import { getUser } from '@netlify/identity'
import type { Config } from '@netlify/functions'
import { brandedNoticeHtml, sendTransactionalEmail } from '../shared/transactional-email.mjs'

function json(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
  })
}

export default async (req: Request) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405)
  const url = new URL(req.url)
  if (req.headers.get('origin') !== url.origin) {
    return json({ error: 'Same-origin requests are required.' }, 403)
  }

  const user = await getUser()
  if (!user || !user.confirmedAt || !user.email) {
    return json({ error: 'Sign in with a verified Qamivo account first.' }, 401)
  }

  const adminEmail = process.env.QAMIVO_ADMIN_EMAIL?.trim().toLowerCase()
  if (!adminEmail || user.email.trim().toLowerCase() !== adminEmail) {
    return json({ error: 'This test is restricted to the configured Qamivo administrator account.' }, 403)
  }

  try {
    const base = process.env.QAMIVO_APP_URL || 'https://qamivo-platform.netlify.app'
    const result = await sendTransactionalEmail({
      to: user.email,
      subject: 'Qamivo transactional email configuration test',
      html: brandedNoticeHtml(
        'Email test',
        'Qamivo reached its configured transactional email provider. This confirms provider API acceptance only; final inbox delivery is confirmed separately by a signed delivery webhook.',
        `${base}/dashboard`,
      ),
      eventType: 'admin.email_test',
      idempotencyKey: `admin-email-test/${user.id}/${Math.floor(Date.now() / 60000)}`,
    })
    if (result.status === 'sent') {
      return json({
        accepted: true,
        providerId: result.providerId,
        message: 'The provider accepted the test email. This is not yet proof of inbox delivery; check the signed delivery webhook status.',
      })
    }
    if (result.status === 'not_configured') {
      return json({
        accepted: false,
        status: result.status,
        message: 'Email provider configuration is missing. Set RESEND_API_KEY and QAMIVO_FROM_EMAIL in Netlify function-scoped environment variables, then redeploy.',
      }, 503)
    }
    return json({
      accepted: false,
      status: result.status,
      message: 'The provider rejected or could not accept this email. Check the email delivery event log and provider dashboard; no success was reported.',
    }, 502)
  } catch {
    return json({ accepted: false, message: 'The email test failed unexpectedly. No success was reported.' }, 502)
  }
}

export const config: Config = { path: '/api/email/test' }
