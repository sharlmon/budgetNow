<template>
  <Transition name="lock">
    <div v-if="locked" class="lock" role="dialog" aria-modal="true" aria-label="BudgetNow is locked">
      <div class="inner">
        <img :src="icon" alt="" width="64" height="64" class="logo" />
        <h1>BudgetNow is locked</h1>
        <p class="sub" :class="{ bad: !!message }" aria-live="polite">{{ message || `Enter your ${lockLength}-digit PIN` }}</p>
        <PinPad ref="pad" :length="lockLength" :disabled="busy || waiting > 0" @complete="submit" />
        <button class="forgot" @click="forgot">Forgot PIN? Sign out</button>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
const icon = `${useRuntimeConfig().app.baseURL}icons/icon-192.png`
const { unlock } = useAppLock()
const auth = useAppAuth()
const { prepareSignOut } = useSync()
const pad = ref<{ reset: () => void; fail: () => void }>()
const busy = ref(false)
const message = ref('')
const waiting = ref(0)
let timer: ReturnType<typeof setInterval> | undefined

function tick() {
  waiting.value = Math.max(0, Math.ceil((lockUntil.value - Date.now()) / 1000))
  if (waiting.value > 0) message.value = `Too many tries. Wait ${waiting.value}s`
  else if (message.value.startsWith('Too many')) { message.value = ''; pad.value?.reset() }
}
watch(locked, (v) => {
  clearInterval(timer)
  message.value = ''
  if (v) { pad.value?.reset(); tick(); timer = setInterval(tick, 500) }
}, { immediate: true })
onBeforeUnmount(() => clearInterval(timer))

async function submit(pin: string) {
  busy.value = true
  const r = await unlock(pin)
  busy.value = false
  if (r === 'ok') return
  pad.value?.fail()
  tick()
  if (!waiting.value) message.value = 'Wrong PIN. Try again'
}

async function forgot() {
  if (!confirm('To reset your PIN you will be signed out of this device and need to sign in again. Your data stays safe in your account. Continue?')) return
  if (!(await prepareSignOut())) return
  try { await auth.signOut() } catch { /* already signed out */ }
  await navigateTo('/sign-in')
}
</script>

<style scoped>
.lock { position:fixed; inset:0; z-index:100; display:grid; place-items:center; padding:24px; background:linear-gradient(180deg,#fff7f2 0%,#fff 55%); }
.inner { width:100%; max-width:360px; text-align:center; }
.logo { border-radius:18px; box-shadow:0 14px 28px -12px rgba(239,106,58,.8); margin-bottom:16px; }
h1 { font-size:1.35rem; margin:0 0 6px; }
.sub { margin:0 0 26px; color:var(--muted); min-height:1.4em; transition:color .2s; } .sub.bad { color:var(--bad); font-weight:600; }
.forgot { margin-top:26px; background:none; border:0; color:var(--muted); font:inherit; font-size:.85rem; cursor:pointer; text-decoration:underline; }
.lock-enter-active { transition:opacity .2s; } .lock-leave-active { transition:opacity .35s ease, transform .35s ease; }
.lock-enter-from { opacity:0; } .lock-leave-to { opacity:0; transform:scale(1.04); }
</style>
