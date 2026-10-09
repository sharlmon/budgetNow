<template>
  <div class="wallet">
    <div class="c c3" />
    <div class="c c2" />
    <div class="c c1"><span>{{ first?.label || 'Latest income' }}</span><b>{{ first ? money(first.amount) : '' }}</b></div>
    <div class="front">
      <div class="chipic"><Icon name="wallet" :size="18" /></div>
      <small>Total Balance</small>
      <div class="amt"><AnimatedNumber :value="balance" /></div>
      <i class="sheen" />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ balance: number; first?: { label: string; amount: number }; second?: unknown }>()
</script>

<style scoped>
.wallet { position:relative; height:206px; }
.c { position:absolute; left:0; right:0; border-radius:22px; padding:12px 20px; display:flex; justify-content:space-between; font-size:.78rem; font-weight:500; animation:slide .8s var(--ease) both; }
.c3 { top:0; background:var(--silver-3); height:80px; transform:scale(.88); animation-delay:.05s; }
.c2 { top:14px; background:linear-gradient(var(--silver-2a),var(--silver-2b)); color:var(--silver-ink2); height:90px; transform:scale(.94); animation-delay:.12s; }
.c1 { top:30px; background:linear-gradient(var(--silver-1a),var(--silver-1b)); color:var(--silver-ink); height:100px; animation-delay:.2s; }
.front { position:absolute; left:0; right:0; bottom:0; height:134px; border-radius:26px; padding:18px 22px; color:#f7e7da; display:flex; flex-direction:column; justify-content:flex-end; overflow:hidden; animation:slide .9s .3s var(--ease) both;
  background: radial-gradient(circle at 18% 0%,rgba(255,255,255,.2),transparent 55%), repeating-linear-gradient(45deg,rgba(255,255,255,.035) 0 2px,transparent 2px 5px), linear-gradient(160deg,#9d5c36,#5c2d17);
  box-shadow:0 22px 34px -16px rgba(70,30,10,.75), inset 0 1px 0 rgba(255,255,255,.2), inset 0 0 0 1.5px rgba(255,255,255,.08); }
.front::after { content:''; position:absolute; inset:8px; border:1.5px dashed rgba(255,225,200,.3); border-radius:19px; pointer-events:none; }
.chipic { position:absolute; top:18px; right:20px; width:34px; height:34px; border-radius:11px; display:grid; place-items:center; background:rgba(255,255,255,.14); backdrop-filter:blur(4px); color:var(--tint-accent); }
.amt { font-size:2.1rem; font-weight:700; letter-spacing:-.03em; color:#fff; line-height:1.15; }
small { opacity:.8; font-weight:500; }
.sheen { position:absolute; top:-20%; bottom:-20%; width:40%; left:-60%; background:linear-gradient(100deg,transparent,rgba(255,255,255,.28),transparent); transform:skewX(-18deg); animation:sheen 1.6s 1.1s var(--ease) both; }
@keyframes slide { from { opacity:0; transform:translateY(46px) scale(.9); } }
@keyframes sheen { to { left:130%; } }
</style>
