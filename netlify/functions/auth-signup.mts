import { admin } from '@netlify/identity'
import type { Config } from '@netlify/functions'
import { and, desc, eq, gte, inArray, lt, sql } from 'drizzle-orm'
import { z } from 'zod'
import { database } from '../../db/index.js'
import { rateLimits, verificationChallenges } from '../../db/schema.js'
import { brandedNoticeHtml, sendTransactionalEmail } from '../shared/transactional-email.mjs'

const startSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  fullName: z.string().trim().min(2).max(70),
})
const verifySchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  code: z.string().regex(/^\d{6}$/),
  password: z.string().min(10).max(128),
})

function json(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
  })
}
function validOrigin(req: Request, url: URL) {
  return req.headers.get('origin') === url.origin
}
async function parseBody(req: Request) {
  if (!req.headers.get('content-type')?.toLowerCase().includes('application/json')) {
    throw new Error('JSON required.')
  }
  const raw = await req.text()
  if (raw.length > 12000) throw new Error('Request is too large.')
  return JSON.parse(raw) as unknown
}
async function hmacHex(secret: string, value: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value)))
  return Array.from(signature, (byte) => byte.toString(16).padStart(2, '0')).join('')
}
function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false
  let diff = 0
  for (let i = 0; i < left.length; i += 1) {
    diff |= left.charCodeAt(i) ^ right.charCodeAt(i)
  }
  return diff === 0
}
function generateOtp() {
  const range = 1_000_000
  const limit = Math.floor(0x1_0000_0000 / range) * range
  while (true) {
    const bytes = new Uint32Array(1)
    crypto.getRandomValues(bytes)
    if (bytes[0] < limit) return String(bytes[0] % range).padStart(6, '0')
  }
}
function configurationReady() {
  const secret = process.env.QAMIVO_OTP_SECRET
  return !!(
    process.env.RESEND_API_KEY &&
    process.env.QAMIVO_FROM_EMAIL?.trim() &&
    secret &&
    secret.length >= 32
  )
}

export default async (req: Request) => {
  const url = new URL(req.url)
  if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405)
  if (!validOrigin(req, url)) return json({ error: 'Same-origin requests are required.' }, 403)
  if (!configurationReady()) {
    return json({
      error: 'Email verification is not configured. Set RESEND_API_KEY, QAMIVO_FROM_EMAIL and a random QAMIVO_OTP_SECRET (at least 32 characters) in Netlify Function environment variables, then redeploy.',
    }, 503)
  }

  const db = database()
  const secret = process.env.QAMIVO_OTP_SECRET!
  const route = url.pathname.replace(/\/+$/, '')

  try {
    const input = await parseBody(req)

    if (route === '/api/auth/signup/start') {
      const parsed = startSchema.safeParse(input)
      if (!parsed.success) {
        return json({ error: parsed.error.issues.map((item) => item.message).join(' ') }, 422)
      }
      const { email, fullName } = parsed.data

      await db.delete(rateLimits).where(lt(rateLimits.windowStart, new Date(Date.now() - 24 * 60 * 60 * 1000)))
      await db.delete(verificationChallenges).where(lt(verificationChallenges.expiresAt, new Date(Date.now() - 24 * 60 * 60 * 1000)))

      const currentMinute = new Date(Date.now() - 60 * 1000)
      const [recent] = await db.select({ id: verificationChallenges.id })
        .from(verificationChallenges)
        .where(and(
          eq(verificationChallenges.email, email),
          inArray(verificationChallenges.status, ['pending', 'sent']),
          gte(verificationChallenges.createdAt, currentMinute),
        ))
        .orderBy(desc(verificationChallenges.createdAt))
        .limit(1)
      if (recent) {
        return json({ error: 'A verification code was requested recently. Wait at least 60 seconds before requesting another.' }, 429)
      }

      const hour = Math.floor(Date.now() / (60 * 60 * 1000))
      const emailKey = await hmacHex(secret, `signup-rate:${email}`)
      const [rate] = await db.insert(rateLimits)
        .values({ key: `otp-start:${emailKey}:${hour}`, count: 1, windowStart: new Date(hour * 60 * 60 * 1000) })
        .onConflictDoUpdate({
          target: rateLimits.key,
          set: { count: sql`${rateLimits.count} + 1` },
        })
        .returning()
      if (rate.count > 3) {
        return json({ error: 'Too many verification requests for this email. Try again later.' }, 429)
      }

      await db.update(verificationChallenges)
        .set({ status: 'superseded' })
        .where(and(
          eq(verificationChallenges.email, email),
          inArray(verificationChallenges.status, ['pending', 'sent']),
        ))

      const code = generateOtp()
      const id = crypto.randomUUID()
      const codeHash = await hmacHex(secret, `${id}\n${email}\n${code}`)
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000)
      await db.insert(verificationChallenges).values({
        id,
        email,
        fullName,
        codeHash,
        status: 'pending',
        attempts: 0,
        expiresAt,
      })

      const base = process.env.QAMIVO_APP_URL || 'https://qamivo-platform.netlify.app'
      const result = await sendTransactionalEmail({
        to: email,
        subject: 'Your Qamivo email verification code',
        html: brandedNoticeHtml(
          'Verify your email',
          `Your Qamivo verification code is ${code}. It expires in 10 minutes. Enter this code on the registration page to create your account. If you did not request it, ignore this email.`,
          `${base}/register`,
        ),
        eventType: 'account.email_otp',
        idempotencyKey: `registration-otp/${id}`,
      })
      if (result.status !== 'sent') {
        await db.update(verificationChallenges).set({ status: 'failed' })
          .where(eq(verificationChallenges.id, id))
        return json({
          error: result.status === 'not_configured'
            ? 'The email provider is missing configuration. No verification email was reported as sent.'
            : 'The verification email could not be accepted by the provider. Check the sender/domain configuration and try again later.',
        }, result.status === 'not_configured' ? 503 : 502)
      }
      await db.update(verificationChallenges).set({ status: 'sent' })
        .where(eq(verificationChallenges.id, id))
      return json({
        challengeId: id,
        message: 'The email provider accepted the verification email. Check your inbox and spam folder; delivery confirmation is tracked separately.',
      }, 202)
    }

    if (route === '/api/auth/signup/verify') {
      const parsed = verifySchema.safeParse(input)
      if (!parsed.success) {
        return json({ error: parsed.error.issues.map((item) => item.message).join(' ') }, 422)
      }
      const { email, code, password } = parsed.data
      const verification = await db.transaction(async (tx) => {
        const [challenge] = await tx.select().from(verificationChallenges)
          .where(and(
            eq(verificationChallenges.email, email),
            eq(verificationChallenges.status, 'sent'),
          ))
          .orderBy(desc(verificationChallenges.createdAt))
          .limit(1)
          .for('update')
        if (!challenge) return { kind: 'missing' as const }
        if (challenge.expiresAt.getTime() <= Date.now()) {
          await tx.update(verificationChallenges).set({ status: 'expired' })
            .where(eq(verificationChallenges.id, challenge.id))
          return { kind: 'expired' as const }
        }
        if (challenge.attempts >= 5) {
          await tx.update(verificationChallenges).set({ status: 'locked' })
            .where(eq(verificationChallenges.id, challenge.id))
          return { kind: 'locked' as const }
        }
        const candidate = await hmacHex(secret, `${challenge.id}\n${email}\n${code}`)
        if (!constantTimeEqual(candidate, challenge.codeHash)) {
          const attempts = challenge.attempts + 1
          await tx.update(verificationChallenges).set({
            attempts,
            status: attempts >= 5 ? 'locked' : 'sent',
          }).where(eq(verificationChallenges.id, challenge.id))
          return { kind: attempts >= 5 ? 'locked' as const : 'invalid' as const }
        }
        await tx.update(verificationChallenges).set({
          status: 'consumed',
          consumedAt: new Date(),
        }).where(eq(verificationChallenges.id, challenge.id))
        return { kind: 'verified' as const, fullName: challenge.fullName, challengeId: challenge.id }
      })

      if (verification.kind === 'missing') return json({ error: 'No active verification code exists. Request a new code.' }, 400)
      if (verification.kind === 'expired') return json({ error: 'This verification code has expired. Request a new one.' }, 400)
      if (verification.kind === 'locked') return json({ error: 'Too many incorrect codes. Request a new code.' }, 429)
      if (verification.kind === 'invalid') return json({ error: 'The verification code is incorrect.' }, 400)

      let newUser: { id: string; email?: string } | null = null
      try {
        newUser = await admin.createUser({
          email,
          password,
          data: { full_name: verification.fullName },
        })
      } catch {
        await db.update(verificationChallenges).set({ status: 'failed' })
          .where(eq(verificationChallenges.id, verification.challengeId))
        return json({
          error: 'Account creation could not be completed. Restart registration, or sign in/use account recovery if you already have an account.',
        }, 409)
      }

      // The account is created only after the recipient proves mailbox access.
      await sendTransactionalEmail({
        to: email,
        subject: 'Welcome to Qamivo',
        html: brandedNoticeHtml(
          'Welcome to Qamivo',
          'Your email is verified and your Qamivo account is ready. Complete your profile and explore opportunities.',
          `${process.env.QAMIVO_APP_URL || 'https://qamivo-platform.netlify.app'}/account`,
        ),
        eventType: 'account.welcome',
        idempotencyKey: `account-welcome/${newUser.id}`,
      }).catch(() => ({ status: 'failed' as const }))

      return json({
        created: true,
        message: 'Email verified and account created. Sign in to continue.',
      }, 201)
    }

    return json({ error: 'Endpoint not found.' }, 404)
  } catch (error) {
    if (error instanceof SyntaxError) return json({ error: 'Invalid JSON.' }, 400)
    return json({
      error: error instanceof Error && error.message === 'JSON required.'
        ? error.message
        : 'Registration is temporarily unavailable. No account creation was confirmed.',
    }, error instanceof Error && error.message === 'JSON required.' ? 415 : 503)
  }
}

export const config: Config = {
  path: ['/api/auth/signup/start', '/api/auth/signup/verify'],
  rateLimit: {
    windowLimit: 10,
    windowSize: 60,
    aggregateBy: ['ip', 'domain'],
  },
}
