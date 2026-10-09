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
    incomes: inc.map(mapIncome),
    expenses: exp.map(mapExpense),
    debts: dbt.map(mapDebt),
    goals: gl.map(g => mapGoal(g, contribs)),
    bills: bl.map(mapBill),
    profile: {
      currency: prof[0]?.currency ?? 'KES',
      name: prof[0]?.name ?? '',
      split: { needs: prof[0]?.splitNeeds ?? 50, wants: prof[0]?.splitWants ?? 30, savings: prof[0]?.splitSavings ?? 20 },
    },
  }
})
