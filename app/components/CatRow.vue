<template>
  <div class="catrow" :class="{ flat }">
    <CatIcon :cat="c.key" />
    <div class="grow">
      <div class="row" style="justify-content:space-between"><strong>{{ c.label }}</strong><strong><AnimatedNumber :value="spent" /></strong></div>
      <div class="bar" style="margin:8px 0 6px"><i :style="{ width: fill + '%', background: over ? 'var(--bad)' : c.color }" /></div>
      <div class="row sm" style="justify-content:space-between"><span :style="{ color: over ? 'var(--bad)' : 'var(--ink2)', fontWeight: 700 }">{{ Math.round(fill) }}%</span><span class="muted">of {{ money(budgeted) }}</span></div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ c: typeof CATEGORIES[number]; budgeted: number; spent: number; /** Drops the card styling so rows can sit inside another card. */ flat?: boolean }>()
const over = computed(() => props.spent > props.budgeted)
const fill = computed(() => (props.budgeted > 0 ? Math.min(100, (props.spent / props.budgeted) * 100) : props.spent > 0 ? 100 : 0))
</script>

<style scoped>
.catrow { display:flex; gap:14px; align-items:center; background:var(--surface); border:1px solid var(--line); border-radius:20px; padding:14px; margin-bottom:10px; box-shadow:0 1px 2px rgba(20,20,40,.03); transition:transform .25s var(--spring), box-shadow .25s; }
.catrow:active { transform:scale(.985); }
.catrow.flat { background:none; border:0; border-radius:0; box-shadow:none; margin:0; padding:14px 0; }
.catrow.flat + .catrow.flat { border-top:1px solid var(--line); }
.catrow.flat:active { transform:none; }
</style>
