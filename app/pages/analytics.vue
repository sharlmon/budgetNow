<template>
  <div>
    <h1 style="margin-bottom:14px">Analytics</h1>
    <div class="seg" style="margin-bottom:14px">
      <button :class="{ on: tab === 'expense' }" @click="tab = 'expense'">Expenses</button>
      <button :class="{ on: tab === 'income' }" @click="tab = 'income'">Income split</button>
    </div>

    <div class="card white">
      <div class="monthnav">
        <button class="circ" @click="month = shiftMonth(month, -1)" aria-label="Previous month">‹</button>
        <span class="mpill">📅 {{ monthLabel(month) }}</span>
        <button class="circ" @click="month = shiftMonth(month, 1)" aria-label="Next month">›</button>
      </div>
      <Donut :segments="segments" :size="210" style="margin:14px auto">
        <small class="muted">{{ tab === 'expense' ? 'Total Spent' : 'Total Income' }}</small>
        <strong style="font-size:1.5rem;letter-spacing:-.02em">{{ money(tab === 'expense' ? stats.spentTotal : stats.income) }}</strong>
      </Donut>
      <div class="legend">
        <span v-for="c in CATEGORIES" :key="c.key"><i :style="{ background: c.color }" />{{ c.label }}</span>
      </div>
    </div>

    <div class="tip" @click="sheet = { open: true, mode: 'income' }">
      <span class="ico" style="background:#fff">💡</span>
      <div class="grow sm"><strong>{{ tip.title }}</strong><br><span class="muted">{{ tip.body }}</span></div>
    </div>

    <div class="sec"><h2>Budget Spending</h2></div>
    <CatRow v-for="c in CATEGORIES" :key="c.key" :c="c" :budgeted="stats.budgeted[c.key]" :spent="stats.spent[c.key]" />
  </div>
</template>

<script setup lang="ts">
const sheet = useSheet()
const month = useState('month', () => today().slice(0, 7))
const tab = ref<'expense' | 'income'>('expense')
const stats = useMonthStats(month)
const segments = computed(() => CATEGORIES.map(c => ({ value: tab.value === 'expense' ? stats.value.spent[c.key] : stats.value.budgeted[c.key], color: c.color })))
const tip = computed(() => {
  const s = stats.value
  if (!s.income) return { title: 'No income this month', body: 'Add money in to see where it should go.' }
  const hot = CATEGORIES.find(c => s.budgeted[c.key] > 0 && s.spent[c.key] > s.budgeted[c.key])
  if (hot) return { title: `${hot.label} is over budget`, body: `You're ${money(s.spent[hot.key] - s.budgeted[hot.key])} past what you planned. Consider adjusting next time.` }
  if (s.savingsRate < 20) return { title: 'Try saving 20%', body: `You're at ${Math.round(s.savingsRate)}% this month.` }
  return { title: 'You are on track', body: 'Every category is within budget. Keep it up!' }
})
</script>

<style scoped>
.monthnav { display:flex; justify-content:space-between; align-items:center; }
.monthnav .circ { font-size:1.3rem; width:36px; height:36px; }
.mpill { font-size:.85rem; font-weight:600; background:var(--card); border:1px solid var(--line); border-radius:99px; padding:8px 16px; }
.legend { display:flex; flex-wrap:wrap; gap:8px 16px; justify-content:center; font-size:.75rem; color:var(--muted); }
.legend i { display:inline-block; width:8px; height:8px; border-radius:3px; margin-right:6px; }
.tip { display:flex; gap:12px; align-items:center; background:linear-gradient(90deg,#fff1ea,#fff8f4); border:1px solid #fbe0d3; border-radius:18px; padding:12px; margin-top:14px; cursor:pointer; }
</style>
