<template>
  <nav class="tabs">
    <NuxtLink v-for="t in left" :key="t.to" :to="t.to" class="tab" active-class="on"><span v-html="t.icon" /><small>{{ t.label }}</small></NuxtLink>
    <button class="fab" aria-label="Add" @click="sheet = { open: true, mode: 'income' }">
      <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round"><path d="M12 5v14M5 12h14" /></svg>
    </button>
    <NuxtLink v-for="t in right" :key="t.to" :to="t.to" class="tab" active-class="on"><span v-html="t.icon" /><small>{{ t.label }}</small></NuxtLink>
  </nav>
</template>

<script setup lang="ts">
const sheet = useSheet()
const s = (d: string) => `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`
const left = [
  { to: '/', label: 'Home', icon: s('<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>') },
  { to: '/activity', label: 'Activity', icon: s('<path d="M7 4v14m0 0l-3-3m3 3l3-3M17 20V6m0 0l-3 3m3-3l3 3"/>') },
]
const right = [
  { to: '/analytics', label: 'Analytics', icon: s('<path d="M5 20V11M12 20V4M19 20v-7"/>') },
  { to: '/debts', label: 'Debts', icon: s('<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3 10h18M7 15h3"/>') },
]
</script>

<style scoped>
.tabs { position:sticky; bottom:0; display:grid; grid-template-columns:1fr 1fr 78px 1fr 1fr; align-items:center; padding:10px 8px calc(10px + env(safe-area-inset-bottom)); background:rgba(255,255,255,.94); backdrop-filter:blur(14px); border-top:1px solid var(--line); z-index:10; }
.tab { display:flex; flex-direction:column; align-items:center; gap:3px; color:#a3a6b2; text-decoration:none; font-size:.68rem; font-weight:500; }
.tab.on { color:var(--accent); font-weight:700; }
.fab { justify-self:center; width:58px; height:58px; margin-top:-34px; border-radius:50%; border:5px solid #fff; background:var(--accent); display:grid; place-items:center; cursor:pointer; box-shadow:0 10px 22px -6px rgba(239,106,58,.8); }
</style>
