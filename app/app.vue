<template>
  <div class="wrap">
    <header>
      <h1>BudgetNow</h1>
      <p class="muted">Money in → instant breakdown → track every spend and debt.</p>
    </header>
    <NuxtPage />
  </div>
</template>

<style>
:root { --bg:#f6f7fb; --card:#fff; --ink:#1c2230; --muted:#6b7385; --line:#e3e6ee; --accent:#3b6cf6; --bad:#d64545; --good:#1f9d63; }
@media (prefers-color-scheme: dark) {
  :root { --bg:#12151c; --card:#1b2029; --ink:#e8ebf2; --muted:#9099ad; --line:#2a303c; --accent:#6d93ff; --bad:#ff7b7b; --good:#4cc78e; }
}
* { box-sizing: border-box; }
body { margin:0; background:var(--bg); color:var(--ink); font:16px/1.45 system-ui,-apple-system,Segoe UI,sans-serif; }
.wrap { max-width: 920px; margin: 0 auto; padding: 24px 16px 64px; }
h1 { margin:0; font-size:1.6rem; } h2 { margin:0 0 12px; font-size:1.1rem; }
.muted { color:var(--muted); margin:4px 0 0; }
.grid { display:grid; gap:16px; grid-template-columns: repeat(auto-fit,minmax(280px,1fr)); margin-top:16px; }
.card { background:var(--card); border:1px solid var(--line); border-radius:12px; padding:16px; }
.full { grid-column: 1 / -1; }
input, select, button { font:inherit; color:inherit; padding:8px 10px; border-radius:8px; border:1px solid var(--line); background:var(--bg); }
input, select { width:100%; }
button { cursor:pointer; background:var(--accent); color:#fff; border:0; font-weight:600; }
button.ghost { background:transparent; color:var(--muted); border:1px solid var(--line); font-weight:400; padding:4px 8px; }
button:disabled { opacity:.45; cursor:not-allowed; }
.row { display:flex; gap:8px; align-items:center; margin-bottom:8px; }
.row > * { flex:1; } .row > .fit { flex:0 0 auto; }
.list { list-style:none; margin:0; padding:0; }
.list li { display:flex; justify-content:space-between; gap:8px; align-items:center; padding:8px 0; border-top:1px solid var(--line); }
.bar { height:8px; background:var(--line); border-radius:99px; overflow:hidden; margin-top:4px; }
.bar > i { display:block; height:100%; background:var(--accent); }
.bad { color:var(--bad); } .good { color:var(--good); }
.stack { display:flex; height:14px; border-radius:99px; overflow:hidden; margin:10px 0; }
</style>
