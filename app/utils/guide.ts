// The setup guide: three short steps that get a new person to a useful home screen. Which steps are done is worked out from
// their data, so it is right on every device and never gets out of step.

export type GuideKey = 'account' | 'pay' | 'bill'
export interface GuideStep { key: GuideKey; title: string; detail: string; done: boolean }
export interface GuideCounts { accounts: number; incomes: number; bills: number }

export function guideSteps(c: GuideCounts): GuideStep[] {
  return [
    { key: 'account', title: 'Add where your money is', done: c.accounts > 0, detail: c.accounts > 0 ? `${c.accounts} account${c.accounts === 1 ? '' : 's'} added` : 'M-Pesa, your bank or cash. You type the balance.' },
    { key: 'pay', title: 'Add your first pay', done: c.incomes > 0, detail: c.incomes > 0 ? 'Added and split' : 'Weka splits it into Needs, Wants, Savings and Debt.' },
    { key: 'bill', title: 'Add a bill', done: c.bills > 0, detail: c.bills > 0 ? `${c.bills} bill${c.bills === 1 ? '' : 's'} added` : 'Rent, internet or electricity, so Weka can keep track.' },
  ]
}

export const guideProgress = (steps: GuideStep[]) => ({ done: steps.filter(s => s.done).length, total: steps.length })
/** The step to point at first: the earliest one not done yet. */
export const nextStep = (steps: GuideStep[]) => steps.find(s => !s.done)

/**
 * Whether to show the guide. It waits until the first sync has finished, so someone who already has data on another device never
 * sees it flash up while their data is still arriving. It goes away when everything is done or the person hides it.
 */
export function guideVisible(o: { steps: GuideStep[]; dismissed: boolean; synced: boolean }): boolean {
  return o.synced && !o.dismissed && o.steps.some(s => !s.done)
}
