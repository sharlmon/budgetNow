export type Category = 'needs' | 'wants' | 'savings' | 'debt'
export const CATEGORIES: { key: Category; label: string; hint: string }[] = [
  { key: 'needs', label: 'Needs', hint: 'Rent, food, transport, utilities' },
  { key: 'wants', label: 'Wants', hint: 'Eating out, fun, subscriptions' },
  { key: 'savings', label: 'Savings', hint: 'Emergency fund, goals' },
  { key: 'debt', label: 'Debt', hint: 'Loan and card repayments' },
]

export interface Income { id: string; label: string; amount: number; date: string; split: Record<Category, number> }
export interface Expense { id: string; label: string; amount: number; category: Category; date: string; debtId?: string }
export interface Debt { id: string; name: string; balance: number; minPayment: number }
interface State { incomes: Income[]; expenses: Expense[]; debts: Debt[] }

const KEY = 'budgetnow:v1'
const uid = () => Math.random().toString(36).slice(2, 10)
const today = () => new Date().toISOString().slice(0, 10)
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
  const totalIncome = computed(() => state.value.incomes.reduce((s, i) => s + i.amount, 0))

  function addIncome(label: string, amount: number, split: Record<Category, number>) {
    state.value.incomes.unshift({ id: uid(), label, amount, date: today(), split })
  }
  function addExpense(label: string, amount: number, category: Category, debtId?: string) {
    state.value.expenses.unshift({ id: uid(), label, amount, category, date: today(), debtId })
    if (debtId) {
      const d = state.value.debts.find(x => x.id === debtId)
      if (d) d.balance = Math.max(0, round(d.balance - amount))
    }
  }
  function removeExpense(id: string) {
    const i = state.value.expenses.findIndex(e => e.id === id)
    if (i < 0) return
    const [e] = state.value.expenses.splice(i, 1)
    if (e?.debtId) {
      const d = state.value.debts.find(x => x.id === e.debtId)
      if (d) d.balance = round(d.balance + e.amount)
    }
  }
  function removeIncome(id: string) {
    state.value.incomes = state.value.incomes.filter(i => i.id !== id)
  }
  function addDebt(name: string, balance: number, minPayment: number) {
    state.value.debts.push({ id: uid(), name, balance, minPayment })
  }
  function removeDebt(id: string) {
    state.value.debts = state.value.debts.filter(d => d.id !== id)
  }

  return { state, totalMinDebt, totalDebt, budgeted, spent, totalIncome, addIncome, addExpense, removeExpense, removeIncome, addDebt, removeDebt }
}

export const money = (n: number) => new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(n)
