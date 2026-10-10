import { describe, expect, it } from 'vitest'
import { ACCOUNT_KINDS, kindMeta, moveProblem, projectGrowth } from '../app/utils/accounts'
import { diffSnaps, emptySnap } from '../shared/sync'

const mpesa = { id: 'm', name: 'M-Pesa', balance: 1000 }
const bank = { id: 'b' }

describe('moving money between accounts', () => {
  it('allows a normal move', () => expect(moveProblem(mpesa, bank, 400, 30)).toBeNull())
  it('allows moving the whole balance when there is no fee', () => expect(moveProblem(mpesa, bank, 1000, 0)).toBeNull())
  it('counts the fee: the balance must cover amount plus fee', () => expect(moveProblem(mpesa, bank, 1000, 30)).toMatch(/30 short/))
  it('refuses more than the balance, saying by how much', () => expect(moveProblem(mpesa, bank, 1500, 0)).toMatch(/500 short/))
  it('refuses the same account, a missing account, no amount and a negative fee', () => {
    expect(moveProblem(mpesa, { id: 'm' }, 10, 0)).toMatch(/different/)
    expect(moveProblem(undefined, bank, 10, 0)).toMatch(/both/)
    expect(moveProblem(mpesa, bank, 0, 0)).toMatch(/amount/)
    expect(moveProblem(mpesa, bank, 10, -1)).toMatch(/negative/)
  })
})

describe('growth projection', () => {
  it('with no rate it is just the deposits', () => {
    const p = projectGrowth(1000, 12, 0)
    expect(p.end).toBe(12000); expect(p.earned).toBe(0); expect(p.put).toBe(12000)
  })
  it('compounds monthly with deposits at the start of each month', () => {
    const p = projectGrowth(1000, 1, 12)
    expect(p.end).toBe(1010) // (0 + 1000) * 1.01
    expect(projectGrowth(1000, 2, 12).end).toBe(2030.1) // (1010 + 1000) * 1.01
  })
  it('includes a starting balance and returns one point per month plus the start', () => {
    const p = projectGrowth(0, 12, 12, 1000)
    expect(p.balances).toHaveLength(13); expect(p.balances[0]).toBe(1000)
    expect(p.end).toBeCloseTo(1126.83, 2); expect(p.put).toBe(1000)
  })
  it('treats a negative rate as zero', () => expect(projectGrowth(100, 3, -5).end).toBe(300))
})

describe('account kinds', () => {
  it('has a unique key and a hex colour for every kind', () => {
    expect(new Set(ACCOUNT_KINDS.map(k => k.key)).size).toBe(ACCOUNT_KINDS.length)
    for (const k of ACCOUNT_KINDS) expect(k.color).toMatch(/^#[0-9a-f]{6}$/i)
  })
  it('falls back to Other for an unknown kind', () => expect(kindMeta('nope' as any).key).toBe('other'))
})

describe('syncing accounts', () => {
  const acct = { id: 'a1', name: 'M-Pesa', kind: 'mobile', balance: 500, color: '#2fa05a' }
  it('a new account becomes a put', () => {
    const next = { ...emptySnap(), accounts: [acct] as any }
    expect(diffSnaps(emptySnap(), next)).toEqual([{ t: 'accounts', op: 'put', row: acct }])
  })
  it('a changed balance is one put, a removed account is a delete carrying its revision', () => {
    const prev = { ...emptySnap(), accounts: [{ ...acct, rev: 3 }] as any }
    expect(diffSnaps(prev, { ...prev, accounts: [{ ...acct, rev: 3, balance: 450 }] as any })).toHaveLength(1)
    expect(diffSnaps(prev, emptySnap())).toEqual([{ t: 'accounts', op: 'del', id: 'a1', rev: 3 }])
  })
})
