import { z } from 'zod'
export const categorySchema = z.enum([
  'development',
  'design',
  'marketing',
  'ai',
  'writing',
  'business',
])
const money = z.coerce.number().int().min(1).max(10000000)
export const jobSchema = z.object({
  title: z.string().trim().min(12).max(120),
  description: z.string().trim().min(80).max(10000),
  category: categorySchema,
  budget: money,
  currency: z.enum(['USD', 'PKR', 'GBP', 'EUR']),
  referenceImageIds: z.array(z.string().uuid()).max(5).default([]),
})
export const proposalSchema = z.object({
  coverLetter: z.string().trim().min(60).max(6000),
  amount: money,
  days: z.coerce.number().int().min(1).max(730),
})
export const profileSchema = z.object({
  avatarKey: z.string().uuid().nullable().optional(),
  avatarPosition: z.enum(['center', 'top', 'bottom']).default('center'),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(3)
    .max(32)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z.string().trim().min(2).max(70),
  headline: z.string().trim().min(10).max(120),
  bio: z.string().trim().min(60).max(4000),
  skills: z.string().trim().min(2).max(300),
  category: categorySchema,
  country: z.string().trim().min(2).max(70),
  isPublic: z.boolean(),
})
export const idSchema = z.string().uuid()
