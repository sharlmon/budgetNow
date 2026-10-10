import { eq } from 'drizzle-orm'
import { accounts, bills, debts, expenses, goalContributions, goals, incomes, profiles } from '../db/schema'

/** Permanently removes every row belonging to a user, in one transaction. Used by account deletion and the Clerk webhook. */
export async function deleteUserData(db: any, userId: string) {
  await db.transaction(async (tx: any) => {
    await tx.delete(goalContributions).where(eq(goalContributions.userId, userId))
    await tx.delete(goals).where(eq(goals.userId, userId))
    await tx.delete(incomes).where(eq(incomes.userId, userId))
    await tx.delete(expenses).where(eq(expenses.userId, userId))
    await tx.delete(debts).where(eq(debts.userId, userId))
    await tx.delete(accounts).where(eq(accounts.userId, userId))
    await tx.delete(bills).where(eq(bills.userId, userId))
    await tx.delete(profiles).where(eq(profiles.userId, userId))
  })
}
