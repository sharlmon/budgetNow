import { canon, type TableName } from './sync'

export interface MergeResult { merged: any; conflicts: string[] }

const same = (a: unknown, b: unknown) => canon(a) === canon(b)
const cents = (n: number) => Math.round(n * 100) / 100

/**
 * Three-way merge of one record that two devices edited.
 *   base   what this device last saw from the server
 *   mine   what this device has now
 *   theirs what the server has now (the other device's version)
 * A field only one side changed takes that side's value. A field both sides changed to the same value is fine.
 * Fields both sides changed differently are conflicts (the merged row keeps the server's value for them), except:
 *  - a debt balance, where each side's payment is a change relative to the base, so both are applied
 *  - goal contributions, which only ever grow (a withdrawal is a negative entry), so the two lists are combined
 */
export function mergeRow(table: TableName, base: any | undefined, mine: any, theirs: any): MergeResult {
  const b = base ?? {}
  const merged: any = { ...theirs }
  const conflicts: string[] = []
  const fields = new Set([...Object.keys(b), ...Object.keys(mine), ...Object.keys(theirs)])
  fields.delete('rev')

  for (const f of fields) {
    if (f === 'contributions' && table === 'goals') {
      const byId = new Map<string, any>((theirs.contributions ?? []).map((c: any) => [c.id, c]))
      let clash = false
      for (const c of mine.contributions ?? []) {
        const other = byId.get(c.id)
        if (!other) byId.set(c.id, c)
        else if (!same(other, c)) clash = true
      }
      merged.contributions = [...byId.values()]
      if (clash) conflicts.push(f)
      continue
    }
    const mineSame = same(mine[f], b[f]), theirsSame = same(theirs[f], b[f])
    if (mineSame) merged[f] = theirs[f]
    else if (theirsSame) merged[f] = mine[f]
    else if (same(mine[f], theirs[f])) merged[f] = mine[f]
    else if (table === 'debts' && f === 'balance' && typeof mine[f] === 'number' && typeof theirs[f] === 'number' && typeof b[f] === 'number') {
      merged[f] = Math.max(0, cents(theirs[f] + (mine[f] - b[f])))
    } else { merged[f] = theirs[f]; conflicts.push(f) }
  }
  merged.rev = theirs.rev
  for (const k of Object.keys(merged)) if (merged[k] === undefined) delete merged[k]
  return { merged, conflicts }
}
