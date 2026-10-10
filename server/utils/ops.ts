import { z } from 'zod'

const id = z.string().min(1).max(40).regex(/^[A-Za-z0-9_-]+$/)
const amt = z.number().finite().min(0).max(1e10)
const signed = z.number().finite().min(-1e10).max(1e10)
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(d => !Number.isNaN(Date.parse(d)), 'invalid date')
const label = z.string().max(120)
const cat = z.enum(['needs', 'wants', 'savings', 'debt'])
const optId = id.nullish().transform(v => v ?? null)
// The revision of the row the client last saw. Absent for rows the client created itself.
const revision = z.number().int().min(1).max(2_000_000_000).optional()

export const incomeRow = z.object({ id, rev: revision, label, amount: amt, date, accountId: optId, split: z.object({ needs: amt, wants: amt, savings: amt, debt: amt }) })
export const expenseRow = z.object({ id, rev: revision, label, amount: amt, category: cat, date, debtId: optId, billId: optId, accountId: optId })
export const debtRow = z.object({ id, rev: revision, name: z.string().min(1).max(120), balance: amt, original: amt.nullish().transform(v => v ?? null), minPayment: amt, apr: z.number().finite().min(0).max(100).nullish().transform(v => v ?? null) })
export const goalRow = z.object({
  id, rev: revision, name: z.string().min(1).max(120), target: amt.refine(n => n > 0, 'target must be positive'),
  icon: z.string().min(1).max(20), color: z.string().regex(/^#[0-9a-fA-F]{6}$/), deadline: date.nullish().transform(v => v ?? null),
  contributions: z.array(z.object({ id, amount: signed, date })).max(5000),
})
export const billRow = z.object({
  id, rev: revision, name: z.string().min(1).max(120), amount: amt, category: z.enum(['needs', 'wants', 'debt']), every: z.enum(['week', 'month', 'year']),
  nextDue: date, anchorDay: z.number().int().min(1).max(31), auto: z.boolean(), debtId: optId, accountId: optId,
})
export const ACCOUNT_KINDS = ['mobile', 'bank', 'paypal', 'cash', 'invest', 'other'] as const
export const accountRow = z.object({
  id, rev: revision, name: z.string().min(1).max(60), kind: z.enum(ACCOUNT_KINDS), balance: amt,
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/), rate: z.number().finite().min(0).max(100).nullish().transform(v => v ?? null),
})
const pct = z.number().int().min(0).max(100)
export const splitRow = z.object({ needs: pct, wants: pct, savings: pct }).refine(r => r.needs + r.wants + r.savings === 100, 'split must total 100')
export const profileRow = z.object({ currency: z.string().regex(/^[A-Z]{3}$/), name: z.string().max(40), split: splitRow.optional() })

const put = <T extends string, R extends z.ZodTypeAny>(t: T, row: R) => z.object({ t: z.literal(t), op: z.literal('put'), row })
const del = <T extends string>(t: T) => z.object({ t: z.literal(t), op: z.literal('del'), id, rev: revision })

export const syncBody = z.object({
  ops: z.array(z.union([
    put('incomes', incomeRow), del('incomes'),
    put('expenses', expenseRow), del('expenses'),
    put('debts', debtRow), del('debts'),
    put('goals', goalRow), del('goals'),
    put('bills', billRow), del('bills'),
    put('accounts', accountRow), del('accounts'),
    put('profile', profileRow),
  ])).max(1000),
})
export type SyncBody = z.infer<typeof syncBody>
