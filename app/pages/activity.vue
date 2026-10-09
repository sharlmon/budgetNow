<template>
  <div>
    <h1 class="rise" style="margin-bottom:16px">Activity</h1>
    <div class="rise" style="--i:1"><Seg v-model="filter" :options="[{ value: 'all', label: 'All' }, { value: 'income', label: 'Money in' }, { value: 'expense', label: 'Expenses' }]" /></div>
    <div v-if="!shown.length" class="card empty rise" style="margin-top:20px;--i:2">
      <div class="art"><Icon name="receipt" :size="28" /></div>
      <h2 style="margin-bottom:4px">Nothing here yet</h2>
      <p class="muted" style="margin:0">Tap the + button to add your first transaction.</p>
    </div>
    <div v-for="([date, items], gi) in groups" :key="date" class="rise" :style="{ '--i': 2 + gi }">
      <div class="sec" style="margin:22px 0 8px"><h2 class="muted" style="font-size:.78rem;font-weight:600;text-transform:uppercase;letter-spacing:.06em">{{ nice(date) }}</h2></div>
      <div class="card white" style="padding:2px 18px"><TxnItem v-for="t in items" :key="t.id" :t="t" removable /></div>
    </div>
  </div>
</template>

<script setup lang="ts">
const txns = useTransactions()
const filter = ref('all')
const shown = computed(() => txns.value.filter(t => filter.value === 'all' || t.kind === filter.value))
const groups = computed(() => {
  const m = new Map<string, Txn[]>()
  for (const t of shown.value) m.set(t.date, [...(m.get(t.date) ?? []), t])
  return [...m.entries()]
})
const nice = (d: string) => new Date(d + 'T00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })
</script>
