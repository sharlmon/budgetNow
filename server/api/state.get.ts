import { asc, desc, eq } from 'drizzle-orm'
import { bills, debts, expenses, goalContributions, goals, incomes, profiles } from '../db/schema'

/** The signed-in user's whole budget in the shape the app uses. */
export default defineEventHandler(async (event) => {
  const userId = requireUser(event)
  const db = await useDb()
  await enforceUserLimit(event, db, userId, 'state', 60, 60)
  const [inc, exp, dbt, gl, contribs, bl, prof] = await Promise.all([
    db.select().from(incomes).where(eq(incomes.userId, userId)).orderBy(desc(incomes.date), desc(incomes.createdAt)),
    db.select().from(expenses).where(eq(expenses.userId, userId)).orderBy(desc(expenses.date), desc(expenses.createdAt)),
    db.select().from(debts).where(eq(debts.userId, userId)).orderBy(asc(debts.createdAt)),
    db.select().from(goals).where(eq(goals.userId, userId)).orderBy(asc(goals.createdAt)),
    db.select().from(goalContributions).where(eq(goalContributions.userId, userId)).orderBy(asc(goalContributions.date), asc(goalContributions.id)),
    db.select().from(bills).where(eq(bills.userId, userId)).orderBy(asc(bills.createdAt)),
    db.select().from(profiles).where(eq(profiles.userId, userId)),
  ])
  setResponseHeader(event, 'Cache-Control', 'private, no-store')
  return {
    incomes: inc.map(r => ({ id: r.id, label: r.label, amount: r.amount, date: r.date, split: { needs: r.needs, wants: r.wants, savings: r.savings, debt: r.debt } })),
    expenses: exp.map(r => ({ id: r.id, label: r.label, amount: r.amount, category: r.category, date: r.date, debtId: r.debtId ?? undefined, billId: r.billId ?? undefined })),
    debts: dbt.map(r => ({ id: r.id, name: r.name, balance: r.balance, original: r.original ?? undefined, minPayment: r.minPayment })),
    goals: gl.map(g => ({
      id: g.id, name: g.name, target: g.target, icon: g.icon, color: g.color, deadline: g.deadline ?? undefined,
      contributions: contribs.filter(c => c.goalId === g.id).map(c => ({ id: c.id, amount: c.amount, date: c.date })),
    })),
    bills: bl.map(b => ({ id: b.id, name: b.name, amount: b.amount, category: b.category, every: b.frequency, nextDue: b.nextDue, anchorDay: b.anchorDay, auto: b.auto, debtId: b.debtId ?? undefined })),
    profile: { currency: prof[0]?.currency ?? 'USD', name: prof[0]?.name ?? '' },
  }
})
