import { and, asc, eq, inArray, sql } from 'drizzle-orm'
import { canon } from '../../shared/sync'
import { MAX_BODY_BYTES } from '../../shared/security'
import { accounts, bills, debts, expenses, goalContributions, goals, incomes, profiles } from '../db/schema'
import { content, mapAccount, mapBill, mapDebt, mapExpense, mapGoal, mapIncome } from '../utils/mappers'

const CHUNK = 200
const chunks = <T>(a: T[], n = CHUNK) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n))

// How each synced table maps between the app's row shape and its database columns.
const TABLES: Record<string, { tbl: any; toDb: (userId: string, r: any) => any; toApi: (r: any, contribs: any[]) => any }> = {
  incomes: { tbl: incomes, toApi: r => mapIncome(r), toDb: (userId, r) => ({ userId, id: r.id, label: r.label, amount: r.amount, date: r.date, accountId: r.accountId, ...r.split }) },
  expenses: { tbl: expenses, toApi: r => mapExpense(r), toDb: (userId, r) => ({ userId, id: r.id, label: r.label, amount: r.amount, category: r.category, date: r.date, debtId: r.debtId, billId: r.billId, accountId: r.accountId }) },
  debts: { tbl: debts, toApi: r => mapDebt(r), toDb: (userId, r) => ({ userId, id: r.id, name: r.name, balance: r.balance, original: r.original, minPayment: r.minPayment, apr: r.apr }) },
  bills: { tbl: bills, toApi: r => mapBill(r), toDb: (userId, r) => ({ userId, id: r.id, name: r.name, amount: r.amount, category: r.category, frequency: r.every, nextDue: r.nextDue, anchorDay: r.anchorDay, auto: r.auto, debtId: r.debtId, accountId: r.accountId }) },
  accounts: { tbl: accounts, toApi: r => mapAccount(r), toDb: (userId, r) => ({ userId, id: r.id, name: r.name, kind: r.kind, balance: r.balance, color: r.color, rate: r.rate }) },
  goals: { tbl: goals, toApi: (r, contribs) => mapGoal(r, contribs), toDb: (userId, r) => ({ userId, id: r.id, name: r.name, target: r.target, icon: r.icon, color: r.color, deadline: r.deadline }) },
}

/** Two rows hold the same data (revision ignored, contribution order ignored). */
function sameRow(a: any, b: any) {
  const norm = (r: any) => { const c = content(r); if (c.contributions) c.contributions = [...c.contributions].sort((x: any, y: any) => x.id.localeCompare(y.id)); return canon(c) }
  return norm(a) === norm(b)
}

/**
 * Applies a batch of row changes for the signed-in user in one transaction.
 * user_id always comes from the verified session, so a client can only ever touch its own rows.
 *
 * Every change carries the revision of the row the client last saw. If the row has since moved on (another device
 * edited it) the change is NOT applied and the current version is returned as a conflict, so nothing is silently
 * overwritten. A change that matches what is already stored counts as done, which makes retries after a lost
 * response safe. Clients that send no revision keep the old behaviour (last write wins).
 */
export default defineEventHandler(async (event) => {
  const userId = requireUser(event)
  const db = await useDb()
  await enforceUserLimit(event, db, userId, 'sync', 240, 60)
  // Measure the real body rather than trusting a Content-Length header (which can be missing or wrong).
  const raw = (await readRawBody(event, 'utf8')) ?? ''
  if (raw.length > MAX_BODY_BYTES) throw createError({ statusCode: 413, statusMessage: 'Too much data in one request' })
  let json: unknown
  try { json = JSON.parse(raw) } catch { throw createError({ statusCode: 400, statusMessage: 'Invalid JSON' }) }

  const parsed = syncBody.safeParse(json)
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: 'Invalid data', data: parsed.error.issues.slice(0, 3).map(i => `${i.path.join('.')}: ${i.message}`) })
  const { ops } = parsed.data

  const putsOf = (t: string) => ops.filter(o => o.t === t && o.op === 'put').map(o => (o as any).row)
  const delsOf = (t: string) => ops.filter(o => o.t === t && o.op === 'del').map(o => ({ id: (o as any).id as string, rev: (o as any).rev as number | undefined }))

  const result = await db.transaction(async (tx) => {
    const now = new Date()
    const revs: Record<string, Record<string, number>> = {}
    const conflicts: { t: string; id: string; theirs: any | null }[] = []
    const setRev = (t: string, id: string, rev: number) => { (revs[t] ??= {})[id] = rev }

    for (const [name, cfg] of Object.entries(TABLES)) {
      const puts = putsOf(name), dels = delsOf(name)
      if (!puts.length && !dels.length) continue
      const { tbl } = cfg
      const ids = [...new Set([...puts.map((r: any) => r.id), ...dels.map(d => d.id)])]

      // Read what is stored now for every row this batch touches.
      const existing = new Map<string, { raw: any; api: any }>()
      const load = async (only: string[]) => {
        for (const part of chunks(only)) {
          const rows = await tx.select().from(tbl).where(and(eq(tbl.userId, userId), inArray(tbl.id, part)))
          const contribs = name === 'goals' ? await tx.select().from(goalContributions).where(and(eq(goalContributions.userId, userId), inArray(goalContributions.goalId, part))).orderBy(asc(goalContributions.date), asc(goalContributions.id)) : []
          for (const r of rows) existing.set(r.id, { raw: r, api: cfg.toApi(r, contribs) })
        }
      }
      await load(ids)

      const replaceContributions = async (goalId: string, list: any[]) => {
        await tx.delete(goalContributions).where(and(eq(goalContributions.userId, userId), eq(goalContributions.goalId, goalId)))
        for (const part of chunks(list.map(c => ({ userId, id: c.id, goalId, amount: c.amount, date: c.date })))) {
          await tx.insert(goalContributions).values(part).onConflictDoUpdate({ target: [goalContributions.userId, goalContributions.id], set: { goalId: sql`excluded."goal_id"`, amount: sql`excluded."amount"`, date: sql`excluded."date"` } })
        }
      }
      const conflictWith = async (id: string) => { await load([id]); conflicts.push({ t: name, id, theirs: existing.get(id)?.api ?? null }) }

      const inserts: any[] = []
      for (const row of puts) {
        const cur = existing.get(row.id)
        if (!cur) {
          if (row.rev !== undefined) { conflicts.push({ t: name, id: row.id, theirs: null }); continue } // edited a row another device deleted
          inserts.push(row); continue
        }
        if (sameRow(cur.api, row)) { setRev(name, row.id, cur.raw.rev); continue } // already applied (a retry)
        if (row.rev !== undefined && row.rev !== cur.raw.rev) { conflicts.push({ t: name, id: row.id, theirs: cur.api }); continue }
        const { userId: _u, id: _i, ...fields } = cfg.toDb(userId, row)
        const where = row.rev !== undefined ? and(eq(tbl.userId, userId), eq(tbl.id, row.id), eq(tbl.rev, row.rev)) : and(eq(tbl.userId, userId), eq(tbl.id, row.id))
        const updated = await tx.update(tbl).set({ ...fields, rev: sql`${tbl.rev} + 1`, updatedAt: now }).where(where).returning({ rev: tbl.rev })
        if (!updated.length) { await conflictWith(row.id); continue } // another request got there first
        setRev(name, row.id, updated[0].rev)
        if (name === 'goals') await replaceContributions(row.id, row.contributions)
      }

      for (const part of chunks(inserts)) {
        await tx.insert(tbl).values(part.map(r => cfg.toDb(userId, r))).onConflictDoNothing()
        for (const r of part) setRev(name, r.id, 1)
        if (name === 'goals') for (const r of part) await replaceContributions(r.id, r.contributions)
      }

      for (const d of dels) {
        const cur = existing.get(d.id)
        if (!cur) continue // already gone
        if (d.rev !== undefined && d.rev !== cur.raw.rev) { conflicts.push({ t: name, id: d.id, theirs: cur.api }); continue } // edited elsewhere since: keep it
        const where = d.rev !== undefined ? and(eq(tbl.userId, userId), eq(tbl.id, d.id), eq(tbl.rev, d.rev)) : and(eq(tbl.userId, userId), eq(tbl.id, d.id))
        const gone = await tx.delete(tbl).where(where).returning({ id: tbl.id })
        if (!gone.length) await conflictWith(d.id) // contributions go with the goal (ON DELETE CASCADE)
      }
    }

    const prof = putsOf('profile')[0]
    if (prof) {
      // A client that does not send a split (an older cached copy) must not reset the saved one.
      const split = prof.split ? { splitNeeds: prof.split.needs, splitWants: prof.split.wants, splitSavings: prof.split.savings } : {}
      await tx.insert(profiles).values({ userId, currency: prof.currency, name: prof.name, ...split }).onConflictDoUpdate({
        target: profiles.userId, set: { currency: prof.currency, name: prof.name, ...split, updatedAt: now },
      })
    }
    return { revs, conflicts }
  })
  return { ok: true, applied: ops.length, ...result }
})
