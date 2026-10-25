import { describe, expect, it } from 'vitest'
import { jobSchema, profileSchema } from '../src/lib/validation'

const validProfile = {
  username: 'samira-design',
  name: 'Samira Khan',
  headline: 'Product designer and brand specialist',
  bio: 'I create thoughtful visual systems, interfaces, and accessible digital products for growing teams.',
  skills: 'Product design, branding, accessibility',
  category: 'design',
  country: 'Pakistan',
  isPublic: false,
}

const validJob = {
  title: 'Build a responsive service marketplace',
  description: 'Create a secure, accessible marketplace workflow with project pages and persistent business records.',
  category: 'development',
  budget: '50000',
  currency: 'PKR',
}

describe('profile picture validation', () => {
  it('supports a persisted avatar reference and a safe crop position', () => {
    const parsed = profileSchema.parse({
      ...validProfile,
      avatarKey: 'a47ac8ce-572e-46b1-bf99-3035a2c54030',
      avatarPosition: 'top',
    })
    expect(parsed.avatarKey).toBe('a47ac8ce-572e-46b1-bf99-3035a2c54030')
    expect(parsed.avatarPosition).toBe('top')
  })

  it('allows a user to remove the saved avatar and defaults crop to center', () => {
    const parsed = profileSchema.parse({ ...validProfile, avatarKey: null })
    expect(parsed.avatarKey).toBeNull()
    expect(parsed.avatarPosition).toBe('center')
  })

  it('rejects arbitrary image URLs and unsupported crop positions', () => {
    expect(profileSchema.safeParse({ ...validProfile, avatarKey: 'https://untrusted.example/photo.png' }).success).toBe(false)
    expect(profileSchema.safeParse({ ...validProfile, avatarPosition: 'script' }).success).toBe(false)
  })
})

describe('job reference image validation', () => {
  it('defaults the reference list to empty', () => {
    expect(jobSchema.parse(validJob).referenceImageIds).toEqual([])
  })

  it('accepts at most five UUID upload references', () => {
    const ids = [
      'a47ac8ce-572e-46b1-bf99-3035a2c54030',
      'b47ac8ce-572e-46b1-bf99-3035a2c54031',
      'c47ac8ce-572e-46b1-bf99-3035a2c54032',
      'd47ac8ce-572e-46b1-bf99-3035a2c54033',
      'e47ac8ce-572e-46b1-bf99-3035a2c54034',
    ]
    expect(jobSchema.parse({ ...validJob, referenceImageIds: ids }).referenceImageIds).toHaveLength(5)
    expect(jobSchema.safeParse({ ...validJob, referenceImageIds: [...ids, 'f47ac8ce-572e-46b1-bf99-3035a2c54035'] }).success).toBe(false)
  })

  it('rejects a non-UUID upload reference', () => {
    expect(jobSchema.safeParse({ ...validJob, referenceImageIds: ['../../public/secret.png'] }).success).toBe(false)
  })
})
