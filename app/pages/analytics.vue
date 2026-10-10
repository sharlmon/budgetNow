<template>
  <div>
    <h1 class="rise" style="margin-bottom:16px">Analytics</h1>
    <div class="rise" style="--i:1;margin-bottom:14px"><Seg v-model="tab" :options="[{ value: 'spending', label: 'Spending' }, { value: 'income', label: 'Income' }]" /></div>

    <div class="monthnav rise" style="--i:1">
      <button class="circ" aria-label="Previous month" @click="month = shiftMonth(month, -1)"><Icon name="back" :size="20" /></button>
      <span class="mpill"><Icon name="calendar" :size="15" /> {{ monthLabel(month) }}</span>
      <button class="circ" aria-label="Next month" :disabled="month >= thisMonth" @click="month = shiftMonth(month, 1)"><Icon name="next" :size="20" /></button>
    </div>

    <template v-if="tab === 'spending'">
      <section class="pace rise" :class="pace.status" style="--i:2" aria-labelledby="pace-h">
        <small class="kick">{{ isCurrent ? 'This month so far' : 'The month' }}</small>
        <h2 id="pace-h">{{ paceHead }}</h2>
        <p class="sub">{{ paceSub }}</p>
        <PaceChart v-if="showChart" :actual="series.actual" :ideal="series.ideal" :days="series.days" :budget="pace.budget" :label="`Spending adding up through the month against an even pace, ${money(pace.spent)} so far`" />
        <dl class="mini">
          <div><dt>Spent</dt><dd class="num">{{ money(pace.spent) }}</dd></div>
          <div><dt>Budget</dt><dd class="num">{{ pace.budget > 0 ? money(pace.budget) : '—' }}</dd></div>
          <div v-if="pace.perDayLeft !== null"><dt>Per day left</dt><dd class="num">{{ money(pace.perDayLeft) }}</dd></div>
          <div v-else><dt>{{ pace.budget - pace.spent >= 0 ? 'Left' : 'Over by' }}</dt><dd class="num" :class="{ bad: pace.spent > pace.budget }">{{ pace.budget > 0 ? money(Math.abs(pace.budget - pace.spent)) : '—' }}</dd></div>
        </dl>
      </section>

      <div v-if="!pace.spent" class="card empty rise" style="--i:3;margin-top:16px">
        <div class="art"><Icon name="chart" :size="28" /></div>
        <h2 style="margin-bottom:4px">Nothing spent in {{ monthLabel(month) }}</h2>
        <p class="muted" style="margin:0">Add an expense and it shows up here.</p>
      </div>

      <template v-else>
        <div class="sec rise" style="--i:3"><h2>Where it went</h2></div>
        <div class="card white rise" style="--i:3">
          <Donut :key="month" :segments="CATEGORIES.map(c => ({ value: stats.spent[c.key], color: c.color }))" :size="190" style="margin:4px auto 10px">
            <small class="muted">Total spent</small>
            <strong style="font-size:1.4rem;letter-spacing:-.025em"><AnimatedNumber :value="stats.spentTotal" /></strong>
          </Donut>
          <ul class="cats">
            <li v-for="c in CATEGORIES" :key="c.key">
              <div class="crow">
                <i class="dot" :style="{ background: c.color }" />
                <span class="grow"><strong>{{ c.label }}</strong><small class="muted">{{ share(stats.spent[c.key]) }}% of spending</small></span>
                <span class="end"><strong class="num">{{ money(stats.spent[c.key]) }}</strong>
                  <small v-if="change(c.key)" class="chg" :class="chgTone(c.key)">{{ chgText(c.key) }}</small></span>
              </div>
              <div v-if="stats.budgeted[c.key] > 0" class="bar" role="img" :aria-label="`${c.label}: ${money(stats.spent[c.key])} of ${money(stats.budgeted[c.key])} budgeted`"><i :style="{ width: Math.min(100, (stats.spent[c.key] / stats.budgeted[c.key]) * 100) + '%', background: stats.spent[c.key] > stats.budgeted[c.key] ? 'var(--bad)' : c.color }" /></div>
            </li>
          </ul>
        </div>

        <template v-if="top.length">
          <div class="sec rise" style="--i:4"><h2>Biggest spends</h2></div>
          <div class="card white rise" style="--i:4">
            <ul class="rank">
              <li v-for="t in top" :key="t.label">
                <div class="crow"><span class="grow"><strong class="nm">{{ t.label }}</strong><small class="muted">{{ t.count }} {{ t.count === 1 ? 'entry' : 'entries' }} · {{ Math.round(t.share * 100) }}%</small></span><strong class="num">{{ money(t.total) }}</strong></div>
                <div class="bar"><i :style="{ width: Math.max(3, t.share * 100) + '%', background: 'var(--btn)' }" /></div>
              </li>
            </ul>
          </div>
        </template>

        <template v-if="accountShares.length > 1 || (accountShares.length === 1 && accountShares[0]!.id !== 'none')">
          <div class="sec rise" style="--i:5"><h2>Where it left from</h2></div>
          <div class="card white rise" style="--i:5">
            <ul class="rank">
              <li v-for="a in accountShares" :key="a.id">
                <div class="crow"><i class="dot" :style="{ background: a.color }" /><span class="grow"><strong>{{ a.name }}</strong><small class="muted">{{ Math.round(a.share * 100) }}% of spending</small></span><strong class="num">{{ money(a.total) }}</strong></div>
                <div class="bar"><i :style="{ width: Math.max(3, a.share * 100) + '%', background: a.color }" /></div>
              </li>
            </ul>
          </div>
        </template>
      </template>

      <template v-if="notes.length">
        <div class="sec rise" style="--i:6"><h2>Worth knowing</h2></div>
        <ul class="notes">
          <li v-for="n in notes" :key="n.id" class="note rise" :class="n.tone" style="--i:6">
            <span class="nic"><Icon :name="n.tone === 'warn' ? 'bulb' : n.tone === 'good' ? 'check' : 'sparkles'" :size="18" /></span>
            <span class="grow"><strong>{{ n.title }}</strong><small class="muted">{{ n.body }}</small></span>
          </li>
        </ul>
      </template>
    </template>

    <template v-else>
      <section class="card white rise" style="--i:2;margin-top:16px">
        <Donut :key="'in' + month" :segments="CATEGORIES.map(c => ({ value: stats.budgeted[c.key], color: c.color }))" :size="190" style="margin:4px auto 10px">
          <small class="muted">Money in</small>
          <strong style="font-size:1.4rem;letter-spacing:-.025em"><AnimatedNumber :value="stats.income" /></strong>
        </Donut>
        <p v-if="!stats.income" class="muted" style="text-align:center;margin:0">Nothing came in during {{ monthLabel(month) }}.</p>
        <ul v-else class="cats">
          <li v-for="c in CATEGORIES" :key="c.key">
            <div class="crow"><i class="dot" :style="{ background: c.color }" /><span class="grow"><strong>{{ c.label }}</strong><small class="muted">{{ Math.round((stats.budgeted[c.key] / stats.income) * 100) }}% of what came in</small></span><strong class="num">{{ money(stats.budgeted[c.key]) }}</strong></div>
          </li>
        </ul>
      </section>
      <template v-if="sources.length">
        <div class="sec rise" style="--i:3"><h2>Where it came from</h2></div>
        <div class="card white rise" style="--i:3">
          <ul class="rank">
            <li v-for="s in sources" :key="s.label">
              <div class="crow"><span class="grow"><strong class="nm">{{ s.label }}</strong><small class="muted">{{ s.count }} {{ s.count === 1 ? 'entry' : 'entries' }} · {{ Math.round(s.share * 100) }}%</small></span><strong class="num good">{{ money(s.total) }}</strong></div>
              <div class="bar"><i :style="{ width: Math.max(3, s.share * 100) + '%', background: 'var(--good)' }" /></div>
            </li>
          </ul>
        </div>
      </template>
      <div v-if="stats.income" class="chip rise" :class="stats.savingsRate >= 20 ? 'ok' : 'meh'" style="--i:4"><Icon name="trend" :size="16" /><span class="grow">{{ stats.savingsRate >= 20 ? 'Healthy savings rate' : 'Savings rate this month' }}</span><b>{{ Math.round(stats.savingsRate) }}%</b></div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { buildInsights, categoryChanges, cumulativeSeries, paceSummary, spendByAccount, topSpends, weekdayPattern } from '../utils/insights'

useSeoMeta({ title: 'Analytics' })
const { state } = useBudget()
const month = useState('month', () => today().slice(0, 7))
const thisMonth = today().slice(0, 7)
const tab = ref<'spending' | 'income'>('spending')
const isCurrent = computed(() => month.value === thisMonth)

const stats = useMonthStats(month)
const prevMonth = computed(() => shiftMonth(month.value, -1))
const prev = useMonthStats(prevMonth)

const pace = computed(() => paceSummary({ month: month.value, today: today(), spent: stats.value.spentTotal, budget: stats.value.spendBudget }))
const series = computed(() => cumulativeSeries(state.value.expenses, { month: month.value, today: today(), budget: stats.value.spendBudget }))
const showChart = computed(() => pace.value.status !== 'nobudget' && pace.value.status !== 'idle' && pace.value.budget > 0)

const paceHead = computed(() => ({ nobudget: 'No budget yet', idle: 'Not started', early: 'Early days', under: 'Under budget', on: 'On track', over: pace.value.projected === null ? 'Over budget' : isCurrent.value ? 'Heading over budget' : 'Over budget' }[pace.value.status]))
const paceSub = computed(() => {
  const p = pace.value
  if (p.status === 'nobudget') return 'Add money in to set a spending budget for the month.'
  if (p.status === 'idle') return 'This month has not started yet.'
  if (p.status === 'early') return `${money(p.spent)} spent so far. A projection appears after day 5.`
  if (!isCurrent.value) return `You spent ${money(p.spent)} of your ${money(p.budget)} budget.`
  if (p.status === 'over' && p.projected === null) return `You have already spent ${money(p.spent)} of your ${money(p.budget)} budget.`
  return `At this pace you will spend ${money(p.projected ?? 0)} of your ${money(p.budget)} budget.`
})

const share = (v: number) => (stats.value.spentTotal > 0 ? Math.round((v / stats.value.spentTotal) * 100) : 0)
const changes = computed(() => categoryChanges(stats.value.spent, prev.value.spent, CATEGORIES.map(c => c.key)))
const change = (k: string) => { const c = changes.value.find(x => x.key === k); return c && (c.now > 0 || c.before > 0) && c.delta !== 0 ? c : null }
const chgText = (k: string) => { const c = change(k)!; return c.pct === null ? 'New' : `${c.delta > 0 ? '▲' : '▼'} ${Math.abs(c.pct)}%` }
const chgTone = (k: string) => (change(k)!.delta > 0 ? 'up' : 'down')

const top = computed(() => topSpends(state.value.expenses, month.value, 5, k => catMeta(k as Category).label))
const accountShares = computed(() => spendByAccount(state.value.expenses, month.value, state.value.accounts))
const sources = computed(() => topSpends(state.value.incomes.map(i => ({ label: i.label, amount: i.amount, category: 'income', date: i.date })), month.value, 5, () => 'Income'))

const notes = computed(() => buildInsights({
  fmt: money, income: stats.value.income, pace: pace.value,
  overCategories: CATEGORIES.filter(c => stats.value.budgeted[c.key] > 0 && stats.value.spent[c.key] > stats.value.budgeted[c.key]).map(c => ({ label: c.label, over: stats.value.spent[c.key] - stats.value.budgeted[c.key] })),
  changes: changes.value.map(c => ({ ...c, label: catMeta(c.key as Category).label })),
  topSpend: top.value[0] ?? null, weekday: weekdayPattern(state.value.expenses, month.value), savingsRate: stats.value.savingsRate,
}))
</script>

<style scoped>
.monthnav { display:flex; justify-content:space-between; align-items:center; gap:8px; }
.circ { width:44px; height:44px; } .circ:disabled { opacity:.35; cursor:not-allowed; }
.mpill { display:inline-flex; gap:8px; align-items:center; white-space:nowrap; font-size:.85rem; font-weight:600; background:var(--card); border:1px solid var(--line); border-radius:99px; padding:10px 16px; }
.mpill svg { color:var(--accent); }
.pace { margin-top:14px; border-radius:26px; padding:20px; border:1px solid var(--line); background:var(--surface); }
.pace.under, .pace.on { background:linear-gradient(160deg,var(--surface),var(--goodbg)); border-color:color-mix(in srgb, var(--good) 30%, var(--line)); }
.pace.over { background:linear-gradient(160deg,var(--surface),var(--bad-bg)); border-color:color-mix(in srgb, var(--bad) 40%, var(--line)); }
.kick { font-weight:600; color:var(--muted); }
#pace-h { margin:6px 0 4px; font-size:1.6rem; letter-spacing:-.03em; line-height:1.15; }
.under #pace-h, .on #pace-h { color:var(--good-ink); } .over #pace-h { color:var(--bad); }
.sub { margin:0 0 8px; color:var(--ink2); line-height:1.5; font-size:.95rem; }
.mini { margin:12px 0 0; background:color-mix(in srgb, var(--surface) 70%, transparent); border-radius:16px; padding:2px 14px; }
.mini div { display:flex; justify-content:space-between; align-items:baseline; gap:12px; padding:10px 0; }
.mini div + div { border-top:1px solid var(--line); }
.mini dt { font-size:.84rem; color:var(--muted); font-weight:600; } .mini dd { margin:0; font-weight:700; font-size:1rem; white-space:nowrap; } .bad { color:var(--bad); }
.cats, .rank { list-style:none; margin:0; padding:0; }
.cats li, .rank li { padding:10px 0; } .cats li + li, .rank li + li { border-top:1px solid var(--line); }
.crow { display:flex; align-items:center; gap:12px; min-width:0; }
.dot { width:10px; height:10px; border-radius:3px; flex:none; }
.grow { min-width:0; } .grow strong, .grow small { display:block; } .nm { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.end { text-align:right; flex:none; } .end strong { display:block; }
.chg { display:inline-block; margin-top:2px; font-size:.72rem; font-weight:700; padding:1px 7px; border-radius:99px; }
.chg.up { background:var(--warn-bg); color:var(--warn-ink); } .chg.down { background:var(--goodbg); color:var(--good-ink); }
.bar { margin-top:8px; }
.notes { list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:10px; }
.note { display:flex; gap:12px; align-items:flex-start; padding:14px; border-radius:18px; background:var(--surface); border:1px solid var(--line); }
.note .grow strong, .note .grow small { display:block; } .note small { margin-top:2px; line-height:1.45; }
.nic { width:36px; height:36px; border-radius:12px; display:grid; place-items:center; flex:none; background:var(--soft); color:var(--ink2); }
.note.warn .nic { background:var(--warn-bg); color:var(--warn-ink); } .note.good .nic { background:var(--goodbg); color:var(--good-ink); } .note.info .nic { background:var(--tint-accent); color:var(--accent); }
.good { color:var(--good-ink); }
.chip { display:flex; align-items:center; gap:8px; margin-top:14px; padding:12px 14px; border-radius:14px; font-size:.85rem; font-weight:500; }
.chip.ok { background:var(--goodbg); color:var(--good-ink); } .chip.meh { background:var(--soft); color:var(--muted); }
</style>
