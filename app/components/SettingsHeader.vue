<template>
  <div class="hdr rise">
    <NuxtLink :to="back" class="circ" :aria-label="back === '/home' ? 'Back to home' : 'Back to settings'"><Icon name="back" :size="22" /></NuxtLink>
    <h1>{{ title }}</h1>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ title: string; back?: string }>(), { back: '/settings' })
</script>
