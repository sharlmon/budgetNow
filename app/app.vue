<template>
  <div class="shell">
    <main><NuxtPage /></main>
    <TabBar />
    <AddSheet />
  </div>
</template>

<style>
:root {
  --page:#e8e8ec; --bg:#fff; --card:#f6f6f8; --line:#ececf0; --ink:#17181c; --muted:#8c8f9b;
  --accent:#ef6a3a; --accent2:#f7a04b; --good:#2fb67c; --goodbg:#e6f6ee; --bad:#e5484d;
  --grad: linear-gradient(160deg,#f7a352 0%,#ef6a3a 100%);
  color-scheme: light;
}
* { box-sizing:border-box; -webkit-tap-highlight-color:transparent; }
html { background:var(--page); }
body { margin:0; color:var(--ink); font:16px/1.4 'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif; -webkit-font-smoothing:antialiased; }
.shell { max-width:480px; margin:0 auto; min-height:100dvh; display:flex; flex-direction:column; background:var(--bg); position:relative; box-shadow:0 0 60px rgba(0,0,0,.08); }
main { flex:1; padding:calc(18px + env(safe-area-inset-top)) 18px 28px; }
h1 { font-size:1.45rem; margin:0; letter-spacing:-.02em; font-weight:700; }
.muted { color:var(--muted); } .good { color:var(--good); } .bad { color:var(--bad); } .sm { font-size:.8rem; }
.card { background:var(--card); border:1px solid var(--line); border-radius:20px; padding:16px; }
.card.white { background:#fff; box-shadow:0 1px 2px rgba(20,20,40,.04); }
.sec { display:flex; justify-content:space-between; align-items:center; margin:22px 0 10px; }
.sec h2 { font-size:1rem; margin:0; font-weight:700; }
.link { background:none; border:0; color:var(--accent); font:inherit; font-size:.85rem; font-weight:600; cursor:pointer; padding:0; text-decoration:none; }
.btn { appearance:none; border:0; border-radius:99px; padding:15px 18px; font:inherit; font-weight:600; color:#fff; background:var(--accent); cursor:pointer; width:100%; box-shadow:0 8px 18px -8px rgba(239,106,58,.8); }
.btn:disabled { opacity:.45; cursor:not-allowed; box-shadow:none; }
.btn.soft { background:#fff; color:var(--ink); border:1px solid var(--line); box-shadow:none; }
.icon-x { background:#fff; border:1px solid var(--line); color:var(--muted); border-radius:50%; width:28px; height:28px; cursor:pointer; flex:none; }
.field { width:100%; background:#fff; border:1px solid var(--line); color:var(--ink); border-radius:14px; padding:13px 14px; font:inherit; outline:none; }
.field:focus { border-color:var(--accent); }
.bar { height:7px; background:#ebebef; border-radius:99px; overflow:hidden; }
.bar > i { display:block; height:100%; border-radius:99px; transition:width .35s; }
.row { display:flex; align-items:center; gap:12px; } .grow { flex:1; min-width:0; }
.ico { width:42px; height:42px; border-radius:13px; display:grid; place-items:center; font-size:1.15rem; flex:none; }
.item { display:flex; align-items:center; gap:12px; padding:11px 0; } .item + .item { border-top:1px solid var(--line); }
.empty { text-align:center; padding:26px 16px; } .empty .em { font-size:2.2rem; }
.seg { display:flex; background:#ececf0; border-radius:99px; padding:4px; }
.seg button { flex:1; border:0; background:none; color:var(--muted); font:inherit; font-size:.85rem; font-weight:600; padding:9px; border-radius:99px; cursor:pointer; }
.seg button.on { background:#fff; color:var(--ink); box-shadow:0 1px 4px rgba(0,0,0,.12); }
.hdr { display:flex; align-items:center; gap:12px; margin-bottom:18px; }
.circ { width:40px; height:40px; border-radius:50%; background:#fff; border:1px solid var(--line); display:grid; place-items:center; color:var(--ink); text-decoration:none; cursor:pointer; flex:none; }
.avatar { width:42px; height:42px; border-radius:50%; background:var(--grad); color:#fff; font-weight:700; display:grid; place-items:center; text-decoration:none; flex:none; }
</style>
