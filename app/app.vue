<template>
  <div class="shell">
    <main><NuxtPage /></main>
    <TabBar />
    <AddSheet />
  </div>
</template>

<style>
:root {
  --bg:#0c0f16; --surface:#151a24; --surface2:#1c2230; --line:#262d3d; --ink:#f2f4f9; --muted:#8b94a8;
  --accent:#7c5cff; --accent2:#4d8dff; --good:#35d399; --bad:#ff6b81;
  --hero: linear-gradient(135deg,#7c5cff 0%,#4d8dff 100%);
}
@media (prefers-color-scheme: light) {
  :root { --bg:#eef0f6; --surface:#fff; --surface2:#f3f4f9; --line:#e2e5ee; --ink:#161a26; --muted:#6d7589; }
}
* { box-sizing:border-box; -webkit-tap-highlight-color:transparent; }
html { background:var(--bg); }
body { margin:0; background:var(--bg); color:var(--ink); font:16px/1.4 -apple-system,BlinkMacSystemFont,'Inter','Segoe UI',system-ui,sans-serif; }
.shell { max-width:480px; margin:0 auto; min-height:100dvh; display:flex; flex-direction:column; background:var(--bg); position:relative; }
@media (min-width:520px) { .shell { border-left:1px solid var(--line); border-right:1px solid var(--line); } }
main { flex:1; padding:20px 16px 24px; }
h1 { font-size:1.5rem; margin:0; letter-spacing:-.02em; } h2 { font-size:1rem; margin:0; }
.muted { color:var(--muted); } .good { color:var(--good); } .bad { color:var(--bad); }
.sec { display:flex; justify-content:space-between; align-items:baseline; margin:22px 2px 10px; }
.sec h2 { font-size:.8rem; text-transform:uppercase; letter-spacing:.08em; color:var(--muted); font-weight:600; }
.card { background:var(--surface); border:1px solid var(--line); border-radius:18px; padding:14px 16px; }
.hero { background:var(--hero); color:#fff; border-radius:24px; padding:20px; box-shadow:0 12px 32px -12px rgba(100,90,255,.6); }
.hero small { opacity:.8; }
.big { font-size:2.4rem; font-weight:700; letter-spacing:-.03em; line-height:1.1; }
.btn { appearance:none; border:0; border-radius:14px; padding:14px 18px; font:inherit; font-weight:600; color:#fff; background:var(--hero); cursor:pointer; width:100%; }
.btn:disabled { opacity:.4; cursor:not-allowed; }
.btn.soft { background:var(--surface2); color:var(--ink); }
.link { background:none; border:0; color:var(--accent2); font:inherit; font-weight:600; cursor:pointer; padding:0; }
.icon-x { background:var(--surface2); border:0; color:var(--muted); border-radius:50%; width:28px; height:28px; cursor:pointer; }
.field { width:100%; background:var(--surface2); border:1px solid transparent; color:var(--ink); border-radius:14px; padding:13px 14px; font:inherit; outline:none; }
.field:focus { border-color:var(--accent); }
.bar { height:6px; background:var(--surface2); border-radius:99px; overflow:hidden; }
.bar > i { display:block; height:100%; border-radius:99px; transition:width .3s; }
.row { display:flex; align-items:center; gap:12px; }
.grow { flex:1; min-width:0; }
.ico { width:42px; height:42px; border-radius:13px; display:grid; place-items:center; font-size:1.2rem; flex:none; }
.item { display:flex; align-items:center; gap:12px; padding:10px 0; }
.item + .item { border-top:1px solid var(--line); }
.empty { text-align:center; padding:28px 16px; }
.empty .em { font-size:2.4rem; }
.seg { display:flex; background:var(--surface2); border-radius:12px; padding:3px; }
.seg button { flex:1; border:0; background:none; color:var(--muted); font:inherit; font-weight:600; padding:8px; border-radius:10px; cursor:pointer; }
.seg button.on { background:var(--surface); color:var(--ink); box-shadow:0 1px 4px rgba(0,0,0,.25); }
</style>
