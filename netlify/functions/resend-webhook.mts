import { eq } from 'drizzle-orm'
import type { Config } from '@netlify/functions'
import { database } from '../../db/index.js'
import { emailEvents } from '../../db/schema.js'

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
}
function decodeBase64(value: string) {
  const binary = atob(value)
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}
function bytesToBase64(bytes: Uint8Array) {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}
async function verifySignature(req: Request, rawBody: string, secret: string) {
  const id = req.headers.get('svix-id')
  const timestamp = req.headers.get('svix-timestamp')
  const signatures = req.headers.get('svix-signature')
  if (!id || !timestamp || !signatures || !/^\d+$/.test(timestamp)) return false
  const seconds = Number(timestamp)
  if (Math.abs(Date.now() / 1000 - seconds) > 300) return false
  const keyMaterial = decodeBase64(secret.replace(/^whsec_/, ''))
  const key = await crypto.subtle.importKey('raw', keyMaterial, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const signed = new TextEncoder().encode(`${id}.${timestamp}.${rawBody}`)
  const expected = bytesToBase64(new Uint8Array(await crypto.subtle.sign('HMAC', key, signed)))
  return signatures.split(' ').some((entry) => {
    const [version, signature] = entry.split(',')
    return version === 'v1' && signature === expected
  })
}
export default async (req: Request) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405)
  const secret = process.env.RESEND_WEBHOOK_SECRET
  if (!secret) return json({ error: 'Email webhook is not configured.' }, 503)
  const rawBody = await req.text()
  if (rawBody.length > 100000) return json({ error: 'Payload too large.' }, 413)
  try {
    if (!await verifySignature(req, rawBody, secret)) return json({ error: 'Invalid webhook signature.' }, 401)
    const payload = JSON.parse(rawBody) as { type?: string; data?: { email_id?: string; id?: string } }
    const providerId = payload.data?.email_id || payload.data?.id
    if (!providerId || !payload.type?.startsWith('email.')) return json({ received: true, updated: false })
    const statusByType: Record<string, string> = {
      'email.sent': 'sent',
      'email.delivered': 'delivered',
      'email.delivery_delayed': 'delivery_delayed',
      'email.bounced': 'bounced',
      'email.complained': 'complained',
      'email.opened': 'opened',
      'email.clicked': 'clicked',
    }
    const status = statusByType[payload.type]
    if (!status) return json({ received: true, updated: false })
    await database().update(emailEvents).set({ status, errorCode: null })
      .where(eq(emailEvents.providerId, providerId))
    return json({ received: true, updated: true })
  } catch {
    return json({ error: 'Unable to process signed email event.' }, 400)
  }
}
export const config: Config = { path: '/api/webhooks/resend' }
