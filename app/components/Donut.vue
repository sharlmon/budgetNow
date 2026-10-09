<template>
  <div class="donut" :style="{ width: size + 'px', height: size + 'px' }">
    <svg viewBox="0 0 200 200">
      <circle cx="100" cy="100" r="76" fill="none" style="stroke:var(--track)" stroke-width="14" />
      <circle v-for="(a, i) in arcs" :key="i" cx="100" cy="100" r="76" fill="none" :stroke="a.color" stroke-width="14" stroke-linecap="round"
        :stroke-dasharray="`${a.len} ${C - a.len}`" :stroke-dashoffset="-a.start" transform="rotate(-90 100 100)" class="arc" :style="{ animationDelay: i * 110 + 'ms' }" />
    </svg>
    <span v-for="(a, i) in arcs" v-show="a.frac >= 0.06" :key="'b' + i" class="bubble" :style="{ left: a.x + '%', top: a.y + '%', animationDelay: 500 + i * 110 + 'ms' }">{{ Math.round(a.frac * 100) }}%</span>
    <div class="center"><slot /></div>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{ segments: { value: number; color: string }[]; size?: number }>(), { size: 220 })
const R = 76
const C = 2 * Math.PI * R
const arcs = computed(() => {
  const total = props.segments.reduce((s, x) => s + x.value, 0)
  if (total <= 0) return []
  let acc = 0
  return props.segments.filter(s => s.value > 0).map((s) => {
    const frac = s.value / total
    const len = Math.max(0.1, frac * C - 22)
    const start = acc + 11
    const mid = ((acc + frac * C / 2) / C) * Math.PI * 2 - Math.PI / 2
    acc += frac * C
    return { color: s.color, frac, len, start, x: ((100 + R * Math.cos(mid)) / 200) * 100, y: ((100 + R * Math.sin(mid)) / 200) * 100 }
  })
})
</script>

<style scoped>
.arc { animation:draw .9s var(--ease) both; }
@keyframes draw { from { stroke-dasharray:0 480; opacity:.4; } }
@keyframes pin { from { opacity:0; transform:translate(-50%,-50%) scale(.4); } }
.donut { position:relative; margin:0 auto; }
svg { width:100%; height:100%; }
.center { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; }
.bubble { position:absolute; transform:translate(-50%,-50%); background:var(--surface); border-radius:99px; padding:2px 6px; font-size:.65rem; font-weight:700; box-shadow:0 2px 8px rgba(0,0,0,.18); animation:pin .4s var(--spring) both; }
</style>
