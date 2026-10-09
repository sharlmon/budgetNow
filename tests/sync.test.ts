import { describe, expect, it } from 'vitest'
import { canon, diffSnaps, emptySnap } from '../shared/sync'

const base: any = emptySnap()
const inc = { id: 'i1', label: 'Pay', amount: 100, date: '2026-10-01', split: { needs: 50, wants: 30, savings: 20, debt: 0 } }
const withInc: any = { ...base, incomes: [inc] }

describe('diffSnaps', () => {
  it('produces nothing when nothing changed', () => expect(diffSnaps(base, base)).toEqual([]))
  it('puts new rows and deletes removed rows', () => {
    expect(diffSnaps(base, withInc)).toEqual([{ t: 'incomes', op: 'put', row: inc }])
    expect(diffSnaps(withInc, base)).toEqual([{ t: 'incomes', op: 'del', id: 'i1' }])
  })
  it('ignores key order and undefined fields', () => {
    expect(diffSnaps(withInc, { ...withInc, incomes: [{ ...inc, split: { debt: 0, savings: 20, wants: 30, needs: 50 } }] })).toEqual([])
    expect(diffSnaps(withInc, { ...withInc, incomes: [{ ...inc, note: undefined }] })).toEqual([])
  })
  it('puts an edited row once', () => expect(diffSnaps(withInc, { ...withInc, incomes: [{ ...inc, label: 'Pay2' }] }).map(o => o.op)).toEqual(['put']))
  it('turns a new goal contribution into a single goal put', () => {
    const g = { id: 'g', name: 'x', target: 5, icon: 'i', color: '#fff000', contributions: [{ id: 'c', amount: 1, date: '2026-10-01' }] }
    const next = { ...base, goals: [{ ...g, contributions: [...g.contributions, { id: 'c2', amount: 2, date: '2026-10-02' }] }] }
    expect(diffSnaps({ ...base, goals: [g] }, next)).toHaveLength(1)
  })
  it('syncs profile changes', () => {
    const next = { ...base, profile: { ...base.profile, currency: 'ZAR' } }
    expect(diffSnaps(base, next)).toEqual([{ t: 'profile', op: 'put', row: next.profile }])
  })
  it('syncs a changed split rule as a profile change', () => {
    const next = { ...base, profile: { ...base.profile, split: { needs: 60, wants: 20, savings: 20 } } }
    expect(diffSnaps(base, next)).toEqual([{ t: 'profile', op: 'put', row: next.profile }])
    expect(diffSnaps(next, JSON.parse(JSON.stringify(next)))).toEqual([])
  })
  it('replacing a row is one delete and one put', () => {
    const rows = Array.from({ length: 5 }, (_, i) => ({ id: 'e' + i, label: '', amount: 1, category: 'needs', date: '2026-10-01' }))
    const ops = diffSnaps({ ...base, expenses: rows }, { ...base, expenses: [...rows.slice(1), { ...rows[0], id: 'new' }] })
    expect(ops.map((o: any) => o.op + ':' + (o.id ?? o.row.id)).sort()).toEqual(['del:e0', 'put:new'])
  })
  it('regression: a baseline that shares arrays with live state would hide edits, so callers must clone', () => {
    const live: any = { ...base, incomes: [inc] }
    const aliased: any = { ...live } // same incomes array
    live.incomes.unshift({ ...inc, id: 'i2' })
    expect(diffSnaps(aliased, live)).toEqual([]) // shows why useSync clones the baseline
    const cloned = JSON.parse(JSON.stringify({ ...base, incomes: [inc] }))
    expect(diffSnaps(cloned, live)).toHaveLength(1)
  })
})

it('canon sorts keys and drops undefined', () => expect(canon({ b: 1, a: { d: 1, c: undefined } })).toBe('{"a":{"d":1},"b":1}'))
