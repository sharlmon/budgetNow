<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<script setup lang="ts">
// Start syncing as soon as we know who is signed in; stop (and clear the in-memory copy) when nobody is.
const auth = useAppAuth()
const { startSync, stopSync } = useSync()
startTheme() // client only; the head script already applied an explicit choice before first paint
watch(() => auth.userId.value, (uid) => { if (!import.meta.client) return; if (uid) startSync(uid); else stopSync() }, { immediate: true })
// The app may have opened from this device's saved copy before Clerk answered. If the answer is "nobody is signed in" (for
// example the session expired), leave the private screen.
const route = useRoute()
watch(() => [auth.isVerified.value, auth.isSignedIn.value] as const, ([verified, signedIn]) => {
  if (import.meta.client && verified && !signedIn && !isOpenPath(route.path)) navigateTo('/sign-in')
}, { immediate: true })
</script>

<style>

/* Colours are named tokens so the whole app can switch theme. Light is the default; dark applies when the device prefers it
   (unless the person chose Light) or when they chose Dark in Settings. The same dark values appear twice on purpose:
   once for the system preference, once for the explicit choice. */
:root {
  --page:#e8e8ec; --bg:#fff; --surface:#fff; --surface2:#fafafc; --card:#f6f6f9; --soft:#f1f1f5; --track:#ececf1; --line:#ebebf0;
  --vault:#15161a; --vault-ink:#fff; --vault-muted:#a9abb4;
  --thumb:#fff; --toggle-off:#dcdce3; --toast:#17181c; --glass:rgba(255,255,255,.86);
  --ink:#16171c; --ink2:#3c3f4a; --ink3:#555968; --muted:#8a8d9a;
  --accent:#ef6a3a; --accent2:#f7a04b;
  --good:#2fb67c; --good-ink:#1f8f5f; --goodbg:#e6f6ee; --good-line:#cfeadc;
  --bad:#e5484d; --bad-bg:#fdecec; --bad-line:#f6c7ca;
  --warn-bg:#fff4e0; --warn-ink:#b97800;
  --tint-accent:#fff1ea; --tint-accent2:#ffe2d4; --tint-accent-soft:#fff7f2; --tint-accent-line:#fbdfd0;
  --tint-blue:#eef2ff; --tint-blue-line:#dbe3ff;
  --grad: linear-gradient(160deg,#f8a85a 0%,#ef6a3a 100%);
  --btn: linear-gradient(180deg,#f58b50 0%,#ec5e2e 100%);
  --ease: cubic-bezier(.2,.8,.2,1); --spring: cubic-bezier(.3,1.4,.5,1);
  color-scheme: light;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --page:#07080b; --bg:#0e1015; --surface:#171a21; --surface2:#13161c; --card:#1c2029; --soft:#262b36; --track:#2a2f3b; --line:#2a2f3a;
    --vault:#1d212b; --vault-ink:#fff; --vault-muted:#a9abb4;
    --thumb:#3a4152; --toggle-off:#3a4152; --toast:#2b303b; --glass:rgba(14,16,21,.82);
    --ink:#f2f3f7; --ink2:#c9ccd7; --ink3:#a8adbb; --muted:#8b92a5;
    --good:#35c58b; --good-ink:#5fd6a0; --goodbg:rgba(47,182,124,.16); --good-line:rgba(47,182,124,.35);
    --bad:#ff6b70; --bad-bg:rgba(229,72,77,.16); --bad-line:rgba(229,72,77,.4);
    --warn-bg:rgba(245,165,36,.15); --warn-ink:#f5b94a;
    --tint-accent:rgba(239,106,58,.16); --tint-accent2:rgba(239,106,58,.26); --tint-accent-soft:rgba(239,106,58,.1); --tint-accent-line:rgba(239,106,58,.3);
    --tint-blue:rgba(91,141,239,.16); --tint-blue-line:rgba(91,141,239,.32);
    color-scheme: dark;
  }
}
:root[data-theme="dark"] {
  --page:#07080b; --bg:#0e1015; --surface:#171a21; --surface2:#13161c; --card:#1c2029; --soft:#262b36; --track:#2a2f3b; --line:#2a2f3a;
  --vault:#1d212b; --vault-ink:#fff; --vault-muted:#a9abb4;
    --thumb:#3a4152; --toggle-off:#3a4152; --toast:#2b303b; --glass:rgba(14,16,21,.82);
  --ink:#f2f3f7; --ink2:#c9ccd7; --ink3:#a8adbb; --muted:#8b92a5;
  --good:#35c58b; --good-ink:#5fd6a0; --goodbg:rgba(47,182,124,.16); --good-line:rgba(47,182,124,.35);
  --bad:#ff6b70; --bad-bg:rgba(229,72,77,.16); --bad-line:rgba(229,72,77,.4);
  --warn-bg:rgba(245,165,36,.15); --warn-ink:#f5b94a;
  --tint-accent:rgba(239,106,58,.16); --tint-accent2:rgba(239,106,58,.26); --tint-accent-soft:rgba(239,106,58,.1); --tint-accent-line:rgba(239,106,58,.3);
  --tint-blue:rgba(91,141,239,.16); --tint-blue-line:rgba(91,141,239,.32);
  color-scheme: dark;
}
* { box-sizing:border-box; -webkit-tap-highlight-color:transparent; }
html { background:var(--page); }
body { margin:0; color:var(--ink); font:16px/1.45 'Inter Variable','Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif; -webkit-font-smoothing:antialiased; font-feature-settings:'cv11','ss01'; }
.shell { max-width:480px; margin:0 auto; min-height:100dvh; display:flex; flex-direction:column; background:var(--bg); position:relative; box-shadow:0 0 80px rgba(20,20,40,.1); }
main { flex:1; padding:calc(20px + env(safe-area-inset-top)) 20px 32px; overflow-x:hidden; overflow-x:clip; } /* clip keeps position:sticky working inside; browsers without it fall back to hidden */
h1 { font-size:1.5rem; margin:0; letter-spacing:-.025em; font-weight:700; } h2 { font-size:1rem; margin:0; font-weight:700; letter-spacing:-.01em; }
.muted { color:var(--muted); } .good { color:var(--good-ink); } .bad { color:var(--bad); } .sm { font-size:.8rem; }
:focus-visible { outline:2px solid var(--accent); outline-offset:2px; }

/* surfaces */
.num { font-variant-numeric:tabular-nums; }
.card { background:var(--card); border:1px solid var(--line); border-radius:22px; padding:18px; }
.card.white { background:var(--surface); box-shadow:0 1px 2px rgba(20,20,40,.04), 0 8px 24px -16px rgba(20,20,40,.14); }
.sec { display:flex; justify-content:space-between; align-items:center; margin:28px 0 12px; }
.link { display:inline-flex; align-items:center; gap:2px; background:none; border:0; color:var(--accent); font:inherit; font-size:.82rem; font-weight:600; cursor:pointer; padding:0 2px; min-height:44px; text-decoration:none; }

/* buttons */
.btn { display:flex; align-items:center; justify-content:center; gap:8px; appearance:none; border:0; border-radius:16px; padding:16px 20px; font:inherit; font-weight:600; letter-spacing:-.005em; color:#fff; background:var(--btn); cursor:pointer; width:100%; box-shadow:inset 0 1px 0 rgba(255,255,255,.35), inset 0 -2px 0 rgba(0,0,0,.08), 0 10px 22px -8px rgba(239,106,58,.75); transition:transform .18s var(--spring), box-shadow .2s, opacity .2s; position:relative; overflow:hidden; }
.btn:hover { box-shadow:inset 0 1px 0 rgba(255,255,255,.35), inset 0 -2px 0 rgba(0,0,0,.08), 0 14px 26px -8px rgba(239,106,58,.85); }
.btn:active { transform:scale(.97); }
.btn:disabled { opacity:.4; cursor:not-allowed; box-shadow:none; transform:none; }
.btn.soft { background:var(--surface); color:var(--ink); border:1px solid var(--line); box-shadow:0 1px 2px rgba(20,20,40,.05); }
.btn.sm { width:auto; min-height:44px; padding:12px 18px; border-radius:14px; font-size:.9rem; }
.icon-btn { width:34px; height:34px; border-radius:11px; border:1px solid var(--line); background:var(--surface); color:var(--muted); display:grid; place-items:center; cursor:pointer; flex:none; position:relative; transition:all .2s var(--spring); }
.icon-btn::after { content:''; position:absolute; inset:-5px; } /* 44px touch target around the 34px button */
.icon-btn:hover { color:var(--bad); border-color:#f5c4c6; background:#fff5f5; } .icon-btn:active { transform:scale(.9); }
.circ { width:42px; height:42px; border-radius:50%; background:var(--surface); border:1px solid var(--line); display:grid; place-items:center; color:var(--ink); text-decoration:none; cursor:pointer; flex:none; box-shadow:0 1px 2px rgba(20,20,40,.05); transition:transform .18s var(--spring); }
.circ:active { transform:scale(.9); }

/* inputs */
.field { width:100%; background:var(--surface); border:1.5px solid var(--line); color:var(--ink); border-radius:14px; padding:14px 16px; font:inherit; outline:none; transition:border-color .2s, box-shadow .2s; }
.field:focus { border-color:var(--accent); box-shadow:0 0 0 4px rgba(239,106,58,.12); }

/* bits */
.bar { height:8px; background:var(--track); border-radius:99px; overflow:hidden; }
.bar > i { display:block; height:100%; border-radius:99px; transform-origin:left; animation:grow .9s var(--ease) both; transition:width .5s var(--ease); }
.row { display:flex; align-items:center; gap:12px; } .grow { flex:1; min-width:0; }
.ico { border-radius:14px; display:grid; place-items:center; flex:none; }
.item { display:flex; align-items:center; gap:12px; padding:12px 0; } .item + .item { border-top:1px solid var(--line); }
.empty { text-align:center; padding:30px 20px; }
.empty .art { width:64px; height:64px; border-radius:22px; margin:0 auto 14px; display:grid; place-items:center; background:linear-gradient(145deg,var(--tint-accent),var(--tint-accent2)); color:var(--accent); animation:float 3.2s ease-in-out infinite; }
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
