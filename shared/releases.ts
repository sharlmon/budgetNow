// The version history shown in Settings > About. Newest first.
// To release: bump "version" in package.json, add an entry at the top here and in CHANGELOG.md (a test checks all three agree), then tag it (git tag vX.Y.Z).

export interface Release { version: string; date: string; title: string; notes: string[] }

export const RELEASES: Release[] = [
  {
    version: '1.5.0',
    date: '2026-10-11',
    title: 'Plan, Activity and Analytics, redesigned',
    notes: [
      'Plan now tells you whether your accounts cover the bills due in the next 14, 30 or 60 days, and names the first bill they will not cover',
      'Activity can be searched and filtered by category, account and day, with a spend-by-day strip and each day\'s total pinned as you scroll',
      'Analytics shows whether you are on pace this month, how each category changed from last month, and your biggest spends',
      'Analytics also splits spending by account and gives a few plain-language observations',
      'Long entry details no longer run under the amount on small phones',
    ],
  },
  {
    version: '1.4.0',
    date: '2026-10-11',
    title: 'Bill reminders',
    notes: [
      'Get a notification on the morning a bill is due, even when Weka is closed',
      'Choose how early to be reminded, from the day itself up to 3 days before',
      'Choose what the lock screen shows: just a count, bill names, or names and amounts',
      'A live example of the notification, and a button to send yourself a test',
      'On iPhone and iPad, reminders work once Weka is on your Home Screen',
    ],
  },
  {
    version: '1.3.0',
    date: '2026-10-10',
    title: 'Edit entries, and a setup guide',
    notes: [
      'Tap any income or expense to edit it: label, amount, date, category and the account it used',
      'Account balances and debts stay correct when you change an amount or move an entry to another account, and every edit can be undone',
      'A Get set up card walks new people through adding an account, their first pay and a bill',
      'Hide the guide any time and bring it back from Settings',
    ],
  },
  {
    version: '1.2.2',
    date: '2026-10-10',
    title: 'A tidier Settings',
    notes: [
      'Settings is now a short menu, with each group on its own screen',
      'Each row says in one line what is set, such as your split, App lock, or when you last backed up',
      'Sync, sign out and Delete account are together on one Account and sync screen',
    ],
  },
  {
    version: '1.2.1',
    date: '2026-10-10',
    title: 'Faster start',
    notes: [
      'A Weka loading screen appears at once instead of a blank page',
      'The app opens straight from your saved data while it checks your sign-in in the background',
      'Screens open instantly from this device, even on a slow connection',
    ],
  },
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
