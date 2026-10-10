<template>
  <NuxtLink v-if="show" to="/settings/reminders" class="card rp" aria-label="Turn on bill reminders">
    <span class="ic"><Icon name="bill" :size="20" /></span>
    <span class="grow"><strong>Never miss a bill</strong><small class="muted">Get a notification the morning one is due.</small></span>
    <button class="x" aria-label="Not now" @click.prevent.stop="dismiss"><Icon name="x" :size="16" /></button>
  </NuxtLink>
</template>

<script setup lang="ts">
const KEY = 'bn:reminders:prompt-dismissed'
const { state } = useBudget()
const { configured } = useReminders()
const eligible = ref(false)
const dismissed = ref(true)

// Suggest reminders only where they can work, and not to someone who already has them on, blocked them, or said no thanks.
onMounted(() => {
  const { supported } = reminderSupport()
  try { dismissed.value = localStorage.getItem(KEY) === '1' } catch { dismissed.value = false }
  eligible.value = supported && configured.value && Notification.permission !== 'denied' && !reminderHint()?.on
})
const show = computed(() => eligible.value && !dismissed.value && state.value.bills.length > 0)
function dismiss() { dismissed.value = true; try { localStorage.setItem(KEY, '1') } catch { /* ignore */ } }
</script>

<style scoped>
.rp { display:flex; align-items:center; gap:12px; text-decoration:none; color:var(--ink); min-height:64px; margin:14px 0 0; background:var(--tint-accent-soft); border-color:var(--tint-accent-line); }
.ic { width:42px; height:42px; border-radius:14px; background:linear-gradient(145deg,var(--tint-accent),var(--tint-accent2)); color:var(--accent); display:grid; place-items:center; flex:none; }
.grow { min-width:0; } .grow strong, .grow small { display:block; }
.x { width:44px; height:44px; margin:-8px -10px -8px 0; border-radius:50%; border:0; background:none; color:var(--muted); display:grid; place-items:center; cursor:pointer; flex:none; }
</style>
