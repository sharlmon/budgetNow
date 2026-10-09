<template>
  <div v-if="show" class="card white inst" :class="{ solo: always }">
    <img :src="icon" alt="" class="appic" width="48" height="48" />
    <div class="grow">
      <strong>Install BudgetNow</strong>
      <div class="muted sm" v-if="deferred">Open it like a real app, full screen and offline.</div>
      <div class="muted sm" v-else>Tap <Icon name="share" :size="14" class="inl" /> Share, then <b>Add to Home Screen</b> <Icon name="addsquare" :size="14" class="inl" /></div>
    </div>
    <button v-if="deferred" class="btn sm" @click="install"><Icon name="download" :size="16" /> Install</button>
    <button v-if="!always" class="icon-btn" aria-label="Dismiss" @click="dismiss"><Icon name="x" :size="15" /></button>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ always?: boolean }>()
const base = useRuntimeConfig().app.baseURL
const icon = `${base}icons/icon-192.png`
const deferred = useState<any>('pwa-deferred', () => null)
const installedEvt = useState('pwa-installed', () => false)
const standalone = ref(true)
const isIOS = ref(false)
const dismissed = ref(true)
const KEY = 'budgetnow:install-dismissed'

onMounted(() => {
  standalone.value = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true
  isIOS.value = /iphone|ipad|ipod/i.test(navigator.userAgent)
  try { dismissed.value = localStorage.getItem(KEY) === '1' } catch { dismissed.value = false }
})

const show = computed(() => !standalone.value && !installedEvt.value && (props.always || !dismissed.value) && (!!deferred.value || isIOS.value))

async function install() {
  const e = deferred.value
  if (!e) return
  e.prompt()
  const { outcome } = await e.userChoice
  deferred.value = null
  if (outcome === 'accepted') showToast('BudgetNow installed')
}
function dismiss() {
  dismissed.value = true
  try { localStorage.setItem(KEY, '1') } catch { /* ignore */ }
}
</script>

<style scoped>
.inst { display:flex; align-items:center; gap:14px; margin-top:16px; padding:14px; background:linear-gradient(95deg,#fff,#fff6f1); }
.appic { border-radius:13px; flex:none; box-shadow:0 6px 14px -6px rgba(239,106,58,.8); }
.inl { display:inline-block; vertical-align:-2px; color:var(--accent); }
.solo { margin-top:0; }
</style>
