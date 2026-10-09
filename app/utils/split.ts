// The rule used to divide what is left of each pay (after debt minimums) between Needs, Wants and Savings.

export interface SplitRule { needs: number; wants: number; savings: number }

export const DEFAULT_SPLIT: SplitRule = { needs: 50, wants: 30, savings: 20 }

export const SPLIT_PRESETS: { label: string; hint: string; rule: SplitRule }[] = [
  { label: 'Balanced', hint: 'The classic 50/30/20', rule: { needs: 50, wants: 30, savings: 20 } },
  { label: 'High rent', hint: 'Needs take more', rule: { needs: 60, wants: 20, savings: 20 } },
  { label: 'Tight budget', hint: 'Mostly essentials', rule: { needs: 70, wants: 20, savings: 10 } },
  { label: 'Save more', hint: 'Build savings faster', rule: { needs: 40, wants: 30, savings: 30 } },
  { label: 'Lean', hint: 'Few wants, big savings', rule: { needs: 50, wants: 10, savings: 40 } },
]

const isPct = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= 100

/** Three whole-number percentages that add up to exactly 100. */
export const isValidSplit = (r: Partial<SplitRule> | null | undefined): r is SplitRule =>
  !!r && isPct(r.needs) && isPct(r.wants) && isPct(r.savings) && r.needs + r.wants + r.savings === 100

export const sameSplit = (a: SplitRule, b: SplitRule) => a.needs === b.needs && a.wants === b.wants && a.savings === b.savings

const round = (n: number) => Math.round(n * 100) / 100

/**
 * Divides a pay: debt minimums are reserved first, then what is left follows the rule.
 * Savings takes the remainder so the four amounts always add up to the pay exactly.
 */
export function suggestSplit(amount: number, minDebt: number, rule: SplitRule = DEFAULT_SPLIT) {
  const r = isValidSplit(rule) ? rule : DEFAULT_SPLIT
  const debt = Math.min(round(minDebt), amount)
  const rest = amount - debt
  const needs = round((rest * r.needs) / 100)
  const wants = round((rest * r.wants) / 100)
  const savings = round(rest - needs - wants)
  return { needs, wants, savings, debt }
}

export const splitLabel = (r: SplitRule) => `${r.needs}/${r.wants}/${r.savings}`
