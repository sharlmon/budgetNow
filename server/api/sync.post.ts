import { and, eq, inArray, sql } from 'drizzle-orm'
import { MAX_BODY_BYTES } from '../../shared/security'
import { bills, debts, expenses, goalContributions, goals, incomes, profiles } from '../db/schema'

const CHUNK = 200
const chunks = <T>(a: T[], n = CHUNK) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n))
/** `col = excluded.col` for every listed column, used for upserts. */
const take = (cols: Record<string, any>, keys: string[]) => Object.fromEntries(keys.map(k => [k, sql.raw(`excluded."${cols[k].name}"`)]))

/**
 * Applies a batch of row changes for the signed-in user in one transaction.
 * user_id always comes from the verified session, so a client can only ever touch its own rows.
 */
export default defineEventHandler(async (event) => {
  const userId = requireUser(event)
  // Measure the real body rather than trusting a Content-Length header (which can be missing or wrong).
  const raw = (await readRawBody(event, 'utf8')) ?? ''
  if (raw.length > MAX_BODY_BYTES) throw createError({ statusCode: 413, statusMessage: 'Too much data in one request' })
  let json: unknown
  try { json = JSON.parse(raw) } catch { throw createError({ statusCode: 400, statusMessage: 'Invalid JSON' }) }

  const parsed = syncBody.safeParse(json)
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: 'Invalid data', data: parsed.error.issues.slice(0, 3).map(i => `${i.path.join('.')}: ${i.message}`) })
  const { ops } = parsed.data

  const putsOf = <K extends string>(t: K) => ops.filter(o => o.t === t && o.op === 'put').map(o => (o as any).row)
  const delsOf = (t: string) => ops.filter(o => o.t === t && o.op === 'del').map(o => (o as any).id as string)

  const db = await useDb()
  await db.transaction(async (tx) => {
    const now = new Date()

    for (const rows of chunks(putsOf('incomes'))) {
      await tx.insert(incomes).values(rows.map((r: any) => ({ userId, id: r.id, label: r.label, amount: r.amount, date: r.date, ...r.split }))).onConflictDoUpdate({
        target: [incomes.userId, incomes.id], set: { ...take(incomes, ['label', 'amount', 'date', 'needs', 'wants', 'savings', 'debt']), updatedAt: now },
      })
    }
    for (const rows of chunks(putsOf('expenses'))) {
      await tx.insert(expenses).values(rows.map((r: any) => ({ userId, ...r }))).onConflictDoUpdate({
        target: [expenses.userId, expenses.id], set: { ...take(expenses, ['label', 'amount', 'category', 'date', 'debtId', 'billId']), updatedAt: now },
      })
    }
    for (const rows of chunks(putsOf('debts'))) {
      await tx.insert(debts).values(rows.map((r: any) => ({ userId, ...r }))).onConflictDoUpdate({
        target: [debts.userId, debts.id], set: { ...take(debts, ['name', 'balance', 'original', 'minPayment']), updatedAt: now },
      })
    }
    for (const rows of chunks(putsOf('bills'))) {
      await tx.insert(bills).values(rows.map((r: any) => ({ userId, id: r.id, name: r.name, amount: r.amount, category: r.category, frequency: r.every, nextDue: r.nextDue, anchorDay: r.anchorDay, auto: r.auto, debtId: r.debtId }))).onConflictDoUpdate({
        target: [bills.userId, bills.id], set: { ...take(bills, ['name', 'amount', 'category', 'frequency', 'nextDue', 'anchorDay', 'auto', 'debtId']), updatedAt: now },
      })
    }

    const goalRows = putsOf('goals') as any[]
    for (const rows of chunks(goalRows)) {
      await tx.insert(goals).values(rows.map(r => ({ userId, id: r.id, name: r.name, target: r.target, icon: r.icon, color: r.color, deadline: r.deadline }))).onConflictDoUpdate({
        target: [goals.userId, goals.id], set: { ...take(goals, ['name', 'target', 'icon', 'color', 'deadline']), updatedAt: now },
      })
    }
    if (goalRows.length) {
      // A goal row carries its full contribution list, so replace what is stored for those goals.
      for (const ids of chunks(goalRows.map(g => g.id))) {
        await tx.delete(goalContributions).where(and(eq(goalContributions.userId, userId), inArray(goalContributions.goalId, ids)))
      }
      const contribs = goalRows.flatMap(g => g.contributions.map((c: any) => ({ userId, id: c.id, goalId: g.id, amount: c.amount, date: c.date })))
      for (const rows of chunks(contribs)) {
        await tx.insert(goalContributions).values(rows).onConflictDoUpdate({
          target: [goalContributions.userId, goalContributions.id], set: take(goalContributions, ['goalId', 'amount', 'date']),
        })
      }
    }

    const del = async (table: any, ids: string[]) => {
      for (const part of chunks(ids)) await tx.delete(table).where(and(eq(table.userId, userId), inArray(table.id, part)))
    }
    await del(incomes, delsOf('incomes'))
    await del(expenses, delsOf('expenses'))
    await del(debts, delsOf('debts'))
    await del(bills, delsOf('bills'))
    await del(goals, delsOf('goals')) // contributions go with it (ON DELETE CASCADE)

    const prof = putsOf('profile')[0]
    if (prof) {
      await tx.insert(profiles).values({ userId, currency: prof.currency, name: prof.name }).onConflictDoUpdate({
        target: profiles.userId, set: { currency: prof.currency, name: prof.name, updatedAt: now },
      })
    }
  })
  return { ok: true, applied: ops.length }
})
