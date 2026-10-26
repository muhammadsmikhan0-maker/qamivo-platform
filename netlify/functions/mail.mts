import { getUser } from '@netlify/identity'
import type { Config } from '@netlify/functions'
import { and, desc, eq, isNull } from 'drizzle-orm'
import { ZodError } from 'zod'
import { database } from '../../db/index.js'
import { mailApiKeys, mailDomains, mailMessages } from '../../db/schema.js'
import { mailApiKeyInputSchema, mailDomainInputSchema, mailSendInputSchema, type MailSendInput } from '../../src/lib/mail-validation.js'

type JsonObject = Record<string, unknown>

class MailError extends Error {
  status: number
  code: string
  constructor(message: string, status = 400, code = 'request_error') {
    super(message)
    this.status = status
    this.code = code
  }
}

function json(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
    },
  })
}

function appUrl() {
  return (process.env.QAMIVO_APP_URL || 'https://qamivo-platform.netlify.app').replace(/\/+$/, '')
}

function providerKey() {
  return process.env.RESEND_API_KEY?.trim() || ''
}

async function readJson(request: Request, maxBytes = 50000): Promise<unknown> {
  const contentType = request.headers.get('content-type') || ''
  if (!contentType.toLowerCase().includes('application/json')) throw new MailError('Content-Type must be application/json.', 415)
  const raw = await request.text()
  if (raw.length > maxBytes) throw new MailError('Request body is too large.', 413)
  try {
    return JSON.parse(raw)
  } catch {
    throw new MailError('Invalid JSON body.', 400)
  }
}

async function hash(value: string): Promise<string> {
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function randomHex(bytes = 32) {
  const input = new Uint8Array(bytes)
  crypto.getRandomValues(input)
  return Array.from(input, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function providerRequest(path: string, init: RequestInit = {}): Promise<JsonObject> {
  const key = providerKey()
  if (!key) throw new MailError('The Resend provider is not configured. Ask the site owner to add RESEND_API_KEY in Netlify Function environment variables.', 503, 'provider_not_configured')
  let response: Response
  try {
    response = await fetch('https://api.resend.com' + path, {
      ...init,
      headers: {
        Authorization: 'Bearer ' + key,
        'Content-Type': 'application/json',
        ...(init.headers || {}),
      },
    })
  } catch {
    throw new MailError('The email provider could not be reached. No successful send was recorded.', 502, 'provider_unreachable')
  }
  const payload = await response.json().catch(() => ({})) as JsonObject
  if (!response.ok) {
    const message = typeof payload.message === 'string' ? payload.message : 'The email provider rejected the request.'
    throw new MailError(message, response.status === 429 ? 429 : 502, 'provider_http_' + response.status)
  }
  return payload
}

function providerConfigured() {
  return Boolean(providerKey())
}

function publicKeyRow(row: typeof mailApiKeys.$inferSelect) {
  return {
    id: row.id,
    name: row.name,
    prefix: row.keyPrefix,
    createdAt: row.createdAt.toISOString(),
    lastUsedAt: row.lastUsedAt?.toISOString() || null,
    revokedAt: row.revokedAt?.toISOString() || null,
  }
}

function publicDomainRow(row: typeof mailDomains.$inferSelect) {
  let dnsRecords: unknown = []
  try { dnsRecords = JSON.parse(row.dnsRecords) as unknown } catch { dnsRecords = [] }
  return {
    id: row.id,
    domain: row.domain,
    status: row.status,
    dnsRecords,
    createdAt: row.createdAt.toISOString(),
    lastCheckedAt: row.lastCheckedAt?.toISOString() || null,
  }
}

function publicMessageRow(row: typeof mailMessages.$inferSelect) {
  return {
    id: row.id,
    providerId: row.providerId,
    from: row.fromEmail,
    to: row.recipients,
    subject: row.subject,
    status: row.status,
    errorCode: row.errorCode,
    createdAt: row.createdAt.toISOString(),
  }
}

async function currentMember(request: Request) {
  if (request.method !== 'GET') {
    const url = new URL(request.url)
    if (request.headers.get('origin') !== url.origin) throw new MailError('Same-origin requests are required.', 403)
  }
  const user = await getUser()
  if (!user || !user.id) throw new MailError('Sign in to manage Qamivo Mail.', 401)
  if (!user.confirmedAt) throw new MailError('Verify your account email before using Qamivo Mail.', 403)
  return user
}

function fromDomain(from: string) {
  return from.slice(from.lastIndexOf('@') + 1).trim().toLowerCase()
}

async function deliver(ownerId: string, input: MailSendInput, idempotencyKey: string | null) {
  const db = database()
  const domain = fromDomain(input.from)
  const [approvedDomain] = await db.select().from(mailDomains).where(and(
    eq(mailDomains.ownerId, ownerId),
    eq(mailDomains.domain, domain),
    eq(mailDomains.status, 'verified'),
  )).limit(1)

  if (!approvedDomain) {
    throw new MailError('The sender domain is not verified for this Qamivo Mail workspace. Verify it in the Domains tab first.', 403, 'sender_domain_not_verified')
  }

  const requestFingerprint = await hash(JSON.stringify({
    from: input.from,
    to: input.to,
    subject: input.subject,
    html: input.html || '',
    text: input.text || '',
  }))

  if (idempotencyKey) {
    const [existing] = await db.select().from(mailMessages).where(and(
      eq(mailMessages.ownerId, ownerId),
      eq(mailMessages.idempotencyKey, idempotencyKey),
    )).limit(1)
    if (existing) {
      if (existing.requestHash !== requestFingerprint) {
        throw new MailError('This Idempotency-Key was already used with a different request body.', 409, 'idempotency_conflict')
      }
      return {
        id: existing.id,
        providerId: existing.providerId,
        status: existing.status,
        replayed: true,
      }
    }
  }

  const [message] = await db.insert(mailMessages).values({
    ownerId,
    fromEmail: input.from,
    recipients: input.to,
    subject: input.subject,
    status: 'sending',
    idempotencyKey,
    requestHash: requestFingerprint,
  }).onConflictDoNothing().returning()

  if (!message) {
    if (idempotencyKey) {
      const [existing] = await db.select().from(mailMessages).where(and(
        eq(mailMessages.ownerId, ownerId),
        eq(mailMessages.idempotencyKey, idempotencyKey),
      )).limit(1)
      if (existing) {
        if (existing.requestHash !== requestFingerprint) {
          throw new MailError('This Idempotency-Key was already used with a different request body.', 409, 'idempotency_conflict')
        }
        return { id: existing.id, providerId: existing.providerId, status: existing.status, replayed: true }
      }
    }
    throw new MailError('The request could not be reserved safely. Retry with a new idempotency key.', 409, 'reservation_conflict')
  }

  try {
    const providerPayload = await providerRequest('/emails', {
      method: 'POST',
      headers: { 'Idempotency-Key': idempotencyKey || 'qamivo-mail-' + message.id },
      body: JSON.stringify({
        from: input.from,
        to: input.to,
        subject: input.subject,
        ...(input.html ? { html: input.html } : {}),
        ...(input.text ? { text: input.text } : {}),
      }),
    })
    const providerId = typeof providerPayload.id === 'string' ? providerPayload.id : null
    await db.update(mailMessages).set({
      providerId,
      status: 'accepted',
      errorCode: null,
    }).where(eq(mailMessages.id, message.id))
    return { id: message.id, providerId, status: 'accepted', replayed: false }
  } catch (error) {
    const failure = error instanceof MailError ? error : new MailError('The email provider failed unexpectedly.', 502, 'provider_error')
    await db.update(mailMessages).set({
      status: 'failed',
      errorCode: failure.code,
    }).where(eq(mailMessages.id, message.id))
    throw failure
  }
}

export default async (request: Request) => {
  const url = new URL(request.url)
  const path = url.pathname.replace(/\/+$/, '')
  const parts = path.replace(/^\/api\/mail\/?/, '').split('/').filter(Boolean)
  const db = database()

  try {
    if (path === '/api/mail/v1/emails' && request.method === 'POST') {
      const authorization = request.headers.get('authorization') || ''
      const token = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : ''
      if (!token.startsWith('qm_live_') || token.length < 30) {
        return json({ error: { code: 'unauthorized', message: 'A valid Qamivo Mail API key is required.' } }, 401)
      }
      const tokenHash = await hash(token)
      const [key] = await db.select().from(mailApiKeys).where(and(
        eq(mailApiKeys.keyHash, tokenHash),
        isNull(mailApiKeys.revokedAt),
      )).limit(1)
      if (!key) return json({ error: { code: 'unauthorized', message: 'A valid Qamivo Mail API key is required.' } }, 401)
      let raw: unknown
      try { raw = await readJson(request) } catch (error) {
        if (error instanceof MailError) return json({ error: { code: error.code, message: error.message } }, error.status)
        throw error
      }
      const parsed = mailSendInputSchema.safeParse(raw)
      if (!parsed.success) return json({ error: { code: 'validation_error', message: parsed.error.issues.map((item) => item.message).join(' ') } }, 422)
      await db.update(mailApiKeys).set({ lastUsedAt: new Date() }).where(eq(mailApiKeys.id, key.id))
      const idempotencyKey = request.headers.get('Idempotency-Key')?.trim() || null
      if (idempotencyKey && (idempotencyKey.length > 200 || /[\r\n]/.test(idempotencyKey))) {
        return json({ error: { code: 'invalid_idempotency_key', message: 'Idempotency-Key must be at most 200 characters without newlines.' } }, 400)
      }
      const sent = await deliver(key.ownerId, parsed.data, idempotencyKey)
      return json({ id: sent.id, provider_id: sent.providerId, status: sent.status, replayed: sent.replayed }, sent.replayed ? 200 : 202)
    }

    const user = await currentMember(request)

    if (path === '/api/mail/dashboard' && request.method === 'GET') {
      const [keys, domains, emails] = await Promise.all([
        db.select().from(mailApiKeys).where(eq(mailApiKeys.ownerId, user.id)).orderBy(desc(mailApiKeys.createdAt)).limit(50),
        db.select().from(mailDomains).where(eq(mailDomains.ownerId, user.id)).orderBy(desc(mailDomains.createdAt)).limit(50),
        db.select().from(mailMessages).where(eq(mailMessages.ownerId, user.id)).orderBy(desc(mailMessages.createdAt)).limit(50),
      ])
      const activeKeys = keys.filter((row) => !row.revokedAt).length
      const verifiedDomains = domains.filter((row) => row.status === 'verified').length
      const accepted = emails.filter((row) => ['accepted', 'delivered', 'opened', 'clicked'].includes(row.status)).length
      const failed = emails.filter((row) => ['failed', 'bounced', 'complained'].includes(row.status)).length
      return json({
        provider: { name: 'Resend', configured: providerConfigured() },
        transactionalSenderConfigured: Boolean(process.env.QAMIVO_FROM_EMAIL?.trim()),
        stats: { activeKeys, domains: domains.length, verifiedDomains, emails: emails.length, accepted, failed },
        keys: keys.map(publicKeyRow),
        domains: domains.map(publicDomainRow),
        emails: emails.map(publicMessageRow),
      })
    }

    if (path === '/api/mail/keys' && request.method === 'POST') {
      const parsed = mailApiKeyInputSchema.safeParse(await readJson(request))
      if (!parsed.success) return json({ error: parsed.error.issues.map((item) => item.message).join(' ') }, 422)
      const rawKey = 'qm_live_' + randomHex(32)
      const [created] = await db.insert(mailApiKeys).values({
        ownerId: user.id,
        name: parsed.data.name,
        keyPrefix: rawKey.slice(0, 16),
        keyHash: await hash(rawKey),
      }).returning()
      return json({ key: rawKey, apiKey: publicKeyRow(created), warning: 'Copy this key now. It cannot be shown again.' }, 201)
    }

    if (parts[0] === 'keys' && parts.length === 2 && request.method === 'DELETE') {
      const [key] = await db.select().from(mailApiKeys).where(and(
        eq(mailApiKeys.id, parts[1]),
        eq(mailApiKeys.ownerId, user.id),
        isNull(mailApiKeys.revokedAt),
      )).limit(1)
      if (!key) return json({ error: 'API key not found.' }, 404)
      await db.update(mailApiKeys).set({ revokedAt: new Date() }).where(eq(mailApiKeys.id, key.id))
      return json({ revoked: true })
    }

    if (path === '/api/mail/domains' && request.method === 'POST') {
      const parsed = mailDomainInputSchema.safeParse(await readJson(request))
      if (!parsed.success) return json({ error: parsed.error.issues.map((item) => item.message).join(' ') }, 422)
      const domainName = parsed.data.domain
      const [existing] = await db.select().from(mailDomains).where(eq(mailDomains.domain, domainName)).limit(1)
      if (existing) return json({ error: 'This domain is already registered in Qamivo Mail. Contact the workspace owner if you believe this is incorrect.' }, 409)
      const providerDomain = await providerRequest('/domains', {
        method: 'POST',
        body: JSON.stringify({ name: domainName }),
      })
      const providerDomainId = typeof providerDomain.id === 'string' ? providerDomain.id : ''
      if (!providerDomainId) throw new MailError('The provider did not return a domain ID. No domain was recorded.', 502, 'provider_invalid_response')
      let dnsRecords = '[]'
      try { dnsRecords = JSON.stringify(Array.isArray(providerDomain.records) ? providerDomain.records : []) } catch { dnsRecords = '[]' }
      const providerStatus = typeof providerDomain.status === 'string' ? providerDomain.status : 'pending'
      const [created] = await db.insert(mailDomains).values({
        ownerId: user.id,
        domain: domainName,
        providerDomainId,
        status: providerStatus,
        dnsRecords,
        lastCheckedAt: new Date(),
      }).returning()
      return json(publicDomainRow(created), 201)
    }

    if (parts[0] === 'domains' && parts.length === 3 && parts[2] === 'verify' && request.method === 'POST') {
      const [domain] = await db.select().from(mailDomains).where(and(
        eq(mailDomains.id, parts[1]),
        eq(mailDomains.ownerId, user.id),
      )).limit(1)
      if (!domain) return json({ error: 'Domain not found.' }, 404)
      await providerRequest('/domains/' + encodeURIComponent(domain.providerDomainId) + '/verify', {
        method: 'POST',
        body: JSON.stringify({}),
      })
      const current = await providerRequest('/domains/' + encodeURIComponent(domain.providerDomainId), { method: 'GET', headers: {} })
      const status = typeof current.status === 'string' ? current.status : 'pending'
      let dnsRecords = domain.dnsRecords
      try { dnsRecords = JSON.stringify(Array.isArray(current.records) ? current.records : JSON.parse(domain.dnsRecords)) } catch { /* keep prior provider DNS records */ }
      const [updated] = await db.update(mailDomains).set({
        status,
        dnsRecords,
        lastCheckedAt: new Date(),
      }).where(eq(mailDomains.id, domain.id)).returning()
      return json(publicDomainRow(updated))
    }

    if (path === '/api/mail/test' && request.method === 'POST') {
      const parsed = zodTestSchema(await readJson(request))
      if (!parsed.ok) return json({ error: parsed.error }, 422)
      const result = await deliver(user.id, {
        from: parsed.from,
        to: [parsed.to],
        subject: 'Qamivo Mail delivery test',
        text: 'This test email was requested from the Qamivo Mail dashboard. It confirms provider acceptance, not final inbox delivery.',
      }, null)
      return json({ ...result, message: 'Provider accepted the test request. Final delivery is confirmed separately by a signed webhook.' }, 202)
    }

    if (path === '/api/mail/emails' && request.method === 'GET') {
      const emails = await db.select().from(mailMessages).where(eq(mailMessages.ownerId, user.id)).orderBy(desc(mailMessages.createdAt)).limit(100)
      return json(emails.map(publicMessageRow))
    }

    if (request.method === 'GET' && parts.length === 1 && parts[0] === 'domains') {
      const domains = await db.select().from(mailDomains).where(eq(mailDomains.ownerId, user.id)).orderBy(desc(mailDomains.createdAt)).limit(50)
      return json(domains.map(publicDomainRow))
    }

    return json({ error: 'Endpoint not found.' }, 404)
  } catch (error) {
    if (error instanceof ZodError) return json({ error: error.issues.map((item) => item.message).join(' ') }, 422)
    if (error instanceof MailError) return json({ error: { code: error.code, message: error.message } }, error.status)
    return json({ error: 'Qamivo Mail could not complete the request. Check configuration and try again.' }, 503)
  }
}

function zodTestSchema(value: unknown): { ok: true; from: string; to: string } | { ok: false; error: string } {
  const shape = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  const from = typeof shape.from === 'string' ? shape.from.trim().toLowerCase() : ''
  const to = typeof shape.to === 'string' ? shape.to.trim().toLowerCase() : ''
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(from)) return { ok: false, error: 'Enter a valid sender email address.' }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return { ok: false, error: 'Enter a valid recipient email address.' }
  return { ok: true, from, to }
}

export const config: Config = {
  path: ['/api/mail', '/api/mail/*'],
  rateLimit: { windowLimit: 120, windowSize: 60, aggregateBy: ['ip', 'domain'] },
}
