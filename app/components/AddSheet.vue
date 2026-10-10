<template>
  <Transition name="slide">
    <div v-if="sheet.open" class="screen" :style="themeVars">
      <div class="top">
        <div class="bar-row">
          <button class="circ back" aria-label="Back" @click="back"><Icon name="back" :size="22" :stroke="2.4" /></button>
          <strong>{{ step === 2 ? 'Your breakdown' : 'New Transaction' }}</strong>
          <span class="spacer" />
        </div>

        <template v-if="step === 1">
          <Seg v-model="mode" variant="glass" :options="[{ value: 'income', label: 'Money in' }, { value: 'expense', label: 'Expense' }]" />
          <div class="amtrow">
            <div class="amount" :class="[{ empty: !str }, sizeClass]">{{ display }}</div>
            <button class="zeros" aria-label="Add three zeros" :disabled="!canZeros" @click="press('000')">000</button>
          </div>

          <!-- what this entry will do, live -->
          <div class="live" aria-live="polite">
            <template v-if="sheet.mode === 'income'">
              <div class="ribbon" :class="{ ghost: !amount }" role="img" :aria-label="ribbonLabel">
                <i v-for="c in CATEGORIES" :key="c.key" :style="{ flexGrow: ribbon[c.key], background: c.color }" />
              </div>
              <div class="legend">
                <span v-for="c in CATEGORIES" :key="c.key" :class="{ dim: !ribbon[c.key] }"><b :style="{ background: c.color }" />{{ c.label }} <em>{{ amount ? compactNumber(preview[c.key]) : `${rulePct[c.key]}%` }}</em></span>
              </div>
            </template>
            <template v-else>
              <div class="meter" :class="{ over: impact.over > 0, none: !impact.hasBudget }" role="img" :aria-label="meterText">
                <i class="used" :style="{ width: Math.min(1, impact.before) * 100 + '%' }" />
                <i class="add" :style="{ left: Math.min(1, impact.before) * 100 + '%', width: Math.max(0, Math.min(1, impact.after) - Math.min(1, impact.before)) * 100 + '%' }" />
              </div>
              <p class="mtext">{{ meterText }}</p>
              <p v-if="safeText" class="mtext soft">{{ safeText }}</p>
            </template>
          </div>

          <div class="lblrow">
            <input v-model="label" class="lbl" :placeholder="sheet.mode === 'income' ? 'Label, e.g. October salary' : 'What was it for?'" />
            <label class="datepill">
              <Icon name="calendar" :size="15" /> {{ dateText }}
              <input v-model="date" type="date" aria-label="Date" :max="today()" />
            </label>
          </div>
          <div v-if="picks.length" class="picks" role="group" aria-label="Quick picks">
            <button v-for="h in picks" :key="h.key" :aria-label="`Use ${h.label}, usually ${money(h.amount)}`" @click="applyPick(h)">{{ h.label }} <em>{{ compactNumber(h.amount) }}</em></button>
          </div>
        </template>
        <template v-else>
          <div class="amount" style="margin-top:14px">{{ money(amount) }}</div>
          <div class="sub">Drag to adjust. The rest rebalances automatically.</div>
        </template>
      </div>

      <div class="panel">
        <!-- step 1: choices and keypad -->
        <template v-if="step === 1">
          <div v-if="sheet.mode === 'expense'" class="group" role="group" aria-label="Category">
            <span class="gl">Category</span>
            <div class="chips">
              <button v-for="c in spendCats" :key="c.key" :aria-pressed="eCat === c.key" :class="{ on: eCat === c.key }" :style="eCat === c.key ? { borderColor: c.color, background: c.color + '24' } : {}" @click="eCat = c.key"><Icon :name="c.icon" :size="16" :style="{ color: c.color }" /> {{ c.label }}</button>
            </div>
          </div>
          <div v-if="state.accounts.length" class="group" role="group" aria-label="Account">
            <span class="gl">{{ sheet.mode === 'income' ? 'Into' : 'From' }}</span>
            <div class="chips scroll">
              <button v-for="a in state.accounts" :key="a.id" :aria-pressed="accountId === a.id" :class="{ on: accountId === a.id }" @click="accountId = a.id"><i class="dot" :style="{ background: a.color }" />{{ a.name }} <small class="num">{{ money(a.balance) }}</small></button>
              <button :aria-pressed="accountId === ''" :class="{ on: accountId === '' }" @click="accountId = ''">No account</button>
            </div>
          </div>
          <p v-if="sheet.mode === 'expense' && short" class="hint bad" role="alert">{{ short }} Pick another account, or "No account".</p>
          <p v-else-if="accountId && amount > 0" class="hint">{{ afterText }}</p>
          <div class="keys">
            <button v-for="k in keys" :key="k" :aria-label="k === 'back' ? 'Delete' : k" @click="press(k)">
              <Icon v-if="k === 'back'" name="backspace" :size="24" :stroke="1.8" />
              <template v-else>{{ k }}</template>
            </button>
          </div>
          <button class="btn cta" :disabled="!(amount > 0) || (sheet.mode === 'expense' && !!short)" @click="sheet.mode === 'income' ? toBreakdown() : addExp()">{{ sheet.mode === 'income' ? 'See my breakdown' : 'Add Transaction' }}<Icon :name="sheet.mode === 'income' ? 'next' : 'check'" :size="18" :stroke="2.6" /></button>
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
import { compactNumber, keypadSymbol } from '../utils/money'
import { ADD_THEMES, expenseImpact, habitsFrom, themeFor, type Habit } from '../utils/quickadd'
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
/** Long amounts get a smaller type size so they stay on one line. */
const sizeClass = computed(() => (display.value.length > 12 ? 'xs' : display.value.length > 9 ? 'sm' : ''))
const dateText = computed(() => (date.value === today() ? 'Today' : date.value === addDays(today(), -1) ? 'Yesterday' : new Date(date.value + 'T00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })))

/** Three zeros are only for whole amounts: not on an empty amount, and not once a decimal point is typed. */
const canZeros = computed(() => !!str.value && str.value !== '0' && !str.value.includes('.') && str.value.length + 3 <= 10)
function press(k: string) {
  if (import.meta.client) navigator.vibrate?.(6)
  if (k === '000') { if (canZeros.value) str.value += '000'; return }
  if (k === 'back') { str.value = str.value.slice(0, -1); return }
  if (k === '.') { if (!str.value.includes('.')) str.value = (str.value || '0') + '.'; return }
  const dec = str.value.split('.')[1]
  if ((dec !== undefined && dec.length >= 2) || str.value.replace('.', '').length >= 10) return
  str.value = str.value === '0' ? k : str.value + k
}

// ---- The picture under the amount ----
const theme = computed(() => themeFor(sheet.value.mode, eCat.value))
const themeVars = computed(() => ({ '--g1': ADD_THEMES[theme.value][0], '--g2': ADD_THEMES[theme.value][1] }))
/** How a pay would divide, as you type. With no amount yet it shows your own rule. */
const preview = computed(() => suggestSplit(amount.value, totalMinDebt.value, splitRule.value))
const rulePct = computed(() => ({ needs: splitRule.value.needs, wants: splitRule.value.wants, savings: splitRule.value.savings, debt: 0 }) as Record<Category, number>)
const ribbon = computed(() => (amount.value > 0 ? preview.value : rulePct.value) as Record<Category, number>)
const ribbonLabel = computed(() => (amount.value > 0 ? `This would divide into ${CATEGORIES.map(c => `${c.label} ${money(preview.value[c.key])}`).join(', ')}` : `Your split rule: ${splitLabel(splitRule.value)}`))

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
const impact = computed(() => expenseImpact({ budgeted: stats.value.budgeted[eCat.value], spent: stats.value.spent[eCat.value], amount: amount.value }))
const safe = useSafeToSpend()
const meterText = computed(() => {
  const c = catMeta(eCat.value).label, i = impact.value
  if (!i.hasBudget) return `No ${c} budget yet. Add money in to set one.`
  if (!amount.value) return `${money(Math.max(0, left.value))} left in ${c} this month`
  return i.over > 0 ? `${money(i.over)} over your ${c} budget` : `${money(i.left)} left in ${c} after this`
})
/** Today's allowance, before and after, for something spent today on Needs or Wants. */
const safeText = computed(() => {
  const s = safe.value
  if (!amount.value || !s.hasBudget || date.value !== today() || (eCat.value !== 'needs' && eCat.value !== 'wants') || s.leftToday <= 0) return ''
  return `Safe to spend today: ${money(s.leftToday)} → ${money(Math.max(0, s.leftToday - amount.value))}`
})

// ---- Quick picks: what you add again and again ----
const picks = computed<Habit[]>(() => {
  const entries = sheet.value.mode === 'income'
    ? state.value.incomes.map(i => ({ label: i.label, amount: i.amount, date: i.date, accountId: i.accountId }))
    : state.value.expenses.filter(e => !e.debtId).map(e => ({ label: e.label, amount: e.amount, date: e.date, category: e.category, accountId: e.accountId }))
  const typed = label.value.trim().toLowerCase().replace(/\s+/g, ' ')
  // Suggestions narrow as you type, and once what you typed is exactly one of them there is nothing left to suggest.
  return habitsFrom(entries, today(), 12).filter(h => h.key !== typed && (!typed || h.key.includes(typed))).slice(0, 6)
})
function applyPick(h: Habit) {
  label.value = h.label
  if (sheet.value.mode === 'expense' && h.category && spendCats.some(c => c.key === h.category)) eCat.value = h.category as Category
  if (h.accountId && state.value.accounts.some(a => a.id === h.accountId)) accountId.value = h.accountId
  if (!str.value) str.value = String(h.amount)
}
function addExp() { addExpense(label.value.trim(), amount.value, eCat.value, undefined, date.value, undefined, accountId.value || undefined); remember(); showToast(`${money(amount.value)} added to ${catMeta(eCat.value).label}${accountName.value ? `, taken from ${accountName.value}` : ''}`); close() }

function back() { if (step.value === 2) step.value = 1; else close() }
function close() {
  sheet.value.open = false
  step.value = 1; str.value = ''; label.value = ''; date.value = today()
}
</script>

<style scoped>
.screen { --g1:#ea6f2b; --g2:#d44412; position:fixed; top:0; bottom:0; left:0; right:0; margin:0 auto; max-width:480px; z-index:50; background:var(--g2); display:flex; flex-direction:column; }
.top { background:linear-gradient(160deg,var(--g1),var(--g2)); color:#fff; padding:calc(12px + env(safe-area-inset-top)) 18px 34px; }
.bar-row { display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; }
.bar-row .circ { background:rgba(255,255,255,.22); border:0; color:#fff; box-shadow:none; backdrop-filter:blur(6px); }
.spacer { width:42px; }
.amtrow { position:relative; margin:14px 0 6px; }
.amount { text-align:center; font-variant-numeric:tabular-nums; transition:opacity .2s; font-size:3rem; font-weight:700; letter-spacing:-.03em; line-height:1.1; overflow-wrap:anywhere; padding:0 54px; white-space:nowrap; }
.amount.empty { opacity:.55; }
.amount.sm { font-size:2.5rem; } .amount.xs { font-size:2rem; }
.zeros { position:absolute; right:0; top:50%; transform:translateY(-50%); min-width:48px; min-height:44px; border-radius:99px; border:0; background:rgba(255,255,255,.22); color:#fff; font:inherit; font-weight:700; font-size:.9rem; cursor:pointer; }
.zeros:disabled { opacity:.35; cursor:default; }
.zeros:active:not(:disabled) { transform:translateY(-50%) scale(.92); }
.sub { text-align:center; opacity:.9; font-size:.85rem; }

.live { margin:6px 0 12px; min-height:58px; }
.ribbon { display:flex; gap:3px; height:14px; border-radius:99px; overflow:hidden; background:rgba(255,255,255,.2); }
.ribbon i { display:block; flex-basis:0; flex-shrink:1; min-width:0; transition:flex-grow .45s var(--ease); }
.ribbon.ghost { opacity:.55; }
.legend { display:flex; justify-content:space-between; gap:6px; margin-top:8px; font-size:.74rem; font-weight:600; flex-wrap:wrap; row-gap:2px; }
.legend span { display:inline-flex; align-items:center; gap:5px; white-space:nowrap; } .legend span.dim { opacity:.55; }
.legend b { display:inline-block; width:9px; height:9px; border-radius:3px; border:1.5px solid rgba(255,255,255,.85); box-sizing:border-box; }
.legend em { font-style:normal; opacity:.95; font-variant-numeric:tabular-nums; }
.meter { position:relative; height:14px; border-radius:99px; overflow:hidden; background:rgba(255,255,255,.22); }
.meter .used { position:absolute; left:0; top:0; bottom:0; background:rgba(255,255,255,.7); transition:width .45s var(--ease); }
.meter .add { position:absolute; top:0; bottom:0; background:#fff; transition:left .45s var(--ease), width .35s var(--ease); }
.meter.over .add { background:repeating-linear-gradient(135deg,#fff 0 6px,rgba(255,255,255,.55) 6px 12px); }
.meter.none { opacity:.55; }
.mtext { margin:8px 0 0; text-align:center; font-size:.84rem; font-weight:600; line-height:1.35; }
.mtext.soft { margin-top:2px; font-weight:500; opacity:.9; }

.lblrow { display:flex; gap:8px; align-items:center; }
.lbl { flex:1; min-width:0; text-align:left; background:rgba(255,255,255,.2); border:0; color:#fff; border-radius:99px; padding:12px 16px; min-height:44px; font:inherit; font-size:.92rem; outline:none; }
.lbl::placeholder { color:rgba(255,255,255,.85); }
.lbl:focus { background:rgba(255,255,255,.3); }
.datepill { position:relative; flex:none; display:inline-flex; align-items:center; gap:6px; min-height:44px; padding:0 14px; border-radius:99px; background:rgba(255,255,255,.2); font-size:.85rem; font-weight:600; cursor:pointer; white-space:nowrap; }
.datepill input { position:absolute; inset:0; width:100%; height:100%; opacity:0; cursor:pointer; }
.picks { display:flex; gap:8px; overflow-x:auto; margin:10px -18px 0; padding:2px 18px 4px; scrollbar-width:none; }
.picks::-webkit-scrollbar { display:none; }
.picks button { flex:none; display:inline-flex; align-items:center; gap:6px; min-height:40px; padding:0 14px; border-radius:99px; border:1.5px solid rgba(255,255,255,.55); background:transparent; color:#fff; font:inherit; font-size:.84rem; font-weight:600; cursor:pointer; }
.picks button:active { background:rgba(255,255,255,.25); }
.picks em { font-style:normal; opacity:.85; font-weight:500; font-variant-numeric:tabular-nums; }

.panel { flex:1; overflow:auto; background:var(--surface); border-radius:28px 28px 0 0; margin-top:-24px; padding:16px 18px calc(16px + env(safe-area-inset-bottom)); }
.group { margin-bottom:12px; }
.gl { display:block; font-size:.72rem; font-weight:700; color:var(--muted); text-transform:uppercase; letter-spacing:.07em; margin:0 2px 6px; }
.chips { display:flex; gap:8px; flex-wrap:wrap; }
.chips.scroll { flex-wrap:nowrap; overflow-x:auto; margin:0 -18px; padding:2px 18px 4px; scrollbar-width:none; }
.chips.scroll::-webkit-scrollbar { display:none; }
.chips button { flex:none; display:inline-flex; align-items:center; gap:7px; min-height:44px; padding:0 14px; border-radius:99px; border:1.5px solid var(--line); background:var(--card); color:var(--ink); font:inherit; font-size:.85rem; font-weight:600; cursor:pointer; transition:transform .15s var(--spring); }
.chips button:active { transform:scale(.95); }
.chips button.on { border-color:var(--accent); background:var(--tint-accent-soft); }
.chips small { color:var(--muted); font-weight:500; }
.dot { width:9px; height:9px; border-radius:50%; flex:none; display:block; }
.hint { text-align:center; font-size:.8rem; color:var(--muted); margin:6px 0 0; } .hint.bad { color:var(--bad); }
.keys { display:grid; grid-template-columns:repeat(3,1fr); gap:2px; margin:6px 0 10px; }
.keys button { display:grid; place-items:center; background:none; border:0; font:inherit; font-size:1.55rem; font-weight:500; padding:9px 0; cursor:pointer; color:var(--ink); border-radius:18px; transition:background .15s, transform .15s var(--spring); }
.keys button:active { background:var(--card); transform:scale(.9); }
.cta { position:sticky; bottom:0; z-index:2; }
.cat { padding:10px 0; } .cat + .cat { border-top:1px solid var(--line); }
.cat input[type=range] { -webkit-appearance:none; appearance:none; width:100%; height:6px; border-radius:99px; margin:12px 0 4px; outline:none; background:linear-gradient(to right,var(--c) var(--p),var(--track) var(--p)); }
.cat input[type=range]::-webkit-slider-thumb { -webkit-appearance:none; width:22px; height:22px; border-radius:50%; background:var(--surface); border:3px solid var(--c); box-shadow:0 2px 6px rgba(0,0,0,.2); cursor:pointer; }
.cat input[type=range]::-moz-range-thumb { width:18px; height:18px; border-radius:50%; background:var(--surface); border:3px solid var(--c); cursor:pointer; }
.slide-enter-active { transition:transform .5s cubic-bezier(.2,1,.3,1), opacity .3s; } .slide-leave-active { transition:transform .3s ease-in, opacity .3s; }
.slide-enter-from,.slide-leave-to { transform:translateY(100%); opacity:.6; }

/* Short phones: tighten the header and the keys so the keypad stays on screen */
@media (max-height: 880px) {
  .top { padding-bottom:28px; } .bar-row { margin-bottom:8px; }
  .amtrow { margin:8px 0 2px; }
  .live { margin:4px 0 8px; min-height:50px; }
  .keys { margin-bottom:6px; } .keys button { padding:6px 0; font-size:1.4rem; }
  .group { margin-bottom:8px; } .panel { padding-top:14px; }
}
@media (max-height: 700px) { .picks { display:none; } .amount { font-size:2.4rem; } .amount.sm { font-size:2.1rem; } .amount.xs { font-size:1.8rem; } .keys button { padding:4px 0; font-size:1.3rem; } }
@media (prefers-reduced-motion: reduce) { .ribbon i, .meter .used, .meter .add { transition:none; } }
</style>
