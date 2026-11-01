// Transfers between accounts and the standing rules that start some of them. The providers are simulated, so both lists live on
// this device only (they are not synced or backed up). The balances they change are ordinary account balances, and those do sync.
import { creditDeltas, fail, holdDeltas, providerOutcome, refundDeltas, settle, startTransfer, type Transfer } from '../utils/transfers'
import { proposals, ruleProblem, type Proposal, type SweepRule } from '../utils/sweep'

const tKey = (uid: string) => `bn:transfers:${uid}`, rKey = (uid: string) => `bn:sweepRules:${uid}`
/** Wipes this device's transfers and rules for one person (sign-out and account deletion). */
export function clearTransferData(uid: string) { try { localStorage.removeItem(tKey(uid)); localStorage.removeItem(rKey(uid)) } catch { /* ignore */ } }
/** How long the simulated provider takes to answer. */
export const SIM_MS = 1800
const KEEP = 50
const read = <T>(k: string): T[] => { try { const v = JSON.parse(localStorage.getItem(k) ?? '[]'); return Array.isArray(v) ? v : [] } catch { return [] } }
const write = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* private mode: it just will not be remembered */ } }
const stamp = () => new Date().toISOString()

export function useTransfers() {
  const { state, applyDeltas } = useBudget()
  // Kept per person, so someone else signing in on this device never sees them.
  const uid = useAppAuth().userId.value
  const transfers = useState<Transfer[]>('transfers', () => (uid ? read<Transfer>(tKey(uid)) : []))
  const rules = useState<SweepRule[]>('sweepRules', () => (uid ? read<SweepRule>(rKey(uid)) : []))
  const saveTransfers = () => { if (uid) write(tKey(uid), transfers.value) }
  const saveRules = () => { if (uid) write(rKey(uid), rules.value) }

  /** The provider answers: the amount arrives, or everything held goes back. */
  function finish(id: string) {
    const t = transfers.value.find(x => x.id === id)
    if (!t || t.status !== 'pending') return
    const out = providerOutcome(t)
    let next: Transfer
    if (out.ok) { applyDeltas(creditDeltas(t)); next = settle(t, stamp()); showToast(`${money(t.amount)} arrived in ${t.toName}`) }
    else { applyDeltas(refundDeltas(t)); next = fail(t, out.reason, stamp()); showToast(`Transfer to ${t.toName} failed: ${out.reason}. Your money is back in ${t.fromName}.`) }
    transfers.value = transfers.value.map(x => (x.id === id ? next : x))
    saveTransfers()
  }

  /** Sends money. The sender is debited at once; the receiver is credited when the provider confirms. */
  function send(i: { key?: string; fromId: string; toId: string; amount: number; fee?: number; by?: 'you' | 'rule' }): { error: string } | { transfer: Transfer } {
    const r = startTransfer(state.value.accounts, transfers.value, { ...i, key: i.key ?? newId(), id: newId(), now: stamp() })
    if ('error' in r) return r
    if (!r.duplicate) {
      applyDeltas(holdDeltas(r.transfer))
      transfers.value = [r.transfer, ...transfers.value].slice(0, KEEP)
      saveTransfers()
      setTimeout(() => finish(r.transfer.id), SIM_MS)
    }
    return { transfer: r.transfer }
  }

  /** After a reload, anything still in flight gets its answer. */
  function resume() { for (const t of transfers.value) if (t.status === 'pending') setTimeout(() => finish(t.id), SIM_MS) }

  const due = computed<Proposal[]>(() => proposals(rules.value, state.value.accounts, state.value.bills, today()))
  function addRule(r: Omit<SweepRule, 'id' | 'on'>): { error: string } | { ok: true } {
    const error = ruleProblem(r)
    if (error) return { error }
    rules.value = [...rules.value, { ...r, id: newId(), on: true }]
    saveRules()
    return { ok: true }
  }
  function removeRule(id: string) { rules.value = rules.value.filter(r => r.id !== id); saveRules() }
  function toggleRule(id: string) { rules.value = rules.value.map(r => (r.id === id ? { ...r, on: !r.on } : r)); saveRules() }
  /** Carries out a proposal (the person approved it, or its rule runs by itself). */
  function run(p: Proposal) { return send({ key: `rule-${p.rule.id}-${today()}-${p.amount}`, fromId: p.rule.fromId, toId: p.rule.toId, amount: p.amount, by: 'rule' }) }
  /** Runs every rule that does not need asking. Its key includes the day and amount, so opening the app twice never sweeps twice. */
  function runAuto() { for (const p of due.value) if (p.rule.auto) run(p) }

  return { transfers, rules, due, send, resume, addRule, removeRule, toggleRule, run, runAuto }
}
