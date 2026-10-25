import { getUser } from '@netlify/identity'
import type { Config } from '@netlify/functions'
import { and, desc, eq, ne, sql } from 'drizzle-orm'
import { database } from '../../db/index.js'
import {
  conversations, conversationMembers, messages, profiles, jobs, proposals, uploads,
} from '../../db/schema.js'
import { brandedNoticeHtml, sendTransactionalEmail } from '../shared/transactional-email.mjs'
import { conversationInputSchema, messageInputSchema } from '../../src/lib/comms-validation.js'


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
          avatarPosition: profiles.avatarPosition, isPublic: profiles.isPublic,
        }).from(profiles).where(eq(profiles.id, otherMember.memberId)).limit(1) : []
        const [last] = await db.select({ body: messages.body, createdAt: messages.createdAt })
          .from(messages).where(eq(messages.conversationId, row.id))
          .orderBy(desc(messages.createdAt)).limit(1)
        result.push({
          ...row, createdAt: row.createdAt.toISOString(),
          participantId: otherMember?.memberId || '', participantName: profile?.name || 'Qamivo member',
          participantUsername: profile?.username || '', avatarUrl: profile?.isPublic && profile.avatarKey ? `/api/uploads/${profile.avatarKey}` : null,
          lastMessage: last?.body || '', lastMessageAt: last?.createdAt?.toISOString() || null,
        })
      }
      return json(result)
    }

    if (parts.length === 1 && parts[0] === 'conversations' && req.method === 'POST') {
      const input = conversationInputSchema.parse(await parseJson(req))
      const [job] = await db.select().from(jobs).where(eq(jobs.id, input.jobId)).limit(1)
      if (!job) return json({ error: 'Project not found.' }, 404)

      let recipientId = ''
      if (job.ownerId === user.id) {
        if (!input.recipientUsername) {
          return json({ error: 'Enter the public username of a freelancer who proposed on your project.' }, 422)
        }
        const [recipient] = await db.select({ id: profiles.id }).from(profiles)
          .where(eq(profiles.username, input.recipientUsername)).limit(1)
        if (!recipient || recipient.id === user.id) return json({ error: 'Member not found.' }, 404)
        const [proposal] = await db.select({ id: proposals.id }).from(proposals)
          .where(and(eq(proposals.jobId, job.id), eq(proposals.freelancerId, recipient.id))).limit(1)
        if (!proposal) return json({ error: 'Messaging is available only with freelancers who have proposed on this project.' }, 403)
        recipientId = recipient.id
      } else {
        const [ownProposal] = await db.select({ id: proposals.id }).from(proposals)
          .where(and(eq(proposals.jobId, job.id), eq(proposals.freelancerId, user.id))).limit(1)
        if (!ownProposal) return json({ error: 'Messaging is available only for a project you own or have proposed on.' }, 403)
        recipientId = job.ownerId
      }
      if (!recipientId || recipientId === user.id) return json({ error: 'Invalid conversation participant.' }, 403)

      const existingConversations = await db.select({ id: conversations.id }).from(conversations)
        .innerJoin(conversationMembers, eq(conversationMembers.conversationId, conversations.id))
        .where(and(eq(conversations.jobId, job.id), eq(conversationMembers.memberId, user.id)))
        .limit(100)
      for (const existing of existingConversations) {
        const [shared] = await db.select({ id: conversationMembers.id }).from(conversationMembers)
          .where(and(eq(conversationMembers.conversationId, existing.id), eq(conversationMembers.memberId, recipientId))).limit(1)
        if (shared) return json({ id: existing.id, subject: 'Project conversation' }, 200)
      }

      const conversation = await db.transaction(async (tx) => {
        const [created] = await tx.insert(conversations).values({
          jobId: job.id, subject: input.subject,
        }).returning()
        await tx.insert(conversationMembers).values([
          { conversationId: created.id, memberId: user.id },
          { conversationId: created.id, memberId: recipientId },
        ])
        return created
      })
      return json({ id: conversation.id, subject: conversation.subject }, 201)
    }

    if (parts.length === 3 && parts[0] === 'conversations' && parts[2] === 'messages') {
      const conversationId = conversationInputSchema.shape.jobId.parse(parts[1])
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

      const input = messageInputSchema.parse(await parseJson(req))
      if (input.attachmentId) {
        const [asset] = await db.select().from(uploads).where(eq(uploads.id, input.attachmentId)).limit(1)
        if (!asset || asset.ownerId !== user.id || asset.purpose !== 'message_attachment') {
          return json({ error: 'The selected image is not available to attach.' }, 403)
        }
      }
      const saved = await db.transaction(async (tx) => {
        const [message] = await tx.insert(messages).values({
          conversationId, senderId: user.id, body: input.body, attachmentId: input.attachmentId || null,
        }).returning()
        await tx.update(conversationMembers)
          .set({ unreadCount: sql`${conversationMembers.unreadCount} + 1` })
          .where(and(eq(conversationMembers.conversationId, conversationId), ne(conversationMembers.memberId, user.id)))
        const otherMembers = await tx.select({ memberId: conversationMembers.memberId })
          .from(conversationMembers)
          .where(and(eq(conversationMembers.conversationId, conversationId), ne(conversationMembers.memberId, user.id)))
        return { message, otherMembers }
      })
      const { message, otherMembers } = saved
      const notificationStatuses: string[] = []
      const [senderProfile] = await db.select({ name: profiles.name })
        .from(profiles).where(eq(profiles.id, user.id)).limit(1)
      for (const member of otherMembers) {
        const [profile] = await db.select({ email: profiles.email, name: profiles.name })
          .from(profiles).where(eq(profiles.id, member.memberId)).limit(1)
        if (!profile?.email) {
          notificationStatuses.push('recipient_email_unavailable')
          continue
        }
        const base = process.env.QAMIVO_APP_URL || 'https://qamivo-platform.netlify.app'
        const subject = 'You have a new message on Qamivo'
        const html = brandedNoticeHtml(subject, `${senderProfile?.name || 'A Qamivo member'} sent you a message: ${input.body.slice(0, 1200) || 'An image was attached.'}`, `${base}/dashboard`)
        const result = await sendTransactionalEmail({
          to: profile.email, subject, html, eventType: 'message.new',
          idempotencyKey: `message-notification/${message.id}/${member.memberId}`,
        }).catch(() => ({ status: 'failed' as const }))
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
    if (error instanceof Error && error.name === 'ZodError') return json({ error: ('issues' in error && Array.isArray(error.issues) ? error.issues.map((i: { message: string }) => i.message).join(' ') : 'Invalid input.') }, 422)
    if (error instanceof SyntaxError) return json({ error: 'Invalid JSON.' }, 400)
    return json({ error: error instanceof Error ? error.message : 'Messaging is temporarily unavailable.' }, 503)
  }
}
export const config: Config = {
  path: '/api/comms/*',
  rateLimit: { windowLimit: 60, windowSize: 60, aggregateBy: ['ip', 'domain'] },
}
