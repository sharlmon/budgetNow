<template>
  <div class="boot" role="status" aria-label="Loading Weka">
    <svg class="mark" viewBox="0 0 512 512" width="88" height="88" aria-hidden="true">
      <defs><linearGradient id="bootg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f9ad60" /><stop offset="1" stop-color="#ec5a2a" /></linearGradient></defs>
      <rect width="512" height="512" rx="116" fill="url(#bootg)" />
      <path d="M118 232 L188 382 L256 262 L324 382 L394 232" fill="none" stroke="#fff" stroke-width="46" stroke-linecap="round" stroke-linejoin="round" />
      <circle class="coin" cx="256" cy="150" r="44" fill="#fff" />
    </svg>
    <div class="name">Weka</div>
    <div class="bar" aria-hidden="true"><i /></div>
  </div>
</template>

<style scoped>
/* Matches app/spa-loading-template.html (the first thing shown) so the two read as one screen. */
.boot { position:fixed; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:14px; background:var(--bg); color:var(--ink); }
.name { font-size:1.35rem; font-weight:700; letter-spacing:-.02em; }
.mark { filter:drop-shadow(0 14px 22px rgba(239,106,58,.45)); }
.coin { animation:drop 1.4s cubic-bezier(.5,0,.3,1) infinite; transform-origin:256px 150px; }
.bar { width:96px; height:4px; border-radius:99px; background:var(--tint-accent2); overflow:hidden; }
.bar i { display:block; width:40%; height:100%; border-radius:99px; background:var(--accent); animation:slide 1.2s ease-in-out infinite; }
@keyframes drop { 0%,100% { transform:translateY(0); } 45% { transform:translateY(16px); } }
@keyframes slide { from { transform:translateX(-110%); } to { transform:translateX(260%); } }
@media (prefers-reduced-motion: reduce) { .coin, .bar i { animation:none; } }
</style>
