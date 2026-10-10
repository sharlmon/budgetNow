// The version history shown in Settings > About. Newest first.
// To release: bump "version" in package.json, add an entry at the top here and in CHANGELOG.md (a test checks all three agree), then tag it (git tag vX.Y.Z).

export interface Release { version: string; date: string; title: string; notes: string[] }

export const RELEASES: Release[] = [
  {
    version: '1.2.0',
    date: '2026-10-10',
    title: 'Accounts at the top, and linked to your money',
    notes: [
      'The home screen now starts with your accounts, then quick actions, bills that need attention, and your budget',
      'Choose the account when you add income or an expense, and Weka updates its balance',
      'Pay a bill or a debt from an account; if the account is short you are told by how much',
      'Give a bill its own account, so one tap pays it from the right place',
      'Activity shows which account each entry used',
      'Two devices changing the same account balance are combined instead of clashing',
    ],
  },
  {
    version: '1.1.0',
    date: '2026-10-10',
    title: 'All your accounts in one wallet',
    notes: [
      'New Accounts screen: add M-Pesa, your bank, PayPal, cash and investments and see the total in one wallet',
      'Record money moving between your accounts, with an optional fee, and undo it',
      'For investments, enter the yearly return you expect and preview how monthly savings could grow',
      'Hide your balances with one tap; Weka remembers the choice on this device',
      'The Weka name and logo, and a landing page built around your bills',
      'Undo now keeps working after a change has been saved (paying a bill, deleting a debt payment)',
      'Bigger tap targets on phones and longer titles on small screens',
    ],
  },
  {
    version: '1.0.0',
    date: '2026-10-09',
    title: 'Weka 1.0',
    notes: [
      'Enter a pay and see it split into Needs, Wants, Savings and Debt, then adjust it before you confirm',
      'A "safe to spend today" number worked out from your budget and bills still due',
      'Debts with a payoff planner (snowball or avalanche), savings goals, and recurring bills',
      'Accounts with sign-in, syncing across devices, and full use offline',
      'Editable default split and Kenyan shillings (KSh) as the default currency',
      'Optional PIN lock with Face ID or fingerprint, and a light or dark theme',
      'Edits made on two devices are merged, and you decide only when they truly clash',
    ],
  },
]

const parts = (v: string) => v.split('-')[0]!.split('.').map(n => parseInt(n, 10) || 0)

/** Positive when a is newer than b, negative when older, 0 when equal ("1.10.0" is newer than "1.9.0"). */
export function compareVersions(a: string, b: string): number {
  const x = parts(a), y = parts(b)
  for (let i = 0; i < Math.max(x.length, y.length, 3); i++) {
    const d = (x[i] ?? 0) - (y[i] ?? 0)
    if (d !== 0) return d
  }
  return 0
}

export const isSemver = (v: string) => /^\d+\.\d+\.\d+$/.test(v)
