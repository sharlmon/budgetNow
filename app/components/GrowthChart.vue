<template>
  <svg class="chart" :viewBox="`0 0 ${W} ${H}`" role="img" :aria-label="label">
    <path :d="`${line(balances)} L${x(balances.length - 1)} ${H - PAD} L${x(0)} ${H - PAD}Z`" fill="var(--accent)" opacity=".16" />
    <path :d="line(put)" fill="none" stroke="var(--muted)" stroke-width="2" stroke-dasharray="4 4" stroke-linecap="round" />
    <path :d="line(balances)" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
    <circle :cx="x(balances.length - 1)" :cy="y(balances[balances.length - 1] ?? 0)" r="4" fill="var(--accent)" />
  </svg>
</template>

<script setup lang="ts">
// Balance over time (solid) against what was put in (dashed). Both lines share one scale, starting from zero.
const props = defineProps<{ balances: number[]; put: number[]; label: string }>()
const W = 300, H = 120, PAD = 8
const top = computed(() => Math.max(1, ...props.balances, ...props.put) * 1.06)
const x = (i: number) => PAD + (i / Math.max(1, props.balances.length - 1)) * (W - PAD * 2)
const y = (v: number) => H - PAD - (v / top.value) * (H - PAD * 2)
const line = (a: number[]) => a.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join('')
</script>

<style scoped>
.chart { width:100%; height:auto; display:block; }
</style>
