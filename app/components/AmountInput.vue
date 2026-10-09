<template>
  <input :value="text" inputmode="decimal" :placeholder="placeholder ?? '0'" :class="big ? 'amt-big' : 'field'" @input="onInput" />
</template>

<script setup lang="ts">
const props = defineProps<{ modelValue: number; big?: boolean; placeholder?: string }>()
const emit = defineEmits<{ 'update:modelValue': [number] }>()
const parse = (s: string) => { const n = parseFloat(s); return Number.isFinite(n) ? n : 0 }
const text = ref(props.modelValue ? String(props.modelValue) : '')
watch(() => props.modelValue, (v) => { if (parse(text.value) !== v) text.value = v ? String(v) : '' })
function onInput(e: Event) {
  const el = e.target as HTMLInputElement
  const clean = el.value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1')
  text.value = clean
  el.value = clean
  emit('update:modelValue', parse(clean))
}
</script>

<style scoped>
.amt-big { width:100%; background:none; border:0; outline:none; color:var(--ink); font:700 3rem/1.1 inherit; font-family:inherit; text-align:center; letter-spacing:-.03em; padding:6px 0; }
.amt-big::placeholder { color:var(--line); }
</style>
