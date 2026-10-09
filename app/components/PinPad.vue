<template>
  <div class="pad" :class="{ shake: shaking }">
    <div class="dots" role="status" :aria-label="`${digits.length} of ${length} digits entered`">
      <i v-for="n in length" :key="n" :class="{ on: n <= digits.length }" />
    </div>
    <div class="keys">
      <button v-for="k in keys" :key="k" :disabled="disabled" :aria-label="k === 'back' ? 'Delete' : k" @click="press(k)">
        <Icon v-if="k === 'back'" name="backspace" :size="26" :stroke="1.8" />
        <template v-else>{{ k }}</template>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{ length?: number; disabled?: boolean }>(), { length: 4 })
const emit = defineEmits<{ complete: [pin: string] }>()
const digits = ref('')
const shaking = ref(false)
const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'back']

function press(k: string) {
  if (props.disabled || k === '') return
  if (import.meta.client) navigator.vibrate?.(6)
  if (k === 'back') { digits.value = digits.value.slice(0, -1); return }
  if (digits.value.length >= props.length) return
  digits.value += k
  if (digits.value.length === props.length) emit('complete', digits.value)
}

// Keyboard support for desktop.
function onKey(e: KeyboardEvent) {
  if (/^\d$/.test(e.key)) press(e.key)
  else if (e.key === 'Backspace') press('back')
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
watch(() => props.length, () => { digits.value = '' })

defineExpose({
  reset() { digits.value = '' },
  fail() { shaking.value = true; setTimeout(() => { shaking.value = false; digits.value = '' }, 450) },
})
</script>

<style scoped>
.pad { width:100%; max-width:320px; margin:0 auto; }
.dots { display:flex; justify-content:center; gap:16px; margin:6px 0 28px; }
.dots i { width:15px; height:15px; border-radius:50%; border:2px solid #d9d9e1; transition:all .2s var(--spring); }
.dots i.on { background:var(--accent); border-color:var(--accent); transform:scale(1.15); }
.keys { display:grid; grid-template-columns:repeat(3,1fr); gap:10px 14px; }
.keys button { height:68px; border-radius:50%; border:0; background:#f3f3f7; font:inherit; font-size:1.7rem; font-weight:500; color:var(--ink); cursor:pointer; display:grid; place-items:center; transition:transform .15s var(--spring), background .15s; }
.keys button:active { transform:scale(.9); background:#e8e8ef; }
.keys button:empty { visibility:hidden; }
.keys button[aria-label='Delete'] { background:none; }
.keys button:disabled { opacity:.4; }
.shake { animation:shake .45s; }
@keyframes shake { 20%,60% { transform:translateX(-10px); } 40%,80% { transform:translateX(10px); } }
</style>
