// Standing rules for moving money: "keep this much here, sweep the rest into that account", never touching money the bills
// coming up still need. Pure functions, so the screen and the tests share one answer.
import { addDays, occurrencesUntil, type Every } from './bills'

export interface SweepRule {
  id: string
  fromId: string; toId: string
  /** Stays in the sending account, whatever happens. */
  keep: number
  /** Also keep what the bills due within this many days need. 0 ignores bills. */
  billDays: number
  /** The smallest sweep worth making. */
  min: number
  /** true: carried out by itself. false: the person is asked first. */
  auto: boolean
  on: boolean
}
export interface SweepBill { amount: number; every: Every; nextDue: string; anchorDay: number; accountId?: string }
export interface Proposal { rule: SweepRule; amount: number; /** What was held back for bills. */ reserve: number }

const round = (n: number) => Math.round(n * 100) / 100

/**
 * What bills due in the next `days` days need from this account. A bill tied to another account is not this account's business;
 * one with no account counts here. Overdue bills count too, and a bill that falls due twice in the window counts twice.
 */
export function billReserve(bills: SweepBill[], accountId: string, today: string, days: number): number {
  if (days <= 0) return 0
  const until = addDays(today, days)
  let total = 0
  for (const b of bills) {
    if (b.accountId && b.accountId !== accountId) continue
    total += occurrencesUntil(b.nextDue, b.every, b.anchorDay, until).length * b.amount
  }
  return round(total)
}

/**
 * What each rule would move right now. Rules run in order against a working copy of the balances, so two rules that sweep the
 * same account do not both spend the same money.
 */
export function proposals(rules: SweepRule[], accounts: { id: string; balance: number }[], bills: SweepBill[], today: string): Proposal[] {
  const bal = new Map(accounts.map(a => [a.id, a.balance]))
  const out: Proposal[] = []
  for (const rule of rules) {
    if (!rule.on || rule.fromId === rule.toId || !bal.has(rule.fromId) || !bal.has(rule.toId)) continue
    const reserve = billReserve(bills, rule.fromId, today, rule.billDays)
    const amount = round(bal.get(rule.fromId)! - Math.max(0, rule.keep) - reserve)
    if (amount <= 0 || amount < Math.max(rule.min, 0.01)) continue
    bal.set(rule.fromId, round(bal.get(rule.fromId)! - amount))
    bal.set(rule.toId, round(bal.get(rule.toId)! + amount))
    out.push({ rule, amount, reserve })
  }
  return out
}

/** Why a rule cannot be saved, or null when it can. */
export function ruleProblem(r: Pick<SweepRule, 'fromId' | 'toId' | 'keep' | 'min' | 'billDays'>): string | null {
  if (!r.fromId || !r.toId) return 'Pick both accounts.'
  if (r.fromId === r.toId) return 'Pick two different accounts.'
  if (!(r.keep >= 0)) return 'The amount to keep cannot be negative.'
  if (!(r.min >= 0)) return 'The smallest sweep cannot be negative.'
  if (!Number.isInteger(r.billDays) || r.billDays < 0 || r.billDays > 31) return 'Days of bills must be between 0 and 31.'
  return null
}
