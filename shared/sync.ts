import type { State } from '../app/composables/useBudget'

/** Everything that is synced: the budget data plus the small profile (currency and display name). */
export interface Profile { currency: string; name: string; split: { needs: number; wants: number; savings: number } }
export type Snap = State & { profile: Profile }
export type TableName = 'incomes' | 'expenses' | 'debts' | 'goals' | 'bills'
export const TABLES: TableName[] = ['incomes', 'expenses', 'debts', 'goals', 'bills']

export type Op =
  | { t: TableName; op: 'put'; row: Record<string, any> }
  | { t: TableName; op: 'del'; id: string; rev?: number }
  | { t: 'profile'; op: 'put'; row: Profile }

/** JSON with sorted keys so two equal rows always compare equal regardless of key order. */
export const canon = (v: unknown): string => JSON.stringify(v, (_k, val) =>
  val && typeof val === 'object' && !Array.isArray(val)
    ? Object.fromEntries(Object.keys(val).sort().filter(k => val[k] !== undefined).map(k => [k, val[k]]))
    : val)

export const emptySnap = (): Snap => ({ incomes: [], expenses: [], debts: [], goals: [], bills: [], profile: { currency: 'USD', name: '', split: { needs: 50, wants: 30, savings: 20 } } })

/** The minimal set of row changes that turns `prev` into `next`. Puts and deletes are idempotent, so retrying is always safe. */
export function diffSnaps(prev: Snap, next: Snap): Op[] {
  const ops: Op[] = []
  for (const t of TABLES) {
    const prevRows = new Map<string, any>((prev[t] as any[]).map(r => [r.id, r]))
    const before = new Map<string, string>((prev[t] as any[]).map(r => [r.id, canon(r)]))
    const seen = new Set<string>()
    for (const row of next[t] as any[]) {
      seen.add(row.id)
      if (before.get(row.id) !== canon(row)) ops.push({ t, op: 'put', row })
    }
    // A delete carries the revision being deleted, so the server can refuse it if another device edited the row since.
    for (const id of before.keys()) if (!seen.has(id)) ops.push({ t, op: 'del', id, rev: prevRows.get(id)?.rev })
  }
  if (canon(prev.profile) !== canon(next.profile)) ops.push({ t: 'profile', op: 'put', row: next.profile })
  return ops
}
