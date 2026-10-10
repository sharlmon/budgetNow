import { describe, expect, it } from 'vitest'
import { isAppleMobile, urlBase64ToBytes } from '../app/utils/push'

describe('push helpers', () => {
  it('turns URL-safe base64 into the bytes of the key, with or without padding', () => {
    expect([...urlBase64ToBytes('AQID')]).toEqual([1, 2, 3])
    expect([...urlBase64ToBytes('_-8')]).toEqual([255, 239]) // - and _ stand for + and /
    expect([...urlBase64ToBytes('_-8=')]).toEqual([255, 239])
  })
  it('turns a real 65-byte public key into 65 bytes starting with 4 (an uncompressed point)', () => {
    const key = 'BMKvdYE-qLVF1BkoSnzTcTnEc8Zx0GYcI6Ng26h7X0Xl8Wx4lQoCDDmVxVb2wB9aVfkrM4a1XyH6Y3Gm0aBqz0Y'
    const bytes = urlBase64ToBytes(key.slice(0, 86))
    expect(bytes[0]).toBe(4)
  })
  it('recognises iPhone, iPad and the iPad that calls itself a Mac, but not other phones', () => {
    expect(isAppleMobile('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)')).toBe(true)
    expect(isAppleMobile('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)')).toBe(true)
    expect(isAppleMobile('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 5)).toBe(true)
    expect(isAppleMobile('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 0)).toBe(false)
    expect(isAppleMobile('Mozilla/5.0 (Linux; Android 14; Pixel 8)')).toBe(false)
  })
})
