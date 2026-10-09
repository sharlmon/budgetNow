<template>
  <div class="ringw" :style="{ width: size + 'px', height: size + 'px' }">
    <svg :viewBox="`0 0 ${size} ${size}`">
      <circle :cx="size / 2" :cy="size / 2" :r="r" fill="none" style="stroke:var(--track)" :stroke-width="stroke" />
      <circle :cx="size / 2" :cy="size / 2" :r="r" fill="none" :stroke="color" :stroke-width="stroke" stroke-linecap="round" :transform="`rotate(-90 ${size / 2} ${size / 2})`"
        :stroke-dasharray="`${Math.min(1, Math.max(0, pct)) * C} ${C}`" class="arc" :style="{ '--C': C }" />
    </svg>
    <div class="mid"><slot /></div>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{ pct: number; color: string; size?: number; stroke?: number }>(), { size: 64, stroke: 7 })
const r = computed(() => (props.size - props.stroke) / 2)
const C = computed(() => 2 * Math.PI * r.value)
</script>

<style scoped>
.ringw { position:relative; flex:none; }
svg { width:100%; height:100%; }
.arc { animation:fill 1s var(--ease) both; transition:stroke-dasharray .6s var(--ease); }
@keyframes fill { from { stroke-dasharray:0 var(--C); } }
.mid { position:absolute; inset:0; display:grid; place-items:center; }
</style>
