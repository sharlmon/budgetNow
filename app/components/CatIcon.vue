<template>
  <span class="ico" :style="{ background: `linear-gradient(145deg, ${color}2e, ${color}14)`, color, width: box + 'px', height: box + 'px' }">
    <Icon :name="name" :size="Math.round(box * .5)" :stroke="2" />
  </span>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{ cat?: Category; icon?: string; color?: string; size?: number }>(), { size: 44 })
const box = computed(() => props.size)
const meta = computed(() => (props.cat ? catMeta(props.cat) : null))
const color = computed(() => props.color ?? meta.value?.color ?? '#2fb67c')
const name = computed(() => props.icon ?? meta.value?.icon ?? 'in')
</script>
