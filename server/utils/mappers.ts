// Database rows <-> the shape the app uses. Shared by the state endpoint and the sync endpoint.

export const mapIncome = (r: any) => ({ id: r.id, rev: r.rev, label: r.label, amount: r.amount, date: r.date, accountId: r.accountId ?? undefined, split: { needs: r.needs, wants: r.wants, savings: r.savings, debt: r.debt } })
export const mapExpense = (r: any) => ({ id: r.id, rev: r.rev, label: r.label, amount: r.amount, category: r.category, date: r.date, debtId: r.debtId ?? undefined, billId: r.billId ?? undefined, accountId: r.accountId ?? undefined })
export const mapDebt = (r: any) => ({ id: r.id, rev: r.rev, name: r.name, balance: r.balance, original: r.original ?? undefined, minPayment: r.minPayment, apr: r.apr ?? undefined })
export const mapBill = (b: any) => ({ id: b.id, rev: b.rev, name: b.name, amount: b.amount, category: b.category, every: b.frequency, nextDue: b.nextDue, anchorDay: b.anchorDay, auto: b.auto, debtId: b.debtId ?? undefined, accountId: b.accountId ?? undefined })
export const mapAccount = (a: any) => ({ id: a.id, rev: a.rev, name: a.name, kind: a.kind, balance: a.balance, color: a.color, rate: a.rate ?? undefined })
export const mapGoal = (g: any, contributions: any[]) => ({
  id: g.id, rev: g.rev, name: g.name, target: g.target, icon: g.icon, color: g.color, deadline: g.deadline ?? undefined,
  contributions: contributions.filter(c => c.goalId === g.id).map(c => ({ id: c.id, amount: c.amount, date: c.date })),
})

/** The editable content of a row: no revision, and null treated as missing, so two rows can be compared fairly. */
export const content = (row: any) => JSON.parse(JSON.stringify(row, (k, v) => (k === 'rev' || v === null ? undefined : v)))
