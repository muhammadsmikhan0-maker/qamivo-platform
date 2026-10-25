import { getUser } from '@netlify/identity'
import type { Config } from '@netlify/functions'
import { and, desc, eq, ilike, inArray, or, sql, lt } from 'drizzle-orm'
import { z } from 'zod'
import { database } from '../../db/index.js'
import {
  profiles,
  jobs,
  proposals,
  auditEvents,
  rateLimits,
  uploads,
} from '../../db/schema.js'
import { brandedNoticeHtml, sendTransactionalEmail } from '../shared/transactional-email.mjs'
import {
  jobSchema,
  proposalSchema,
  profileSchema,
  idSchema,
} from '../../src/lib/validation.js'

export default async (req: Request) => {
  const url = new URL(req.url)
  const parts = url.pathname
    .replace(/^\/api\/marketplace\/?/, '')
    .split('/')
    .filter(Boolean)
  const [resource, id, child] = parts
  const json = (body: unknown, status = 200) =>
    Response.json(body, {
      status,
      headers: {
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  try {
    if (!['GET', 'POST', 'PUT', 'PATCH'].includes(req.method))
      return json({ error: 'Method not allowed' }, 405)
    if (req.method !== 'GET') {
      if (req.headers.get('origin') !== url.origin)
        return json({ error: 'Request origin not allowed.' }, 403)
      if (!req.headers.get('content-type')?.startsWith('application/json'))
        return json({ error: 'JSON required.' }, 415)
      const bodyText = await req.text()
      if (bodyText.length > 18000)
        return json({ error: 'Request too large.' }, 413)
      let body: unknown
      try {
        body = JSON.parse(bodyText)
      } catch {
        return json({ error: 'Invalid JSON.' }, 400)
      }
      const user = await getUser()
      if (!user) return json({ error: 'Sign in to continue.' }, 401)
      if (!user.confirmedAt)
        return json({ error: 'Verify your email before continuing.' }, 403)
      const db = database()
      await db
        .delete(rateLimits)
        .where(lt(rateLimits.windowStart, new Date(Date.now() - 86400000)))
      const key = `${user.id}:${Math.floor(Date.now() / 3600000)}`
      const [rate] = await db
        .insert(rateLimits)
        .values({ key, count: 1 })
        .onConflictDoUpdate({
          target: rateLimits.key,
          set: { count: sql`${rateLimits.count}+1` },
        })
        .returning()
      if (rate.count > 60)
        return json(
          { error: 'Hourly action limit reached. Please try again later.' },
          429,
        )
      if (resource === 'profile' && req.method === 'PUT') {
        const data = profileSchema.parse(body)
        if (data.avatarKey) {
          const [asset] = await db.select().from(uploads).where(eq(uploads.id, data.avatarKey)).limit(1)
          if (!asset || asset.ownerId !== user.id || asset.purpose !== 'avatar') {
            return json({ error: 'Choose a profile image uploaded by your own account.' }, 403)
          }
        }
        const profileData = {
          ...data,
          id: user.id,
          email: user.email || null,
          avatarKey: data.avatarKey || null,
          avatarPosition: data.avatarPosition || 'center',
        }
        const result = await db
          .insert(profiles)
          .values(profileData)
          .onConflictDoUpdate({
            target: profiles.id,
            set: { ...profileData, updatedAt: new Date() },
          })
          .returning()
        return json(result[0])
      }
      if (resource === 'jobs' && !id && req.method === 'POST') {
        const data = jobSchema.parse(body)
        const referenceImageIds = data.referenceImageIds || []
        if (referenceImageIds.length) {
          const assets = await db.select().from(uploads).where(inArray(uploads.id, referenceImageIds))
          if (assets.length !== new Set(referenceImageIds).size ||
              assets.some((asset) => asset.ownerId !== user.id || asset.purpose !== 'job_reference')) {
            return json({ error: 'One or more project reference images are not owned by your account.' }, 403)
          }
        }
        const [result] = await db.transaction(async (tx) => {
          const rows = await tx
            .insert(jobs)
            .values({ ...data, referenceImageIds, ownerId: user.id })
            .returning()
          await tx
            .insert(auditEvents)
            .values({
              actorId: user.id,
              action: 'job.created',
              recordId: rows[0].id,
            })
          return rows
        })
        const adminEmail = process.env.QAMIVO_ADMIN_EMAIL
        if (adminEmail) {
          const base = process.env.QAMIVO_APP_URL || 'https://qamivo-platform.netlify.app'
          await sendTransactionalEmail({
            to: adminEmail,
            subject: 'New project published on Qamivo',
            html: brandedNoticeHtml('New project published', result.title, `${base}/jobs/${result.id}`),
            eventType: 'job.created.admin',
            idempotencyKey: `job-created-admin/${result.id}`,
          }).catch(() => ({ status: 'failed' as const }))
        }
        return json(result, 201)
      }
      if (resource === 'jobs' && id) {
        idSchema.parse(id)
        let proposalNotification: { email: string | null; jobTitle: string; jobId: string; proposalId: string } | null = null
        // Serialize proposals and closing against the same job row.
        const response = await db.transaction(async (tx) => {
          const [job] = await tx
            .select()
            .from(jobs)
            .where(eq(jobs.id, id))
            .for('update')
          if (!job) return json({ error: 'Project not found.' }, 404)
          if (child === 'proposals' && req.method === 'POST') {
            if (job.ownerId === user.id)
              return json(
                { error: 'You cannot apply to your own project.' },
                403,
              )
            if (job.status !== 'open')
              return json({ error: 'This project is closed.' }, 409)
            const [profile] = await tx
              .select()
              .from(profiles)
              .where(eq(profiles.id, user.id))
            if (!profile)
              return json(
                { error: 'Create a professional profile before applying.' },
                422,
              )
            const data = proposalSchema.parse(body)
            const [proposal] = await tx
              .insert(proposals)
              .values({ ...data, jobId: id, freelancerId: user.id })
              .onConflictDoNothing()
              .returning()
            if (!proposal)
              return json(
                { error: 'You have already submitted a proposal.' },
                409,
              )
            await tx
              .insert(auditEvents)
              .values({
                actorId: user.id,
                action: 'proposal.submitted',
                recordId: proposal.id,
              })
            const [ownerProfile] = await tx.select({ email: profiles.email })
              .from(profiles).where(eq(profiles.id, job.ownerId)).limit(1)
            proposalNotification = { email: ownerProfile?.email || null, jobTitle: job.title, jobId: job.id, proposalId: proposal.id }
            return json(proposal, 201)
          }
          if (!child && req.method === 'PATCH') {
            if (job.ownerId !== user.id)
              return json({ error: 'Project not found.' }, 404)
            const data = z.object({ status: z.literal('closed') }).parse(body)
            if (job.status !== 'open')
              return json({ error: 'This project is already closed.' }, 409)
            const [result] = await tx
              .update(jobs)
              .set(data)
              .where(eq(jobs.id, id))
              .returning()
            await tx
              .insert(auditEvents)
              .values({ actorId: user.id, action: 'job.closed', recordId: id })
            return json(result)
          }
          return json({ error: 'Operation not found.' }, 404)
        })
        const notification = proposalNotification as {
          email: string | null
          jobTitle: string
          jobId: string
          proposalId: string
        } | null
        if (notification?.email && response.status === 201) {
          const base = process.env.QAMIVO_APP_URL || 'https://qamivo-platform.netlify.app'
          await sendTransactionalEmail({
            to: notification.email,
            subject: 'A new proposal was submitted on Qamivo',
            html: brandedNoticeHtml('New proposal received', `A freelancer submitted a proposal for: ${notification.jobTitle}`, `${base}/jobs/${notification.jobId}`),
            eventType: 'proposal.submitted',
            idempotencyKey: `proposal-submitted/${notification.proposalId}`,
          }).catch(() => ({ status: 'failed' as const }))
        }
        return response
      }
      if (resource === 'proposals' && id && req.method === 'PATCH') {
        idSchema.parse(id)
        const data = z
          .object({ status: z.enum(['shortlisted', 'rejected']) })
          .parse(body)
        let proposalDecision: { email: string | null; jobTitle: string; proposalId: string; status: 'shortlisted' | 'rejected' } | null = null
        const response = await db.transaction(async (tx) => {
          const [entry] = await tx
            .select({ proposal: proposals, job: jobs })
            .from(proposals)
            .innerJoin(jobs, eq(jobs.id, proposals.jobId))
            .where(eq(proposals.id, id))
            .for('update')
          if (!entry || entry.job.ownerId !== user.id)
            return json({ error: 'Proposal not found.' }, 404)
          if (
            entry.job.status !== 'open' ||
            entry.proposal.status === 'rejected'
          )
            return json(
              { error: 'This proposal can no longer be updated.' },
              409,
            )
          const [result] = await tx
            .update(proposals)
            .set(data)
            .where(eq(proposals.id, id))
            .returning()
          await tx
            .insert(auditEvents)
            .values({
              actorId: user.id,
              action: `proposal.${data.status}`,
              recordId: id,
            })
          const [recipient] = await tx.select({ email: profiles.email })
            .from(profiles).where(eq(profiles.id, entry.proposal.freelancerId)).limit(1)
          proposalDecision = { email: recipient?.email || null, jobTitle: entry.job.title, proposalId: id, status: data.status }
          return json(result)
        })
        const decision = proposalDecision as {
          email: string | null
          jobTitle: string
          proposalId: string
          status: 'shortlisted' | 'rejected'
        } | null
        if (decision?.email && response.status === 200) {
          const base = process.env.QAMIVO_APP_URL || 'https://qamivo-platform.netlify.app'
          const label = decision.status === 'shortlisted' ? 'Your proposal was shortlisted' : 'Your proposal was declined'
          await sendTransactionalEmail({
            to: decision.email,
            subject: label + ' on Qamivo',
            html: brandedNoticeHtml(label, `Project: ${decision.jobTitle}`, `${base}/dashboard`),
            eventType: `proposal.${decision.status}`,
            idempotencyKey: `proposal-decision/${decision.proposalId}/${decision.status}`,
          }).catch(() => ({ status: 'failed' as const }))
        }
        return response
      }
      return json({ error: 'Operation not found.' }, 404)
    }
    const db = database()
    if (resource === 'profiles') {
      const query = (url.searchParams.get('q') || '').slice(0, 100)
      const category = (url.searchParams.get('category') || '').slice(0, 30)
      const conditions = [eq(profiles.isPublic, true)]
      if (id) conditions.push(eq(profiles.username, id.slice(0, 32)))
      if (query)
        conditions.push(
          or(
            ilike(profiles.headline, `%${query}%`),
            ilike(profiles.skills, `%${query}%`),
            ilike(profiles.name, `%${query}%`),
          )!,
        )
      if (category) conditions.push(eq(profiles.category, category))
      const rows = await db
        .select({
          username: profiles.username,
          name: profiles.name,
          headline: profiles.headline,
          bio: profiles.bio,
          skills: profiles.skills,
          category: profiles.category,
          country: profiles.country,
          avatarKey: profiles.avatarKey,
          avatarPosition: profiles.avatarPosition,
        })
        .from(profiles)
        .where(and(...conditions))
        .limit(50)
      if (id && !rows.length) return json({ error: 'Profile not found.' }, 404)
      return json(id ? rows[0] : rows)
    }
    if (resource === 'jobs') {
      if (id) {
        idSchema.parse(id)
        const [job] = await db
          .select({
            id: jobs.id,
            title: jobs.title,
            description: jobs.description,
            category: jobs.category,
            budget: jobs.budget,
            currency: jobs.currency,
            status: jobs.status,
            createdAt: jobs.createdAt,
          })
          .from(jobs)
          .where(eq(jobs.id, id))
        if (!job) return json({ error: 'Project not found.' }, 404)
        if (child === 'proposals') {
          const user = await getUser()
          if (!user) return json({ error: 'Sign in to continue.' }, 401)
          const [owner] = await db
            .select({ ownerId: jobs.ownerId })
            .from(jobs)
            .where(eq(jobs.id, id))
          if (owner.ownerId !== user.id)
            return json({ error: 'Project not found.' }, 404)
          return json(
            await db
              .select({
                id: proposals.id,
                coverLetter: proposals.coverLetter,
                amount: proposals.amount,
                days: proposals.days,
                status: proposals.status,
                name: profiles.name,
                username: profiles.username,
              })
              .from(proposals)
              .leftJoin(profiles, eq(profiles.id, proposals.freelancerId))
              .where(eq(proposals.jobId, id))
              .orderBy(desc(proposals.createdAt))
              .limit(100),
          )
        }
        return json(job)
      }
      const query = (url.searchParams.get('q') || '').slice(0, 100),
        category = (url.searchParams.get('category') || '').slice(0, 30)
      const conditions = [eq(jobs.status, 'open')]
      if (query)
        conditions.push(
          or(
            ilike(jobs.title, `%${query}%`),
            ilike(jobs.description, `%${query}%`),
          )!,
        )
      if (category) conditions.push(eq(jobs.category, category))
      return json(
        await db
          .select({
            id: jobs.id,
            title: jobs.title,
            description: jobs.description,
            category: jobs.category,
            budget: jobs.budget,
            currency: jobs.currency,
            status: jobs.status,
            createdAt: jobs.createdAt,
          })
          .from(jobs)
          .where(and(...conditions))
          .orderBy(desc(jobs.createdAt))
          .limit(50),
      )
    }
    if (resource === 'me') {
      const user = await getUser()
      if (!user) return json({ error: 'Sign in to view your workspace.' }, 401)
      await db.update(profiles).set({ email: user.email || null })
        .where(eq(profiles.id, user.id))
      const [profile] = await db
        .select()
        .from(profiles)
        .where(eq(profiles.id, user.id))
      const myJobs = await db
        .select()
        .from(jobs)
        .where(eq(jobs.ownerId, user.id))
        .orderBy(desc(jobs.createdAt))
        .limit(100)
      const myProposals = await db
        .select({
          id: proposals.id,
          jobId: proposals.jobId,
          title: jobs.title,
          status: proposals.status,
          amount: proposals.amount,
          currency: jobs.currency,
          days: proposals.days,
        })
        .from(proposals)
        .innerJoin(jobs, eq(jobs.id, proposals.jobId))
        .where(eq(proposals.freelancerId, user.id))
        .limit(100)
      return json({
        profile: profile || null,
        jobs: myJobs,
        proposals: myProposals,
      })
    }
    return json({ error: 'Endpoint not found.' }, 404)
  } catch (error) {
    if (error instanceof z.ZodError)
      return json(
        {
          error: error.issues
            .map((x) => `${x.path.join('.')}: ${x.message}`)
            .join('; '),
        },
        422,
      )
    const dbError = error as { code?: string; cause?: { code?: string } }
    if (dbError.code === '23505' || dbError.cause?.code === '23505')
      return json({ error: 'That username or record already exists.' }, 409)
    return json(
      {
        error:
          'The marketplace is temporarily unavailable. Please try again later. Your action has not been confirmed.',
      },
      503,
    )
  }
}
export const config: Config = {
  path: '/api/marketplace/*',
  rateLimit: {
    windowLimit: 120,
    windowSize: 60,
    aggregateBy: ['ip', 'domain'],
  },
}
