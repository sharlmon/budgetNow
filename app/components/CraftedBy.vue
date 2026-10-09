<template>
  <p class="crafted">Crafted by <a :href="SITE.makerUrl" target="_blank" rel="noopener">{{ SITE.maker }}</a></p>
</template>

<script setup lang="ts">
import { SITE } from '#shared/site'
</script>

<style scoped>
.crafted { margin:0; font-size:.8rem; color:var(--muted); text-align:center; }
.crafted a { color:var(--accent); font-weight:600; text-decoration:none; }
.crafted a:hover { text-decoration:underline; }
</style>
