import { describe, expect, it } from 'vitest'
import { brandedNoticeHtml } from '../netlify/shared/transactional-email.mts'

describe('transactional email template', () => {
  it('escapes untrusted message and title content', () => {
    const html = brandedNoticeHtml(
      '<script>bad()</script>',
      '<img src=x onerror=alert(1)>',
      'https://qamivo-platform.netlify.app/dashboard?name="unsafe"',
    )
    expect(html).not.toContain('<script>bad()</script>')
    expect(html).not.toContain('<img src=x onerror=alert(1)>')
    expect(html).toContain('&lt;script&gt;bad()&lt;/script&gt;')
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;')
    expect(html).toContain('&quot;unsafe&quot;')
  })

  it('uses the Qamivo branded template and responsive viewport', () => {
    const html = brandedNoticeHtml('Welcome', 'Your profile is ready.', 'https://qamivo-platform.netlify.app/dashboard')
    expect(html).toContain('QAMIVO')
    expect(html).toContain('name="viewport"')
    expect(html).toContain('Welcome')
    expect(html).toContain('Open Qamivo')
  })
})
