<template>
  <div>
    <h1 class="rise" style="margin-bottom:16px">Analytics</h1>
    <div class="rise" style="--i:1;margin-bottom:16px"><Seg v-model="tab" :options="[{ value: 'expense', label: 'Expenses' }, { value: 'income', label: 'Income split' }]" /></div>

    <div class="card white rise" style="--i:2">
      <div class="monthnav">
        <button class="circ" style="width:38px;height:38px" aria-label="Previous month" @click="month = shiftMonth(month, -1)"><Icon name="back" :size="20" /></button>
        <span class="mpill"><Icon name="calendar" :size="15" /> {{ monthLabel(month) }}</span>
        <button class="circ" style="width:38px;height:38px" aria-label="Next month" @click="month = shiftMonth(month, 1)"><Icon name="next" :size="20" /></button>
      </div>
      <Donut :key="tab + month" :segments="segments" :size="220" style="margin:18px auto">
        <small class="muted">{{ tab === 'expense' ? 'Total spent' : 'Total income' }}</small>
        <strong style="font-size:1.55rem;letter-spacing:-.025em"><AnimatedNumber :value="tab === 'expense' ? stats.spentTotal : stats.income" /></strong>
      </Donut>
      <div class="legend"><span v-for="c in CATEGORIES" :key="c.key"><i :style="{ background: c.color }" />{{ c.label }}</span></div>
    </div>

    <button class="tip rise" style="--i:3" @click="sheet = { open: true, mode: 'income' }">
      <span class="tipic"><Icon name="bulb" :size="20" /></span>
      <span class="grow"><strong>{{ tip.title }}</strong><br><span class="muted sm">{{ tip.body }}</span></span>
      <Icon name="next" :size="18" />
    </button>

    <div class="sec rise" style="--i:4"><h2>Budget spending</h2></div>
    <div v-for="(c, i) in CATEGORIES" :key="c.key" class="rise" :style="{ '--i': 5 + i }"><CatRow :c="c" :budgeted="stats.budgeted[c.key]" :spent="stats.spent[c.key]" /></div>
  </div>
</template>

<script setup lang="ts">
const sheet = useSheet()
const month = useState('month', () => today().slice(0, 7))
const tab = ref('expense')
const stats = useMonthStats(month)
const segments = computed(() => CATEGORIES.map(c => ({ value: tab.value === 'expense' ? stats.value.spent[c.key] : stats.value.budgeted[c.key], color: c.color })))
const tip = computed(() => {
  const s = stats.value
  if (!s.income) return { title: 'No income this month', body: 'Add money in to see where it should go.' }
  const hot = CATEGORIES.find(c => s.budgeted[c.key] > 0 && s.spent[c.key] > s.budgeted[c.key])
  if (hot) return { title: `${hot.label} is over budget`, body: `You're ${money(s.spent[hot.key] - s.budgeted[hot.key])} past your plan.` }
  if (s.savingsRate < 20) return { title: 'Try saving 20%', body: `You're at ${Math.round(s.savingsRate)}% this month.` }
  return { title: 'You are on track', body: 'Every category is within budget. Keep it up.' }
})
</script>

<style scoped>
.monthnav { display:flex; justify-content:space-between; align-items:center; }
.mpill { display:inline-flex; gap:8px; align-items:center; font-size:.85rem; font-weight:600; background:var(--card); border:1px solid var(--line); border-radius:99px; padding:9px 16px; }
.mpill svg { color:var(--accent); }
.legend { display:flex; flex-wrap:wrap; gap:8px 18px; justify-content:center; font-size:.76rem; color:var(--muted); font-weight:500; }
.legend i { display:inline-block; width:9px; height:9px; border-radius:3px; margin-right:7px; }
.tip { width:100%; display:flex; gap:14px; align-items:center; text-align:left; font:inherit; color:var(--ink); background:linear-gradient(95deg,#fff0e8,#fff8f4); border:1px solid #fbdfd0; border-radius:20px; padding:14px; margin-top:16px; cursor:pointer; transition:transform .2s var(--spring); }
.tip:active { transform:scale(.98); }
.tipic { width:42px; height:42px; border-radius:14px; background:#fff; color:var(--accent); display:grid; place-items:center; box-shadow:0 4px 12px -6px rgba(239,106,58,.6); flex:none; }
</style>
