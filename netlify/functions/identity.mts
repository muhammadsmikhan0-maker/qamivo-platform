import type { Config } from '@netlify/functions'
import { and, eq, gte } from 'drizzle-orm'
import { database } from '../../db/index.js'
import { emailEvents } from '../../db/schema.js'
import { brandedNoticeHtml, sendTransactionalEmail } from '../shared/transactional-email.mjs'

type IdentityEventUser = {
  id: string
  email?: string | null
  confirmedAt?: string | null
}
type IdentityEvent = { user: IdentityEventUser }

const appUrl = () => process.env.QAMIVO_APP_URL || 'https://qamivo-platform.netlify.app'

export default {
  async userSignup(event: IdentityEvent) {
    const user = event.user
    if (!user.id || !user.email || !user.confirmedAt) return
    await sendTransactionalEmail({
      to: user.email,
      subject: 'Welcome to Qamivo',
      html: brandedNoticeHtml(
        'Welcome to Qamivo',
        'Your email is confirmed. Complete your profile, explore opportunities, and keep your account details secure.',
        `${appUrl()}/account`,
      ),
      eventType: 'account.welcome',
      idempotencyKey: `account-welcome/${user.id}`,
    }).catch(() => ({ status: 'failed' as const }))
  },

  async userLogin(event: IdentityEvent) {
    const user = event.user
    if (!user.id || !user.email || !user.confirmedAt) return

    // Avoid sending a security email on every refresh or repeated sign-in.
    const recentCutoff = new Date(Date.now() - 6 * 60 * 60 * 1000)
    const [recent] = await database()
      .select({ id: emailEvents.id })
      .from(emailEvents)
      .where(and(
        eq(emailEvents.recipient, user.email.trim().toLowerCase()),
        eq(emailEvents.eventType, 'account.security_login'),
        gte(emailEvents.createdAt, recentCutoff),
      ))
      .limit(1)
    if (recent) return

    await sendTransactionalEmail({
      to: user.email,
      subject: 'New sign-in to your Qamivo account',
      html: brandedNoticeHtml(
        'New sign-in',
        'A sign-in to your Qamivo account was recorded. If this was not you, use account recovery to secure your account and contact Qamivo support.',
        `${appUrl()}/forgot-password`,
      ),
      eventType: 'account.security_login',
      idempotencyKey: `account-security-login/${user.id}/${Math.floor(Date.now() / (6 * 60 * 60 * 1000))}`,
    }).catch(() => ({ status: 'failed' as const }))
  },
}

export const config: Config = { background: true }
