<template>
  <span class="ico" :style="{ background: `linear-gradient(145deg, ${color}2e, ${color}14)`, color, width: box + 'px', height: box + 'px' }">
    <Icon :name="name" :size="Math.round(box * .5)" :stroke="2" />
  </span>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{ cat?: Category; income?: boolean; size?: number }>(), { size: 44 })
const box = computed(() => props.size)
const meta = computed(() => (props.cat ? catMeta(props.cat) : null))
const color = computed(() => meta.value?.color ?? '#2fb67c')
const name = computed(() => meta.value?.icon ?? 'in')
</script>
