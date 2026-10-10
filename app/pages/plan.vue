<template>
  <div>
    <h1 class="rise" style="margin-bottom:16px">Plan</h1>
    <div class="rise" style="--i:1;margin-bottom:16px"><PlanSwitch /></div>

    <section class="hero rise" :class="r.status" style="--i:2" aria-labelledby="rw-h">
      <div class="top">
        <small class="when">Next {{ days }} days</small>
        <div class="win" role="group" aria-label="How far ahead">
          <button v-for="n in WINDOWS" :key="n" :aria-pressed="days === n" :class="{ on: days === n }" @click="days = n">{{ n }}</button>
        </div>
      </div>
      <h2 id="rw-h">{{ headline }}</h2>
      <p class="sub">{{ detail }}</p>

      <RunwayChart v-if="r.series.length > 1" :series="r.series" :days="days" :end-label="shortDate(r.until)" :label="`Your balance over the next ${days} days, after each bill`" class="chart" />

      <dl class="stats">
        <div><dt>In your accounts</dt><dd class="num">{{ r.available === null ? '—' : money(r.available) }}</dd></div>
        <div><dt>Bills due</dt><dd class="num">{{ money(r.due) }}</dd></div>
        <div><dt>Left after</dt><dd class="num" :class="{ neg: (r.endBalance ?? 0) < 0 }">{{ r.endBalance === null ? '—' : money(r.endBalance) }}</dd></div>
      </dl>

      <div v-if="r.status === 'short'" class="cta">
        <button class="btn sm" @click="sheet = { open: true, mode: 'income' }"><Icon name="plus" :size="16" :stroke="2.6" /> Add money</button>
        <button v-if="state.accounts.length > 1" class="btn soft sm" @click="mover = { open: true, from: '' }"><Icon name="swap" :size="16" /> Move money</button>
      </div>
      <div v-else-if="r.status === 'unknown'" class="cta"><NuxtLink to="/accounts" class="btn sm"><Icon name="wallet" :size="16" /> Add your accounts</NuxtLink></div>
    </section>

    <template v-if="groups.length">
      <div class="sec rise" style="--i:3"><h2>Coming up</h2><span class="sm muted">{{ billCount }} bill{{ billCount === 1 ? '' : 's' }}</span></div>
      <div v-for="g in groups" :key="g.key" class="rise" style="--i:3">
        <div class="day"><span :class="{ late: g.late }">{{ g.label }}</span></div>
        <div class="card white lst">
          <template v-for="it in g.items" :key="it.kind + it.id + it.date">
            <BillRow v-if="payable(it)" :bill="billOf(it)!" compact :after="it.kind === 'bill' && it.after !== null ? { balance: it.after, short: it.short } : null" />
            <RunwayRow v-else :item="it" />
          </template>
        </div>
      </div>
    </template>
    <div v-else class="card empty rise" style="--i:3;margin-top:8px">
      <div class="art"><Icon name="calendar" :size="28" /></div>
      <h2 style="margin-bottom:4px">A clear stretch</h2>
      <p class="muted" style="margin:0 0 14px">Nothing is due in the next {{ days }} days. Add your bills and Weka will tell you whether you can cover them.</p>
      <NuxtLink to="/bills?add=1" class="btn"><Icon name="plus" :size="18" :stroke="2.6" /> Add a bill</NuxtLink>
    </div>

    <div class="sec rise" style="--i:4"><h2>Manage</h2></div>
    <div class="tiles rise" style="--i:4">
      <NuxtLink to="/bills" class="tile"><span class="ti"><Icon name="bill" :size="20" /></span><span class="grow"><strong>Bills</strong><small class="muted">{{ state.bills.length ? `${state.bills.length} · about ${money(Math.round(monthly))} a month` : 'Add rent, subscriptions and loans' }}</small></span><Icon name="next" :size="18" /></NuxtLink>
      <NuxtLink to="/goals" class="tile"><span class="ti g"><Icon name="target" :size="20" /></span><span class="grow"><strong>Goals</strong><small class="muted">{{ state.goals.length ? `${state.goals.length} · ${goalPct}% saved` : 'Save towards something' }}</small></span><Icon name="next" :size="18" /></NuxtLink>
      <NuxtLink to="/debts" class="tile"><span class="ti d"><Icon name="card" :size="20" /></span><span class="grow"><strong>Debts</strong><small class="muted">{{ state.debts.length ? `${money(totalDebt)} owed · ${money(totalMinDebt)} minimum a month` : 'Track what you owe' }}</small></span><Icon name="next" :size="18" /></NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { monthlyEquivalent } from '../utils/bills'
import { buildRunway, type RunwayItem } from '../utils/runway'

useSeoMeta({ title: 'Plan' })
const WINDOWS = [14, 30, 60]
const { state, totalDebt, totalMinDebt } = useBudget()
const sheet = useSheet(), mover = useMoveSheet()
const days = ref(30)

const r = computed(() => buildRunway({
  today: today(), days: days.value,
  accounts: state.value.accounts, bills: state.value.bills,
  goals: state.value.goals.map(g => ({ id: g.id, name: g.name, target: g.target, saved: goalSaved(g), deadline: g.deadline })),
}))

const shortDate = (d: string) => new Date(d + 'T00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
const niceDay = (d: string) => new Date(d + 'T00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })
const headline = computed(() => ({
  covered: "You're covered", tight: 'Covered, but tight', clear: 'Nothing due',
  short: `Short by ${money(r.value.firstShort?.below ?? 0)}`, unknown: 'Add an account to check',
}[r.value.status]))
const detail = computed(() => {
  const v = r.value
  switch (v.status) {
    case 'covered': return `You'll have ${money(v.endBalance ?? 0)} left after ${money(v.due)} of bills.`
    case 'tight': return `Your lowest point is ${money(v.lowest?.balance ?? 0)} on ${shortDate(v.lowest?.date ?? v.today)}.`
    case 'short': return `${v.firstShort?.name} on ${shortDate(v.firstShort?.date ?? v.today)} is the first bill your accounts will not cover.`
    case 'clear': return `No bills fall in the next ${days.value} days.`
    default: return `${money(v.due)} of bills are due in the next ${days.value} days. Add the accounts you pay from to see if you are covered.`
  }
})

// Group the timeline by day: late bills together, then each day.
const groups = computed(() => {
  const t = today(), map = new Map<string, { key: string; label: string; late: boolean; items: RunwayItem[] }>()
  for (const it of r.value.items) {
    const late = it.kind === 'bill' && it.overdue
    const key = late ? 'late' : it.date
    const label = late ? 'Late' : it.date === t ? 'Today' : it.date === addDays(t, 1) ? 'Tomorrow' : niceDay(it.date)
    if (!map.has(key)) map.set(key, { key, label, late, items: [] })
    map.get(key)!.items.push(it)
  }
  return [...map.values()]
})
const billCount = computed(() => r.value.items.filter(i => i.kind === 'bill').length)
const billOf = (it: RunwayItem) => state.value.bills.find(b => b.id === it.id)
/** Only a bill's next due date can be paid from here; later repeats are shown but paid when their turn comes. */
const payable = (it: RunwayItem) => it.kind === 'bill' && !!billOf(it) && (it.overdue || it.date === billOf(it)!.nextDue)

const monthly = computed(() => state.value.bills.reduce((s, b) => s + monthlyEquivalent(b.amount, b.every), 0))
const goalPct = computed(() => {
  const target = state.value.goals.reduce((s, g) => s + g.target, 0)
  return target > 0 ? Math.round(Math.min(100, (state.value.goals.reduce((s, g) => s + goalSaved(g), 0) / target) * 100)) : 0
})
</script>

<style scoped>
.hero { border-radius:26px; padding:20px; color:var(--ink); border:1px solid var(--line); background:var(--surface); position:relative; overflow:hidden; }
.hero.covered { background:linear-gradient(160deg,var(--surface),var(--goodbg)); border-color:color-mix(in srgb, var(--good) 30%, var(--line)); }
.hero.tight { background:linear-gradient(160deg,var(--surface),var(--warn-bg)); border-color:color-mix(in srgb, var(--warn-ink) 30%, var(--line)); }
.hero.short { background:linear-gradient(160deg,var(--surface),var(--bad-bg)); border-color:color-mix(in srgb, var(--bad) 40%, var(--line)); }
.top { display:flex; justify-content:space-between; align-items:center; gap:10px; }
.when { font-weight:600; color:var(--muted); }
.win { display:inline-flex; gap:4px; background:var(--soft); border-radius:99px; padding:3px; }
.win button { min-width:44px; min-height:36px; border-radius:99px; border:0; background:none; font:inherit; font-size:.8rem; font-weight:700; color:var(--muted); cursor:pointer; }
.win button.on { background:var(--surface); color:var(--ink); box-shadow:0 1px 4px rgba(20,20,40,.15); }
h2#rw-h { margin:10px 0 4px; font-size:1.7rem; letter-spacing:-.03em; line-height:1.15; }
.covered h2#rw-h { color:var(--good-ink); } .tight h2#rw-h { color:var(--warn-ink); } .short h2#rw-h { color:var(--bad); }
.sub { margin:0 0 6px; color:var(--ink2); line-height:1.5; font-size:.95rem; }
.chart { margin:8px 0 2px; }
.stats { margin:12px 0 0; background:color-mix(in srgb, var(--surface) 70%, transparent); border-radius:16px; padding:2px 14px; }
.stats div { display:flex; justify-content:space-between; align-items:baseline; gap:12px; padding:10px 0; }
.stats div + div { border-top:1px solid var(--line); }
.stats dt { font-size:.84rem; color:var(--muted); font-weight:600; } .stats dd { margin:0; font-weight:700; font-size:1rem; white-space:nowrap; }
.stats dd.neg { color:var(--bad); }
.cta { display:flex; gap:8px; flex-wrap:wrap; margin-top:14px; } .cta .btn { text-decoration:none; }
.day { margin:18px 4px 8px; font-size:.78rem; font-weight:700; text-transform:uppercase; letter-spacing:.06em; color:var(--muted); } .day .late { color:var(--bad); }
.lst { padding:2px 18px; } .lst > :deep(* + *) { border-top:1px solid var(--line); }
.tiles { display:flex; flex-direction:column; gap:10px; }
.tile { display:flex; align-items:center; gap:14px; min-height:68px; padding:12px 16px; border-radius:20px; background:var(--surface); border:1px solid var(--line); color:var(--ink); text-decoration:none; }
.tile .grow { min-width:0; } .tile strong, .tile small { display:block; } .tile small { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.ti { width:42px; height:42px; border-radius:14px; display:grid; place-items:center; background:linear-gradient(145deg,var(--tint-accent),var(--tint-accent2)); color:var(--accent); flex:none; }
.ti.g { background:var(--goodbg); color:var(--good-ink); } .ti.d { background:var(--tint-blue); color:#5b8def; }
</style>
