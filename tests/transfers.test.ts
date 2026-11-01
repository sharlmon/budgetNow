import { describe, expect, it } from 'vitest'
import { DEMO_LIMIT, creditDeltas, fail, holdDeltas, inFlight, providerOutcome, recent, refundDeltas, settle, startTransfer, type Transfer } from '../app/utils/transfers'

const accounts = [{ id: 'm', name: 'M-Pesa', balance: 10_000 }, { id: 'f', name: 'Money market fund', balance: 50_000 }]
const base = { key: 'k1', fromId: 'm', toId: 'f', amount: 4000, now: '2026-11-01T08:00:00Z', id: 't1' }

describe('starting a transfer', () => {
  it('creates a pending transfer with the account names', () => {
    const r = startTransfer(accounts, [], base)
    expect('transfer' in r && r.transfer).toMatchObject({ status: 'pending', fromName: 'M-Pesa', toName: 'Money market fund', amount: 4000, fee: 0, by: 'you' })
  })
  it('refuses more than the balance, with the usual reason', () => {
    expect(startTransfer(accounts, [], { ...base, amount: 20_000 })).toEqual({ error: expect.stringMatching(/short/) })
  })
  it('refuses the same account on both sides', () => {
    expect(startTransfer(accounts, [], { ...base, toId: 'm' })).toEqual({ error: expect.stringMatching(/different/) })
  })
  it('sending the same key twice returns the first transfer and flags it', () => {
    const first = startTransfer(accounts, [], base)
    if (!('transfer' in first)) throw new Error('expected a transfer')
    const again = startTransfer(accounts, [first.transfer], { ...base, id: 't2' })
    expect(again).toEqual({ transfer: first.transfer, duplicate: true })
  })
})

describe('holding, settling and failing', () => {
  const t: Transfer = { id: 't1', key: 'k1', fromId: 'm', toId: 'f', fromName: 'M-Pesa', toName: 'Fund', amount: 4000, fee: 30, status: 'pending', by: 'you', createdAt: 'a' }
  it('holds the amount and the fee, credits only the amount, and refunds everything held', () => {
    expect(holdDeltas(t)).toEqual({ m: -4030 })
    expect(creditDeltas(t)).toEqual({ f: 4000 })
    expect(refundDeltas(t)).toEqual({ m: 4030 })
  })
  it('settles or fails a pending transfer once', () => {
    expect(settle(t, 'b')).toMatchObject({ status: 'settled', settledAt: 'b' })
    expect(fail(t, 'No', 'b')).toMatchObject({ status: 'failed', reason: 'No' })
    expect(fail(settle(t, 'b'), 'No', 'c').status).toBe('settled')
    expect(settle(fail(t, 'No', 'b'), 'c').status).toBe('failed')
  })
})

describe('the simulated provider', () => {
  it('accepts a normal transfer', () => expect(providerOutcome({ amount: 4000 })).toEqual({ ok: true }))
  it('accepts exactly the limit', () => expect(providerOutcome({ amount: DEMO_LIMIT })).toEqual({ ok: true }))
  it('refuses more than the limit, saying why', () => expect(providerOutcome({ amount: DEMO_LIMIT + 1 })).toEqual({ ok: false, reason: expect.stringContaining('limit') }))
})

describe('history helpers', () => {
  const mk = (id: string, createdAt: string, status: Transfer['status'], amount: number): Transfer => ({ id, key: id, fromId: 'm', toId: 'f', fromName: 'a', toName: 'b', amount, fee: 0, status, by: 'you', createdAt })
  it('adds up only what is still on its way', () => {
    expect(inFlight([mk('1', 'a', 'pending', 100), mk('2', 'b', 'settled', 500), mk('3', 'c', 'pending', 50.5)])).toBe(150.5)
  })
  it('lists the newest first and caps the list', () => {
    expect(recent([mk('1', '2026-11-01', 'settled', 1), mk('2', '2026-11-03', 'settled', 1), mk('3', '2026-11-02', 'settled', 1)], 2).map(t => t.id)).toEqual(['2', '3'])
  })
})
