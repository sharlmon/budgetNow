<template>
  <NuxtLink v-if="ready || flying > 0" to="/accounts" class="card strip" :aria-label="ready ? 'Money ready to sweep' : 'Money on its way'">
    <span class="ic"><Icon :name="ready ? 'swap' : 'repeat'" :size="20" /></span>
    <span class="grow">
      <strong v-if="ready">{{ hide(money(ready.amount)) }} is ready to sweep</strong>
      <strong v-else>{{ hide(money(flying)) }} on its way</strong>
      <small class="muted">{{ ready ? `${name(ready.rule.fromId)} to ${name(ready.rule.toId)} · your rule asks first` : 'Waiting for the provider to confirm' }}</small>
    </span>
    <Icon name="next" :size="18" />
  </NuxtLink>
</template>

<script setup lang="ts">
import { inFlight } from '../utils/transfers'

const { state } = useBudget()
const { transfers, due } = useTransfers()
const { hidden } = useHideAmounts()
const hide = (s: string) => (hidden.value ? '••••••' : s)
const ready = computed(() => due.value.find(p => !p.rule.auto))
const flying = computed(() => inFlight(transfers.value))
const name = (id: string) => state.value.accounts.find(a => a.id === id)?.name ?? 'Removed account'
</script>

<style scoped>
.strip { display:flex; align-items:center; gap:12px; margin-top:14px; padding:12px 14px; text-decoration:none; color:var(--ink); background:linear-gradient(95deg,var(--surface),var(--tint-accent-soft)); border-color:var(--tint-accent-line); }
.ic { width:42px; height:42px; border-radius:14px; background:linear-gradient(145deg,var(--tint-accent),var(--tint-accent2)); color:var(--accent); display:grid; place-items:center; flex:none; }
.grow strong, .grow small { display:block; }
</style>
