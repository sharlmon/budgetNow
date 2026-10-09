import { diffSnaps, emptySnap, type Snap } from '#shared/sync'

type Status = 'idle' | 'syncing' | 'synced' | 'offline' | 'error'

// One sync engine per browser tab. It keeps a local copy of the signed-in user's data (so the app is instant and
// works offline) and, whenever something changes, sends only the changed rows to the server. On start and whenever
// the app comes back to the foreground it pushes pending changes first, then pulls the latest from the server.
export const syncStatus = ref<Status>('idle')
export const syncReady = ref(false)
export const syncPending = ref(0)
export const lastSyncedAt = ref<string | null>(null)

let uid: string | null = null
let synced: Snap = emptySnap()
let pushing = false, again = false, wired = false
let pushTimer: ReturnType<typeof setTimeout> | undefined, cacheTimer: ReturnType<typeof setTimeout> | undefined, retryTimer: ReturnType<typeof setTimeout> | undefined
let retries = 0

const key = (kind: 'cache' | 'synced', id: string) => `bn:${kind}:${id}`
const read = (k: string): Snap | null => { try { const r = localStorage.getItem(k); return r ? { ...emptySnap(), ...JSON.parse(r) } : null } catch { return null } }
const write = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* storage full or blocked */ } }
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v))

export function useSync() {
  const { state, runAutoBills } = useBudget()

  const snapshot = (): Snap => clone({ ...state.value, profile: { currency: currency.value, name: userName.value } })
  const apply = (s: Snap) => {
    state.value = { incomes: s.incomes, expenses: s.expenses, debts: s.debts, goals: s.goals, bills: s.bills }
    currency.value = s.profile.currency
    userName.value = s.profile.name
  }
  const persist = () => { if (uid) { write(key('cache', uid), snapshot()); write(key('synced', uid), synced) } }
  const refreshPending = () => { syncPending.value = diffSnaps(synced, snapshot()).length }

  /** Records bills that came due while the app was closed. */
  function autoBills() {
    const n = runAutoBills()
    if (n) showToast(`${n} bill${n > 1 ? 's' : ''} logged automatically`)
  }

  async function push(): Promise<boolean> {
    if (!uid) return false
    if (pushing) { again = true; return false }
    const sent = snapshot()
    const ops = diffSnaps(synced, sent)
    if (!ops.length) { syncPending.value = 0; return true }
    if (!navigator.onLine) { syncStatus.value = 'offline'; return false }
    pushing = true
    syncStatus.value = 'syncing'
    const owner = uid
    try {
      for (let i = 0; i < ops.length; i += 500) await $fetch('/api/sync', { method: 'POST', body: { ops: ops.slice(i, i + 500) } })
      if (uid !== owner) return false
      synced = sent
      persist()
      retries = 0
      lastSyncedAt.value = new Date().toISOString()
      refreshPending()
      syncStatus.value = syncPending.value ? 'syncing' : 'synced'
      return true
    } catch (e: any) {
      const code = e?.statusCode ?? e?.response?.status
      syncStatus.value = !navigator.onLine ? 'offline' : 'error'
      // A rejected payload (4xx other than an expired session) won't fix itself, so don't hammer the server.
      if (!(code >= 400 && code < 500 && code !== 401 && code !== 429)) scheduleRetry()
      return false
    } finally {
      pushing = false
      if (again) { again = false; schedulePush() }
    }
  }

  function scheduleRetry() {
    clearTimeout(retryTimer)
    retries = Math.min(retries + 1, 5)
    retryTimer = setTimeout(syncNow, Math.min(2000 * 2 ** retries, 60000))
  }
  function schedulePush() {
    clearTimeout(pushTimer)
    pushTimer = setTimeout(push, 600)
  }

  /** Push anything pending, then pull the server's version. Never overwrites local changes that haven't been pushed. */
  async function syncNow() {
    if (!uid) return
    const owner = uid
    if (!navigator.onLine) { syncStatus.value = 'offline'; return }
    if (!(await push())) return
    try {
      syncStatus.value = 'syncing'
      const remote = await $fetch<Snap>('/api/state')
      if (uid !== owner) return
      if (diffSnaps(synced, snapshot()).length) { schedulePush(); return } // edits landed while fetching: push first, pull next time
      // The baseline must be its own copy: sharing arrays with the live state would make later edits invisible to the diff.
      synced = clone(remote)
      apply(clone(remote))
      persist()
      lastSyncedAt.value = new Date().toISOString()
      syncPending.value = 0
      syncStatus.value = 'synced'
      retries = 0
      autoBills()
    } catch (e: any) {
      syncStatus.value = !navigator.onLine ? 'offline' : 'error'
      const code = e?.statusCode ?? e?.response?.status
      if (!(code >= 400 && code < 500 && code !== 401 && code !== 429)) scheduleRetry()
    }
  }

  function wire() {
    if (wired) return
    wired = true
    watch([state, currency, userName], () => {
      if (!uid) return
      refreshPending()
      clearTimeout(cacheTimer)
      cacheTimer = setTimeout(persist, 250)
      schedulePush()
    }, { deep: true })
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') syncNow() })
    window.addEventListener('online', () => syncNow())
    window.addEventListener('offline', () => { syncStatus.value = 'offline' })
    window.addEventListener('pagehide', persist)
  }

  /** Called when a user is signed in. Shows their local copy immediately, then syncs in the background. */
  function startSync(userId: string) {
    if (uid === userId && syncReady.value) return
    stopSync()
    uid = userId
    const cached = read(key('cache', userId))
    synced = read(key('synced', userId)) ?? emptySnap()
    apply(cached ?? emptySnap())
    try { localStorage.setItem('bn:lastUser', userId) } catch { /* ignore */ }
    wire()
    syncReady.value = true
    refreshPending()
    autoBills()
    syncNow()
  }

  function stopSync() {
    clearTimeout(pushTimer); clearTimeout(retryTimer); clearTimeout(cacheTimer)
    uid = null
    synced = emptySnap()
    syncReady.value = false
    syncStatus.value = 'idle'
    syncPending.value = 0
    state.value = { incomes: [], expenses: [], debts: [], goals: [], bills: [] }
    currency.value = 'USD'
    userName.value = ''
  }

  /** Tries to upload pending changes, then wipes this device's copy. Returns false if the user chose to stay. */
  async function prepareSignOut(): Promise<boolean> {
    if (uid) {
      await push()
      if (syncPending.value > 0 && !confirm(`${syncPending.value} change${syncPending.value === 1 ? '' : 's'} haven't synced yet and will be lost if you sign out. Sign out anyway?`)) return false
      try { localStorage.removeItem(key('cache', uid)); localStorage.removeItem(key('synced', uid)); localStorage.removeItem('bn:lastUser') } catch { /* ignore */ }
    }
    stopSync()
    return true
  }

  /** Deletes the account and all its data on the server, then wipes this device. Throws if the server refuses. */
  async function deleteAccount() {
    const owner = uid
    if (!owner) return
    // Stop syncing first so a pending push can never re-create rows after they are deleted.
    clearTimeout(pushTimer); clearTimeout(retryTimer); clearTimeout(cacheTimer)
    uid = null
    try {
      await $fetch('/api/account', { method: 'DELETE' })
    } catch (e) {
      uid = owner
      throw e
    }
    try { localStorage.removeItem(key('cache', owner)); localStorage.removeItem(key('synced', owner)); localStorage.removeItem('bn:lastUser') } catch { /* ignore */ }
    stopSync()
  }

  return { startSync, stopSync, syncNow, prepareSignOut, deleteAccount }
}
