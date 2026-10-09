<template>
  <div class="card white theme">
    <div class="row">
      <span class="ic"><Icon :name="activeTheme === 'dark' ? 'moon' : 'sun'" :size="20" /></span>
      <div class="grow"><h2>Appearance</h2><div class="muted sm">{{ note }}</div></div>
    </div>
    <Seg :model-value="themeChoice" :options="[{ value: 'system', label: 'System' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]" class="seg" @update:model-value="v => setTheme(v as ThemeChoice)" />
  </div>
</template>

<script setup lang="ts">
import type { ThemeChoice } from '../utils/theme'
const note = computed(() => (themeChoice.value === 'system' ? `Following your device (${activeTheme.value} right now)` : `${themeChoice.value === 'dark' ? 'Dark' : 'Light'} on this device`))
</script>

<style scoped>
.theme { margin-bottom:12px; display:flex; flex-direction:column; gap:14px; }
.ic { width:42px; height:42px; border-radius:14px; background:var(--tint-blue); color:var(--tint-blue-ink, #5b8def); display:grid; place-items:center; flex:none; }
</style>
