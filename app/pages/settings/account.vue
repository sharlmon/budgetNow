<template>
  <div>
    <SettingsHeader title="Account and sync" />
    <div class="card white rise" style="margin-bottom:12px;--i:1">
      <div class="row">
        <img v-if="auth.imageUrl.value" :src="auth.imageUrl.value" alt="" class="pic" width="48" height="48" />
        <span v-else class="avatar">{{ (auth.fullName.value || auth.email.value || 'B')[0]?.toUpperCase() }}</span>
        <div class="grow"><strong class="nm">{{ auth.fullName.value || 'Your account' }}</strong><div class="muted sm nm">{{ auth.email.value }}</div></div>
      </div>
      <div class="sync" :class="syncStatus"><Icon :name="syncStatus === 'synced' ? 'check' : syncStatus === 'error' ? 'x' : 'repeat'" :size="14" :stroke="2.6" /> {{ syncText }}</div>
      <div class="row" style="margin-top:12px">
        <button class="btn soft sm acct" @click="syncNow"><Icon name="repeat" :size="15" /> Sync</button>
        <button class="btn soft sm acct" @click="auth.manageAccount()"><Icon name="settings" :size="15" /> Manage</button>
        <button class="btn soft sm acct" @click="signOut"><Icon name="back" :size="15" /> Sign out</button>
      </div>
    </div>

    <div class="card white rise" style="margin-bottom:16px;--i:2;border-color:var(--bad-line)">
      <h2 style="color:var(--bad)">Delete account</h2>
      <p class="muted sm" style="margin:6px 0 14px">Permanently deletes your account and everything stored with it. This cannot be undone. Export a backup first if you want to keep a copy.</p>
      <button class="btn soft" style="color:var(--bad)" :disabled="deleting" @click="deleteAccount"><Icon name="trash" :size="16" /> {{ deleting ? 'Deleting…' : 'Delete my account' }}</button>
    </div>
  </div>
</template>

<script setup lang="ts">
useSeoMeta({ title: 'Account and sync' })
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
</style>
