export type Category = 'needs' | 'wants' | 'savings' | 'debt'
export const CATEGORIES: { key: Category; label: string; hint: string; color: string; icon: string }[] = [
  { key: 'needs', label: 'Needs', hint: 'Rent, food, transport', color: '#ef6a3a', icon: 'house' },
  { key: 'wants', label: 'Wants', hint: 'Fun, eating out, subs', color: '#f5c242', icon: 'bag' },
  { key: 'savings', label: 'Savings', hint: 'Emergency fund, goals', color: '#2fb67c', icon: 'piggy' },
  { key: 'debt', label: 'Debt', hint: 'Loans and cards', color: '#5b8def', icon: 'card' },
]
export const catMeta = (k: Category) => CATEGORIES.find(c => c.key === k)!

export interface Income { id: string; label: string; amount: number; date: string; split: Record<Category, number> }
export interface Expense { id: string; label: string; amount: number; category: Category; date: string; debtId?: string }
export interface Debt { id: string; name: string; balance: number; original?: number; minPayment: number }
interface State { incomes: Income[]; expenses: Expense[]; debts: Debt[] }

const KEY = 'budgetnow:v1'
const uid = () => Math.random().toString(36).slice(2, 10)
export const today = () => new Date().toLocaleDateString('sv')
const round = (n: number) => Math.round(n * 100) / 100

/** Default rule: min debt payments first, then 50/30/20 across what's left (percentages of the whole income). */
export function suggestSplit(amount: number, minDebt: number): Record<Category, number> {
  const debt = Math.min(round(minDebt), amount)
  const rest = amount - debt
  const needs = round(rest * 0.5)
  const wants = round(rest * 0.3)
  const savings = round(rest - needs - wants)
  return { needs, wants, savings, debt }
}

export function useBudget() {
  const state = useState<State>('budget', () => ({ incomes: [], expenses: [], debts: [] }))
  const loaded = useState('budget-loaded', () => false)

  if (import.meta.client && !loaded.value) {
    try {
      const raw = localStorage.getItem(KEY)
      if (raw) state.value = { ...state.value, ...JSON.parse(raw) }
    } catch { /* corrupt or blocked storage: start fresh */ }
    loaded.value = true
    watch(state, (v) => {
      try { localStorage.setItem(KEY, JSON.stringify(v)) } catch { /* ignore */ }
    }, { deep: true })
  }

  const totalMinDebt = computed(() => state.value.debts.reduce((s, d) => s + (d.balance > 0 ? Math.min(d.minPayment, d.balance) : 0), 0))
  const totalDebt = computed(() => state.value.debts.reduce((s, d) => s + d.balance, 0))

  const budgeted = computed(() => {
    const t: Record<Category, number> = { needs: 0, wants: 0, savings: 0, debt: 0 }
    for (const i of state.value.incomes) for (const c of CATEGORIES) t[c.key] += i.split[c.key]
    return t
  })
  const spent = computed(() => {
    const t: Record<Category, number> = { needs: 0, wants: 0, savings: 0, debt: 0 }
    for (const e of state.value.expenses) t[e.category] += e.amount
    return t
  })
  const totalSpent = computed(() => state.value.expenses.reduce((s, e) => s + e.amount, 0))
  const totalIncome = computed(() => state.value.incomes.reduce((s, i) => s + i.amount, 0))

  function addIncome(label: string, amount: number, split: Record<Category, number>, date = today()) {
    state.value.incomes.unshift({ id: uid(), label, amount, date, split })
  }
  function addExpense(label: string, amount: number, category: Category, debtId?: string, date = today()) {
    state.value.expenses.unshift({ id: uid(), label, amount, category, date, debtId })
    if (debtId) {
      const d = state.value.debts.find(x => x.id === debtId)
      if (d) d.balance = Math.max(0, round(d.balance - amount))
    }
  }
  /** Removes an expense and returns a function that puts it back (used for Undo). */
  function removeExpense(id: string) {
    const i = state.value.expenses.findIndex(e => e.id === id)
    if (i < 0) return () => {}
    const [e] = state.value.expenses.splice(i, 1)
    const debt = e?.debtId ? state.value.debts.find(x => x.id === e!.debtId) : undefined
    if (debt && e) debt.balance = round(debt.balance + e.amount)
    return () => {
      if (!e) return
      state.value.expenses.splice(Math.min(i, state.value.expenses.length), 0, e)
      if (debt) debt.balance = Math.max(0, round(debt.balance - e.amount))
    }
  }
  function removeIncome(id: string) {
    const i = state.value.incomes.findIndex(x => x.id === id)
    if (i < 0) return () => {}
    const [inc] = state.value.incomes.splice(i, 1)
    return () => { if (inc) state.value.incomes.splice(Math.min(i, state.value.incomes.length), 0, inc) }
  }
  function addDebt(name: string, balance: number, minPayment: number) {
    state.value.debts.push({ id: uid(), name, balance, original: balance, minPayment })
  }
  function removeDebt(id: string) {
    state.value.debts = state.value.debts.filter(d => d.id !== id)
  }

  function resetAll() {
    state.value = { incomes: [], expenses: [], debts: [] }
  }

  return { totalSpent, resetAll, state, totalMinDebt, totalDebt, budgeted, spent, totalIncome, addIncome, addExpense, removeExpense, removeIncome, addDebt, removeDebt }
}

const CUR_KEY = 'budgetnow:currency'
export const currency = ref('USD')
if (import.meta.client) {
  try { currency.value = localStorage.getItem(CUR_KEY) || 'USD' } catch { /* ignore */ }
  watch(currency, v => { try { localStorage.setItem(CUR_KEY, v) } catch { /* ignore */ } })
}
export const userName = ref('')
if (import.meta.client) {
  try { userName.value = localStorage.getItem('budgetnow:name') || '' } catch { /* ignore */ }
  watch(userName, v => { try { localStorage.setItem('budgetnow:name', v) } catch { /* ignore */ } })
}
export const money = (n: number) =>
  new Intl.NumberFormat(undefined, { style: 'currency', currency: currency.value, currencyDisplay: 'narrowSymbol', minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 }).format(n)
export const ym = (d: string) => d.slice(0, 7)
export const monthLabel = (m: string) => new Date(m + '-01T00:00').toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
export const shiftMonth = (m: string, by: number) => { const d = new Date(m + '-01T00:00'); d.setMonth(d.getMonth() + by); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` }

export function useMonthStats(month: Ref<string>) {
  const { state } = useBudget()
  return computed(() => {
    const budgeted: Record<Category, number> = { needs: 0, wants: 0, savings: 0, debt: 0 }
    const spent: Record<Category, number> = { needs: 0, wants: 0, savings: 0, debt: 0 }
    let income = 0
    for (const i of state.value.incomes) if (ym(i.date) === month.value) { income += i.amount; for (const c of CATEGORIES) budgeted[c.key] += i.split[c.key] }
    for (const e of state.value.expenses) if (ym(e.date) === month.value) spent[e.category] += e.amount
    const spentTotal = CATEGORIES.reduce((a, c) => a + spent[c.key], 0)
    const spendBudget = income - budgeted.savings
    const savingsRate = income > 0 ? (budgeted.savings / income) * 100 : 0
    return { income, budgeted, spent, spentTotal, spendBudget, savingsRate }
  })
}

export const useSheet = () => useState('sheet', () => ({ open: false, mode: 'income' as 'income' | 'expense' }))

export interface Txn { id: string; kind: 'income' | 'expense'; title: string; amount: number; date: string; category?: Category }
export function useTransactions() {
  const { state } = useBudget()
  return computed<Txn[]>(() => [
    ...state.value.incomes.map(i => ({ id: i.id, kind: 'income' as const, title: i.label || 'Income', amount: i.amount, date: i.date })),
    ...state.value.expenses.map(e => ({ id: e.id, kind: 'expense' as const, title: e.label || catMeta(e.category).label, amount: e.amount, date: e.date, category: e.category })),
  ].sort((a, b) => b.date.localeCompare(a.date)))
}

export const useToast = () => useState<{ id: number; msg: string; undo?: () => void } | null>('toast', () => null)
let toastTimer: ReturnType<typeof setTimeout> | undefined
export function showToast(msg: string, undo?: () => void) {
  const t = useToast()
  t.value = { id: Date.now(), msg, undo }
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { t.value = null }, 4500)
}
