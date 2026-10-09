<template>
  <div class="card white lockcard">
    <div class="row">
      <span class="lk"><Icon :name="lockEnabled ? 'lock' : 'unlock'" :size="20" /></span>
      <div class="grow"><h2>App lock</h2><div class="muted sm">{{ lockEnabled ? 'On for this device' : 'Ask for a PIN when the app opens' }}</div></div>
      <Toggle :model-value="lockEnabled" aria-label="App lock" @update:model-value="toggle" />
    </div>
    <p class="muted sm note">Keeps people who pick up your phone out of your budget. The PIN stays on this device only, and it doesn't encrypt the data stored here.</p>

    <template v-if="lockEnabled">
      <label class="muted sm" for="al">Lock after</label>
      <select id="al" class="field" :value="lockTimeout" @change="e => setTimeoutSeconds(Number((e.target as HTMLSelectElement).value))">
        <option v-for="o in options" :key="o.v" :value="o.v">{{ o.l }}</option>
      </select>
      <div class="row" style="margin-top:12px">
        <button class="btn soft sm" style="flex:1" @click="lockNow"><Icon name="lock" :size="15" /> Lock now</button>
        <button class="btn soft sm" style="flex:1" @click="open('change', 'old')">Change PIN</button>
      </div>
    </template>

    <Teleport to="body">
      <Transition name="dlg">
        <div v-if="dialog" class="scrim" @click.self="close">
          <div class="sheet" role="dialog" aria-modal="true" :aria-label="title">
            <button class="x" aria-label="Cancel" @click="close"><Icon name="x" :size="18" /></button>
            <h3>{{ title }}</h3>
            <p class="sub" :class="{ bad: !!error }" aria-live="polite">{{ error || subtitle }}</p>
            <div v-if="dialog.step === 'new'" class="lenpick"><Seg :model-value="String(newLen)" :options="[{ value: '4', label: '4 digits' }, { value: '6', label: '6 digits' }]" @update:model-value="v => (newLen = Number(v))" /></div>
            <PinPad :key="dialog.mode + dialog.step + padLength" ref="pad" :length="padLength" :disabled="busy" @complete="submit" />
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
type Mode = 'setup' | 'change' | 'disable'
type Step = 'old' | 'new' | 'confirm'

const { verify, setup, remove, setTimeoutSeconds, lockNow } = useAppLock()
const options = [{ v: 0, l: 'As soon as I leave' }, { v: 60, l: '1 minute' }, { v: 300, l: '5 minutes' }, { v: 900, l: '15 minutes' }, { v: -1, l: 'Only when I reopen the app' }]

const dialog = ref<{ mode: Mode; step: Step } | null>(null)
const first = ref('')
const newLen = ref(4)
const error = ref('')
const busy = ref(false)
const pad = ref<{ reset: () => void; fail: () => void }>()

const padLength = computed(() => (dialog.value?.step === 'old' ? lockLength.value : newLen.value))
const title = computed(() => {
  const d = dialog.value
  if (!d) return ''
  if (d.mode === 'disable') return 'Turn off app lock'
  if (d.step === 'old') return 'Enter current PIN'
  return d.step === 'new' ? (d.mode === 'change' ? 'Choose a new PIN' : 'Choose a PIN') : 'Confirm your PIN'
})
const subtitle = computed(() => {
  const d = dialog.value
  if (!d) return ''
  if (d.step === 'old') return `Enter your ${lockLength.value}-digit PIN`
  return d.step === 'new' ? 'Pick something you will remember' : 'Enter it once more'
})

function open(mode: Mode, step: Step) { error.value = ''; first.value = ''; dialog.value = { mode, step } }
function close() { dialog.value = null; error.value = '' }
function toggle(on: boolean) { on ? open('setup', 'new') : open('disable', 'old') }

async function checkCurrent(pin: string): Promise<boolean> {
  const r = await verify(pin)
  if (r === 'ok') return true
  pad.value?.fail()
  error.value = r === 'wait' ? 'Too many tries. Wait a moment' : 'Wrong PIN. Try again'
  return false
}

async function submit(pin: string) {
  const d = dialog.value
  if (!d) return
  busy.value = true
  try {
    error.value = ''
    if (d.step === 'old') {
      if (!(await checkCurrent(pin))) return
      if (d.mode === 'disable') { remove(); close(); showToast('App lock turned off'); return }
      dialog.value = { mode: d.mode, step: 'new' }
    } else if (d.step === 'new') {
      first.value = pin
      dialog.value = { mode: d.mode, step: 'confirm' }
    } else if (pin === first.value) {
      await setup(pin)
      close()
      showToast('App lock is on')
    } else {
      pad.value?.fail()
      error.value = "PINs didn't match. Start again"
      first.value = ''
      setTimeout(() => { if (dialog.value) dialog.value = { mode: d.mode, step: 'new' } }, 600)
    }
  } finally { busy.value = false }
}
</script>

<style scoped>
.lockcard { margin-bottom:12px; }
.lk { width:42px; height:42px; border-radius:14px; background:#e6f6ee; color:var(--good); display:grid; place-items:center; flex:none; }
.note { margin:12px 0 14px; }
label { display:block; margin-bottom:6px; }
.scrim { position:fixed; inset:0; z-index:90; background:rgba(15,15,25,.5); display:flex; align-items:flex-end; justify-content:center; }
.sheet { position:relative; width:100%; max-width:480px; background:#fff; border-radius:28px 28px 0 0; padding:26px 24px calc(28px + env(safe-area-inset-bottom)); text-align:center; }
.x { position:absolute; top:16px; right:16px; width:34px; height:34px; border-radius:50%; border:0; background:#f1f1f5; color:var(--muted); display:grid; place-items:center; cursor:pointer; }
h3 { margin:0 0 4px; font-size:1.2rem; }
.sub { margin:0 0 20px; color:var(--muted); min-height:1.4em; } .sub.bad { color:var(--bad); font-weight:600; }
.lenpick { max-width:240px; margin:0 auto 20px; }
.dlg-enter-active { transition:opacity .2s; } .dlg-enter-active .sheet { transition:transform .4s cubic-bezier(.2,1,.3,1); }
.dlg-leave-active { transition:opacity .2s; }
.dlg-enter-from, .dlg-leave-to { opacity:0; } .dlg-enter-from .sheet { transform:translateY(60px); }
</style>
