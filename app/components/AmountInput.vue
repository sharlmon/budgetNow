<template>
  <input :value="text" inputmode="decimal" :placeholder="placeholder ?? '0'" class="field" @input="onInput" />
</template>

<script setup lang="ts">
const props = defineProps<{ modelValue: number; placeholder?: string }>()
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
