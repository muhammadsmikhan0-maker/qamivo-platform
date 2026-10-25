import { describe, expect, it } from 'vitest'
import { conversationInputSchema, messageInputSchema } from '../src/lib/comms-validation'

describe('conversation input', () => {
  it('requires a valid project id and accepts owner-selected participants', () => {
    expect(conversationInputSchema.safeParse({
      jobId: 'a47ac8ce-572e-46b1-bf99-3035a2c54030',
    }).success).toBe(true)
    expect(conversationInputSchema.safeParse({ jobId: 'invalid-id' }).success).toBe(false)
  })

  it('normalises freelancer usernames and rejects malformed usernames', () => {
    const parsed = conversationInputSchema.parse({
      jobId: 'a47ac8ce-572e-46b1-bf99-3035a2c54030',
      recipientUsername: '  Samira-Design ',
    })
    expect(parsed.recipientUsername).toBe('samira-design')
    expect(conversationInputSchema.safeParse({
      jobId: 'a47ac8ce-572e-46b1-bf99-3035a2c54030',
      recipientUsername: '../private',
    }).success).toBe(false)
  })
})

describe('message input', () => {
  it('requires message text or a valid attachment reference', () => {
    expect(messageInputSchema.safeParse({ body: '' }).success).toBe(false)
    expect(messageInputSchema.safeParse({
      body: '',
      attachmentId: 'a47ac8ce-572e-46b1-bf99-3035a2c54030',
    }).success).toBe(true)
  })

  it('rejects overlong messages and non-UUID attachment ids', () => {
    expect(messageInputSchema.safeParse({ body: 'x'.repeat(4001) }).success).toBe(false)
    expect(messageInputSchema.safeParse({ body: 'Hello', attachmentId: '../../file.png' }).success).toBe(false)
  })
})
