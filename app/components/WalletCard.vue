<template>
  <div class="wallet">
    <div class="c c3" />
    <div class="c c2"><span>{{ second?.label || 'Next pay' }}</span><b>{{ second ? money(second.amount) : '' }}</b></div>
    <div class="c c1"><span>{{ first?.label || 'Latest income' }}</span><b>{{ first ? money(first.amount) : '' }}</b></div>
    <div class="front">
      <small>Total Balance</small>
      <div class="amt">{{ money(balance) }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ balance: number; first?: { label: string; amount: number }; second?: { label: string; amount: number } }>()
</script>

<style scoped>
.wallet { position:relative; height:196px; }
.c { position:absolute; left:0; right:0; border-radius:22px; padding:12px 18px; display:flex; justify-content:space-between; font-size:.78rem; }
.c3 { top:0; transform:scale(.88); background:#d9d9de; height:80px; }
.c2 { top:12px; transform:scale(.94); background:linear-gradient(#cfcfd4,#b9b9c1); color:#444; height:90px; }
.c1 { top:26px; background:linear-gradient(#e4e4e9,#a9a9b3); color:#333; height:100px; }
.front { position:absolute; left:0; right:0; bottom:0; height:130px; border-radius:24px; padding:18px 20px; color:#f7e7da; display:flex; flex-direction:column; justify-content:flex-end; background:
  radial-gradient(circle at 20% 0%,rgba(255,255,255,.18),transparent 55%),
  repeating-linear-gradient(45deg,rgba(255,255,255,.03) 0 2px,transparent 2px 5px),
  linear-gradient(160deg,#9a5a34,#5f2f19); box-shadow:0 18px 30px -14px rgba(70,30,10,.7), inset 0 0 0 1.5px rgba(255,255,255,.1); }
.front::after { content:''; position:absolute; inset:7px; border:1.5px dashed rgba(255,225,200,.35); border-radius:19px; pointer-events:none; }
.amt { font-size:2rem; font-weight:700; letter-spacing:-.02em; color:#fff; line-height:1.15; }
small { opacity:.8; }
</style>
