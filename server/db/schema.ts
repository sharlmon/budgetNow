import { sql } from 'drizzle-orm'
import { boolean, check, date, foreignKey, index, integer, numeric, pgTable, primaryKey, text, timestamp } from 'drizzle-orm/pg-core'

// Every table is keyed by (user_id, id): ids are generated on the client, so they are only unique per user.
// user_id is the Clerk user id and is always set from the verified session on the server, never from the request body.
const money = (name: string) => numeric(name, { precision: 14, scale: 2, mode: 'number' }).notNull()
const stamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}

export const profiles = pgTable('profiles', {
  userId: text('user_id').primaryKey(),
  currency: text('currency').notNull().default('USD'),
  name: text('name').notNull().default(''),
  ...stamps,
})

export const incomes = pgTable('incomes', {
  userId: text('user_id').notNull(),
  id: text('id').notNull(),
  label: text('label').notNull().default(''),
  amount: money('amount'),
  date: date('date', { mode: 'string' }).notNull(),
  needs: money('needs'),
  wants: money('wants'),
  savings: money('savings'),
  debt: money('debt'),
  ...stamps,
}, t => [
  primaryKey({ columns: [t.userId, t.id] }), index('incomes_user_date').on(t.userId, t.date),
  check('incomes_nonneg', sql`${t.amount} >= 0 AND ${t.needs} >= 0 AND ${t.wants} >= 0 AND ${t.savings} >= 0 AND ${t.debt} >= 0`),
])

export const expenses = pgTable('expenses', {
  userId: text('user_id').notNull(),
  id: text('id').notNull(),
  label: text('label').notNull().default(''),
  amount: money('amount'),
  category: text('category').notNull(),
  date: date('date', { mode: 'string' }).notNull(),
  debtId: text('debt_id'),
  billId: text('bill_id'),
  ...stamps,
}, t => [
  primaryKey({ columns: [t.userId, t.id] }), index('expenses_user_date').on(t.userId, t.date),
  check('expenses_category', sql`${t.category} IN ('needs','wants','savings','debt')`), check('expenses_nonneg', sql`${t.amount} >= 0`),
])

export const debts = pgTable('debts', {
  userId: text('user_id').notNull(),
  id: text('id').notNull(),
  name: text('name').notNull(),
  balance: money('balance'),
  original: numeric('original', { precision: 14, scale: 2, mode: 'number' }),
  minPayment: money('min_payment'),
  ...stamps,
}, t => [primaryKey({ columns: [t.userId, t.id] }), check('debts_nonneg', sql`${t.balance} >= 0 AND ${t.minPayment} >= 0`)])

export const goals = pgTable('goals', {
  userId: text('user_id').notNull(),
  id: text('id').notNull(),
  name: text('name').notNull(),
  target: money('target'),
  icon: text('icon').notNull().default('target'),
  color: text('color').notNull().default('#ef6a3a'),
  deadline: date('deadline', { mode: 'string' }),
  ...stamps,
}, t => [primaryKey({ columns: [t.userId, t.id] }), check('goals_target', sql`${t.target} > 0`)])

export const goalContributions = pgTable('goal_contributions', {
  userId: text('user_id').notNull(),
  id: text('id').notNull(),
  goalId: text('goal_id').notNull(),
  amount: money('amount'),
  date: date('date', { mode: 'string' }).notNull(),
}, t => [
  primaryKey({ columns: [t.userId, t.id] }),
  foreignKey({ columns: [t.userId, t.goalId], foreignColumns: [goals.userId, goals.id] }).onDelete('cascade'),
  index('goal_contrib_goal').on(t.userId, t.goalId),
])

export const bills = pgTable('bills', {
  userId: text('user_id').notNull(),
  id: text('id').notNull(),
  name: text('name').notNull(),
  amount: money('amount'),
  category: text('category').notNull(),
  frequency: text('frequency').notNull(),
  nextDue: date('next_due', { mode: 'string' }).notNull(),
  anchorDay: integer('anchor_day').notNull(),
  auto: boolean('auto').notNull().default(false),
  debtId: text('debt_id'),
  ...stamps,
}, t => [
  primaryKey({ columns: [t.userId, t.id] }),
  check('bills_category', sql`${t.category} IN ('needs','wants','debt')`), check('bills_frequency', sql`${t.frequency} IN ('week','month','year')`),
  check('bills_amount', sql`${t.amount} >= 0`), check('bills_anchor', sql`${t.anchorDay} BETWEEN 1 AND 31`),
])

// Shared counters for rate limiting. Serverless instances do not share memory, so the limit lives in the database.
export const rateLimits = pgTable('rate_limits', {
  key: text('key').primaryKey(),
  count: integer('count').notNull(),
  windowStart: timestamp('window_start', { withTimezone: true }).notNull().defaultNow(),
})
