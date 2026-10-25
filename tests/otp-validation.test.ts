import { describe, expect, it } from 'vitest'
import { signupStartSchema, signupVerifySchema } from '../src/lib/otp-validation'

describe('registration OTP input validation', () => {
  it('normalises email casing and surrounding whitespace', () => {
    expect(signupStartSchema.parse({
      email: '  Test.User@Example.com ',
      fullName: 'Test User',
    }).email).toBe('test.user@example.com')
  })

  it('rejects invalid email addresses and too-long names', () => {
    expect(signupStartSchema.safeParse({ email: 'invalid', fullName: 'Valid Name' }).success).toBe(false)
    expect(signupStartSchema.safeParse({ email: 'valid@example.com', fullName: 'x'.repeat(71) }).success).toBe(false)
  })

  it('requires exactly six numeric digits and a 10–128 character password', () => {
    const base = { email: 'test@example.com', password: 'correct-horse-12' }
    expect(signupVerifySchema.safeParse({ ...base, code: '123456' }).success).toBe(true)
    expect(signupVerifySchema.safeParse({ ...base, code: '12345' }).success).toBe(false)
    expect(signupVerifySchema.safeParse({ ...base, code: '12a456' }).success).toBe(false)
    expect(signupVerifySchema.safeParse({ ...base, code: '123456', password: 'short' }).success).toBe(false)
  })
})
