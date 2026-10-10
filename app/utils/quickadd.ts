// What makes adding an entry fast and clear: your own habits as one-tap picks, a live picture of what the entry will do to a budget,
// and the colours the add screen takes on. Pure functions, shared with the tests.

const round = (n: number) => Math.round(n * 100) / 100
const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ')

// ---- Quick picks ----
export interface PastEntry { label: string; amount: number; date: string; category?: string; accountId?: string }
export interface Habit { key: string; label: string; count: number; /** The usual amount: the middle of the last few. */ amount: number; category?: string; accountId?: string; lastDate: string }

const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2 }
/** An entry this recent counts for more, because what you did lately is more likely what you are about to do again. */
const RECENT_DAYS = 30

/**
 * The things you add again and again, best first. Entries with the same name are one habit however they were written. The pick
 * remembers the usual amount, the category you usually give it and the account you last used.
 */
export function habitsFrom(entries: PastEntry[], today: string, max = 6): Habit[] {
  const groups = new Map<string, PastEntry[]>()
  for (const e of entries) {
    const key = norm(e.label)
    if (!key || !(e.amount > 0)) continue
    ;(groups.get(key) ?? groups.set(key, []).get(key)!).push(e)
  }
  const day = (d: string) => Date.UTC(Number(d.slice(0, 4)), Number(d.slice(5, 7)) - 1, Number(d.slice(8, 10))) / 86_400_000
  const out: (Habit & { score: number })[] = []
  for (const [key, list] of groups) {
    const byRecent = [...list].sort((a, b) => b.date.localeCompare(a.date))
    const latest = byRecent[0]!
    const cats = new Map<string, number>()
    for (const e of list) if (e.category) cats.set(e.category, (cats.get(e.category) ?? 0) + 1)
    const topCount = Math.max(0, ...cats.values())
    const category = byRecent.find(e => e.category && cats.get(e.category) === topCount)?.category // ties go to the more recent
    const score = list.length + (day(today) - day(latest.date) <= RECENT_DAYS ? 2 : 0)
    out.push({ key, label: latest.label.trim(), count: list.length, amount: round(median(byRecent.slice(0, 5).map(e => e.amount))), category, accountId: byRecent.find(e => e.accountId)?.accountId, lastDate: latest.date, score })
  }
  return out.sort((a, b) => b.score - a.score || b.lastDate.localeCompare(a.lastDate) || a.label.localeCompare(b.label)).slice(0, max).map(({ score: _s, ...h }) => h)
}

// ---- What an expense does to its budget ----
export interface Impact {
  /** 0 to 1 (and a little over): how much of the budget was used before, and after, this expense. */
  before: number; after: number
  /** Money left in the budget after this expense, or 0. */
  left: number
  /** How far past the budget this expense takes it, or 0. */
  over: number
  hasBudget: boolean
}
export function expenseImpact(o: { budgeted: number; spent: number; amount: number }): Impact {
  const hasBudget = o.budgeted > 0
  const afterSpent = o.spent + o.amount
  const share = (v: number) => (hasBudget ? Math.min(1.25, v / o.budgeted) : 0)
  return { before: share(o.spent), after: share(afterSpent), left: hasBudget ? round(Math.max(0, o.budgeted - afterSpent)) : 0, over: hasBudget ? round(Math.max(0, afterSpent - o.budgeted)) : 0, hasBudget }
}

// ---- The colours the add screen takes on ----
export type AddTheme = 'income' | 'needs' | 'wants' | 'savings' | 'debt'
/** Header gradient stops. Each is dark enough for white text to reach 3:1 (the WCAG minimum for large text such as the amount). */
export const ADD_THEMES: Record<AddTheme, [string, string]> = {
  income: ['#13a186', '#0c7d68'],
  needs: ['#ea6f2b', '#d44412'],
  wants: ['#c97a0a', '#a85d00'],
  savings: ['#1a9b6e', '#0f7a55'],
  debt: ['#4f7de0', '#3b5fc0'],
}
export const themeFor = (mode: 'income' | 'expense', category: string): AddTheme => (mode === 'income' ? 'income' : (['needs', 'wants', 'savings', 'debt'] as const).find(c => c === category) ?? 'needs')

/** WCAG contrast ratio of white text on a colour. */
export function contrastWithWhite(hex: string): number {
  const n = parseInt(hex.replace('#', ''), 16)
  const lin = (c: number) => { const v = c / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }
  const lum = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255)
  return 1.05 / (lum + 0.05)
}
