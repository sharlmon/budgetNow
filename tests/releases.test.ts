import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { RELEASES, compareVersions, isSemver } from '../shared/releases'

const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
const changelog = readFileSync('CHANGELOG.md', 'utf8')

describe('compareVersions', () => {
  it('orders versions numerically, not alphabetically', () => {
    expect(compareVersions('1.10.0', '1.9.0')).toBeGreaterThan(0)
    expect(compareVersions('2.0.0', '1.99.99')).toBeGreaterThan(0)
    expect(compareVersions('1.0.1', '1.0.2')).toBeLessThan(0)
    expect(compareVersions('1.0.0', '1.0.0')).toBe(0)
  })
  it('copes with missing parts, prerelease tags and junk', () => {
    expect(compareVersions('1.2', '1.2.0')).toBe(0)
    expect(compareVersions('1.2.0-beta', '1.2.0')).toBe(0)
    expect(compareVersions('', '0.0.0')).toBe(0)
    expect(() => compareVersions('abc', '1.0.0')).not.toThrow()
  })
  it('isSemver', () => {
    for (const ok of ['1.0.0', '10.20.30']) expect(isSemver(ok)).toBe(true)
    for (const bad of ['1.0', 'v1.0.0', '1.0.0-beta', '', 'one.two.three']) expect(isSemver(bad)).toBe(false)
  })
})

describe('release tracking stays consistent', () => {
  it('package.json has a valid version', () => expect(isSemver(pkg.version)).toBe(true))
  it('the newest release entry is the version in package.json', () => expect(RELEASES[0]!.version).toBe(pkg.version))
  it('CHANGELOG.md has a heading for the current version', () => expect(changelog).toMatch(new RegExp(`^## ${pkg.version.replace(/\./g, '\\.')} - \\d{4}-\\d{2}-\\d{2}$`, 'm')))
  it('every release has a valid version, date, title and notes', () => {
    for (const r of RELEASES) {
      expect(isSemver(r.version), r.version).toBe(true)
      expect(r.date).toMatch(/^\d{4}-\d{2}-\d{2}$/); expect(Number.isNaN(Date.parse(r.date))).toBe(false)
      expect(r.title.length).toBeGreaterThan(2); expect(r.notes.length).toBeGreaterThan(0)
      expect(changelog, `CHANGELOG.md is missing ${r.version}`).toContain(`## ${r.version} - ${r.date}`)
    }
  })
  it('versions are unique and listed newest first', () => {
    expect(new Set(RELEASES.map(r => r.version)).size).toBe(RELEASES.length)
    for (let i = 1; i < RELEASES.length; i++) {
      expect(compareVersions(RELEASES[i - 1]!.version, RELEASES[i]!.version)).toBeGreaterThan(0)
      expect(RELEASES[i - 1]!.date >= RELEASES[i]!.date).toBe(true)
    }
  })
})
