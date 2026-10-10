import { describe, expect, it } from 'vitest'
import { newId } from '../app/utils/id'

describe('new record ids', () => {
  it('are 8 characters of a-z and 0-9, which the server accepts as safe ids', () => {
    for (let i = 0; i < 200; i++) expect(newId()).toMatch(/^[a-z0-9]{8}$/)
  })
  it('do not repeat in a large batch', () => expect(new Set(Array.from({ length: 5000 }, newId)).size).toBe(5000))
})
