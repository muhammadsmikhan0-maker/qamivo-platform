import { z } from 'zod'

export const uuidSchema = z.string().uuid()

export const conversationInputSchema = z.object({
  recipientUsername: z.string().trim().toLowerCase().min(3).max(32).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  jobId: uuidSchema,
  subject: z.string().trim().min(3).max(120).default('Project conversation'),
})

export const messageInputSchema = z.object({
  body: z.string().trim().max(4000).default(''),
  attachmentId: uuidSchema.optional(),
}).refine((value) => value.body.length > 0 || !!value.attachmentId, {
  message: 'Write a message or attach an image.',
})
