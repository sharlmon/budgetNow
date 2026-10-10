<template>
  <div>
    <SettingsHeader title="Settings" back="/home" />

    <NuxtLink to="/settings/account" class="card white profile rise" style="--i:1" aria-label="Account and sync">
      <img v-if="auth.imageUrl.value" :src="auth.imageUrl.value" alt="" class="pic" width="52" height="52" />
      <span v-else class="avatar big">{{ (auth.fullName.value || auth.email.value || 'W')[0]?.toUpperCase() }}</span>
      <span class="grow"><strong class="nm">{{ auth.fullName.value || 'Your account' }}</strong><span class="muted sm nm">{{ auth.email.value }}</span>
        <span class="sync" :class="syncStatus"><Icon :name="syncStatus === 'synced' ? 'check' : syncStatus === 'error' ? 'x' : 'repeat'" :size="12" :stroke="2.8" /> {{ syncShort }}</span></span>
      <Icon name="next" :size="18" class="chev" />
    </NuxtLink>

    <div class="rise" style="--i:2"><InstallCard always /></div>

    <h2 class="gh rise" style="--i:2">Your money</h2>
    <div class="card white group rise" style="--i:3">
      <SettingsRow to="/accounts" icon="wallet" tone="good" title="Accounts" :summary="accountsSummary" />
      <SettingsRow to="/settings/budget" icon="chart" tone="accent" title="Budget" :summary="`${currency} · ${splitLabel(splitRule)} split`" />
    </div>

    <h2 class="gh rise" style="--i:3">This device</h2>
    <div class="card white group rise" style="--i:4">
      <SettingsRow to="/settings/appearance" :icon="activeTheme === 'dark' ? 'moon' : 'sun'" tone="blue" title="Appearance" :summary="themeSummary" />
      <SettingsRow to="/settings/security" :icon="lockEnabled ? 'lock' : 'unlock'" title="Security" :summary="lockEnabled ? 'App lock is on' : 'App lock is off'" />
      <SettingsRow to="/settings/data" icon="shield" tone="good" title="Backup and data" :summary="backupSummary" />
    </div>

    <h2 class="gh rise" style="--i:4">Weka</h2>
    <div class="card white group rise" style="--i:5">
      <SettingsRow v-if="guide.dismissed.value && guide.progress.value.done < guide.progress.value.total" to="/home" icon="flag" tone="good" title="Setup guide" :summary="`${guide.progress.value.done} of ${guide.progress.value.total} done · tap to show it again`" @click="guide.show()" />
      <SettingsRow to="/settings/about" icon="sparkles" tone="accent" title="About and what's new" :summary="`Version ${version.current.version}`" :dot="updateAvailable ? 'An update is available' : undefined" />
    </div>

    <nav class="legal" aria-label="Legal"><NuxtLink to="/privacy">Privacy Policy</NuxtLink><span>·</span><NuxtLink to="/terms">Terms</NuxtLink></nav>
    <CraftedBy style="margin-top:4px" />
  </div>
</template>

<script setup lang="ts">
import { splitLabel } from '../../utils/split'
useSeoMeta({ title: 'Settings' })
const auth = useAppAuth()
const { state } = useBudget()
const { daysSince } = useBackup()
const version = useVersion()
const guide = useGuide()

const accountsSummary = computed(() => { const n = state.value.accounts.length; return n ? `${n} account${n === 1 ? '' : 's'} · ${money(state.value.accounts.reduce((s, a) => s + a.balance, 0))}` : 'Add where you keep money' })
const themeSummary = computed(() => (themeChoice.value === 'system' ? `Follows your device (${activeTheme.value})` : themeChoice.value === 'dark' ? 'Dark' : 'Light'))
const backupSummary = computed(() => (daysSince.value === null ? 'Never backed up' : daysSince.value === 0 ? 'Backed up today' : `Backed up ${daysSince.value} day${daysSince.value === 1 ? '' : 's'} ago`))
const syncShort = computed(() => {
  const n = syncPending.value
  if (syncStatus.value === 'syncing') return 'Syncing…'
  if (syncStatus.value === 'offline') return n ? `Offline · ${n} to sync` : 'Offline'
  if (syncStatus.value === 'error') return 'Retrying…'
  if (syncStatus.value === 'synced') return 'Saved to your account'
  return 'Waiting to sync'
})
</script>

<style scoped>
.profile { display:flex; align-items:center; gap:14px; text-decoration:none; color:var(--ink); margin-bottom:6px; }
.avatar.big { width:52px; height:52px; font-size:1.2rem; }
.pic { border-radius:50%; flex:none; }
.nm { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.grow { min-width:0; }
.chev { color:var(--muted); flex:none; }
.sync { display:inline-flex; align-items:center; gap:6px; margin-top:8px; padding:4px 10px; border-radius:99px; font-size:.74rem; font-weight:600; background:var(--soft); color:var(--muted); }
.sync.synced { background:var(--goodbg); color:var(--good-ink); } .sync.error { background:var(--bad-bg); color:var(--bad); } .sync.offline { background:var(--warn-bg); color:var(--warn-ink); }
.gh { font-size:.78rem; font-weight:700; color:var(--muted); text-transform:uppercase; letter-spacing:.07em; margin:22px 4px 8px; }
.group { padding:2px 16px; }
.legal { display:flex; justify-content:center; gap:10px; font-size:.82rem; color:var(--muted); margin-top:22px; }
.legal a { color:var(--muted); padding:12px 6px; }
</style>
