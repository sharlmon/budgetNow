// The life of a transfer between two accounts: the money is held when it is sent, then the other side settles or fails it.
// Pure functions, so the screen and the tests share one answer. Providers are simulated for now (see providerOutcome).
import { moveProblem, type Account } from './accounts'

export type TransferStatus = 'pending' | 'settled' | 'failed'
export interface Transfer {
  id: string
  /** Sent with the request. Sending the same key again never moves the money twice, even after a dropped connection. */
  key: string
  fromId: string; toId: string
  /** Names are kept so the history still reads right after an account is renamed or removed. */
  fromName: string; toName: string
  amount: number; fee: number
  status: TransferStatus
  /** Who started it: the person, or one of their standing rules. */
  by: 'you' | 'rule'
  createdAt: string
  settledAt?: string
  /** Why it failed, in plain words. */
  reason?: string
}

const round = (n: number) => Math.round(n * 100) / 100

/** The largest single transfer the simulated providers accept. Real providers set their own limits. */
export const DEMO_LIMIT = 250_000

export interface TransferInput { key: string; fromId: string; toId: string; amount: number; fee?: number; by?: 'you' | 'rule'; now: string; id: string }

/**
 * Starts a transfer. The caller holds the money by applying holdDeltas. Sending a key that already exists returns that transfer
 * and flags it, so the caller knows not to hold the money again.
 */
export function startTransfer(accounts: Pick<Account, 'id' | 'name' | 'balance'>[], existing: Transfer[], i: TransferInput): { error: string } | { transfer: Transfer; duplicate: boolean } {
  const seen = existing.find(t => t.key === i.key)
  if (seen) return { transfer: seen, duplicate: true }
  const from = accounts.find(a => a.id === i.fromId), to = accounts.find(a => a.id === i.toId)
  const fee = i.fee ?? 0
  const error = moveProblem(from, to, i.amount, fee)
  if (error || !from || !to) return { error: error ?? 'Pick both accounts.' }
  return { duplicate: false, transfer: { id: i.id, key: i.key, fromId: from.id, toId: to.id, fromName: from.name, toName: to.name, amount: round(i.amount), fee: round(fee), status: 'pending', by: i.by ?? 'you', createdAt: i.now } }
}

/** Balance changes, by account id. Holding takes the amount and fee out of the sender straight away. */
export const holdDeltas = (t: Transfer): Record<string, number> => ({ [t.fromId]: -round(t.amount + t.fee) })
/** When the other side confirms, the amount arrives. */
export const creditDeltas = (t: Transfer): Record<string, number> => ({ [t.toId]: round(t.amount) })
/** When it fails, everything held goes back. */
export const refundDeltas = (t: Transfer): Record<string, number> => ({ [t.fromId]: round(t.amount + t.fee) })

export const settle = (t: Transfer, now: string): Transfer => (t.status === 'pending' ? { ...t, status: 'settled', settledAt: now } : t)
export const fail = (t: Transfer, reason: string, now: string): Transfer => (t.status === 'pending' ? { ...t, status: 'failed', reason, settledAt: now } : t)

/** What the simulated provider answers. Predictable on purpose, so the demo and the tests agree. */
export function providerOutcome(t: Pick<Transfer, 'amount'>): { ok: true } | { ok: false; reason: string } {
  if (t.amount > DEMO_LIMIT) return { ok: false, reason: `Over the ${DEMO_LIMIT.toLocaleString('en-US')} limit for one transfer` }
  return { ok: true }
}

/** Money that has left an account but not yet arrived anywhere, so the person is not alarmed by a total that looks short. */
export const inFlight = (transfers: Transfer[]): number => round(transfers.filter(t => t.status === 'pending').reduce((s, t) => s + t.amount, 0))

/** Newest first, capped. */
export const recent = (transfers: Transfer[], max = 8): Transfer[] => [...transfers].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, max)
