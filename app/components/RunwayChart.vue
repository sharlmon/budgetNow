<template>
  <svg class="rc" :viewBox="`0 0 ${W} ${H}`" role="img" :aria-label="label">
    <rect v-if="below" :x="PX" :y="zeroY" :width="W - PX * 2" :height="H - PY - zeroY" class="neg" />
    <line :x1="PX" :x2="W - PX" :y1="zeroY" :y2="zeroY" class="zero" />
    <path :d="area" class="fill" />
    <path :d="line" class="line" />
    <circle v-for="p in dots" :key="p.i" :cx="p.x" :cy="p.y" r="3.5" :class="['dot', { bad: p.v < 0 }]" />
    <text :x="PX" :y="H - 2" class="tick">Today</text>
    <text :x="W - PX" :y="H - 2" class="tick" text-anchor="end">{{ endLabel }}</text>
  </svg>
</template>

<script setup lang="ts">
// The money you hold, stepping down as each bill comes due. The dashed line is zero; anything under it is shortfall.
const props = defineProps<{ series: { day: number; balance: number }[]; days: number; endLabel: string; label: string }>()
const W = 320, H = 130, PX = 8, PY = 14
const hi = computed(() => Math.max(1, ...props.series.map(s => s.balance)) * 1.08)
const lo = computed(() => Math.min(0, ...props.series.map(s => s.balance)) * 1.15)
const x = (d: number) => PX + (Math.min(d, props.days) / Math.max(1, props.days)) * (W - PX * 2)
const y = (v: number) => PY + (1 - (v - lo.value) / Math.max(1, hi.value - lo.value)) * (H - PY * 2 - 8)
const zeroY = computed(() => y(0))
const below = computed(() => lo.value < 0)
// A step line: hold the balance flat until the next bill, then drop.
const steps = computed(() => {
  const pts: [number, number][] = []
  props.series.forEach((s, i) => {
    if (i > 0) pts.push([x(s.day), y(props.series[i - 1]!.balance)])
    pts.push([x(s.day), y(s.balance)])
  })
  const last = props.series[props.series.length - 1]
  if (last) pts.push([x(props.days), y(last.balance)])
  return pts
})
const line = computed(() => steps.value.map(([a, b], i) => `${i ? 'L' : 'M'}${a.toFixed(1)} ${b.toFixed(1)}`).join(''))
const area = computed(() => (steps.value.length ? `${line.value} L${x(props.days).toFixed(1)} ${zeroY.value.toFixed(1)} L${steps.value[0]![0].toFixed(1)} ${zeroY.value.toFixed(1)}Z` : ''))
const dots = computed(() => props.series.slice(1).map((s, i) => ({ i, x: x(s.day), y: y(s.balance), v: s.balance })))
</script>

<style scoped>
.rc { width:100%; height:auto; display:block; }
.line { fill:none; stroke:var(--accent); stroke-width:2.5; stroke-linejoin:round; stroke-linecap:round; }
.fill { fill:var(--accent); opacity:.12; }
.zero { stroke:var(--muted); stroke-width:1; stroke-dasharray:4 4; opacity:.7; }
.neg { fill:var(--bad); opacity:.12; }
.dot { fill:var(--surface); stroke:var(--accent); stroke-width:2; }
.dot.bad { stroke:var(--bad); fill:var(--bad-bg); }
.tick { fill:var(--muted); font-size:10px; font-weight:600; }
</style>
