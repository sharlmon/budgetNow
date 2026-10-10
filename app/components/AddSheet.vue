<template>
  <Transition name="slide">
    <div v-if="sheet.open" class="screen">
      <div class="top">
        <div class="bar-row">
          <button class="circ back" aria-label="Back" @click="back"><Icon name="back" :size="22" :stroke="2.4" /></button>
          <strong>{{ step === 2 ? 'Your breakdown' : 'New Transaction' }}</strong>
          <span style="width:40px" />
        </div>

        <template v-if="step === 1">
          <Seg v-model="mode" variant="glass" :options="[{ value: 'income', label: 'Money in' }, { value: 'expense', label: 'Expense' }]" />
          <div class="amount" :class="{ empty: !str }">{{ display }}</div>
          <input v-model="label" class="lbl" :placeholder="sheet.mode === 'income' ? 'Label, e.g. October salary' : 'What was it for?'" />
        </template>
        <template v-else>
          <div class="amount">{{ money(amount) }}</div>
          <div class="sub">Drag to adjust. The rest rebalances automatically.</div>
        </template>
      </div>

      <div class="panel">
        <!-- step 1: keypad -->
        <template v-if="step === 1">
          <div class="pills">
            <label v-if="sheet.mode === 'expense'" class="pill">
              <span class="pl"><Icon :name="catMeta(eCat).icon" :size="16" /> {{ catMeta(eCat).label }}</span><Icon name="down" :size="14" />
              <select v-model="eCat"><option v-for="c in spendCats" :key="c.key" :value="c.key">{{ c.label }}</option></select>
            </label>
            <span v-else class="pill static"><span class="pl"><Icon name="in" :size="16" /> Income</span></span>
            <label class="pill">
              <span class="pl"><Icon name="calendar" :size="16" /> {{ prettyDate }}</span><Icon name="down" :size="14" />
              <input v-model="date" type="date" />
            </label>
          </div>
          <div v-if="state.accounts.length" class="pills acctrow">
            <label class="pill">
              <span class="pl"><Icon name="wallet" :size="16" /> {{ accountLabel }}</span><Icon name="down" :size="14" />
              <select v-model="accountId" aria-label="Account"><option value="">No account</option><option v-for="a in state.accounts" :key="a.id" :value="a.id">{{ a.name }} · {{ money(a.balance) }}</option></select>
            </label>
          </div>
          <p v-if="sheet.mode === 'expense' && short" class="hint bad" role="alert">{{ short }} Pick another account, or "No account".</p>
          <p v-else-if="accountId && amount > 0" class="hint">{{ afterText }}</p>
          <p v-if="sheet.mode === 'expense' && amount > 0" class="hint" :class="{ bad: over > 0 }">
            <template v-if="over > 0">That's {{ money(over) }} over your {{ catMeta(eCat).label }} budget.</template>
            <template v-else>{{ money(left - amount) }} will be left in {{ catMeta(eCat).label }}.</template>
          </p>
          <p v-else-if="sheet.mode === 'income'" class="hint">Next, you'll see how it gets divided.</p>
          <div class="keys">
            <button v-for="k in keys" :key="k" @click="press(k)">
              <Icon v-if="k === 'back'" name="backspace" :size="26" :stroke="1.8" />
              <template v-else>{{ k }}</template>
            </button>
          </div>
          <button class="btn" :disabled="!(amount > 0) || (sheet.mode === 'expense' && !!short)" @click="sheet.mode === 'income' ? toBreakdown() : addExp()">{{ sheet.mode === 'income' ? 'See my breakdown' : 'Add Transaction' }}<Icon :name="sheet.mode === 'income' ? 'next' : 'check'" :size="18" :stroke="2.6" /></button>
        </template>

        <!-- step 2: breakdown -->
        <template v-else>
          <Donut :segments="segments" :size="190">
            <small class="muted">Total</small><strong style="font-size:1.25rem">{{ money(amount) }}</strong>
          </Donut>
          <p v-if="totalMinDebt > 0" class="hint" style="margin-top:10px">Debt minimums ({{ money(totalMinDebt) }}) are covered first, then {{ splitLabel(splitRule) }} (change it in Settings).</p>
          <p v-else class="hint" style="margin-top:10px">Split {{ splitLabel(splitRule) }} between Needs, Wants and Savings (change it in Settings).</p>
          <div v-for="c in CATEGORIES" :key="c.key" class="cat">
            <div class="row">
              <CatIcon :cat="c.key" :size="40" />
              <div class="grow"><strong>{{ c.label }}</strong><br><small :style="{ color: c.color, fontWeight: 700 }">{{ pct(c.key).toFixed(0) }}%</small></div>
              <div style="width:120px"><AmountInput :model-value="split[c.key]" @update:model-value="v => setCat(c.key, v)" /></div>
            </div>
            <input type="range" min="0" :max="amount" step="1" :value="split[c.key]" :style="{ '--c': c.color, '--p': pct(c.key) + '%' }" @input="e => setCat(c.key, +(e.target as HTMLInputElement).value)" />
          </div>
          <button class="btn" style="margin-top:14px" @click="confirm">Looks good, confirm<Icon name="check" :size="18" :stroke="2.6" /></button>
          <button class="link" style="display:block;margin:14px auto 0" @click="resetSplit">Reset to suggestion</button>
        </template>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { splitLabel, suggestSplit } from '../utils/split'
import { keypadSymbol } from '../utils/money'
const sheet = useSheet()
const mode = computed({ get: () => sheet.value.mode, set: (v: string) => { sheet.value.mode = v as 'income' | 'expense' } })
const { state, totalMinDebt, addIncome, addExpense, accountShort } = useBudget()
const symbol = computed(() => keypadSymbol(currency.value))

const step = ref(1)
const str = ref('')
const label = ref('')
const date = ref(today())
const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'back']
const amount = computed(() => parseFloat(str.value) || 0)
const display = computed(() => {
  const [i = '0', d] = (str.value || '0').split('.')
  const grouped = Number(i || 0).toLocaleString('en-US')
  return `${symbol.value}${grouped}${d !== undefined ? '.' + d : str.value.endsWith('.') ? '.' : ''}`
})
const prettyDate = computed(() => new Date(date.value + 'T00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }))

function press(k: string) {
  if (import.meta.client) navigator.vibrate?.(6)
  if (k === 'back') { str.value = str.value.slice(0, -1); return }
  if (k === '.') { if (!str.value.includes('.')) str.value = (str.value || '0') + '.'; return }
  const dec = str.value.split('.')[1]
  if ((dec !== undefined && dec.length >= 2) || str.value.replace('.', '').length >= 10) return
  str.value = str.value === '0' ? k : str.value + k
}

const split = reactive<Record<Category, number>>({ needs: 0, wants: 0, savings: 0, debt: 0 })
const r2 = (n: number) => Math.round(n * 100) / 100
const pct = (k: Category) => (amount.value > 0 ? (split[k] / amount.value) * 100 : 0)
const segments = computed(() => CATEGORIES.map(c => ({ value: split[c.key], color: c.color })))
function resetSplit() { Object.assign(split, suggestSplit(amount.value, totalMinDebt.value, splitRule.value)) }
function toBreakdown() { resetSplit(); step.value = 2 }
/** Set one category and spread the change across the others so the total always matches. */
function setCat(k: Category, v: number) {
  const total = amount.value
  v = Math.min(total, Math.max(0, r2(v)))
  const others = CATEGORIES.map(c => c.key).filter(x => x !== k)
  const rest = r2(total - v)
  const oldSum = others.reduce((s, x) => s + split[x], 0)
  let acc = 0
  others.forEach((x, i) => {
    const n = i === others.length - 1 ? r2(rest - acc) : oldSum > 0 ? r2(rest * split[x] / oldSum) : r2(rest / others.length)
    split[x] = Math.max(0, n); acc += split[x]
  })
  split[k] = r2(total - others.reduce((s, x) => s + split[x], 0))
}
function confirm() {
  addIncome(label.value.trim(), amount.value, { ...split }, date.value, accountId.value || undefined)
  remember()
  showToast(`${label.value.trim() || 'Income'} added and split${accountName.value ? `, and ${money(amount.value)} added to ${accountName.value}` : ''}`)
  close()
}

// Which account the money goes into or comes out of. It starts on the one used last time for this kind of entry.
const accountId = ref('')
const accountName = computed(() => state.value.accounts.find(a => a.id === accountId.value)?.name ?? '')
const accountLabel = computed(() => (accountName.value ? `${sheet.value.mode === 'income' ? 'Into' : 'From'} ${accountName.value}` : 'No account'))
const lastKey = () => `bn:lastAccount:${sheet.value.mode}`
function pickDefault() {
  if (!state.value.accounts.length) { accountId.value = ''; return }
  let last: string | null = null
  try { last = localStorage.getItem(lastKey()) } catch { /* private mode */ }
  accountId.value = last === '' ? '' : state.value.accounts.find(a => a.id === last)?.id ?? state.value.accounts[0]!.id
}
function remember() { try { localStorage.setItem(lastKey(), accountId.value) } catch { /* it just will not be remembered */ } }
watch(() => [sheet.value.open, sheet.value.mode, state.value.accounts.length] as const, ([open]) => { if (open) pickDefault() }, { immediate: true })
const short = computed(() => (amount.value > 0 ? accountShort(accountId.value || undefined, amount.value) : null))
const afterText = computed(() => {
  const a = state.value.accounts.find(x => x.id === accountId.value)
  if (!a) return ''
  return sheet.value.mode === 'income' ? `${a.name} will have ${money(a.balance + amount.value)}.` : `${a.name} will have ${money(Math.max(0, a.balance - amount.value))} left.`
})

const spendCats = CATEGORIES.filter(c => c.key !== 'debt')
const eCat = ref<Category>('needs')
const month = computed(() => ym(date.value))
const stats = useMonthStats(month)
const left = computed(() => stats.value.budgeted[eCat.value] - stats.value.spent[eCat.value])
const over = computed(() => amount.value - left.value)
function addExp() { addExpense(label.value.trim(), amount.value, eCat.value, undefined, date.value, undefined, accountId.value || undefined); remember(); showToast(`${money(amount.value)} added to ${catMeta(eCat.value).label}${accountName.value ? `, taken from ${accountName.value}` : ''}`); close() }

function back() { if (step.value === 2) step.value = 1; else close() }
function close() {
  sheet.value.open = false
  step.value = 1; str.value = ''; label.value = ''; date.value = today()
}
</script>

<style scoped>
.screen { position:fixed; top:0; bottom:0; left:0; right:0; margin:0 auto; max-width:480px; z-index:50; background:var(--accent); display:flex; flex-direction:column; }
.top { background:var(--grad); color:#fff; padding:calc(14px + env(safe-area-inset-top)) 18px 40px; }
.bar-row { display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; }
.bar-row .circ { background:rgba(255,255,255,.22); border:0; color:#fff; box-shadow:none; backdrop-filter:blur(6px); }
.amount { text-align:center; font-variant-numeric:tabular-nums; transition:opacity .2s; font-size:3rem; font-weight:700; letter-spacing:-.03em; margin:22px 0 10px; line-height:1.1; }
.amount.empty { opacity:.55; }
.sub { text-align:center; opacity:.85; font-size:.85rem; }
.lbl { display:block; margin:0 auto; width:80%; text-align:center; background:rgba(255,255,255,.2); border:0; color:#fff; border-radius:99px; padding:10px 14px; font:inherit; font-size:.9rem; outline:none; }
.lbl::placeholder { color:rgba(255,255,255,.8); }
.panel { flex:1; overflow:auto; background:var(--surface); border-radius:28px 28px 0 0; margin-top:-24px; padding:20px 18px calc(18px + env(safe-area-inset-bottom)); }
.pills { display:flex; gap:10px; }
.acctrow { margin-top:10px; }
.pill { flex:1; position:relative; display:flex; align-items:center; justify-content:space-between; background:var(--card); border:1px solid var(--line); border-radius:99px; padding:11px 16px; font-size:.85rem; font-weight:500; cursor:pointer; }
.pl { display:inline-flex; align-items:center; gap:8px; } .pill svg { color:var(--muted); } .pl svg { color:var(--accent); }
.pill.static { cursor:default; }
.pill select, .pill input { position:absolute; inset:0; width:100%; height:100%; opacity:0; cursor:pointer; }
.hint { text-align:center; font-size:.8rem; color:var(--muted); margin:10px 0 0; } .hint.bad { color:var(--bad); }
.keys { display:grid; grid-template-columns:repeat(3,1fr); gap:2px; margin:6px 0 12px; }
.keys button { display:grid; place-items:center; background:none; border:0; font:inherit; font-size:1.7rem; font-weight:500; padding:14px 0; cursor:pointer; color:var(--ink); border-radius:18px; transition:background .15s, transform .15s var(--spring); }
.keys button:active { background:var(--card); transform:scale(.9); }
.cat { padding:10px 0; } .cat + .cat { border-top:1px solid var(--line); }
.cat input[type=range] { -webkit-appearance:none; appearance:none; width:100%; height:6px; border-radius:99px; margin:12px 0 4px; outline:none; background:linear-gradient(to right,var(--c) var(--p),var(--track) var(--p)); }
.cat input[type=range]::-webkit-slider-thumb { -webkit-appearance:none; width:22px; height:22px; border-radius:50%; background:var(--surface); border:3px solid var(--c); box-shadow:0 2px 6px rgba(0,0,0,.2); cursor:pointer; }
.cat input[type=range]::-moz-range-thumb { width:18px; height:18px; border-radius:50%; background:var(--surface); border:3px solid var(--c); cursor:pointer; }
.slide-enter-active { transition:transform .5s cubic-bezier(.2,1,.3,1), opacity .3s; } .slide-leave-active { transition:transform .3s ease-in, opacity .3s; }
.slide-enter-from,.slide-leave-to { transform:translateY(100%); opacity:.6; }
</style>
