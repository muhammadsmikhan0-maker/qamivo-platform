import { and, eq, inArray } from 'drizzle-orm'
import { database } from '../../db/index.js'
import { emailEvents } from '../../db/schema.js'

export type EmailSendStatus = 'sent' | 'failed' | 'not_configured'

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[char] || char)
}

export function brandedNoticeHtml(title: string, message: string, actionUrl: string) {
  const safeTitle = escapeHtml(title)
  const safeMessage = escapeHtml(message)
  const safeUrl = escapeHtml(actionUrl)
  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#f6f8fa;font-family:Arial,Helvetica,sans-serif;color:#122238">
  <div style="max-width:600px;margin:24px auto;padding:24px">
    <div style="background:#071526;color:#fff;border-radius:12px;padding:22px 24px">
      <div style="font-size:12px;letter-spacing:2px;color:#22d3ee;font-weight:700">QAMIVO</div>
      <h1 style="font-size:24px;line-height:1.25;margin:14px 0 0">${safeTitle}</h1>
    </div>
    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:24px;margin-top:14px">
      <p style="font-size:16px;line-height:1.6;white-space:pre-wrap">${safeMessage}</p>
      <p><a href="${safeUrl}" style="display:inline-block;background:#087fba;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:700">Open Qamivo</a></p>
      <p style="font-size:12px;line-height:1.6;color:#657283">This is an automated Qamivo notification. Do not reply with passwords or verification codes.</p>
    </div>
  </div>
</body></html>`
}

export async function sendTransactionalEmail(input: {
  to: string
  subject: string
  html: string
  eventType: string
  idempotencyKey: string
}): Promise<{ status: EmailSendStatus; providerId?: string }> {
  const db = database()
  const eventId = crypto.randomUUID()
  const recipient = input.to.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
    await db.insert(emailEvents).values({
      id: eventId, eventType: input.eventType, recipient: recipient.slice(0, 254),
      status: 'failed', errorCode: 'invalid_recipient',
    })
    return { status: 'failed' }
  }

  const [suppression] = await db.select({ id: emailEvents.id, status: emailEvents.status })
    .from(emailEvents)
    .where(and(
      eq(emailEvents.recipient, recipient),
      inArray(emailEvents.status, ['bounced', 'complained']),
    ))
    .limit(1)
  if (suppression) {
    await db.insert(emailEvents).values({
      id: eventId, eventType: input.eventType, recipient,
      status: 'failed', errorCode: `recipient_suppressed_${suppression.status}`,
    })
    return { status: 'failed' }
  }

  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.QAMIVO_FROM_EMAIL
  await db.insert(emailEvents).values({
    id: eventId, eventType: input.eventType, recipient,
    status: 'pending',
  })

  if (!apiKey || !from) {
    await db.update(emailEvents).set({
      status: 'not_configured', errorCode: !apiKey ? 'missing_RESEND_API_KEY' : 'missing_QAMIVO_FROM_EMAIL',
    }).where(eq(emailEvents.id, eventId))
    return { status: 'not_configured' }
  }

  let lastError = 'provider_error'
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': input.idempotencyKey.slice(0, 256),
        },
        body: JSON.stringify({
          from, to: [recipient], subject: input.subject, html: input.html,
          headers: { 'X-Qamivo-Event': input.eventType.slice(0, 100) },
        }),
        signal: AbortSignal.timeout(10000),
      })
      const payload = await response.json().catch(() => ({})) as { id?: string }
      if (response.ok && payload.id) {
        await db.update(emailEvents).set({
          status: 'sent', providerId: payload.id, errorCode: null,
        }).where(eq(emailEvents.id, eventId))
        return { status: 'sent', providerId: payload.id }
      }
      if (response.status === 429) {
        lastError = 'provider_rate_limited'
        if (attempt === 0) await new Promise((resolve) => setTimeout(resolve, 500))
        continue
      }
      lastError = response.status >= 500 ? 'provider_temporary_error' : `provider_http_${response.status}`
      if (response.status < 500) break
      if (attempt === 0) await new Promise((resolve) => setTimeout(resolve, 300))
    } catch {
      lastError = 'provider_network_error'
    }
  }
  await db.update(emailEvents).set({ status: 'failed', errorCode: lastError })
    .where(eq(emailEvents.id, eventId))
  return { status: 'failed' }
}
