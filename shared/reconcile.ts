import { mergeRow } from './merge'
import { canon, type Snap, type TableName, TABLES } from './sync'

export interface PushResponse {
  revs?: Record<string, Record<string, number>>
  conflicts?: { t: TableName; id: string; theirs: any | null }[]
}

export interface Conflict {
  key: string
  t: TableName
  id: string
  /** edit: both devices changed the same field. removed-elsewhere: you edited it, another device deleted it. delete-blocked: you deleted it, another device edited it. */
  kind: 'edit' | 'removed-elsewhere' | 'delete-blocked'
  title: string
  mine: any | null
  theirs: any | null
  fields: string[]
}

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v))
const find = (rows: any[], id: string) => rows.find(r => r.id === id)
const put = (rows: any[], row: any) => { const i = rows.findIndex(r => r.id === row.id); if (i >= 0) rows[i] = row; else rows.unshift(row) }
const drop = (rows: any[], id: string) => { const i = rows.findIndex(r => r.id === id); if (i >= 0) rows.splice(i, 1) }
const withoutRev = (r: any) => { const { rev: _r, ...rest } = r; return rest }

export const titleOf = (row: any): string => row?.label || row?.name || 'an item'

/**
 * Applies the server's answer to a push.
 *   prevSynced  the server copy this device had before pushing (the merge base)
 *   sent        what was pushed
 *   live        the app's data right now (it may contain edits made while the request was in flight)
 * Accepted rows get their new revision. Rows the server refused are merged with the other device's version when the
 * edits don't overlap (merged rows are returned changed, so the caller pushes them again); otherwise the other device's
 * version is shown and the clash is returned for the user to decide.
 */
export function reconcile(i: { prevSynced: Snap; sent: Snap; live: Snap; res: PushResponse }) {
  const synced = clone(i.sent)
  const live = clone(i.live)
  const conflicts: Conflict[] = []
  let merged = 0

  for (const [t, map] of Object.entries(i.res.revs ?? {})) {
    if (!(TABLES as string[]).includes(t)) continue
    for (const [id, rev] of Object.entries(map)) {
      const s = find((synced as any)[t], id), l = find((live as any)[t], id)
      if (s) s.rev = rev
      if (l) l.rev = rev
    }
  }

  for (const c of i.res.conflicts ?? []) {
    const t = c.t
    if (!(TABLES as string[]).includes(t)) continue
    const base = find((i.prevSynced as any)[t], c.id)
    const sentRow = find((i.sent as any)[t], c.id)
    const liveRow = find((live as any)[t], c.id)
    const rows = (live as any)[t] as any[], srows = (synced as any)[t] as any[]

    if (base && !sentRow) { // I tried to delete it
      if (!c.theirs) { drop(srows, c.id); continue } // gone on both sides
      put(srows, clone(c.theirs)); put(rows, clone(c.theirs))
      conflicts.push({ key: `${t}:${c.id}:${c.theirs.rev}`, t, id: c.id, kind: 'delete-blocked', title: titleOf(c.theirs), mine: null, theirs: c.theirs, fields: [] })
      continue
    }
    const mine = liveRow ?? sentRow
    if (!mine) continue
    if (!c.theirs) { // another device deleted it while I edited it
      drop(srows, c.id); drop(rows, c.id)
      conflicts.push({ key: `${t}:${c.id}:gone`, t, id: c.id, kind: 'removed-elsewhere', title: titleOf(mine), mine: withoutRev(mine), theirs: null, fields: [] })
      continue
    }
    const m = mergeRow(t, base, mine, c.theirs)
    put(srows, clone(c.theirs)) // the server's copy is the new base
    if (m.conflicts.length === 0) {
      put(rows, m.merged)
      if (canon(m.merged) !== canon(c.theirs)) merged++
    } else {
      put(rows, clone(c.theirs))
      conflicts.push({ key: `${t}:${c.id}:${c.theirs.rev}`, t, id: c.id, kind: 'edit', title: titleOf(c.theirs), mine: clone(mine), theirs: clone(c.theirs), fields: m.conflicts })
    }
  }
  return { synced, live, conflicts, merged }
}
