<template>
  <div class="seg" :class="variant" :style="{ '--n': options.length, '--i': index }" role="tablist">
    <i class="thumb" />
    <button v-for="o in options" :key="o.value" role="tab" :aria-selected="o.value === modelValue" :class="{ on: o.value === modelValue }" @click="$emit('update:modelValue', o.value)">{{ o.label }}</button>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{ modelValue: string; options: { value: string; label: string }[]; variant?: 'light' | 'glass' }>(), { variant: 'light' })
defineEmits<{ 'update:modelValue': [string] }>()
const index = computed(() => Math.max(0, props.options.findIndex(o => o.value === props.modelValue)))
</script>

<style scoped>
.seg { position:relative; display:grid; grid-template-columns:repeat(var(--n),1fr); background:#ececf1; border-radius:99px; padding:4px; }
.thumb { position:absolute; top:4px; bottom:4px; left:4px; width:calc((100% - 8px) / var(--n)); border-radius:99px; background:#fff; box-shadow:0 2px 8px rgba(20,20,40,.12); transform:translateX(calc(var(--i) * 100%)); transition:transform .35s cubic-bezier(.3,1.3,.5,1); }
button { position:relative; z-index:1; background:none; border:0; font:inherit; font-size:.85rem; font-weight:600; padding:10px 8px; border-radius:99px; cursor:pointer; color:var(--muted); transition:color .25s; }
button.on { color:var(--ink); }
.glass { background:rgba(255,255,255,.22); }
.glass button { color:rgba(255,255,255,.9); } .glass button.on { color:var(--ink); }
</style>
