import { describe, expect, it } from 'vitest'

import { buildPoliceBeianUrl } from '../src/services/settings'

describe('police filing links', () => {
  it('builds the official query URL from the filing number', () => {
    expect(buildPoliceBeianUrl('苏公网安备00000000号')).toBe(
      `https://beian.mps.gov.cn/#/query/webSearch?code=${encodeURIComponent('苏公网安备00000000号')}`,
    )
  })

  it('returns an empty link when the filing number is blank', () => {
    expect(buildPoliceBeianUrl('   ')).toBe('')
  })
})
