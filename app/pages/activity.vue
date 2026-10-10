<template>
  <div>
    <h1 class="rise" style="margin-bottom:14px">Activity</h1>

    <section class="card white month rise" style="--i:1" aria-label="Month summary">
      <div class="nav">
        <template v-if="f.month !== 'all'">
          <button class="circ" aria-label="Previous month" @click="shift(-1)"><Icon name="back" :size="20" /></button>
          <span class="mpill"><Icon name="calendar" :size="15" /> {{ monthLabel(f.month) }}</span>
          <button class="circ" aria-label="Next month" :disabled="f.month >= thisMonth" @click="shift(1)"><Icon name="next" :size="20" /></button>
        </template>
        <template v-else>
          <span class="mpill wide"><Icon name="calendar" :size="15" /> All time</span>
        </template>
      </div>

      <dl class="tiles">
        <div><dt>Money in</dt><dd class="good num">{{ money(sum.income) }}</dd></div>
        <div><dt>Spent</dt><dd class="num">{{ money(sum.expense) }}</dd></div>
        <div><dt>Net</dt><dd class="num" :class="{ good: sum.net > 0, bad: sum.net < 0 }">{{ sum.net > 0 ? '+' : sum.net < 0 ? '−' : '' }}{{ money(Math.abs(sum.net)) }}</dd></div>
      </dl>

      <template v-if="f.month !== 'all'">
        <SpendStrip :bars="strip.bars" :max="strip.max" :selected="f.day" @pick="f.day = $event" />
        <p class="muted sm hint">Tap a bar to see just that day.</p>
      </template>
      <button class="all" @click="f.month = f.month === 'all' ? thisMonth : 'all'">{{ f.month === 'all' ? 'Back to months' : 'Show all time' }}</button>
    </section>

    <div class="find rise" style="--i:2">
      <label class="search"><Icon name="search" :size="18" /><input v-model="f.q" type="search" placeholder="Search by name, account or amount" aria-label="Search activity" autocomplete="off" /></label>
      <Seg v-model="f.kind" :options="[{ value: 'all', label: 'All' }, { value: 'income', label: 'Money in' }, { value: 'expense', label: 'Expenses' }]" />
      <div class="chips" role="group" aria-label="Filter by category or account">
        <button v-for="c in CATEGORIES" :key="c.key" :aria-pressed="f.category === c.key" :class="{ on: f.category === c.key }" @click="f.category = f.category === c.key ? 'all' : c.key"><i :style="{ background: c.color }" />{{ c.label }}</button>
        <template v-if="state.accounts.length">
          <span class="sep" aria-hidden="true" />
          <button v-for="a in state.accounts" :key="a.id" :aria-pressed="f.accountId === a.id" :class="{ on: f.accountId === a.id }" @click="f.accountId = f.accountId === a.id ? 'all' : a.id"><i :style="{ background: a.color }" />{{ a.name }}</button>
          <button :aria-pressed="f.accountId === NO_ACCOUNT" :class="{ on: f.accountId === NO_ACCOUNT }" @click="f.accountId = f.accountId === NO_ACCOUNT ? 'all' : NO_ACCOUNT">No account</button>
        </template>
      </div>
      <div v-if="filterCount" class="active" role="status">
        <span>{{ filterCount }} filter{{ filterCount === 1 ? '' : 's' }}<template v-if="f.day"> · {{ niceShort(f.day) }}</template> · {{ shownCount }} of {{ txns.length }}</span>
        <button @click="clear">Clear filters</button>
      </div>
    </div>

    <div v-if="!txns.length" class="card empty rise" style="margin-top:20px;--i:3">
      <div class="art"><Icon name="receipt" :size="28" /></div>
      <h2 style="margin-bottom:4px">Nothing here yet</h2>
      <p class="muted" style="margin:0">Tap the + button to add your first transaction.</p>
    </div>
    <div v-else-if="!filtered.length" class="card empty rise" style="margin-top:20px;--i:3">
      <div class="art"><Icon name="search" :size="28" /></div>
      <h2 style="margin-bottom:4px">{{ filterCount ? 'Nothing matches' : `Nothing in ${monthLabel(f.month)}` }}</h2>
      <p class="muted" style="margin:0 0 14px">{{ filterCount ? 'Try a different word, or clear the filters.' : 'Nothing was recorded this month.' }}</p>
      <button v-if="filterCount" class="btn soft" @click="clear">Clear filters</button>
      <button v-else class="btn soft" @click="f.month = 'all'">Show all time</button>
    </div>

    <div v-for="g in page.groups" :key="g.date" class="grp">
      <div class="dayhead"><span>{{ nice(g.date) }}</span><span class="dn num" :class="{ good: g.net > 0 }">{{ g.net > 0 ? '+' : g.net < 0 ? '−' : '' }}{{ money(Math.abs(g.net)) }}</span></div>
      <div class="card white" style="padding:2px 18px"><TxnItem v-for="t in g.items" :key="t.id" :t="t" removable /></div>
    </div>
    <button v-if="page.shown < page.total" class="btn soft more" @click="limit += PAGE">Show more · {{ page.total - page.shown }} left</button>
  </div>
</template>

<script setup lang="ts">
import { activeFilterCount, dailyBars, defaultFilters, filterTxns, groupByDay, limitGroups, NO_ACCOUNT, summarize } from '../utils/activity'

useSeoMeta({ title: 'Activity' })
const PAGE = 40
const { state } = useBudget()
const txns = useTransactions()
const thisMonth = today().slice(0, 7)
const f = reactive(defaultFilters(thisMonth))
const limit = ref(PAGE)

const names = {
  account: (id?: string) => (id ? state.value.accounts.find(a => a.id === id)?.name ?? '' : ''),
  category: (k?: string) => (k ? CATEGORIES.find(c => c.key === k)?.label ?? '' : ''),
}
// The month's numbers ignore the other filters, so they stay put while you search and filter.
const monthTxns = computed(() => filterTxns(txns.value, { ...defaultFilters(f.month) }, names))
const sum = computed(() => summarize(monthTxns.value))
const strip = computed(() => dailyBars(txns.value, f.month === 'all' ? thisMonth : f.month))
const filtered = computed(() => filterTxns(txns.value, f, names))
const filterCount = computed(() => activeFilterCount(f))
const page = computed(() => limitGroups(groupByDay(filtered.value), limit.value))
const shownCount = computed(() => filtered.value.length)

watch(() => [f.month, f.kind, f.category, f.accountId, f.day, f.q], () => { limit.value = PAGE })
function shift(by: number) { f.month = shiftMonth(f.month, by); f.day = '' }
function clear() { Object.assign(f, { kind: 'all', category: 'all', accountId: 'all', day: '', q: '' }) }

const nice = (d: string) => new Date(d + 'T00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })
const niceShort = (d: string) => new Date(d + 'T00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
</script>

<style scoped>
.month { padding:16px; }
.nav { display:flex; align-items:center; justify-content:space-between; gap:8px; }
.circ { width:44px; height:44px; } .circ:disabled { opacity:.35; cursor:not-allowed; }
.mpill { white-space:nowrap; display:inline-flex; gap:8px; align-items:center; font-size:.85rem; font-weight:600; background:var(--card); border:1px solid var(--line); border-radius:99px; padding:10px 16px; }
.mpill.wide { flex:1; justify-content:center; }
.nav .mpill:not(.wide) { flex:1; justify-content:center; } .mpill svg { color:var(--accent); }
.all { display:block; margin:4px auto -6px; min-height:44px; padding:0 12px; background:none; border:0; color:var(--accent); font:inherit; font-size:.84rem; font-weight:700; cursor:pointer; }
.tiles { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:8px; margin:14px 0 0; }
.tiles div { background:var(--card); border-radius:14px; padding:10px; min-width:0; }
.tiles dt { font-size:.7rem; color:var(--muted); font-weight:600; } .tiles dd { margin:2px 0 0; font-weight:700; font-size:.85rem; overflow-wrap:anywhere; }
.good { color:var(--good-ink); } .bad { color:var(--bad); }
.hint { margin:8px 0 0; text-align:center; }
.find { margin-top:16px; display:flex; flex-direction:column; gap:12px; }
.search { display:flex; align-items:center; gap:10px; background:var(--surface); border:1.5px solid var(--line); border-radius:16px; padding:0 14px; min-height:48px; color:var(--muted); }
.search:focus-within { border-color:var(--accent); box-shadow:0 0 0 4px rgba(239,106,58,.12); }
.search input { flex:1; min-width:0; border:0; outline:0; background:none; font:inherit; color:var(--ink); padding:12px 0; }
.chips { display:flex; gap:8px; overflow-x:auto; padding:2px 2px 6px; margin:0 -2px; scrollbar-width:none; }
.chips::-webkit-scrollbar { display:none; }
.chips button { flex:none; display:inline-flex; align-items:center; gap:7px; min-height:44px; padding:0 14px; border-radius:99px; border:1.5px solid var(--line); background:var(--surface); font:inherit; font-size:.84rem; font-weight:600; color:var(--ink2); cursor:pointer; }
.chips button.on { border-color:var(--accent); background:var(--tint-accent-soft); color:var(--ink); }
.chips i { width:9px; height:9px; border-radius:3px; display:block; }
.sep { flex:none; width:1px; background:var(--line); margin:8px 2px; }
.active { display:flex; justify-content:space-between; align-items:center; gap:10px; font-size:.82rem; color:var(--muted); font-weight:600; }
.active button { min-height:44px; padding:0 4px; background:none; border:0; color:var(--accent); font:inherit; font-weight:700; cursor:pointer; }
.grp { margin-top:6px; }
.dayhead { position:sticky; top:env(safe-area-inset-top, 0px); z-index:3; display:flex; justify-content:space-between; align-items:center; gap:12px; padding:14px 4px 8px; margin-top:6px; background:var(--bg); font-size:.78rem; font-weight:700; text-transform:uppercase; letter-spacing:.06em; color:var(--muted); }
.dn { text-transform:none; letter-spacing:0; font-size:.85rem; }
.more { margin-top:16px; }
</style>
