import { createHmac } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { verifySvix } from '../server/utils/svix'

const KEY = Buffer.from('0123456789abcdef0123456789abcdef')
const SECRET = 'whsec_' + KEY.toString('base64')
const NOW = 1_800_000_000_000
const ts = String(Math.floor(NOW / 1000))
const sign = (id: string, t: string, body: string, key = KEY) => 'v1,' + createHmac('sha256', key).update(`${id}.${t}.${body}`).digest('base64')
const base = { secret: SECRET, id: 'msg_1', timestamp: ts, body: '{"type":"user.deleted"}', now: NOW }

describe('verifySvix', () => {
  it('accepts a correctly signed request', () => {
    expect(verifySvix({ ...base, signature: sign('msg_1', ts, base.body) })).toBe(true)
  })
  it('rejects a wrong secret, a changed body, a changed id, and a changed timestamp', () => {
    expect(verifySvix({ ...base, signature: sign('msg_1', ts, base.body, Buffer.from('another-secret-another-secret-123')) })).toBe(false)
    expect(verifySvix({ ...base, body: base.body + ' ', signature: sign('msg_1', ts, base.body) })).toBe(false)
    expect(verifySvix({ ...base, id: 'msg_2', signature: sign('msg_1', ts, base.body) })).toBe(false)
    expect(verifySvix({ ...base, timestamp: String(Number(ts) + 1), signature: sign('msg_1', ts, base.body) })).toBe(false)
  })
  it('rejects replays outside the 5 minute window, in either direction', () => {
    const old = String(Number(ts) - 301), future = String(Number(ts) + 301)
    expect(verifySvix({ ...base, timestamp: old, signature: sign('msg_1', old, base.body) })).toBe(false)
    expect(verifySvix({ ...base, timestamp: future, signature: sign('msg_1', future, base.body) })).toBe(false)
    const edge = String(Number(ts) - 299)
    expect(verifySvix({ ...base, timestamp: edge, signature: sign('msg_1', edge, base.body) })).toBe(true)
  })
  it('accepts any valid entry when several signatures are sent (key rotation)', () => {
    const rotated = `v1,AAAA ${sign('msg_1', ts, base.body)} v1,BBBB`
    expect(verifySvix({ ...base, signature: rotated })).toBe(true)
  })
  it('rejects missing, malformed or wrong-version input without throwing', () => {
    const good = sign('msg_1', ts, base.body)
    expect(verifySvix({ ...base, signature: undefined })).toBe(false)
    expect(verifySvix({ ...base, id: undefined, signature: good })).toBe(false)
    expect(verifySvix({ ...base, timestamp: undefined, signature: good })).toBe(false)
    expect(verifySvix({ ...base, timestamp: 'abc', signature: good })).toBe(false)
    expect(verifySvix({ ...base, timestamp: '1e9', signature: good })).toBe(false)
    expect(verifySvix({ ...base, signature: 'v1,' })).toBe(false)
    expect(verifySvix({ ...base, signature: good.replace('v1,', 'v2,') })).toBe(false)
    expect(verifySvix({ ...base, signature: 'garbage' })).toBe(false)
    expect(verifySvix({ ...base, signature: 'v1,not base64 !!!' })).toBe(false)
  })
  it('never accepts an empty or blank secret', () => {
    expect(verifySvix({ ...base, secret: '', signature: sign('msg_1', ts, base.body, Buffer.alloc(0) as any) })).toBe(false)
    expect(verifySvix({ ...base, secret: 'whsec_', signature: sign('msg_1', ts, base.body) })).toBe(false)
  })
})
