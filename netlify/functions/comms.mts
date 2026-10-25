import { getUser } from '@netlify/identity'
import type { Config } from '@netlify/functions'
import { and, desc, eq, ne, sql } from 'drizzle-orm'
import { z } from 'zod'
import { database } from '../../db/index.js'
import {
  conversations, conversationMembers, messages, profiles, jobs, proposals, uploads,
} from '../../db/schema.js'
import { brandedNoticeHtml, sendTransactionalEmail } from '../shared/transactional-email.mjs'

const uuid = z.string().uuid()
const conversationInput = z.object({
  recipientUsername: z.string().trim().toLowerCase().min(3).max(32).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  jobId: uuid,
  subject: z.string().trim().min(3).max(120).default('Project conversation'),
})
const messageInput = z.object({
  body: z.string().trim().max(4000).default(''),
  attachmentId: uuid.optional(),
}).refine((v) => v.body.length > 0 || !!v.attachmentId, {
  message: 'Write a message or attach an image.',
})

function json(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
  })
}
async function parseJson(req: Request) {
  const text = await req.text()
  if (text.length > 12000) throw new Error('Request is too large.')
  return JSON.parse(text)
}

export default async (req: Request) => {
  const url = new URL(req.url)
  const parts = url.pathname.replace(/^\/api\/comms\/?/, '').split('/').filter(Boolean)
  if (!['GET', 'POST'].includes(req.method)) return json({ error: 'Method not allowed.' }, 405)
  if (req.method !== 'GET' && (req.headers.get('origin') !== url.origin || !req.headers.get('content-type')?.includes('application/json'))) {
    return json({ error: 'Same-origin JSON requests are required.' }, 403)
  }

  const user = await getUser()
  if (!user) return json({ error: 'Sign in to continue.' }, 401)
  if (!user.confirmedAt) return json({ error: 'Verify your email before messaging.' }, 403)
  const db = database()

  try {
    if (parts.length === 1 && parts[0] === 'conversations' && req.method === 'GET') {
      const rows = await db.select({
        id: conversations.id, subject: conversations.subject, jobId: conversations.jobId,
        createdAt: conversations.createdAt, unreadCount: conversationMembers.unreadCount,
      }).from(conversationMembers)
        .innerJoin(conversations, eq(conversations.id, conversationMembers.conversationId))
        .where(eq(conversationMembers.memberId, user.id))
        .orderBy(desc(conversations.createdAt)).limit(100)
      const result = []
      for (const row of rows) {
        const [otherMember] = await db.select({ memberId: conversationMembers.memberId })
          .from(conversationMembers)
          .where(and(eq(conversationMembers.conversationId, row.id), ne(conversationMembers.memberId, user.id)))
          .limit(1)
        const [profile] = otherMember ? await db.select({
          username: profiles.username, name: profiles.name, avatarKey: profiles.avatarKey,
          avatarPosition: profiles.avatarPosition,
        }).from(profiles).where(eq(profiles.id, otherMember.memberId)).limit(1) : []
        const [last] = await db.select({ body: messages.body, createdAt: messages.createdAt })
          .from(messages).where(eq(messages.conversationId, row.id))
          .orderBy(desc(messages.createdAt)).limit(1)
        result.push({
          ...row, createdAt: row.createdAt.toISOString(),
          participantId: otherMember?.memberId || '', participantName: profile?.name || 'Qamivo member',
          participantUsername: profile?.username || '', avatarUrl: profile?.avatarKey ? `/api/uploads/${profile.avatarKey}` : null,
          lastMessage: last?.body || '', lastMessageAt: last?.createdAt?.toISOString() || null,
        })
      }
      return json(result)
    }

    if (parts.length === 1 && parts[0] === 'conversations' && req.method === 'POST') {
      const input = conversationInput.parse(await parseJson(req))
      const [recipient] = await db.select().from(profiles).where(eq(profiles.username, input.recipientUsername)).limit(1)
      const [job] = await db.select().from(jobs).where(eq(jobs.id, input.jobId)).limit(1)
      if (!recipient || !job || recipient.id === user.id) return json({ error: 'Member or project not found.' }, 404)

      let permitted = false
      if (job.ownerId === user.id) {
        const [proposal] = await db.select({ id: proposals.id }).from(proposals)
          .where(and(eq(proposals.jobId, job.id), eq(proposals.freelancerId, recipient.id))).limit(1)
        permitted = !!proposal
      } else if (job.ownerId === recipient.id) {
        const [proposal] = await db.select({ id: proposals.id }).from(proposals)
          .where(and(eq(proposals.jobId, job.id), eq(proposals.freelancerId, user.id))).limit(1)
        permitted = !!proposal
      }
      if (!permitted) return json({ error: 'Messaging is only available between a project owner and a freelancer who submitted a proposal.' }, 403)

      const [conversation] = await db.insert(conversations).values({
        jobId: job.id, subject: input.subject,
      }).returning()
      await db.insert(conversationMembers).values([
        { conversationId: conversation.id, memberId: user.id },
        { conversationId: conversation.id, memberId: recipient.id },
      ])
      return json({ id: conversation.id, subject: conversation.subject }, 201)
    }

    if (parts.length === 3 && parts[0] === 'conversations' && parts[2] === 'messages') {
      const conversationId = uuid.parse(parts[1])
      const [membership] = await db.select({ id: conversationMembers.id })
        .from(conversationMembers).where(and(
          eq(conversationMembers.conversationId, conversationId),
          eq(conversationMembers.memberId, user.id),
        )).limit(1)
      if (!membership) return json({ error: 'Conversation not found.' }, 404)

      if (req.method === 'GET') {
        await db.update(conversationMembers).set({ unreadCount: 0, lastReadAt: new Date() })
          .where(and(eq(conversationMembers.conversationId, conversationId), eq(conversationMembers.memberId, user.id)))
        const rows = await db.select().from(messages).where(eq(messages.conversationId, conversationId))
          .orderBy(desc(messages.createdAt)).limit(100)
        return json(rows.reverse().map((m) => ({
          id: m.id, body: m.body, senderId: m.senderId, attachmentId: m.attachmentId,
          attachmentUrl: m.attachmentId ? `/api/uploads/${m.attachmentId}` : null,
          createdAt: m.createdAt.toISOString(), mine: m.senderId === user.id,
        })))
      }

      const input = messageInput.parse(await parseJson(req))
      if (input.attachmentId) {
        const [asset] = await db.select().from(uploads).where(eq(uploads.id, input.attachmentId)).limit(1)
        if (!asset || asset.ownerId !== user.id || asset.purpose !== 'message_attachment') {
          return json({ error: 'The selected image is not available to attach.' }, 403)
        }
      }
      const [message] = await db.insert(messages).values({
        conversationId, senderId: user.id, body: input.body, attachmentId: input.attachmentId || null,
      }).returning()
      await db.update(conversationMembers)
        .set({ unreadCount: sql`${conversationMembers.unreadCount} + 1` })
        .where(and(eq(conversationMembers.conversationId, conversationId), ne(conversationMembers.memberId, user.id)))

      const otherMembers = await db.select({ memberId: conversationMembers.memberId })
        .from(conversationMembers)
        .where(and(eq(conversationMembers.conversationId, conversationId), ne(conversationMembers.memberId, user.id)))
      const notificationStatuses: string[] = []
      for (const member of otherMembers) {
        const [profile] = await db.select({ email: profiles.email, name: profiles.name })
          .from(profiles).where(eq(profiles.id, member.memberId)).limit(1)
        if (!profile?.email) {
          notificationStatuses.push('recipient_email_unavailable')
          continue
        }
        const base = process.env.QAMIVO_APP_URL || 'https://qamivo-platform.netlify.app'
        const subject = 'You have a new message on Qamivo'
        const html = brandedNoticeHtml(subject, `${user.email || 'A Qamivo member'} sent you a message: ${input.body.slice(0, 1200) || 'An image was attached.'}`, `${base}/dashboard`)
        const result = await sendTransactionalEmail({
          to: profile.email, subject, html, eventType: 'message.new',
          idempotencyKey: `message-notification/${message.id}/${member.memberId}`,
        })
        notificationStatuses.push(result.status)
      }

      return json({
        id: message.id, body: message.body, senderId: message.senderId,
        attachmentId: message.attachmentId,
        attachmentUrl: message.attachmentId ? `/api/uploads/${message.attachmentId}` : null,
        createdAt: message.createdAt.toISOString(), mine: true,
        emailNotifications: notificationStatuses,
      }, 201)
    }

    return json({ error: 'Endpoint not found.' }, 404)
  } catch (error) {
    if (error instanceof z.ZodError) return json({ error: error.issues.map((i) => i.message).join(' ') }, 422)
    if (error instanceof SyntaxError) return json({ error: 'Invalid JSON.' }, 400)
    return json({ error: error instanceof Error ? error.message : 'Messaging is temporarily unavailable.' }, 503)
  }
}
export const config: Config = {
  path: '/api/comms/*',
  rateLimit: { windowLimit: 60, windowSize: 60, aggregateBy: ['ip', 'domain'] },
}
