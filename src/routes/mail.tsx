import { createFileRoute } from '@tanstack/react-router'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Activity, AlertTriangle, Check, Copy, Globe, KeyRound,
  Mail, Plus, RefreshCw, Send, ShieldCheck, Terminal, Trash2,
} from 'lucide-react'
import { MemberGate } from '@/components/marketplace/auth'
import { PageIntro } from '@/components/marketplace/layout'
import { privateHead } from '@/lib/marketplace'

export const Route = createFileRoute('/mail')({
  head: privateHead,
  component: MailPage,
})

type ApiKey = {
  id: string
  name: string
  prefix: string
  createdAt: string
  lastUsedAt: string | null
  revokedAt: string | null
}
type DnsRecord = {
  type?: string
  name?: string
  record?: string
  value?: string
  ttl?: string | number
  status?: string
  priority?: number
}
type MailDomain = {
  id: string
  domain: string
  status: string
  dnsRecords: DnsRecord[]
  createdAt: string
  lastCheckedAt: string | null
}
type MailEmail = {
  id: string
  providerId: string | null
  from: string
  to: string[]
  subject: string
  status: string
  errorCode: string | null
  createdAt: string
}
type MailDashboard = {
  provider: { name: string; configured: boolean }
  transactionalSenderConfigured: boolean
  stats: {
    activeKeys: number
    domains: number
    verifiedDomains: number
    emails: number
    accepted: number
    failed: number
  }
  keys: ApiKey[]
  domains: MailDomain[]
  emails: MailEmail[]
}
type Tab = 'overview' | 'domains' | 'keys' | 'logs' | 'docs'

async function mailRequest<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(path, {
    method,
    credentials: 'same-origin',
    headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
  const payload = await response.json().catch(() => ({})) as T & { error?: string | { message?: string } }
  if (!response.ok) {
    const error = typeof payload.error === 'string' ? payload.error : payload.error?.message
    throw new Error(error || 'Qamivo Mail could not complete that request.')
  }
  return payload as T
}

function MailPage() {
  return (
    <main className="wrap page-main mail-page">
      <PageIntro eyebrow="DEVELOPER EMAIL INFRASTRUCTURE" title="Qamivo Mail.">
        A simple, developer-friendly email API for your products. Send through a real delivery provider, verify your own domain, and inspect message status in one workspace.
      </PageIntro>
      <MemberGate>
        <MailConsole />
      </MemberGate>
    </main>
  )
}

function MailConsole() {
  const [data, setData] = useState<MailDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [tab, setTab] = useState<Tab>('overview')
  const [keyName, setKeyName] = useState('Production')
  const [revealedKey, setRevealedKey] = useState('')
  const [domainName, setDomainName] = useState('')
  const [testFrom, setTestFrom] = useState('')
  const [testTo, setTestTo] = useState('')
  const [busyId, setBusyId] = useState('')
  const [pending, setPending] = useState(false)

  const refresh = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true)
    else setLoading(true)
    try {
      const result = await mailRequest<MailDashboard>('/api/mail/dashboard')
      setData(result)
      setError('')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load Qamivo Mail.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { void refresh() }, [refresh])

  const verifiedDomains = useMemo(() => data?.domains.filter((domain) => domain.status === 'verified') || [], [data])
  const generatedCurl = [
    'curl -X POST https://qamivo-platform.netlify.app/api/mail/v1/emails',
    '  -H "Authorization: Bearer qm_live_YOUR_API_KEY"',
    '  -H "Content-Type: application/json"',
    '  -H "Idempotency-Key: order-123-welcome"',
    "  -d '{\"from\":\"hello@your-verified-domain.com\",\"to\":[\"customer@example.com\"],\"subject\":\"Your order is confirmed\",\"text\":\"Thank you for your order.\"}'",
  ].join('\\n')

  async function action<T>(run: () => Promise<T>, successMessage: string, after?: (value: T) => void) {
    setPending(true)
    setError('')
    setNotice('')
    try {
      const value = await run()
      after?.(value)
      await refresh(true)
      setNotice(successMessage)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The request failed.')
    } finally {
      setPending(false)
    }
  }

  async function createKey(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await action(
      () => mailRequest<{ key: string; apiKey: ApiKey }>('/api/mail/keys', 'POST', { name: keyName }),
      'API key created. Copy it now; the complete value is only shown once.',
      (result) => setRevealedKey(result.key),
    )
  }

  async function addDomain(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await action(
      () => mailRequest<MailDomain>('/api/mail/domains', 'POST', { domain: domainName }),
      'Domain added. Publish the exact DNS records below, then run verification.',
      (result) => {
        setDomainName('')
        setTab('domains')
        if (result.status === 'verified') setNotice('Domain is verified and ready to use.')
      },
    )
  }

  async function verifyDomain(domain: MailDomain) {
    setBusyId(domain.id)
    await action(
      () => mailRequest<MailDomain>('/api/mail/domains/' + domain.id + '/verify', 'POST', {}),
      'Domain verification request completed. Use the status and DNS checks below to confirm readiness.',
    )
    setBusyId('')
  }

  async function revokeKey(key: ApiKey) {
    if (!window.confirm('Revoke the API key "' + key.name + '"? Applications using it will stop sending.')) return
    await action(
      () => mailRequest<{ revoked: boolean }>('/api/mail/keys/' + key.id, 'DELETE'),
      'API key revoked.',
      () => { if (revealedKey.startsWith(key.prefix)) setRevealedKey('') },
    )
  }

  async function sendTest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await action(
      () => mailRequest<{ id: string; providerId: string | null }>('/api/mail/test', 'POST', { from: testFrom, to: testTo }),
      'The provider accepted the test request. Check the Logs tab and the recipient mailbox; acceptance does not guarantee inbox delivery.',
    )
  }

  async function copyKey() {
    try {
      await navigator.clipboard.writeText(revealedKey)
      setNotice('API key copied to clipboard. Save it in your application secret store.')
    } catch {
      setError('Clipboard access was blocked. Select the key text and copy it manually.')
    }
  }

  if (loading) {
    return <div className="loading-state" role="status"><span className="sr-only">Loading Qamivo Mail…</span></div>
  }

  if (!data && error) {
    return <div className="notice error" role="alert">{error} <button className="mail-inline-button" onClick={() => void refresh()}>Retry</button></div>
  }

  return (
    <div className="mail-console">
      <aside className="mail-sidebar" aria-label="Qamivo Mail navigation">
        <div className="mail-brand"><span className="mail-brand-mark"><Mail size={19} /></span><div><strong>qamivo mail</strong><small>EMAIL API</small></div></div>
        <div className="mail-nav-label">WORKSPACE</div>
        <nav className="mail-nav">
          <button className={tab === 'overview' ? 'active' : ''} onClick={() => setTab('overview')}><Activity size={17} /> Overview</button>
          <button className={tab === 'domains' ? 'active' : ''} onClick={() => setTab('domains')}><Globe size={17} /> Domains <span>{data?.domains.length || 0}</span></button>
          <button className={tab === 'keys' ? 'active' : ''} onClick={() => setTab('keys')}><KeyRound size={17} /> API keys <span>{data?.stats.activeKeys || 0}</span></button>
          <button className={tab === 'logs' ? 'active' : ''} onClick={() => setTab('logs')}><Mail size={17} /> Email logs</button>
          <button className={tab === 'docs' ? 'active' : ''} onClick={() => setTab('docs')}><Terminal size={17} /> API reference</button>
        </nav>
        <div className="mail-sidebar-bottom">
          <ShieldCheck size={17} />
          <span>Keys are stored as hashes. Full API credentials are shown only once.</span>
        </div>
      </aside>

      <section className="mail-main">
        <header className="mail-toolbar">
          <div><span className="mail-breadcrumb">Qamivo / Mail /</span><strong>{tab === 'overview' ? 'Overview' : tab === 'domains' ? 'Domains' : tab === 'keys' ? 'API keys' : tab === 'logs' ? 'Email logs' : 'API reference'}</strong></div>
          <button className="mail-refresh" onClick={() => void refresh(true)} disabled={refreshing} aria-label="Refresh data"><RefreshCw size={16} className={refreshing ? 'mail-spinning' : ''} /> Refresh</button>
        </header>

        {error && <div className="notice error" role="alert">{error}</div>}
        {notice && <div className="notice success" role="status">{notice}</div>}

        {!data?.provider.configured && (
          <div className="mail-warning"><AlertTriangle size={20} /><div><strong>Sending provider is not configured</strong><p>Add RESEND_API_KEY as a secret in Netlify Function environment variables and redeploy. Qamivo Mail will not claim a message was sent until the provider accepts it.</p></div></div>
        )}

        {tab === 'overview' && data && (
          <>
            <div className="mail-heading-row"><div><div className="eyebrow blue">YOUR EMAIL INFRASTRUCTURE</div><h2>Overview</h2><p>Monitor sending readiness, manage credentials, and confirm delivery events.</p></div><span className={'mail-provider-pill ' + (data.provider.configured ? 'ready' : 'blocked')}><span /> Resend {data.provider.configured ? 'connected' : 'not configured'}</span></div>
            <div className="mail-stat-grid">
              <MailStat label="API keys" value={String(data.stats.activeKeys)} detail="Active credentials" icon={<KeyRound size={18} />} />
              <MailStat label="Verified domains" value={String(data.stats.verifiedDomains)} detail={data.stats.domains + ' total domains'} icon={<Globe size={18} />} />
              <MailStat label="Messages logged" value={String(data.stats.emails)} detail="Recent 50 API messages" icon={<Mail size={18} />} />
              <MailStat label="Provider issues" value={String(data.stats.failed)} detail="Failed, bounced or complained" icon={<AlertTriangle size={18} />} />
            </div>
            <section className="mail-card">
              <div className="mail-card-title"><div><h3>Get started</h3><p>Set up a sender domain, then create a Qamivo Mail key.</p></div><span className="mail-icon-box"><ShieldCheck size={20} /></span></div>
              <div className="mail-checklist">
                <div><span className={data.provider.configured ? 'complete' : ''}>{data.provider.configured ? <Check size={15} /> : '1'}</span><div><strong>Connect the delivery provider</strong><p>{data.provider.configured ? 'Resend API is available to server functions.' : 'Add RESEND_API_KEY in Netlify; keep its value secret.'}</p></div></div>
                <div><span className={data.stats.verifiedDomains > 0 ? 'complete' : ''}>{data.stats.verifiedDomains > 0 ? <Check size={15} /> : '2'}</span><div><strong>Verify your sending domain</strong><p>{data.stats.verifiedDomains > 0 ? 'At least one domain is verified.' : 'Add a domain and publish the exact SPF/DKIM records provided by Resend.'}</p><button className="mail-text-action" onClick={() => setTab('domains')}>Manage domains →</button></div></div>
                <div><span className={data.stats.activeKeys > 0 ? 'complete' : ''}>{data.stats.activeKeys > 0 ? <Check size={15} /> : '3'}</span><div><strong>Create an application API key</strong><p>Use this key in your server-side code to call the Qamivo Mail API.</p><button className="mail-text-action" onClick={() => setTab('keys')}>Manage API keys →</button></div></div>
              </div>
            </section>
            <section className="mail-card">
              <div className="mail-card-title"><div><h3>Send a delivery test</h3><p>Only available for a sender address on your verified domain.</p></div><Send size={20} /></div>
              {verifiedDomains.length ? (
                <form className="mail-test-form" onSubmit={sendTest}>
                  <div><label htmlFor="mail-test-from">Sender email</label><input id="mail-test-from" className="field" type="email" value={testFrom} onChange={(e) => setTestFrom(e.target.value)} placeholder={'hello@' + verifiedDomains[0].domain} required /></div>
                  <div><label htmlFor="mail-test-to">Recipient email</label><input id="mail-test-to" className="field" type="email" value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="you@example.com" required /></div>
                  <button className="button" disabled={pending || !data.provider.configured}>{pending ? 'Sending…' : 'Send test email'}</button>
                </form>
              ) : <p className="muted">Add and verify a domain before sending a test email.</p>}
              {!data.transactionalSenderConfigured && <p className="muted">Note: Qamivo’s own account-verification emails separately require QAMIVO_FROM_EMAIL and QAMIVO_OTP_SECRET.</p>}
            </section>
            <section className="mail-card">
              <div className="mail-card-title"><div><h3>Recent email activity</h3><p>Provider acceptance is not the same as final inbox delivery.</p></div><button className="mail-text-action" onClick={() => setTab('logs')}>View logs →</button></div>
              <EmailTable emails={(data.emails || []).slice(0, 5)} />
            </section>
          </>
        )}

        {tab === 'domains' && data && (
          <>
            <div className="mail-heading-row"><div><div className="eyebrow blue">SENDER AUTHENTICATION</div><h2>Domains</h2><p>Add a domain you control. Only verified domains can be used as a sender.</p></div></div>
            <section className="mail-card">
              <h3>Add a sending domain</h3><p className="muted">Qamivo asks Resend to register this domain and displays the exact DNS records returned by the provider.</p>
              <form className="mail-domain-form" onSubmit={addDomain}><input className="field" type="text" autoCapitalize="none" spellCheck={false} value={domainName} onChange={(e) => setDomainName(e.target.value)} placeholder="example.com" aria-label="Domain name" required /><button className="button" disabled={pending || !data.provider.configured}><Plus size={16} /> Add domain</button></form>
              {!data.provider.configured && <p className="muted">Configure RESEND_API_KEY before adding domains.</p>}
            </section>
            {!data.domains.length ? <div className="empty-state"><Globe size={28} /><h3>No domains yet</h3><p>Add a domain to receive provider-generated DNS instructions.</p></div> : data.domains.map((domain) => (
              <section className="mail-card" key={domain.id}>
                <div className="mail-domain-head"><div><h3>{domain.domain}</h3><p className="muted">Added {new Date(domain.createdAt).toLocaleString()}</p></div><StatusPill status={domain.status} /><button className="button secondary small" disabled={pending || busyId === domain.id || !data.provider.configured} onClick={() => void verifyDomain(domain)}><RefreshCw size={15} /> {busyId === domain.id ? 'Checking…' : 'Verify DNS'}</button></div>
                <p className="muted">Publish the record details at your domain’s authoritative DNS provider. Keep existing mail records; add only the records shown here.</p>
                <DnsTable records={domain.dnsRecords} />
              </section>
            ))}
          </>
        )}

        {tab === 'keys' && data && (
          <>
            <div className="mail-heading-row"><div><div className="eyebrow blue">AUTHENTICATION</div><h2>API keys</h2><p>Issue keys for your applications. The full secret is displayed only once and is stored only as a hash.</p></div></div>
            <section className="mail-card">
              <h3>Create an API key</h3>
              <form className="mail-domain-form" onSubmit={createKey}><input className="field" value={keyName} onChange={(e) => setKeyName(e.target.value)} maxLength={80} placeholder="Production" aria-label="API key name" required /><button className="button" disabled={pending}><Plus size={16} /> Create key</button></form>
              {revealedKey && <div className="mail-secret-reveal"><div><AlertTriangle size={18} /><strong>Copy this key now. You will not be able to see it again.</strong></div><code>{revealedKey}</code><button className="button secondary small" onClick={() => void copyKey()}><Copy size={15} /> Copy key</button></div>}
            </section>
            <section className="mail-card">
              <h3>Your API keys</h3>
              {!data.keys.length ? <p className="muted">You have not created any keys.</p> : <div className="mail-table-wrap"><table className="mail-table"><thead><tr><th>Name</th><th>Key prefix</th><th>Created</th><th>Last used</th><th>Status</th><th /></tr></thead><tbody>{data.keys.map((key) => <tr key={key.id}><td><strong>{key.name}</strong></td><td><code>{key.prefix}…</code></td><td>{new Date(key.createdAt).toLocaleDateString()}</td><td>{key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleString() : 'Never'}</td><td><StatusPill status={key.revokedAt ? 'revoked' : 'active'} /></td><td>{!key.revokedAt && <button className="mail-icon-button danger" title="Revoke key" aria-label={'Revoke ' + key.name} disabled={pending} onClick={() => void revokeKey(key)}><Trash2 size={16} /></button>}</td></tr>)}</tbody></table></div>}
            </section>
            <div className="mail-warning"><ShieldCheck size={20} /><div><strong>Keep API keys server-side</strong><p>Never embed a Qamivo Mail key in browser code, public repositories, or a mobile app bundle. Revoke any key that may have been exposed.</p></div></div>
          </>
        )}

        {tab === 'logs' && data && (
          <>
            <div className="mail-heading-row"><div><div className="eyebrow blue">OBSERVABILITY</div><h2>Email logs</h2><p>Recent message requests, provider IDs, and webhook-updated delivery state.</p></div></div>
            <section className="mail-card"><EmailTable emails={data.emails || []} /></section>
            <p className="muted">A status of “accepted” means Resend accepted the request. “Delivered” is shown only after a valid provider webhook updates the message.</p>
          </>
        )}

        {tab === 'docs' && (
          <>
            <div className="mail-heading-row"><div><div className="eyebrow blue">DEVELOPER DOCUMENTATION</div><h2>Send your first email</h2><p>Use the Qamivo Mail key from a trusted server. This endpoint never exposes the Resend key to your application.</p></div></div>
            <section className="mail-card"><h3>Endpoint</h3><div className="mail-code-line"><span>POST</span> https://qamivo-platform.netlify.app/api/mail/v1/emails</div><h3>Authentication</h3><p className="muted">Send your Qamivo Mail key as a Bearer token in the Authorization header. The key must be active and the sender domain must be verified in the same workspace.</p><h3>Example with cURL</h3><pre className="mail-code">{generatedCurl}</pre><h3>Request fields</h3><div className="mail-table-wrap"><table className="mail-table"><thead><tr><th>Field</th><th>Type</th><th>Requirement</th></tr></thead><tbody><tr><td><code>from</code></td><td>Email address</td><td>Required; sender domain must be verified</td></tr><tr><td><code>to</code></td><td>Array of email addresses</td><td>Required; up to 10 recipients</td></tr><tr><td><code>subject</code></td><td>String</td><td>Required; up to 180 characters</td></tr><tr><td><code>html</code></td><td>HTML string</td><td>Optional; up to 40 KB</td></tr><tr><td><code>text</code></td><td>Plain text</td><td>Optional; up to 10 KB</td></tr><tr><td><code>Idempotency-Key</code></td><td>Header</td><td>Optional; prevents duplicate sends for the same key and request</td></tr></tbody></table></div><h3>Response</h3><pre className="mail-code">{'{"id":"Qamivo message ID","provider_id":"Resend email ID","status":"accepted","replayed":false}'}</pre><p className="muted">The ID shown to your application is Qamivo’s message record. Provider acceptance is not a guarantee of inbox delivery. Signed delivery webhooks update the log status.</p></section>
            <section className="mail-card"><h3>Error responses</h3><div className="mail-doc-error"><code>401</code><span>Missing, invalid, or revoked Qamivo Mail API key.</span></div><div className="mail-doc-error"><code>403</code><span>Sender domain does not belong to the workspace or is not verified.</span></div><div className="mail-doc-error"><code>409</code><span>An idempotency key was reused with a different message body.</span></div><div className="mail-doc-error"><code>422</code><span>Invalid message fields or body size.</span></div><div className="mail-doc-error"><code>429</code><span>Provider rate limit reached.</span></div><div className="mail-doc-error"><code>502/503</code><span>Delivery provider failed or is not configured.</span></div></section>
          </>
        )}
        <footer className="mail-footer"><span><ShieldCheck size={14} /> Secure API by Qamivo</span><span>Delivery powered by Resend</span><span>Early access · No message content retained in logs</span></footer>
      </section>
    </div>
  )
}

function MailStat({ label, value, detail, icon }: { label: string; value: string; detail: string; icon: React.ReactNode }) {
  return <article className="mail-stat"><span className="mail-stat-icon">{icon}</span><span className="mail-stat-label">{label}</span><strong>{value}</strong><small>{detail}</small></article>
}

function StatusPill({ status }: { status: string }) {
  const normalized = status.toLowerCase()
  const variant = normalized === 'verified' || normalized === 'active' || normalized === 'delivered' || normalized === 'opened' || normalized === 'clicked'
    ? 'good'
    : normalized === 'failed' || normalized === 'bounced' || normalized === 'complained' || normalized === 'revoked'
      ? 'bad'
      : normalized === 'accepted' || normalized === 'sending' || normalized === 'pending' || normalized === 'not_started'
        ? 'waiting'
        : 'neutral'
  const label = normalized.replaceAll('_', ' ')
  return <span className={'mail-status ' + variant}>{label}</span>
}

function EmailTable({ emails }: { emails: MailEmail[] }) {
  if (!emails.length) return <div className="mail-empty"><Mail size={24} /><strong>No email activity yet</strong><p>Your API send requests will appear here.</p></div>
  return <div className="mail-table-wrap"><table className="mail-table"><thead><tr><th>Status</th><th>Subject</th><th>Recipient(s)</th><th>From</th><th>Time</th></tr></thead><tbody>{emails.map((email) => <tr key={email.id}><td><StatusPill status={email.status} /></td><td><strong>{email.subject}</strong>{email.errorCode && <small className="mail-error-code">{email.errorCode}</small>}</td><td>{email.to.join(', ')}</td><td>{email.from}</td><td>{new Date(email.createdAt).toLocaleString()}</td></tr>)}</tbody></table></div>
}

function DnsTable({ records }: { records: DnsRecord[] }) {
  if (!records.length) return <div className="mail-empty small"><AlertTriangle size={18} /><span>No DNS records were returned yet. Recheck the domain or review its status in the provider dashboard.</span></div>
  return <div className="mail-table-wrap"><table className="mail-table dns-table"><thead><tr><th>Type</th><th>Name / Host</th><th>Value</th><th>TTL</th><th>Provider status</th></tr></thead><tbody>{records.map((record, index) => <tr key={String(record.type || 'record') + index}><td><code>{record.type || '—'}</code></td><td><code>{record.name || record.record || '—'}</code></td><td><code className="dns-value">{record.value || '—'}</code></td><td>{record.ttl || 'Auto'}</td><td>{record.status || 'Check DNS'}</td></tr>)}</tbody></table></div>
}
