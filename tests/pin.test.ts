import { describe, expect, it } from 'vitest'
import { checkPin, createLock, hashPin, isValidPin, lockoutSeconds, randomSalt, safeEqual } from '../app/utils/pin'

describe('PIN hashing', () => {
  it('accepts the right PIN and rejects wrong ones', async () => {
    const cfg = await createLock('1234', 60)
    expect(await checkPin('1234', cfg)).toBe(true)
    expect(await checkPin('1235', cfg)).toBe(false)
    expect(await checkPin('0000', cfg)).toBe(false)
    expect(await checkPin('12345', cfg)).toBe(false)
  })
  it('never stores the PIN and records its length', async () => {
    const cfg = await createLock('482913', 0)
    expect(JSON.stringify(cfg)).not.toContain('482913')
    expect(cfg.len).toBe(6)
    expect(cfg.timeout).toBe(0)
  })
  it('uses a fresh salt each time, so equal PINs hash differently', async () => {
    const a = await createLock('1234', 60), b = await createLock('1234', 60)
    expect(a.salt).not.toBe(b.salt)
    expect(a.hash).not.toBe(b.hash)
    expect(randomSalt()).not.toBe(randomSalt())
  })
  it('is deterministic for the same salt', async () => {
    const salt = randomSalt()
    expect(await hashPin('9876', salt)).toBe(await hashPin('9876', salt))
  })
})

describe('PIN rules', () => {
  it('only allows exactly 4 or 6 digits', () => {
    for (const ok of ['1234', '000000', '987654']) expect(isValidPin(ok)).toBe(true)
    for (const bad of ['', '123', '12345', '1234567', 'abcd', '12a4', ' 1234', '12.4']) expect(isValidPin(bad)).toBe(false)
  })
  it('safeEqual compares whole strings', () => {
    expect(safeEqual('abc', 'abc')).toBe(true)
    expect(safeEqual('abc', 'abd')).toBe(false)
    expect(safeEqual('abc', 'abcd')).toBe(false)
  })
})

describe('wrong-guess lockout', () => {
  it('starts after the fifth wrong guess, then backs off to a cap', () => {
    expect([0, 1, 2, 3, 4].map(lockoutSeconds)).toEqual([0, 0, 0, 0, 0])
    expect(lockoutSeconds(5)).toBe(30)
    expect(lockoutSeconds(6)).toBe(60)
    expect(lockoutSeconds(7)).toBe(120)
    expect(lockoutSeconds(50)).toBe(900)
  })
})
