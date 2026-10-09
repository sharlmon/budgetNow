<template>
  <div>
    <h1 style="margin-bottom:14px">Activity</h1>
    <div class="seg" style="margin-bottom:12px">
      <button v-for="f in ['all', 'income', 'expense']" :key="f" :class="{ on: filter === f }" @click="filter = f">{{ f === 'all' ? 'All' : f === 'income' ? 'Money in' : 'Expenses' }}</button>
    </div>
    <div v-if="!shown.length" class="card empty"><div class="em">🧾</div><p class="muted">Nothing here yet. Tap + to add something.</p></div>
    <div v-for="[date, items] in groups" :key="date">
      <div class="sec"><h2>{{ date }}</h2></div>
      <div class="card"><TxnItem v-for="t in items" :key="t.id" :t="t" removable /></div>
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
</script>
