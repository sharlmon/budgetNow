<template>
  <svg class="pc" :viewBox="`0 0 ${W} ${H}`" role="img" :aria-label="label">
    <line :x1="PX" :x2="W - PX" :y1="yBudget" :y2="yBudget" class="cap" />
    <text :x="W - PX" :y="yBudget - 4" class="cap-t" text-anchor="end">Budget</text>
    <line :x1="x(ideal[0]!.day)" :y1="y(ideal[0]!.value)" :x2="x(ideal[1]!.day)" :y2="y(ideal[1]!.value)" class="even" />
    <path v-if="actual.length > 1" :d="area" class="fill" />
    <path v-if="actual.length > 1" :d="line" class="line" />
    <circle v-if="last" :cx="x(last.day)" :cy="y(last.value)" r="4.5" class="now" />
    <text :x="PX" :y="H - 2" class="tick">1</text>
    <text :x="W - PX" :y="H - 2" class="tick" text-anchor="end">{{ days }}</text>
  </svg>
</template>

<script setup lang="ts">
// Your spending, adding up day by day (solid), against the straight line an even pace would follow (dashed) and the budget (top line).
const props = defineProps<{ actual: { day: number; value: number }[]; ideal: { day: number; value: number }[]; days: number; budget: number; label: string }>()
const W = 320, H = 140, PX = 8, PY = 18
const top = computed(() => Math.max(1, props.budget, ...props.actual.map(a => a.value)) * 1.06)
const x = (d: number) => PX + (d / Math.max(1, props.days)) * (W - PX * 2)
const y = (v: number) => H - PY - (v / top.value) * (H - PY * 2)
const yBudget = computed(() => y(props.budget))
const last = computed(() => props.actual[props.actual.length - 1])
const line = computed(() => props.actual.map((p, i) => `${i ? 'L' : 'M'}${x(p.day).toFixed(1)} ${y(p.value).toFixed(1)}`).join(''))
const area = computed(() => (last.value ? `${line.value} L${x(last.value.day).toFixed(1)} ${y(0).toFixed(1)} L${x(0).toFixed(1)} ${y(0).toFixed(1)}Z` : ''))
</script>

<style scoped>
.pc { width:100%; height:auto; display:block; }
.cap { stroke:var(--muted); stroke-width:1; opacity:.55; }
.cap-t { fill:var(--muted); font-size:10px; font-weight:600; }
.even { stroke:var(--muted); stroke-width:1.5; stroke-dasharray:5 5; opacity:.8; }
.line { fill:none; stroke:var(--accent); stroke-width:2.6; stroke-linejoin:round; stroke-linecap:round; }
.fill { fill:var(--accent); opacity:.12; }
.now { fill:var(--surface); stroke:var(--accent); stroke-width:2.5; }
.tick { fill:var(--muted); font-size:10px; font-weight:600; }
</style>
