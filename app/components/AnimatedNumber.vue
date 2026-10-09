<template><span class="num">{{ text }}</span></template>

<script setup lang="ts">
const props = defineProps<{ value: number }>()
const shown = ref(0)
const text = computed(() => money(shown.value))
let raf = 0
function tween(to: number) {
  cancelAnimationFrame(raf)
  if (!import.meta.client || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { shown.value = to; return }
  const from = shown.value, t0 = performance.now(), dur = 800
  const step = (t: number) => {
    const p = Math.min(1, (t - t0) / dur)
    shown.value = from + (to - from) * (1 - Math.pow(1 - p, 4))
    if (p < 1) raf = requestAnimationFrame(step); else shown.value = to
  }
  raf = requestAnimationFrame(step)
}
onMounted(() => tween(props.value))
watch(() => props.value, tween)
onBeforeUnmount(() => cancelAnimationFrame(raf))
</script>

<style scoped>
.num { font-variant-numeric:tabular-nums; }
</style>
