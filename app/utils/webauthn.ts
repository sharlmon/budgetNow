// Face ID / fingerprint unlock for the app lock, using the browser's WebAuthn "platform authenticator".
// The credential never leaves the device. This is a convenience on top of the PIN, so the app checks that the
// authenticator really verified the person (user-verification flag) rather than trusting that a prompt resolved.

const enc = new TextEncoder()

export const b64u = {
  enc(data: ArrayBuffer | Uint8Array): string {
    const bytes = data instanceof Uint8Array ? data : new Uint8Array(data)
    return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  },
  dec(s: string): Uint8Array {
    const pad = '='.repeat((4 - (s.length % 4)) % 4)
    return Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + pad), c => c.charCodeAt(0))
  },
}

export const randomBytes = (n: number) => crypto.getRandomValues(new Uint8Array(n))

export interface AuthData { rpIdHash: Uint8Array; userPresent: boolean; userVerified: boolean; signCount: number }

/** Reads the fixed 37-byte header of WebAuthn authenticator data. */
export function parseAuthData(buf: ArrayBuffer | Uint8Array): AuthData | null {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
  if (bytes.length < 37) return null
  const flags = bytes[32]!
  return {
    rpIdHash: bytes.slice(0, 32),
    userPresent: (flags & 0x01) !== 0,
    userVerified: (flags & 0x04) !== 0,
    signCount: new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(33),
  }
}

const sameBytes = (a: Uint8Array, b: Uint8Array) => a.length === b.length && a.every((v, i) => v === b[i])

/**
 * Accepts an assertion only if it is a fresh "get" for our challenge, bound to our site, and the authenticator
 * confirms the user was present AND verified (biometric or device passcode).
 * It does not verify the signature: with no server involved this is a local screen lock, like the PIN.
 */
export async function checkAssertion(
  response: { authenticatorData: ArrayBuffer | Uint8Array; clientDataJSON: ArrayBuffer | Uint8Array },
  challenge: Uint8Array,
  rpId: string,
): Promise<boolean> {
  let client: { type?: string; challenge?: string }
  try { client = JSON.parse(new TextDecoder().decode(response.clientDataJSON)) } catch { return false }
  if (client.type !== 'webauthn.get' || client.challenge !== b64u.enc(challenge)) return false
  const auth = parseAuthData(response.authenticatorData)
  if (!auth || !auth.userPresent || !auth.userVerified) return false
  const expected = new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(rpId)))
  return sameBytes(auth.rpIdHash, expected)
}

/** True when this browser/device can verify the user with Face ID, fingerprint or a screen-lock passcode. */
export async function biometricsAvailable(): Promise<boolean> {
  try {
    if (typeof window === 'undefined' || !window.isSecureContext || typeof PublicKeyCredential === 'undefined') return false
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
  } catch { return false }
}

/** Creates a device-bound credential after the user passes biometrics. Returns its id. */
export async function createBiometricCredential(rpId: string): Promise<string> {
  const cred = await navigator.credentials.create({
    publicKey: {
      rp: { name: 'Weka', id: rpId },
      user: { id: randomBytes(16), name: 'budgetnow-app-lock', displayName: 'Weka app lock' },
      challenge: randomBytes(32),
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
      authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'discouraged' },
      attestation: 'none',
      timeout: 60_000,
    },
  }) as PublicKeyCredential | null
  if (!cred) throw new Error('No credential created')
  return b64u.enc(cred.rawId)
}

export type BiometricResult = 'ok' | 'cancelled' | 'failed'

/** Asks the device to verify the user and checks the answer. */
export async function verifyBiometric(credentialId: string, rpId: string): Promise<BiometricResult> {
  const challenge = randomBytes(32)
  try {
    const cred = await navigator.credentials.get({
      publicKey: {
        challenge, rpId, timeout: 60_000, userVerification: 'required',
        allowCredentials: [{ type: 'public-key', id: b64u.dec(credentialId), transports: ['internal'] }],
      },
    }) as PublicKeyCredential | null
    if (!cred) return 'cancelled'
    return (await checkAssertion(cred.response as AuthenticatorAssertionResponse, challenge, rpId)) ? 'ok' : 'failed'
  } catch (e: any) {
    // NotAllowedError is what browsers throw when the person dismisses the prompt or it times out.
    return e?.name === 'NotAllowedError' || e?.name === 'AbortError' ? 'cancelled' : 'failed'
  }
}
