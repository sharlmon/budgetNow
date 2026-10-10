<template>
  <NuxtLink v-if="show" to="/settings/account" class="badge" :class="syncStatus">
    <Icon :name="syncStatus === 'error' ? 'x' : 'repeat'" :size="11" :stroke="2.8" />
    <span v-if="syncStatus === 'offline'">Offline{{ syncPending ? ` · ${syncPending} to sync` : '' }}</span>
    <span v-else-if="syncStatus === 'error'">Sync problem · tap to check</span>
    <span v-else>Syncing…</span>
  </NuxtLink>
</template>

<script setup lang="ts">
// Only visible when something needs attention; a fully synced app shows nothing.
const show = computed(() => syncStatus.value === 'offline' || syncStatus.value === 'error' || (syncStatus.value === 'syncing' && syncPending.value > 0))
</script>

<style scoped>
.badge { display:inline-flex; align-items:center; gap:5px; margin-top:4px; padding:3px 9px; border-radius:99px; font-size:.7rem; font-weight:600; text-decoration:none; background:var(--soft); color:var(--muted); }
.badge.offline { background:var(--warn-bg); color:var(--warn-ink); } .badge.error { background:var(--bad-bg); color:var(--bad); }
</style>
