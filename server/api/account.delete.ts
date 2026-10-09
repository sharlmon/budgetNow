import { eq } from 'drizzle-orm'
import { DELETE_CONFIRM } from '../../shared/security'
import { bills, debts, expenses, goalContributions, goals, incomes, profiles } from '../db/schema'

/**
 * Permanently deletes the signed-in user's data and then their sign-in account.
 * Data goes first: if removing the Clerk account fails afterwards, nothing personal is left behind and the user can retry.
 */
export default defineEventHandler(async (event) => {
  const userId = requireUser(event)
  // Deleting everything must be deliberate: the app sends this header only after the user types DELETE.
  if (getHeader(event, DELETE_CONFIRM.name) !== DELETE_CONFIRM.value) throw createError({ statusCode: 400, statusMessage: 'Confirmation required' })
  const db = await useDb()
  await enforceUserLimit(event, db, userId, 'account', 5, 3600)
  await db.transaction(async (tx) => {
    await tx.delete(goalContributions).where(eq(goalContributions.userId, userId))
    await tx.delete(goals).where(eq(goals.userId, userId))
    await tx.delete(incomes).where(eq(incomes.userId, userId))
    await tx.delete(expenses).where(eq(expenses.userId, userId))
    await tx.delete(debts).where(eq(debts.userId, userId))
    await tx.delete(bills).where(eq(bills.userId, userId))
    await tx.delete(profiles).where(eq(profiles.userId, userId))
  })

  // `nuxt dev` with DEV_AUTH_BYPASS has no real Clerk user to remove.
  if (!(import.meta.dev && process.env.DEV_AUTH_BYPASS === '1')) {
    try {
      const { clerkClient } = await import('@clerk/nuxt/server')
      await clerkClient(event).users.deleteUser(userId)
    } catch {
      throw createError({ statusCode: 502, statusMessage: 'Your data was deleted, but we could not remove your sign-in account. Please try again.' })
    }
  }
  return { ok: true }
})
