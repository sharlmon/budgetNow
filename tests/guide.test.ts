import { describe, expect, it } from 'vitest'
import { guideProgress, guideSteps, guideVisible, nextStep } from '../app/utils/guide'

const none = { accounts: 0, incomes: 0, bills: 0 }

describe('setup guide steps', () => {
  it('starts with all three steps open, in the order account, pay, bill', () => {
    const s = guideSteps(none)
    expect(s.map(x => x.key)).toEqual(['account', 'pay', 'bill'])
    expect(s.every(x => !x.done)).toBe(true)
    expect(guideProgress(s)).toEqual({ done: 0, total: 3 })
  })
  it('marks a step done from the data, whatever order things were added in', () => {
    const s = guideSteps({ accounts: 0, incomes: 2, bills: 1 })
    expect(s.map(x => x.done)).toEqual([false, true, true])
    expect(guideProgress(s).done).toBe(2)
  })
  it('says what was added once a step is done, with correct plurals', () => {
    expect(guideSteps({ ...none, accounts: 1 })[0]!.detail).toBe('1 account added')
    expect(guideSteps({ ...none, accounts: 3 })[0]!.detail).toBe('3 accounts added')
    expect(guideSteps({ ...none, bills: 1 })[2]!.detail).toBe('1 bill added')
    expect(guideSteps({ ...none, bills: 2 })[2]!.detail).toBe('2 bills added')
  })
  it('points at the earliest step that is not done', () => {
    expect(nextStep(guideSteps(none))?.key).toBe('account')
    expect(nextStep(guideSteps({ accounts: 1, incomes: 0, bills: 0 }))?.key).toBe('pay')
    expect(nextStep(guideSteps({ accounts: 1, incomes: 1, bills: 0 }))?.key).toBe('bill')
    expect(nextStep(guideSteps({ accounts: 1, incomes: 1, bills: 1 }))).toBeUndefined()
  })
})

describe('when the guide shows', () => {
  const open = guideSteps(none), complete = guideSteps({ accounts: 1, incomes: 1, bills: 1 })
  it('shows for someone with steps left, once the first sync has finished', () => expect(guideVisible({ steps: open, dismissed: false, synced: true })).toBe(true))
  it('waits for the first sync, so existing users never see it flash', () => expect(guideVisible({ steps: open, dismissed: false, synced: false })).toBe(false))
  it('stays away once everything is done', () => expect(guideVisible({ steps: complete, dismissed: false, synced: true })).toBe(false))
  it('stays away when the person hid it', () => expect(guideVisible({ steps: open, dismissed: true, synced: true })).toBe(false))
})
