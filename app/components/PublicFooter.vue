<template>
  <footer class="pf">
    <div class="in">
      <div class="col about">
        <strong>BudgetNow</strong>
        <p>{{ SITE.tagline }}</p>
      </div>
      <nav class="col" aria-label="Product">
        <h2>Product</h2>
        <NuxtLink to="/#how">How it works</NuxtLink>
        <NuxtLink to="/#faq">FAQ</NuxtLink>
        <NuxtLink to="/guides/50-30-20-rule">50/30/20 guide</NuxtLink>
        <NuxtLink to="/sign-up">Create an account</NuxtLink>
      </nav>
      <nav class="col" aria-label="Legal">
        <h2>Legal</h2>
        <NuxtLink to="/privacy">Privacy Policy</NuxtLink>
        <NuxtLink to="/terms">Terms of Service</NuxtLink>
      </nav>
    </div>
    <div class="base">
      <span>© {{ year }} BudgetNow</span>
      <span class="dot">·</span>
      <CraftedBy />
    </div>
  </footer>
</template>

<script setup lang="ts">
import { SITE } from '#shared/site'
const year = new Date().getFullYear()
</script>

<style scoped>
.pf { border-top:1px solid var(--line); background:#fafafc; margin-top:64px; }
.in { max-width:1080px; margin:0 auto; padding:36px 20px 8px; display:grid; gap:28px; grid-template-columns:1fr; }
.col { display:flex; flex-direction:column; gap:10px; }
.col h2 { font-size:.75rem; text-transform:uppercase; letter-spacing:.08em; color:var(--muted); margin:0 0 2px; }
.col a { color:var(--ink); text-decoration:none; font-size:.92rem; } .col a:hover { color:var(--accent); }
.about p { margin:4px 0 0; color:var(--muted); font-size:.9rem; max-width:34ch; }
.base { max-width:1080px; margin:0 auto; padding:18px 20px 32px; display:flex; flex-wrap:wrap; gap:8px; align-items:center; justify-content:center; color:var(--muted); font-size:.8rem; }
@media (min-width:720px) { .in { grid-template-columns:2fr 1fr 1fr; } .base { justify-content:flex-start; } }
</style>
