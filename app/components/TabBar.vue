<template>
  <nav class="tabs">
    <NuxtLink v-for="t in left" :key="t.to" :to="t.to" class="tab" active-class="on"><span v-html="t.icon" /><small>{{ t.label }}</small></NuxtLink>
    <button class="fab" aria-label="Add" @click="sheet.open = true"><svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round"><path d="M12 5v14M5 12h14" /></svg></button>
    <NuxtLink v-for="t in right" :key="t.to" :to="t.to" class="tab" active-class="on"><span v-html="t.icon" /><small>{{ t.label }}</small></NuxtLink>
  </nav>
</template>

<script setup lang="ts">
const sheet = useSheet()
const s = (d: string) => `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`
const left = [
  { to: '/', label: 'Home', icon: s('<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>') },
  { to: '/activity', label: 'Activity', icon: s('<path d="M4 6h16M4 12h16M4 18h10"/>') },
]
const right = [
  { to: '/debts', label: 'Debts', icon: s('<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3 10h18"/>') },
  { to: '/settings', label: 'Settings', icon: s('<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>') },
]
</script>

<style scoped>
.tabs { position:sticky; bottom:0; display:grid; grid-template-columns:1fr 1fr 76px 1fr 1fr; align-items:center; padding:8px 8px calc(8px + env(safe-area-inset-bottom)); background:color-mix(in srgb,var(--surface) 88%,transparent); backdrop-filter:blur(14px); border-top:1px solid var(--line); z-index:10; }
.tab { display:flex; flex-direction:column; align-items:center; gap:2px; color:var(--muted); text-decoration:none; font-size:.7rem; padding:4px 0; }
.tab.on { color:var(--accent2); }
.fab { justify-self:center; width:56px; height:56px; margin-top:-26px; border-radius:50%; border:4px solid var(--bg); background:var(--hero); display:grid; place-items:center; cursor:pointer; box-shadow:0 8px 20px -6px rgba(110,90,255,.7); }
</style>
