import { checkPin, createLock, lockoutSeconds, type LockConfig } from '../utils/pin'
import { biometricsAvailable, createBiometricCredential, verifyBiometric, type BiometricResult } from '../utils/webauthn'

// Optional PIN lock for this device. The PIN hash lives in this browser only (it does not sync), so each device
// can have its own. It keeps people who pick up an unlocked phone out of the app; it does not encrypt stored data.

export const lockEnabled = ref(false)
export const locked = ref(false)
export const lockTimeout = ref(60)
export const lockLength = ref(4)
/** Epoch ms until which guesses are refused after too many wrong attempts (0 = not throttled). */
export const lockUntil = ref(0)
/** This device can verify you with Face ID, fingerprint or its screen lock. */
export const bioSupported = ref(false)
/** Face ID / fingerprint unlock is turned on for this device. */
export const bioEnabled = ref(false)

let uid: string | null = null
let cfg: LockConfig | null = null
let failures = 0
let hiddenAt = 0
let wired = false

const kCfg = (id: string) => `bn:lock:${id}`
const kFail = (id: string) => `bn:lockfail:${id}`
const readJson = <T>(k: string): T | null => { try { const r = localStorage.getItem(k); return r ? JSON.parse(r) as T : null } catch { return null } }
const writeJson = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* storage unavailable */ } }

function validConfig(c: any): c is LockConfig {
  return c && c.v === 1 && typeof c.salt === 'string' && typeof c.hash === 'string' && Number.isInteger(c.iter) && c.iter > 0 && (c.len === 4 || c.len === 6) && Number.isInteger(c.timeout) && (c.bio === undefined || typeof c.bio === 'string')
}

function persistFailures() {
  if (uid) writeJson(kFail(uid), { count: failures, until: lockUntil.value })
}

function wire() {
  if (wired) return
  wired = true
  document.addEventListener('visibilitychange', () => {
    if (!cfg) return
    if (document.visibilityState === 'hidden') {
      hiddenAt = Date.now()
      if (cfg.timeout === 0) locked.value = true // gone before the app switcher takes its snapshot
    } else if (hiddenAt && cfg.timeout > 0 && (Date.now() - hiddenAt) / 1000 >= cfg.timeout) {
      locked.value = true
    }
  })
}

/** Called when a user is signed in on this device. If a lock is set, the app starts locked. */
export function initLock(userId: string) {
  uid = userId
  const stored = readJson<LockConfig>(kCfg(userId))
  cfg = validConfig(stored) ? stored : null
  lockEnabled.value = !!cfg
  lockTimeout.value = cfg?.timeout ?? 60
  lockLength.value = cfg?.len ?? 4
  bioEnabled.value = !!cfg?.bio
  locked.value = !!cfg
  const f = readJson<{ count: number; until: number }>(kFail(userId))
  failures = f?.count ?? 0
  lockUntil.value = f && f.until > Date.now() ? f.until : 0
  if (import.meta.client) { wire(); biometricsAvailable().then((v) => { bioSupported.value = v }) }
}

/** Forget the lock for a user (sign out, delete account, forgot PIN). */
export function clearLock(userId: string | null) {
  if (userId) { try { localStorage.removeItem(kCfg(userId)); localStorage.removeItem(kFail(userId)) } catch { /* ignore */ } }
  cfg = null; failures = 0
  lockEnabled.value = false; bioEnabled.value = false; locked.value = false; lockUntil.value = 0
}

export type PinResult = 'ok' | 'wrong' | 'wait'

async function attempt(pin: string): Promise<PinResult> {
  if (!cfg) return 'ok'
  if (Date.now() < lockUntil.value) return 'wait'
  if (await checkPin(pin, cfg)) {
    failures = 0; lockUntil.value = 0; persistFailures()
    return 'ok'
  }
  failures++
  const wait = lockoutSeconds(failures)
  if (wait > 0) lockUntil.value = Date.now() + wait * 1000
  persistFailures()
  return 'wrong'
}

export function useAppLock() {
  /** Unlocks the app if the PIN is right. */
  async function unlock(pin: string): Promise<PinResult> {
    const r = await attempt(pin)
    if (r === 'ok') locked.value = false
    return r
  }
  /** Checks the PIN without unlocking (used before changing or removing the lock). */
  const verify = (pin: string) => attempt(pin)

  async function setup(pin: string, timeout = lockTimeout.value) {
    if (!uid) return
    const keepBio = cfg?.bio // changing the PIN keeps Face ID / fingerprint working
    cfg = { ...(await createLock(pin, timeout)), ...(keepBio ? { bio: keepBio } : {}) }
    writeJson(kCfg(uid), cfg)
    failures = 0; lockUntil.value = 0; persistFailures()
    lockEnabled.value = true; lockLength.value = cfg.len; lockTimeout.value = timeout
    locked.value = false
  }

  function remove() { clearLock(uid) }

  function setTimeoutSeconds(seconds: number) {
    lockTimeout.value = seconds
    if (cfg && uid) { cfg = { ...cfg, timeout: seconds }; writeJson(kCfg(uid), cfg) }
  }

  function lockNow() { if (cfg) locked.value = true }

  const rpId = () => location.hostname

  /** Turns on Face ID / fingerprint unlock. The OS asks the user to verify once to create the credential. */
  async function enableBio(): Promise<BiometricResult> {
    if (!cfg || !uid) return 'failed'
    try {
      const id = await createBiometricCredential(rpId())
      cfg = { ...cfg, bio: id }
      writeJson(kCfg(uid), cfg)
      bioEnabled.value = true
      return 'ok'
    } catch (e: any) {
      return e?.name === 'NotAllowedError' || e?.name === 'AbortError' ? 'cancelled' : 'failed'
    }
  }

  function disableBio() {
    if (!cfg || !uid) return
    const { bio: _drop, ...rest } = cfg
    cfg = rest
    writeJson(kCfg(uid), cfg)
    bioEnabled.value = false
  }

  /** Unlocks if the device confirms it is really you. Falls back to the PIN when it cannot. */
  async function unlockWithBio(): Promise<BiometricResult> {
    if (!cfg?.bio) return 'failed'
    const r = await verifyBiometric(cfg.bio, rpId())
    if (r === 'ok') locked.value = false
    return r
  }

  return { unlock, verify, setup, remove, setTimeoutSeconds, lockNow, enableBio, disableBio, unlockWithBio }
}
