<template>
  <div class="shell authshell">
    <main class="authmain">
      <div class="brand rise">
        <img :src="icon" alt="" width="64" height="64" class="logo" />
        <h1>Weka</h1>
        <p class="muted">Split every pay instantly. Know what's safe to spend.</p>
      </div>
      <div class="rise" style="--i:2"><slot /></div>
      <footer class="afoot">
        <nav aria-label="Legal"><NuxtLink to="/privacy">Privacy</NuxtLink><span>·</span><NuxtLink to="/terms">Terms</NuxtLink><span>·</span><NuxtLink to="/">Home</NuxtLink></nav>
        <CraftedBy />
      </footer>
    </main>
    <Toast />
  </div>
</template>

<script setup lang="ts">
// Private screens must never show up in search results.
useSeoMeta({ robots: 'noindex, nofollow' })
const icon = `${useRuntimeConfig().app.baseURL}icons/icon-192.png`
</script>

<style>
.authshell { background:linear-gradient(180deg,var(--tint-accent-soft) 0%, var(--bg) 40%); }
.authmain { display:flex; flex-direction:column; justify-content:center; gap:22px; padding-top:32px; }
.afoot { display:flex; flex-direction:column; gap:8px; align-items:center; margin-top:6px; }
.afoot nav { display:flex; gap:10px; font-size:.82rem; color:var(--muted); } .afoot nav a { color:var(--muted); }
.brand { text-align:center; }
.brand p { margin:6px 0 0; }
.logo { border-radius:18px; box-shadow:0 14px 28px -12px rgba(239,106,58,.8); margin-bottom:14px; }
.authmain .cl-rootBox, .authmain .cl-cardBox { width:100%; }
.authmain .cl-card { box-shadow:0 1px 2px rgba(20,20,40,.04), 0 18px 40px -22px rgba(20,20,40,.25); border:1px solid var(--line); }
</style>
