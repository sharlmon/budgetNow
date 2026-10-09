<template>
  <div>
    <div class="hdr rise"><NuxtLink to="/home" class="circ" aria-label="Back"><Icon name="back" :size="22" /></NuxtLink><h1>Settings</h1></div>
    <div class="card white rise" style="margin-bottom:12px;--i:1">
      <div class="row">
        <img v-if="auth.imageUrl.value" :src="auth.imageUrl.value" alt="" class="pic" width="48" height="48" />
        <span v-else class="avatar">{{ (auth.fullName.value || auth.email.value || 'B')[0]?.toUpperCase() }}</span>
        <div class="grow"><strong class="nm">{{ auth.fullName.value || 'Your account' }}</strong><div class="muted sm nm">{{ auth.email.value }}</div></div>
      </div>
      <div class="sync" :class="syncStatus"><Icon :name="syncStatus === 'synced' ? 'check' : syncStatus === 'error' ? 'x' : 'repeat'" :size="14" :stroke="2.6" /> {{ syncText }}</div>
      <div class="row" style="margin-top:12px">
        <button class="btn soft sm acct" @click="syncNow"><Icon name="repeat" :size="15" /> Sync</button>
        <button class="btn soft sm acct" @click="auth.manageAccount()"><Icon name="settings" :size="15" /> Account</button>
        <button class="btn soft sm acct" @click="signOut"><Icon name="back" :size="15" /> Sign out</button>
      </div>
    </div>
    <div class="rise" style="--i:1"><ThemeCard /></div>
    <div class="rise" style="--i:1"><SplitRuleCard /></div>
    <div class="rise" style="--i:1"><AppLockCard /></div>
    <div class="rise" style="margin-bottom:12px;--i:1"><InstallCard always /></div>
    <div class="card white rise" style="margin-bottom:12px;--i:1">
      <label class="muted sm" for="nm">Your name</label>
      <input id="nm" v-model="name" class="field" placeholder="What should we call you?" style="margin-top:8px" />
    </div>
    <div class="card white rise" style="margin-bottom:12px;--i:2">
      <label class="muted sm" for="cu">Currency</label>
      <select id="cu" v-model="cur" class="field" style="margin-top:8px"><option v-for="c in currencies" :key="c" :value="c">{{ c }}</option></select>
    </div>
    <div class="card white rise" style="margin-bottom:12px;--i:3">
      <div class="row"><span class="bk"><Icon name="shield" :size="20" /></span><div class="grow"><h2>Backup &amp; restore</h2><div class="muted sm">{{ lastText }}</div></div></div>
      <p class="muted sm" style="margin:12px 0 14px">Your data is already saved to your account. You can also keep a file copy of your own, or restore one. A backup file is plain text, so store it somewhere private.</p>
      <div class="row">
        <button class="btn" :disabled="!hasData" @click="exportBackup"><Icon name="download" :size="17" /> Export</button>
        <button class="btn soft" @click="picker?.click()"><Icon name="upload" :size="17" /> Restore</button>
      </div>
      <input ref="picker" type="file" accept="application/json,.json" hidden @change="onPick" />
    </div>
    <div class="card white rise" style="margin-bottom:16px;--i:4">
      <h2>Erase data</h2>
      <p class="muted sm" style="margin:6px 0 14px">Permanently deletes all your income, expenses, debts, goals and bills from your account and every device.</p>
      <button class="btn soft" @click="erase"><Icon name="trash" :size="16" /> Erase all data</button>
    </div>
    <div class="card white rise" style="margin-bottom:16px;--i:5;border-color:var(--bad-line)">
      <h2 style="color:var(--bad)">Delete account</h2>
      <p class="muted sm" style="margin:6px 0 14px">Permanently deletes your account and everything stored with it. This cannot be undone. Export a backup first if you want to keep a copy.</p>
      <button class="btn soft" style="color:var(--bad)" :disabled="deleting" @click="deleteAccount"><Icon name="trash" :size="16" /> {{ deleting ? 'Deleting…' : 'Delete my account' }}</button>
    </div>
    <nav class="legal" aria-label="Legal"><NuxtLink to="/privacy">Privacy Policy</NuxtLink><span>·</span><NuxtLink to="/terms">Terms</NuxtLink></nav>
    <CraftedBy style="margin-top:10px" />
  </div>
</template>

<script setup lang="ts">
import { SITE } from '#shared/site'
const { resetAll } = useBudget()
const { hasData, daysSince, exportBackup, importFile } = useBackup()
const picker = ref<HTMLInputElement>()
const lastText = computed(() => (daysSince.value === null ? 'Never backed up' : daysSince.value === 0 ? 'Last backup: today' : `Last backup: ${daysSince.value} day${daysSince.value === 1 ? '' : 's'} ago`))
async function onPick(e: Event) {
  const input = e.target as HTMLInputElement
  const f = input.files?.[0]
  input.value = ''
  if (f) await importFile(f)
}
const currencies = SITE.currencies
const cur = computed({ get: () => currency.value, set: (v: string) => { currency.value = v } })
const name = computed({ get: () => userName.value, set: (v: string) => { userName.value = v } })
function erase() { if (confirm('Permanently erase all your data from your account and every device? This cannot be undone.')) { resetAll(); showToast('All data erased') } }

const auth = useAppAuth()
const { syncNow, prepareSignOut, deleteAccount: wipeAccount } = useSync()
const deleting = ref(false)
async function deleteAccount() {
  const typed = prompt('This permanently deletes your account and all your data. It cannot be undone.\n\nType DELETE to confirm.')
  if (typed?.trim() !== 'DELETE') return
  deleting.value = true
  try {
    await wipeAccount()
  } catch (e: any) {
    deleting.value = false
    alert(e?.statusMessage || e?.data?.statusMessage || 'Something went wrong. Check your connection and try again.')
    return
  }
  try { await auth.signOut() } catch { /* the account no longer exists, so there is nothing to sign out of */ }
  showToast('Your account and data were deleted')
  await navigateTo('/')
}
const syncText = computed(() => {
  const n = syncPending.value
  if (syncStatus.value === 'syncing') return 'Syncing…'
  if (syncStatus.value === 'offline') return n ? `Offline · ${n} change${n === 1 ? '' : 's'} will sync when you're back` : 'Offline · changes will sync when you reconnect'
  if (syncStatus.value === 'error') return n ? `Couldn't sync ${n} change${n === 1 ? '' : 's'} · retrying` : "Couldn't sync · retrying"
  if (syncStatus.value === 'synced') return 'All changes saved to your account'
  return 'Waiting to sync'
})
async function signOut() {
  if (!(await prepareSignOut())) return
  await auth.signOut()
  await navigateTo('/sign-in')
}
</script>

<style scoped>
.acct { flex:1; white-space:nowrap; padding-inline:10px; gap:6px; }
.pic { border-radius:50%; flex:none; }
.nm { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.sync { display:flex; align-items:center; gap:8px; margin-top:14px; padding:10px 12px; border-radius:12px; font-size:.8rem; font-weight:500; background:var(--soft); color:var(--muted); }
.sync.synced { background:var(--goodbg); color:var(--good-ink); } .sync.error { background:var(--bad-bg); color:var(--bad); } .sync.offline { background:var(--warn-bg); color:var(--warn-ink); }
.legal { display:flex; justify-content:center; gap:10px; font-size:.82rem; color:var(--muted); }
.legal a { color:var(--muted); }
.bk { width:42px; height:42px; border-radius:14px; background:var(--goodbg); color:var(--good); display:grid; place-items:center; flex:none; }
</style>
