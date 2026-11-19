import { describe, expect, it } from 'vitest'

import { assertValidPassword } from '../src/services/users'

describe('password validation', () => {
  it('accepts 72 UTF-8 bytes and rejects 73', () => {
    expect(() => assertValidPassword('a'.repeat(72))).not.toThrow()
    expect(() => assertValidPassword('a'.repeat(73))).toThrow(/72 字节/)

    // Each CJK character is three bytes in UTF-8.
    expect(() => assertValidPassword('你'.repeat(24))).not.toThrow()
    expect(() => assertValidPassword('你'.repeat(25))).toThrow(/72 字节/)
  })
})
