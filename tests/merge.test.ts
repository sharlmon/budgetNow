import { describe, expect, it } from 'vitest'
import { mergeRow } from '../shared/merge'
import { reconcile } from '../shared/reconcile'
import { emptySnap, type Snap } from '../shared/sync'

const inc = (over: any = {}) => ({ id: 'i1', rev: 1, label: 'Salary', amount: 1000, date: '2026-10-01', split: { needs: 500, wants: 300, savings: 200, debt: 0 }, ...over })

describe('mergeRow', () => {
  it('keeps both edits when different fields changed', () => {
    const base = inc(), mine = inc({ label: 'Salary (Oct)' }), theirs = inc({ rev: 2, amount: 1200 })
    const r = mergeRow('incomes', base, mine, theirs)
    expect(r.conflicts).toEqual([])
    expect(r.merged).toMatchObject({ label: 'Salary (Oct)', amount: 1200, rev: 2 })
  })
  it('takes the server value for a field only the other device changed, and mine for one only I changed', () => {
    const r = mergeRow('incomes', inc(), inc({ date: '2026-10-05' }), inc({ rev: 2, label: 'Other' }))
    expect(r.merged).toMatchObject({ date: '2026-10-05', label: 'Other' })
    expect(r.conflicts).toEqual([])
  })
  it('is not a conflict when both devices made the same change', () => {
    const r = mergeRow('incomes', inc(), inc({ label: 'Pay' }), inc({ rev: 2, label: 'Pay' }))
    expect(r.conflicts).toEqual([])
    expect(r.merged.label).toBe('Pay')
  })
  it('flags a field both devices changed differently, keeping the server value in the merge', () => {
    const r = mergeRow('incomes', inc(), inc({ label: 'Mine' }), inc({ rev: 2, label: 'Theirs', amount: 5 }))
    expect(r.conflicts).toEqual(['label'])
    expect(r.merged).toMatchObject({ label: 'Theirs', amount: 5 })
  })
  it('treats an income split as one unit', () => {
    const r = mergeRow('incomes', inc(), inc({ split: { needs: 600, wants: 300, savings: 100, debt: 0 } }), inc({ rev: 2, split: { needs: 500, wants: 200, savings: 300, debt: 0 } }))
    expect(r.conflicts).toEqual(['split'])
  })
  it('combines two payments on the same debt instead of losing one', () => {
    const d = (balance: number, rev = 1) => ({ id: 'd', rev, name: 'Card', balance, minPayment: 20 })
    const r = mergeRow('debts', d(1000), d(900), d(950, 2)) // I paid 100, the other device paid 50
    expect(r.conflicts).toEqual([])
    expect(r.merged.balance).toBe(850)
    expect(mergeRow('debts', d(100), d(0), d(30, 2)).merged.balance).toBe(0) // never below zero
  })
  it('combines two changes to the same account balance instead of losing one', () => {
    const a = (balance: number, rev = 1, extra: any = {}) => ({ id: 'a', rev, name: 'M-Pesa', kind: 'mobile', balance, color: '#2fa05a', ...extra })
    const r = mergeRow('accounts', a(10000), a(9000), a(10500, 2)) // I paid 1,000 here; another device received 500
    expect(r.conflicts).toEqual([])
    expect(r.merged.balance).toBe(9500)
    expect(mergeRow('accounts', a(1000), a(0), a(200, 2)).merged.balance).toBe(0) // never below zero
    // a rename on one side and a payment on the other both survive
    const m = mergeRow('accounts', a(10000), a(9000), a(10000, 2, { name: 'M-Pesa Lipa' }))
    expect(m.conflicts).toEqual([]); expect(m.merged).toMatchObject({ balance: 9000, name: 'M-Pesa Lipa' })
  })
  it('still flags other debt fields changed on both sides', () => {
    const d = (over: any) => ({ id: 'd', rev: 1, name: 'Card', balance: 100, minPayment: 20, ...over })
    expect(mergeRow('debts', d({}), d({ name: 'A' }), d({ rev: 2, name: 'B' })).conflicts).toEqual(['name'])
  })
  it('combines goal contributions made on two devices', () => {
    const g = (c: any[], over: any = {}) => ({ id: 'g', rev: 1, name: 'Trip', target: 500, icon: 'plane', color: '#000000', contributions: c, ...over })
    const k = (id: string, amount = 10) => ({ id, amount, date: '2026-10-01' })
    const r = mergeRow('goals', g([k('a')]), g([k('a'), k('b')]), g([k('a'), k('c')], { rev: 2 }))
    expect(r.conflicts).toEqual([])
    expect(r.merged.contributions.map((c: any) => c.id).sort()).toEqual(['a', 'b', 'c'])
    const clash = mergeRow('goals', g([k('a')]), g([k('a'), k('b', 5)]), g([k('a'), k('b', 99)], { rev: 2 }))
    expect(clash.conflicts).toEqual(['contributions'])
  })
  it('copes with a missing base by treating every differing field as a conflict', () => {
    const r = mergeRow('incomes', undefined, inc({ label: 'A' }), inc({ rev: 2, label: 'B' }))
    expect(r.conflicts).toContain('label')
  })
})

const snap = (over: Partial<Snap> = {}): Snap => ({ ...emptySnap(), ...over })

describe('reconcile', () => {
  it('records new revisions on both the synced copy and the live rows', () => {
    const sent = snap({ incomes: [inc({ rev: undefined })] as any })
    const live = snap({ incomes: [inc({ rev: undefined, label: 'edited after sending' })] as any })
    const out = reconcile({ prevSynced: snap(), sent, live, res: { revs: { incomes: { i1: 1 } } } })
    expect((out.synced.incomes as any[])[0].rev).toBe(1)
    expect((out.live.incomes as any[])[0]).toMatchObject({ rev: 1, label: 'edited after sending' }) // later edits are kept
    expect(out.conflicts).toEqual([]); expect(out.merged).toBe(0)
  })
  it('merges non-overlapping edits automatically and asks for a re-push', () => {
    const base = inc(), mine = inc({ label: 'Mine' }), theirs = inc({ rev: 2, amount: 1200 })
    const out = reconcile({ prevSynced: snap({ incomes: [base] as any }), sent: snap({ incomes: [mine] as any }), live: snap({ incomes: [mine] as any }), res: { conflicts: [{ t: 'incomes', id: 'i1', theirs }] } })
    expect(out.conflicts).toEqual([])
    expect(out.merged).toBe(1)
    expect((out.live.incomes as any[])[0]).toMatchObject({ label: 'Mine', amount: 1200, rev: 2 })
    expect((out.synced.incomes as any[])[0]).toMatchObject({ label: 'Salary', amount: 1200, rev: 2 }) // the server's copy is the new base
  })
  it('shows the other device\'s version and records a conflict when the same field clashes', () => {
    const base = inc(), mine = inc({ label: 'Mine' }), theirs = inc({ rev: 2, label: 'Theirs' })
    const out = reconcile({ prevSynced: snap({ incomes: [base] as any }), sent: snap({ incomes: [mine] as any }), live: snap({ incomes: [mine] as any }), res: { conflicts: [{ t: 'incomes', id: 'i1', theirs }] } })
    expect(out.conflicts).toHaveLength(1)
    expect(out.conflicts[0]).toMatchObject({ kind: 'edit', fields: ['label'], title: 'Theirs', t: 'incomes' })
    expect(out.conflicts[0]!.mine.label).toBe('Mine')
    expect((out.live.incomes as any[])[0].label).toBe('Theirs')
    expect(out.merged).toBe(0)
  })
  it('uses edits made while the request was in flight as "mine"', () => {
    const base = inc(), sentRow = inc({ label: 'Sent' }), liveRow = inc({ label: 'Sent', date: '2026-10-09' }), theirs = inc({ rev: 2, amount: 7 })
    const out = reconcile({ prevSynced: snap({ incomes: [base] as any }), sent: snap({ incomes: [sentRow] as any }), live: snap({ incomes: [liveRow] as any }), res: { conflicts: [{ t: 'incomes', id: 'i1', theirs }] } })
    expect((out.live.incomes as any[])[0]).toMatchObject({ label: 'Sent', date: '2026-10-09', amount: 7 })
  })
  it('reports an edit to something another device deleted, and removes it locally', () => {
    const base = inc(), mine = inc({ label: 'Mine' })
    const out = reconcile({ prevSynced: snap({ incomes: [base] as any }), sent: snap({ incomes: [mine] as any }), live: snap({ incomes: [mine] as any }), res: { conflicts: [{ t: 'incomes', id: 'i1', theirs: null }] } })
    expect(out.conflicts[0]).toMatchObject({ kind: 'removed-elsewhere', title: 'Mine' })
    expect(out.live.incomes).toEqual([]); expect(out.synced.incomes).toEqual([])
    expect(out.conflicts[0]!.mine.rev).toBeUndefined() // restoring it later creates a fresh row
  })
  it('puts back a row I deleted that another device edited', () => {
    const base = inc(), theirs = inc({ rev: 3, label: 'Edited elsewhere' })
    const out = reconcile({ prevSynced: snap({ incomes: [base] as any }), sent: snap(), live: snap(), res: { conflicts: [{ t: 'incomes', id: 'i1', theirs }] } })
    expect(out.conflicts[0]).toMatchObject({ kind: 'delete-blocked', title: 'Edited elsewhere' })
    expect((out.live.incomes as any[])[0]).toMatchObject({ id: 'i1', rev: 3 })
    expect((out.synced.incomes as any[])[0].rev).toBe(3)
  })
  it('handles a delete that both devices made, and unknown tables, without fuss', () => {
    const out = reconcile({ prevSynced: snap({ incomes: [inc()] as any }), sent: snap(), live: snap(), res: { conflicts: [{ t: 'incomes', id: 'i1', theirs: null }, { t: 'users' as any, id: 'x', theirs: null }], revs: { nonsense: { a: 1 } } } })
    expect(out.conflicts).toEqual([]); expect(out.live.incomes).toEqual([])
  })
  it('does not mutate its inputs', () => {
    const base = inc(), mine = inc({ label: 'Mine' }), theirs = inc({ rev: 2, label: 'Theirs' })
    const input = { prevSynced: snap({ incomes: [base] as any }), sent: snap({ incomes: [mine] as any }), live: snap({ incomes: [mine] as any }), res: { conflicts: [{ t: 'incomes' as const, id: 'i1', theirs }] } }
    const before = JSON.stringify(input)
    reconcile(input)
    expect(JSON.stringify(input)).toBe(before)
  })
})
