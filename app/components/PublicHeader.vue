<template>
  <header class="ph">
    <div class="in">
      <NuxtLink to="/" class="brand" aria-label="BudgetNow home"><img :src="icon" alt="" width="34" height="34" /><span>BudgetNow</span></NuxtLink>
      <nav class="links" aria-label="Main">
        <NuxtLink to="/#how">How it works</NuxtLink>
        <NuxtLink to="/#faq">FAQ</NuxtLink>
        <NuxtLink to="/guides/50-30-20-rule">50/30/20 guide</NuxtLink>
      </nav>
      <div class="cta">
        <ClientOnly>
          <NuxtLink v-if="auth.isSignedIn.value" to="/home" class="btn sm">Open app</NuxtLink>
          <template v-else>
            <NuxtLink to="/sign-in" class="signin">Sign in</NuxtLink>
            <NuxtLink to="/sign-up" class="btn sm">Get started</NuxtLink>
          </template>
          <template #fallback>
            <NuxtLink to="/sign-in" class="signin">Sign in</NuxtLink>
            <NuxtLink to="/sign-up" class="btn sm">Get started</NuxtLink>
          </template>
        </ClientOnly>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
const icon = `${useRuntimeConfig().app.baseURL}icons/icon-192.png`
const auth = useAppAuth()
</script>

<style scoped>
.ph { position:sticky; top:0; z-index:20; background:rgba(255,255,255,.86); backdrop-filter:blur(16px) saturate(1.5); -webkit-backdrop-filter:blur(16px) saturate(1.5); border-bottom:1px solid var(--line); }
.in { max-width:1080px; margin:0 auto; padding:10px 20px; display:flex; align-items:center; gap:20px; }
.brand { display:flex; align-items:center; gap:10px; font-weight:700; letter-spacing:-.02em; color:var(--ink); text-decoration:none; }
.brand img { border-radius:10px; }
.links { display:none; gap:22px; margin-left:12px; flex:1; }
.links a { color:var(--muted); text-decoration:none; font-size:.9rem; font-weight:500; } .links a:hover { color:var(--ink); }
.cta { display:flex; align-items:center; gap:14px; margin-left:auto; }
.signin { color:var(--ink); font-weight:600; font-size:.9rem; text-decoration:none; }
.btn { text-decoration:none; }
@media (min-width:820px) { .links { display:flex; } }
</style>
