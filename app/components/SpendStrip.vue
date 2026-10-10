<template>
  <div class="strip" role="group" aria-label="Spending by day">
    <button v-for="b in bars" :key="b.date" class="col" :class="{ sel: selected === b.date, today: b.date === todayDate }" :aria-pressed="selected === b.date" :aria-label="label(b)" @click="$emit('pick', selected === b.date ? '' : b.date)">
      <i :style="{ height: height(b.expense) }" :class="{ none: !b.expense }" />
      <em v-if="b.income" class="in" aria-hidden="true" />
    </button>
  </div>
  <div class="axis" aria-hidden="true"><span>1</span><span>{{ Math.ceil(bars.length / 2) }}</span><span>{{ bars.length }}</span></div>
</template>

<script setup lang="ts">
import type { Bar } from '../utils/activity'
const props = defineProps<{ bars: Bar[]; max: number; selected: string }>()
defineEmits<{ pick: [string] }>()
const todayDate = today()
const height = (v: number) => (v > 0 ? `${Math.max(8, Math.round((v / Math.max(1, props.max)) * 100))}%` : '3px')
const nice = (d: string) => new Date(d + 'T00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
const label = (b: Bar) => `${nice(b.date)}: ${b.expense ? `spent ${money(b.expense)}` : 'nothing spent'}${b.income ? `, money in ${money(b.income)}` : ''}`
</script>

<style scoped>
.strip { display:flex; align-items:flex-end; gap:2px; height:64px; margin-top:14px; }
.col { flex:1; min-width:0; height:100%; padding:0; border:0; background:none; display:flex; flex-direction:column; justify-content:flex-end; align-items:center; gap:3px; cursor:pointer; position:relative; border-radius:4px; }
.col i { width:100%; max-width:12px; border-radius:3px 3px 1px 1px; background:var(--tint-accent2); transition:height .4s var(--ease), background .2s; }
.col i.none { background:var(--line); }
.col.today i { background:var(--accent); opacity:.55; } .col.today i.none { background:var(--accent); opacity:.35; }
.col.sel i { background:var(--accent); opacity:1; } .col.sel { background:var(--tint-accent-soft); }
.col:hover i:not(.none) { background:var(--accent); }
.in { position:absolute; top:0; width:6px; height:6px; border-radius:50%; background:var(--good); }
.axis { display:flex; justify-content:space-between; margin-top:4px; font-size:.7rem; color:var(--muted); font-weight:600; }
@media (prefers-reduced-motion: reduce) { .col i { transition:none; } }
</style>
