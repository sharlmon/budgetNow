import { describe, expect, it } from 'vitest'
import { b64u, checkAssertion, parseAuthData, randomBytes } from '../app/utils/webauthn'

const RP = 'budget.example.com'
const sha = async (s: string) => new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))

async function assertion(opts: { rp?: string; flags?: number; type?: string; challenge?: Uint8Array; sign?: number } = {}) {
  const challenge = opts.challenge ?? randomBytes(32)
  const authData = new Uint8Array(37)
  authData.set(await sha(opts.rp ?? RP), 0)
  authData[32] = opts.flags ?? 0x05 // user present + user verified
  new DataView(authData.buffer).setUint32(33, opts.sign ?? 7)
  const clientDataJSON = new TextEncoder().encode(JSON.stringify({ type: opts.type ?? 'webauthn.get', challenge: b64u.enc(challenge), origin: `https://${RP}` }))
  return { challenge, response: { authenticatorData: authData, clientDataJSON } }
}

describe('base64url', () => {
  it('round-trips arbitrary bytes without padding or unsafe characters', () => {
    for (let n = 0; n < 40; n++) {
      const bytes = randomBytes(n)
      const s = b64u.enc(bytes)
      expect(s).toMatch(/^[A-Za-z0-9_-]*$/)
      expect(Array.from(b64u.dec(s))).toEqual(Array.from(bytes))
    }
  })
})

describe('parseAuthData', () => {
  it('reads flags and counter', async () => {
    const { response } = await assertion({ flags: 0x05, sign: 42 })
    expect(parseAuthData(response.authenticatorData)).toMatchObject({ userPresent: true, userVerified: true, signCount: 42 })
    const { response: r2 } = await assertion({ flags: 0x01 })
    expect(parseAuthData(r2.authenticatorData)).toMatchObject({ userPresent: true, userVerified: false })
  })
  it('rejects data that is too short', () => expect(parseAuthData(new Uint8Array(10))).toBeNull())
})

describe('checkAssertion', () => {
  it('accepts a genuine, verified assertion for this site and challenge', async () => {
    const a = await assertion()
    expect(await checkAssertion(a.response, a.challenge, RP)).toBe(true)
  })
  it('rejects when the person was not verified (presence only)', async () => {
    const a = await assertion({ flags: 0x01 })
    expect(await checkAssertion(a.response, a.challenge, RP)).toBe(false)
  })
  it('rejects when the user was not present', async () => {
    const a = await assertion({ flags: 0x04 })
    expect(await checkAssertion(a.response, a.challenge, RP)).toBe(false)
  })
  it('rejects a replay with a different challenge', async () => {
    const a = await assertion()
    expect(await checkAssertion(a.response, randomBytes(32), RP)).toBe(false)
  })
  it('rejects an assertion made for another site', async () => {
    const a = await assertion({ rp: 'evil.example.org' })
    expect(await checkAssertion(a.response, a.challenge, RP)).toBe(false)
  })
  it('rejects the wrong ceremony type and malformed data', async () => {
    const a = await assertion({ type: 'webauthn.create' })
    expect(await checkAssertion(a.response, a.challenge, RP)).toBe(false)
    expect(await checkAssertion({ authenticatorData: new Uint8Array(5), clientDataJSON: new TextEncoder().encode('{}') }, randomBytes(32), RP)).toBe(false)
    expect(await checkAssertion({ authenticatorData: new Uint8Array(37), clientDataJSON: new TextEncoder().encode('not json') }, randomBytes(32), RP)).toBe(false)
  })
})
