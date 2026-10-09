import type { State } from '../composables/useBudget'

export const BACKUP_VERSION = 1
export const MAX_BACKUP_BYTES = 5 * 1024 * 1024

const CATS = ['needs', 'wants', 'savings', 'debt'] as const
const isObj = (v: unknown): v is Record<string, any> => typeof v === 'object' && v !== null && !Array.isArray(v)
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const isDate = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v))
const text = (v: unknown, max = 120) => (typeof v === 'string' ? v.slice(0, max) : '')
const r2 = (n: number) => Math.round(n * 100) / 100
const rid = () => Math.random().toString(36).slice(2, 10)

export interface Backup { app: 'budgetnow'; version: number; exportedAt: string; currency: string; name: string; data: State }

export function buildBackup(data: State, currency: string, name: string): Backup {
  return { app: 'budgetnow', version: BACKUP_VERSION, exportedAt: new Date().toISOString(), currency, name, data }
}

export type ParseResult =
  | { ok: true; data: State; currency?: string; name?: string; exportedAt?: string; skipped: number }
  | { ok: false; error: string }

/** Parses and sanitises a backup file. Bad records are skipped (and counted) rather than trusted. */
export function parseBackup(raw: string): ParseResult {
  if (raw.length > MAX_BACKUP_BYTES) return { ok: false, error: 'That file is too large to be a BudgetNow backup.' }
  let json: unknown
  try { json = JSON.parse(raw) } catch { return { ok: false, error: 'That file is not valid JSON.' } }
  if (!isObj(json)) return { ok: false, error: 'That file is not a BudgetNow backup.' }

  const wrapped = json.app === 'budgetnow'
  if (wrapped && isNum(json.version) && json.version > BACKUP_VERSION) return { ok: false, error: 'This backup was made by a newer version of BudgetNow.' }
  const src = wrapped ? json.data : json
  if (!isObj(src) || !['incomes', 'expenses', 'debts', 'goals'].some(k => Array.isArray(src[k]))) {
    return { ok: false, error: 'That file is not a BudgetNow backup.' }
  }

  let skipped = 0
  const seen = new Set<string>()
  const uid = (v: unknown) => { let id = typeof v === 'string' && v && !seen.has(v) ? v.slice(0, 40) : rid(); while (seen.has(id)) id = rid(); seen.add(id); return id }
  const list = (v: unknown): any[] => (Array.isArray(v) ? v : [])

  const incomes: State['incomes'] = []
  for (const i of list(src.incomes)) {
    if (!isObj(i) || !isNum(i.amount) || i.amount < 0 || !isDate(i.date) || !isObj(i.split) || !CATS.every(c => isNum(i.split[c]) && i.split[c] >= 0)) { skipped++; continue }
    incomes.push({ id: uid(i.id), label: text(i.label), amount: r2(i.amount), date: i.date, split: { needs: r2(i.split.needs), wants: r2(i.split.wants), savings: r2(i.split.savings), debt: r2(i.split.debt) } })
  }

  const debts: State['debts'] = []
  for (const d of list(src.debts)) {
    if (!isObj(d) || !text(d.name).trim() || !isNum(d.balance) || d.balance < 0 || (d.minPayment !== undefined && !(isNum(d.minPayment) && d.minPayment >= 0))) { skipped++; continue }
    debts.push({ id: uid(d.id), name: text(d.name), balance: r2(d.balance), original: isNum(d.original) && d.original >= 0 ? r2(d.original) : undefined, minPayment: r2(d.minPayment ?? 0) })
  }
  const debtIds = new Set(debts.map(d => d.id))

  const expenses: State['expenses'] = []
  for (const e of list(src.expenses)) {
    if (!isObj(e) || !isNum(e.amount) || e.amount < 0 || !isDate(e.date) || !CATS.includes(e.category)) { skipped++; continue }
    expenses.push({ id: uid(e.id), label: text(e.label), amount: r2(e.amount), category: e.category, date: e.date, debtId: typeof e.debtId === 'string' && debtIds.has(e.debtId) ? e.debtId : undefined })
  }

  const goals: State['goals'] = []
  for (const g of list(src.goals)) {
    if (!isObj(g) || !text(g.name).trim() || !isNum(g.target) || g.target <= 0) { skipped++; continue }
    const contributions = list(g.contributions).filter(c => isObj(c) && isNum(c.amount) && isDate(c.date)).map(c => ({ id: uid(c.id), amount: r2(c.amount), date: c.date as string }))
    goals.push({ id: uid(g.id), name: text(g.name), target: r2(g.target), icon: text(g.icon, 20) || 'target', color: /^#[0-9a-f]{6}$/i.test(g.color) ? g.color : '#ef6a3a', deadline: isDate(g.deadline) ? g.deadline : undefined, contributions })
  }

  let currency: string | undefined
  if (wrapped && typeof json.currency === 'string' && /^[A-Z]{3}$/.test(json.currency)) {
    try {
      // Intl accepts any well-formed 3-letter code, so check against the real list where the runtime offers it.
      const known = (Intl as any).supportedValuesOf?.('currency') as string[] | undefined
      if (!known || known.includes(json.currency)) { new Intl.NumberFormat('en', { style: 'currency', currency: json.currency }); currency = json.currency }
    } catch { /* unknown currency: keep current */ }
  }
  return {
    ok: true, data: { incomes, expenses, debts, goals }, currency,
    name: wrapped ? text(json.name, 40) : undefined,
    exportedAt: wrapped && typeof json.exportedAt === 'string' ? json.exportedAt : undefined,
    skipped,
  }
}
