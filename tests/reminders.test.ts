import { describe, expect, it } from 'vitest'
import { billsToRemind, buildReminder, dayDiff, isAllowedPushEndpoint, isValidTimeZone, localDate, OVERDUE_GRACE_DAYS } from '../shared/reminders'

const bill = (name: string, nextDue: string, amount = 1000) => ({ name, nextDue, amount })
const TODAY = '2026-10-10'
const plain = (s: string) => s.replace(/\u00a0/g, ' ') // the currency formatter keeps "KSh 25,000" together with a non-breaking space

describe('dates', () => {
  it('counts whole days, in either direction, across month and year ends', () => {
    expect(dayDiff('2026-10-10', '2026-10-11')).toBe(1)
    expect(dayDiff('2026-10-10', '2026-10-09')).toBe(-1)
    expect(dayDiff('2026-10-31', '2026-11-01')).toBe(1)
    expect(dayDiff('2026-12-31', '2027-01-01')).toBe(1)
    expect(dayDiff('2028-02-28', '2028-03-01')).toBe(2) // a leap year
  })
  it('works out the calendar date in a time zone, not in UTC', () => {
    const late = new Date('2026-10-10T22:30:00Z')
    expect(localDate(late, 'UTC')).toBe('2026-10-10')
    expect(localDate(late, 'Africa/Nairobi')).toBe('2026-10-11') // already tomorrow in Kenya (UTC+3)
    expect(localDate(new Date('2026-10-10T01:00:00Z'), 'America/Los_Angeles')).toBe('2026-10-09')
  })
  it('accepts real time zones and refuses everything else', () => {
    expect(isValidTimeZone('Africa/Nairobi')).toBe(true)
    for (const bad of ['', 'Nowhere/Land', 'x'.repeat(80), 42, null, undefined]) expect(isValidTimeZone(bad as any), String(bad)).toBe(false)
  })
})

describe('which bills get a reminder', () => {
  const bills = [bill('Rent', '2026-10-10'), bill('Internet', '2026-10-11'), bill('Water', '2026-10-13'), bill('Netflix', '2026-10-20'), bill('Old', '2026-10-08'), bill('Ancient', '2026-09-01')]
  it('puts bills due today, soon and recently overdue in their own groups, and ignores the rest', () => {
    const g = billsToRemind(bills, TODAY, 1)
    expect(g.today.map(b => b.name)).toEqual(['Rent'])
    expect(g.soon.map(b => b.name)).toEqual(['Internet'])
    expect(g.overdue.map(b => b.name)).toEqual(['Old'])
  })
  it('looks further ahead when asked to', () => {
    expect(billsToRemind(bills, TODAY, 3).soon.map(b => b.name)).toEqual(['Internet', 'Water'])
    expect(billsToRemind(bills, TODAY, 0).soon).toEqual([])
  })
  it(`stops mentioning a bill ${OVERDUE_GRACE_DAYS} days after its due date`, () => {
    expect(billsToRemind([bill('Late', '2026-10-07')], TODAY, 1).overdue).toHaveLength(1)
    expect(billsToRemind([bill('Later', '2026-10-06')], TODAY, 1).overdue).toHaveLength(0)
  })
  it('skips a bill with a broken date instead of failing', () => {
    expect(billsToRemind([bill('Bad', 'soon')], TODAY, 3)).toEqual({ overdue: [], today: [], soon: [] })
  })
  it('lists the most overdue first and the nearest due first', () => {
    const g = billsToRemind([bill('b', '2026-10-08'), bill('a', '2026-10-09'), bill('d', '2026-10-13'), bill('c', '2026-10-11')], TODAY, 3)
    expect(g.overdue.map(b => b.name)).toEqual(['b', 'a']); expect(g.soon.map(b => b.name)).toEqual(['c', 'd'])
  })
})

describe('what the notification says', () => {
  const g = (bills: ReturnType<typeof bill>[], days = 3) => billsToRemind(bills, TODAY, days)
  it('says nothing when nothing is due', () => expect(buildReminder(g([bill('Netflix', '2026-10-20')]), 'names', 'KES')).toBeNull())

  it('one bill with names: says which bill and when', () => {
    expect(buildReminder(g([bill('Rent', '2026-10-10')]), 'names', 'KES')).toMatchObject({ title: 'Rent is due today', body: 'Tap to mark it paid.', url: '/bills' })
    expect(buildReminder(g([bill('Rent', '2026-10-11')]), 'names', 'KES')!.title).toBe('Rent is due tomorrow')
    expect(buildReminder(g([bill('Rent', '2026-10-13')]), 'names', 'KES')!.title).toBe('Rent is due in 3 days')
    expect(buildReminder(g([bill('Rent', '2026-10-09')]), 'names', 'KES')!.title).toBe('Rent is overdue by 1 day')
    expect(buildReminder(g([bill('Rent', '2026-10-08')]), 'names', 'KES')!.title).toBe('Rent is overdue by 2 days')
  })
  it('one bill with amounts: adds the amount in the right currency', () => {
    expect(plain(buildReminder(g([bill('Rent', '2026-10-10', 25000)]), 'full', 'KES')!.body)).toBe('KSh 25,000. Tap to mark it paid.')
    expect(plain(buildReminder(g([bill('Rent', '2026-10-10', 12.5)]), 'full', 'USD')!.body)).toBe('$12.50. Tap to mark it paid.')
  })
  it('several bills: a count in the title and the first three in the body, with "+N more"', () => {
    const r = buildReminder(g([bill('Rent', '2026-10-10'), bill('Internet', '2026-10-11'), bill('Water', '2026-10-12'), bill('Power', '2026-10-13')]), 'names', 'KES')!
    expect(r.title).toBe('4 bills need your attention')
    expect(r.body).toBe('Rent due today. Internet due tomorrow. Water due in 2 days. +1 more')
  })
  it('two bills with amounts', () => {
    expect(plain(buildReminder(g([bill('Rent', '2026-10-10', 25000), bill('Internet', '2026-10-11', 3500)]), 'full', 'KES')!.body)).toBe('Rent (KSh 25,000) due today. Internet (KSh 3,500) due tomorrow.')
  })
  it('basic: never shows a name or an amount', () => {
    for (const bills of [[bill('SecretRent', '2026-10-10', 98765)], [bill('SecretRent', '2026-10-10', 98765), bill('Hidden', '2026-10-11', 111)]]) {
      const r = buildReminder(g(bills), 'basic', 'KES')!
      const text = `${r.title} ${r.body}`
      expect(text).not.toMatch(/Secret|Hidden|98|111|KSh/)
    }
    expect(buildReminder(g([bill('A', '2026-10-10'), bill('B', '2026-10-11')]), 'basic', 'KES')!.title).toBe('2 bills need your attention')
  })
  it('names (without amounts) never shows an amount', () => {
    const r = buildReminder(g([bill('Rent', '2026-10-10', 98765), bill('Internet', '2026-10-11', 111)]), 'names', 'KES')!
    expect(`${r.title} ${r.body}`).not.toMatch(/98|111|KSh/)
  })
  it('always opens the Bills page and uses one tag, so a new reminder replaces the last one', () => {
    for (const d of ['basic', 'names', 'full'] as const) expect(buildReminder(g([bill('Rent', '2026-10-10')]), d, 'KES')).toMatchObject({ url: '/bills', tag: 'bill-reminders' })
  })
})

describe('which push addresses the server will send to', () => {
  it('accepts the browser vendors\' push services over https', () => {
    for (const ok of [
      'https://fcm.googleapis.com/fcm/send/abc123', 'https://updates.push.services.mozilla.com/wpush/v2/abc',
      'https://web.push.apple.com/QGxyz', 'https://wns2-par02p.notify.windows.com/w/?token=abc', 'https://push.services.mozilla.com/x',
    ]) expect(isAllowedPushEndpoint(ok), ok).toBe(true)
  })
  it('refuses anything that could point the server somewhere else', () => {
    for (const bad of [
      'http://fcm.googleapis.com/fcm/send/abc', 'https://evil.example.com/x', 'https://127.0.0.1/x', 'https://localhost/x', 'https://169.254.169.254/latest/meta-data',
      'https://fcm.googleapis.com.evil.com/x', 'https://evilfcm.googleapis.com.attacker.io/x', 'https://notfcm.googleapis.org/x',
      'https://fcm.googleapis.com:8443/x', 'https://user:pw@fcm.googleapis.com/x', 'ftp://fcm.googleapis.com/x', 'javascript:alert(1)', '//fcm.googleapis.com/x', '', 'not a url',
    ]) expect(isAllowedPushEndpoint(bad), bad).toBe(false)
  })
  it('refuses non-strings and very long addresses', () => {
    for (const bad of [null, undefined, 42, {}, ['https://fcm.googleapis.com/x']]) expect(isAllowedPushEndpoint(bad as any)).toBe(false)
    expect(isAllowedPushEndpoint('https://fcm.googleapis.com/' + 'a'.repeat(1000))).toBe(false)
  })
  it('is case-insensitive about the host, as the web is', () => expect(isAllowedPushEndpoint('https://FCM.GoogleAPIs.com/fcm/send/x')).toBe(true))
})
