import { DEFAULT_SPLIT, type SplitRule } from '../utils/split'

export type Category = 'needs' | 'wants' | 'savings' | 'debt'
export const CATEGORIES: { key: Category; label: string; hint: string; color: string; icon: string }[] = [
  { key: 'needs', label: 'Needs', hint: 'Rent, food, transport', color: '#ef6a3a', icon: 'house' },
  { key: 'wants', label: 'Wants', hint: 'Fun, eating out, subs', color: '#f5c242', icon: 'bag' },
  { key: 'savings', label: 'Savings', hint: 'Emergency fund, goals', color: '#2fb67c', icon: 'piggy' },
  { key: 'debt', label: 'Debt', hint: 'Loans and cards', color: '#5b8def', icon: 'card' },
]
export const catMeta = (k: Category) => CATEGORIES.find(c => c.key === k)!

export interface Income { id: string; label: string; amount: number; date: string; split: Record<Category, number> }
export interface Expense { id: string; label: string; amount: number; category: Category; date: string; debtId?: string; billId?: string }
export interface Debt { id: string; name: string; balance: number; original?: number; minPayment: number; /** Annual percentage rate for the payoff planner. */ apr?: number }
export interface Goal { id: string; name: string; target: number; icon: string; color: string; deadline?: string; contributions: { id: string; amount: number; date: string }[] }
export const GOAL_STYLES = [
  { icon: 'target', color: '#ef6a3a' }, { icon: 'house', color: '#5b8def' }, { icon: 'car', color: '#8b5cf6' }, { icon: 'plane', color: '#14b8a6' },
  { icon: 'grad', color: '#f5a524' }, { icon: 'laptop', color: '#64748b' }, { icon: 'heart', color: '#ec4899' }, { icon: 'shield', color: '#2fb67c' },
]
export const goalSaved = (g: Goal) => Math.round(g.contributions.reduce((s, c) => s + c.amount, 0) * 100) / 100
export interface Bill { id: string; name: string; amount: number; category: Exclude<Category, 'savings'>; every: Every; nextDue: string; anchorDay: number; auto: boolean; debtId?: string }
export interface State { incomes: Income[]; expenses: Expense[]; debts: Debt[]; goals: Goal[]; bills: Bill[] }

const uid = () => Math.random().toString(36).slice(2, 10)
export const today = () => new Date().toLocaleDateString('sv')
const round = (n: number) => Math.round(n * 100) / 100
/**
 * An item brought back by Undo returns as a new row: its old revision belonged to a row the server may already have deleted,
 * and a change that names a revision of a missing row is treated as an edit to something another device deleted.
 */
const restored = <T extends { rev?: number }>(row: T): T => { const { rev: _gone, ...fresh } = row; return fresh as T }

export function useBudget() {
  // Loading and saving is handled by the sync engine (useSync), which owns persistence per signed-in user.
  const state = useState<State>('budget', () => ({ incomes: [], expenses: [], debts: [], goals: [], bills: [] }))

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
  function addExpense(label: string, amount: number, category: Category, debtId?: string, date = today(), billId?: string) {
    const id = uid()
    state.value.expenses.unshift({ id, label, amount, category, date, debtId, billId })
    if (debtId) {
      const d = state.value.debts.find(x => x.id === debtId)
      if (d) d.balance = Math.max(0, round(d.balance - amount))
    }
    return id
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
      state.value.expenses.splice(Math.min(i, state.value.expenses.length), 0, restored(e))
      if (debt) debt.balance = Math.max(0, round(debt.balance - e.amount))
    }
  }
  function removeIncome(id: string) {
    const i = state.value.incomes.findIndex(x => x.id === id)
    if (i < 0) return () => {}
    const [inc] = state.value.incomes.splice(i, 1)
    return () => { if (inc) state.value.incomes.splice(Math.min(i, state.value.incomes.length), 0, restored(inc)) }
  }
  function addDebt(name: string, balance: number, minPayment: number, apr?: number) {
    state.value.debts.push({ id: uid(), name, balance, original: balance, minPayment, ...(apr && apr > 0 ? { apr } : {}) })
  }
  function removeDebt(id: string) {
    state.value.debts = state.value.debts.filter(d => d.id !== id)
  }

  function addGoal(name: string, target: number, icon: string, color: string, deadline?: string) {
    state.value.goals.push({ id: uid(), name, target, icon, color, deadline: deadline || undefined, contributions: [] })
  }
  function removeGoal(id: string) {
    const i = state.value.goals.findIndex(g => g.id === id)
    if (i < 0) return () => {}
    const [g] = state.value.goals.splice(i, 1)
    return () => { if (g) state.value.goals.splice(Math.min(i, state.value.goals.length), 0, restored(g)) }
  }
  /** Positive amounts add to the goal, negative withdraw (never below zero saved). */
  function addToGoal(id: string, amount: number) {
    const g = state.value.goals.find(x => x.id === id)
    if (!g) return
    const amt = amount < 0 ? -Math.min(-amount, goalSaved(g)) : amount
    if (amt !== 0) g.contributions.push({ id: uid(), amount: round(amt), date: today() })
  }
  /** Savings you've set aside from income, minus what's already assigned to goals. */
  const savingsPot = computed(() => {
    const allocated = state.value.incomes.reduce((s, i) => s + i.split.savings, 0)
    const assigned = state.value.goals.reduce((s, g) => s + goalSaved(g), 0)
    return { allocated, assigned, available: round(allocated - assigned) }
  })

  function addBill(b: Omit<Bill, 'id' | 'anchorDay'>) {
    state.value.bills.push({ ...b, id: uid(), anchorDay: anchorOf(b.nextDue), debtId: b.category === 'debt' ? b.debtId : undefined })
  }
  function removeBill(id: string) {
    const i = state.value.bills.findIndex(b => b.id === id)
    if (i < 0) return () => {}
    const [b] = state.value.bills.splice(i, 1)
    return () => { if (b) state.value.bills.splice(Math.min(i, state.value.bills.length), 0, restored(b)) }
  }
  /** Logs the bill's current due date as an expense (or skips it) and moves it to the next date. Returns an undo. */
  function payBill(id: string, skip = false) {
    const b = state.value.bills.find(x => x.id === id)
    if (!b) return () => {}
    const due = b.nextDue
    const expenseId = skip ? undefined : addExpense(b.name, b.amount, b.category, b.debtId, due < today() ? due : today(), b.id)
    b.nextDue = addPeriod(due, b.every, b.anchorDay)
    return () => {
      if (expenseId) removeExpense(expenseId)
      b.nextDue = due
    }
  }
  /** Logs every due occurrence of bills set to auto-log. Returns how many expenses were added. */
  function runAutoBills() {
    const t = today()
    let n = 0
    for (const b of state.value.bills) {
      if (!b.auto) continue
      for (let k = 0; k < 12 && b.nextDue <= t; k++) { payBill(b.id); n++ }
    }
    return n
  }

  function resetAll() {
    state.value = { incomes: [], expenses: [], debts: [], goals: [], bills: [] }
  }

  return { addBill, removeBill, payBill, runAutoBills, addGoal, removeGoal, addToGoal, savingsPot, totalSpent, resetAll, state, totalMinDebt, totalDebt, budgeted, spent, totalIncome, addIncome, addExpense, removeExpense, removeIncome, addDebt, removeDebt }
}

// Profile values live in the synced snapshot, not in their own storage keys.
export const currency = ref('USD')
export const userName = ref('')
/** How each pay is divided after debt minimums. Saved with the profile, so it follows the user across devices. */
export const splitRule = ref<SplitRule>({ ...DEFAULT_SPLIT })
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

/** What you can still spend today on Needs + Wants, spreading this month's remaining flexible budget over the days left. */
export function useSafeToSpend() {
  const { state } = useBudget()
  return computed(() => {
    const t = today()
    const month = ym(t)
    const [y = 0, m = 0, d = 1] = t.split('-').map(Number)
    const daysLeft = new Date(y, m, 0).getDate() - d + 1
    let flex = 0, before = 0, spentToday = 0
    for (const i of state.value.incomes) if (ym(i.date) === month) flex += i.split.needs + i.split.wants
    for (const e of state.value.expenses) {
      if (ym(e.date) !== month || (e.category !== 'needs' && e.category !== 'wants')) continue
      // Bills are planned spending: they shrink the pool but never count against today's allowance.
      if (e.date === t && !e.billId) spentToday += e.amount; else before += e.amount
    }
    // Bills still to come this month are already spoken for.
    let upcomingBills = 0
    for (const b of state.value.bills) {
      if (b.category === 'debt') continue
      upcomingBills += occurrencesUntil(b.nextDue, b.every, b.anchorDay, endOfMonth(t)).length * b.amount
    }
    const pool = flex - before - upcomingBills
    const allowance = Math.max(0, pool) / daysLeft
    const leftToday = allowance - spentToday
    const tomorrow = daysLeft > 1 ? Math.max(0, pool - spentToday) / (daysLeft - 1) : 0
    const used = allowance > 0 ? spentToday / allowance : spentToday > 0 ? 1 : 0
    return { hasBudget: flex > 0, flex, pool, daysLeft, allowance, spentToday, leftToday, used, tomorrow, upcomingBills }
  })
}
