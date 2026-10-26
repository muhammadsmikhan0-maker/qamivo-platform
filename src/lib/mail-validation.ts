import { z } from 'zod'

const emailSchema = z.string().trim().email().max(254)
const domainPattern = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/

export const mailDomainInputSchema = z.object({
  domain: z.string().trim().toLowerCase().min(4).max(253).regex(domainPattern, 'Enter a valid domain name, such as example.com.'),
})

export const mailApiKeyInputSchema = z.object({
  name: z.string().trim().min(1).max(80),
})

export const mailSendInputSchema = z.object({
  from: emailSchema,
  to: z.array(emailSchema).min(1).max(10),
  subject: z.string().trim().min(1).max(180),
  html: z.string().max(40000).optional(),
  text: z.string().max(10000).optional(),
}).refine((value) => !!value.html?.trim() || !!value.text?.trim(), {
  message: 'Provide a non-empty html or text body.',
  path: ['text'],
})

export type MailSendInput = z.infer<typeof mailSendInputSchema>
