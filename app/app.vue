<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<script setup lang="ts">
// Start syncing as soon as we know who is signed in; stop (and clear the in-memory copy) when nobody is.
const auth = useAppAuth()
const { startSync, stopSync } = useSync()
watch(() => auth.userId.value, (uid) => { if (uid) startSync(uid); else stopSync() }, { immediate: true })
</script>

<style>

:root {
  --page:#e8e8ec; --bg:#fff; --card:#f6f6f9; --line:#ebebf0; --ink:#16171c; --muted:#8a8d9a;
  --accent:#ef6a3a; --accent2:#f7a04b; --good:#2fb67c; --goodbg:#e6f6ee; --bad:#e5484d;
  --grad: linear-gradient(160deg,#f8a85a 0%,#ef6a3a 100%);
  --btn: linear-gradient(180deg,#f58b50 0%,#ec5e2e 100%);
  --ease: cubic-bezier(.2,.8,.2,1); --spring: cubic-bezier(.3,1.4,.5,1);
  color-scheme: light;
}
* { box-sizing:border-box; -webkit-tap-highlight-color:transparent; }
html { background:var(--page); }
body { margin:0; color:var(--ink); font:16px/1.45 'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif; -webkit-font-smoothing:antialiased; font-feature-settings:'cv11','ss01'; }
.shell { max-width:480px; margin:0 auto; min-height:100dvh; display:flex; flex-direction:column; background:var(--bg); position:relative; box-shadow:0 0 80px rgba(20,20,40,.1); }
main { flex:1; padding:calc(20px + env(safe-area-inset-top)) 20px 32px; overflow-x:hidden; }
h1 { font-size:1.5rem; margin:0; letter-spacing:-.025em; font-weight:700; } h2 { font-size:1rem; margin:0; font-weight:700; letter-spacing:-.01em; }
.muted { color:var(--muted); } .good { color:var(--good); } .bad { color:var(--bad); } .sm { font-size:.8rem; }
:focus-visible { outline:2px solid var(--accent); outline-offset:2px; }

/* surfaces */
.card { background:var(--card); border:1px solid var(--line); border-radius:22px; padding:18px; }
.card.white { background:#fff; box-shadow:0 1px 2px rgba(20,20,40,.04), 0 8px 24px -16px rgba(20,20,40,.14); }
.sec { display:flex; justify-content:space-between; align-items:center; margin:28px 0 12px; }
.link { display:inline-flex; align-items:center; gap:2px; background:none; border:0; color:var(--accent); font:inherit; font-size:.82rem; font-weight:600; cursor:pointer; padding:4px 0; text-decoration:none; }

/* buttons */
.btn { display:flex; align-items:center; justify-content:center; gap:8px; appearance:none; border:0; border-radius:16px; padding:16px 20px; font:inherit; font-weight:600; letter-spacing:-.005em; color:#fff; background:var(--btn); cursor:pointer; width:100%; box-shadow:inset 0 1px 0 rgba(255,255,255,.35), inset 0 -2px 0 rgba(0,0,0,.08), 0 10px 22px -8px rgba(239,106,58,.75); transition:transform .18s var(--spring), box-shadow .2s, opacity .2s; position:relative; overflow:hidden; }
.btn:hover { box-shadow:inset 0 1px 0 rgba(255,255,255,.35), inset 0 -2px 0 rgba(0,0,0,.08), 0 14px 26px -8px rgba(239,106,58,.85); }
.btn:active { transform:scale(.97); }
.btn:disabled { opacity:.4; cursor:not-allowed; box-shadow:none; transform:none; }
.btn.soft { background:#fff; color:var(--ink); border:1px solid var(--line); box-shadow:0 1px 2px rgba(20,20,40,.05); }
.btn.sm { width:auto; padding:12px 18px; border-radius:14px; font-size:.9rem; }
.icon-btn { width:34px; height:34px; border-radius:11px; border:1px solid var(--line); background:#fff; color:var(--muted); display:grid; place-items:center; cursor:pointer; flex:none; transition:all .2s var(--spring); }
.icon-btn:hover { color:var(--bad); border-color:#f5c4c6; background:#fff5f5; } .icon-btn:active { transform:scale(.9); }
.circ { width:42px; height:42px; border-radius:50%; background:#fff; border:1px solid var(--line); display:grid; place-items:center; color:var(--ink); text-decoration:none; cursor:pointer; flex:none; box-shadow:0 1px 2px rgba(20,20,40,.05); transition:transform .18s var(--spring); }
.circ:active { transform:scale(.9); }

/* inputs */
.field { width:100%; background:#fff; border:1.5px solid var(--line); color:var(--ink); border-radius:14px; padding:14px 16px; font:inherit; outline:none; transition:border-color .2s, box-shadow .2s; }
.field:focus { border-color:var(--accent); box-shadow:0 0 0 4px rgba(239,106,58,.12); }

/* bits */
.bar { height:8px; background:#ececf1; border-radius:99px; overflow:hidden; }
.bar > i { display:block; height:100%; border-radius:99px; transform-origin:left; animation:grow .9s var(--ease) both; transition:width .5s var(--ease); }
.row { display:flex; align-items:center; gap:12px; } .grow { flex:1; min-width:0; }
.ico { border-radius:14px; display:grid; place-items:center; flex:none; }
.item { display:flex; align-items:center; gap:12px; padding:12px 0; } .item + .item { border-top:1px solid var(--line); }
.empty { text-align:center; padding:30px 20px; }
.empty .art { width:64px; height:64px; border-radius:22px; margin:0 auto 14px; display:grid; place-items:center; background:linear-gradient(145deg,#fff1ea,#ffe2d4); color:var(--accent); animation:float 3.2s ease-in-out infinite; }
.hdr { display:flex; align-items:center; gap:12px; margin-bottom:20px; }
.avatar { width:44px; height:44px; border-radius:50%; background:var(--grad); color:#fff; font-weight:700; display:grid; place-items:center; text-decoration:none; flex:none; box-shadow:0 6px 14px -6px rgba(239,106,58,.8), inset 0 1px 0 rgba(255,255,255,.4); }

/* motion */
.rise { animation:rise .6s var(--ease) both; animation-delay:calc(var(--i,0) * 70ms); }
.page-enter-active { transition:opacity .35s var(--ease), transform .35s var(--ease); } .page-leave-active { transition:opacity .15s ease; }
.page-enter-from { opacity:0; transform:translateY(14px); } .page-leave-to { opacity:0; }
@keyframes rise { from { opacity:0; transform:translateY(18px) scale(.985); } }
@keyframes grow { from { transform:scaleX(0); } }
@keyframes float { 50% { transform:translateY(-5px); } }
@media (prefers-reduced-motion: reduce) { *,*::before,*::after { animation-duration:.01ms !important; animation-delay:0s !important; transition-duration:.01ms !important; } }
</style>
