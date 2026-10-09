<template>
  <nav class="tabs">
    <NuxtLink v-for="t in left" :key="t.to" :to="t.to" class="tab" active-class="on"><span class="ic"><Icon :name="t.icon" :size="22" /></span><small>{{ t.label }}</small></NuxtLink>
    <button class="fab" aria-label="Add transaction" @click="sheet = { open: true, mode: 'income' }"><Icon name="plus" :size="26" :stroke="2.6" /></button>
    <NuxtLink v-for="t in right" :key="t.to" :to="t.to" class="tab" :class="{ on: t.match ? t.match(route.path) : route.path === t.to }"><span class="ic"><Icon :name="t.icon" :size="22" /></span><small>{{ t.label }}</small></NuxtLink>
  </nav>
</template>

<script setup lang="ts">
const sheet = useSheet()
const route = useRoute()
const left = [{ to: '/home', label: 'Home', icon: 'house' }, { to: '/activity', label: 'Activity', icon: 'swap' }]
const right = [
  { to: '/analytics', label: 'Analytics', icon: 'chart', match: undefined },
  { to: '/goals', label: 'Plan', icon: 'target', match: (p: string) => p.startsWith('/goals') || p.startsWith('/debts') || p.startsWith('/bills') },
]
</script>

<style scoped>
.tabs { position:sticky; bottom:0; display:grid; grid-template-columns:1fr 1fr 80px 1fr 1fr; align-items:center; padding:10px 10px calc(10px + env(safe-area-inset-bottom)); background:var(--glass); backdrop-filter:blur(20px) saturate(1.6); -webkit-backdrop-filter:blur(20px) saturate(1.6); border-top:1px solid rgba(20,20,40,.06); z-index:10; }
.tab { display:flex; flex-direction:column; align-items:center; gap:3px; color:var(--muted); text-decoration:none; font-size:.68rem; font-weight:500; transition:color .25s; }
.ic { width:46px; height:30px; border-radius:99px; display:grid; place-items:center; transition:background .3s var(--ease), transform .3s var(--spring); }
.tab.on { color:var(--accent); font-weight:700; }
.tab.on .ic { background:rgba(239,106,58,.12); animation:bump .45s var(--spring); }
.tab:active .ic { transform:scale(.88); }
.fab { justify-self:center; width:60px; height:60px; margin-top:-36px; border-radius:50%; border:5px solid var(--bg); background:var(--btn); color:#fff; display:grid; place-items:center; cursor:pointer; box-shadow:inset 0 1px 0 rgba(255,255,255,.4), 0 14px 26px -8px rgba(239,106,58,.85); transition:transform .25s var(--spring); position:relative; }
.fab::after { content:''; position:absolute; inset:-5px; border-radius:50%; border:2px solid rgba(239,106,58,.5); animation:ring 2.6s ease-out infinite; }
.fab:hover { transform:scale(1.06) rotate(90deg); } .fab:active { transform:scale(.92); }
@keyframes bump { 40% { transform:translateY(-4px) scale(1.08); } }
@keyframes ring { 0% { transform:scale(.9); opacity:.9; } 70%,100% { transform:scale(1.5); opacity:0; } }
</style>
