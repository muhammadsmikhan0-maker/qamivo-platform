import { describe, expect, it } from 'vitest'
import { mailApiKeyInputSchema, mailDomainInputSchema, mailSendInputSchema } from '../src/lib/mail-validation.js'

describe('Qamivo Mail validation', () => {
  it('normalizes domains and rejects malformed domains', () => {
    expect(mailDomainInputSchema.parse({ domain: '  MAIL.Example.com ' }).domain).toBe('mail.example.com')
    expect(mailDomainInputSchema.safeParse({ domain: 'https://example.com' }).success).toBe(false)
    expect(mailDomainInputSchema.safeParse({ domain: 'localhost' }).success).toBe(false)
    expect(mailDomainInputSchema.safeParse({ domain: '-bad.example.com' }).success).toBe(false)
  })

  it('limits and trims API key names', () => {
    expect(mailApiKeyInputSchema.parse({ name: '  Production  ' }).name).toBe('Production')
    expect(mailApiKeyInputSchema.safeParse({ name: ' ' }).success).toBe(false)
    expect(mailApiKeyInputSchema.safeParse({ name: 'x'.repeat(81) }).success).toBe(false)
  })

  it('accepts a valid transactional message', () => {
    expect(mailSendInputSchema.safeParse({
      from: 'send@example.com',
      to: ['person@example.net'],
      subject: 'Welcome',
      text: 'Hello',
    }).success).toBe(true)
  })

  it('rejects messages without a body or valid recipient', () => {
    expect(mailSendInputSchema.safeParse({
      from: 'send@example.com',
      to: ['person@example.net'],
      subject: 'Welcome',
    }).success).toBe(false)
    expect(mailSendInputSchema.safeParse({
      from: 'send@example.com',
      to: ['not-an-email'],
      subject: 'Welcome',
      html: '<p>Hi</p>',
    }).success).toBe(false)
  })

  it('limits recipient count and content size', () => {
    expect(mailSendInputSchema.safeParse({
      from: 'send@example.com',
      to: Array.from({ length: 11 }, (_, i) => 'person' + i + '@example.net'),
      subject: 'Bulk',
      text: 'Hello',
    }).success).toBe(false)
    expect(mailSendInputSchema.safeParse({
      from: 'send@example.com',
      to: ['person@example.net'],
      subject: 'Large',
      html: 'x'.repeat(40001),
    }).success).toBe(false)
  })
})
