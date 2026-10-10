<template>
  <div>
    <SettingsHeader title="About" />
    <AboutCard />
    <nav class="legal" aria-label="Legal"><NuxtLink to="/privacy">Privacy Policy</NuxtLink><span>·</span><NuxtLink to="/terms">Terms</NuxtLink></nav>
    <CraftedBy style="margin-top:10px" />
  </div>
</template>

<script setup lang="ts">
useSeoMeta({ title: 'About Weka' })
</script>

<style scoped>
.legal { display:flex; justify-content:center; gap:10px; font-size:.82rem; color:var(--muted); margin-top:6px; }
.legal a { color:var(--muted); padding:12px 6px; }
</style>
