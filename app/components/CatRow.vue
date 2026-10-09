<template>
  <div class="catrow">
    <span class="ico" :style="{ background: c.color + '22' }">{{ c.emoji }}</span>
    <div class="grow">
      <div class="row" style="justify-content:space-between"><strong>{{ c.label }}</strong><strong>{{ money(spent) }}</strong></div>
      <div class="bar" style="margin:7px 0 5px"><i :style="{ width: fill + '%', background: over ? 'var(--bad)' : c.color }" /></div>
      <div class="row sm" style="justify-content:space-between"><span :style="{ color: over ? 'var(--bad)' : c.color, fontWeight: 600 }">{{ Math.round(fill) }}%</span><span class="muted">of {{ money(budgeted) }}</span></div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ c: typeof CATEGORIES[number]; budgeted: number; spent: number }>()
const over = computed(() => props.spent > props.budgeted)
const fill = computed(() => (props.budgeted > 0 ? Math.min(100, (props.spent / props.budgeted) * 100) : props.spent > 0 ? 100 : 0))
</script>

<style scoped>
.catrow { display:flex; gap:12px; align-items:center; background:#fff; border:1px solid var(--line); border-radius:18px; padding:12px; margin-bottom:10px; }
</style>
