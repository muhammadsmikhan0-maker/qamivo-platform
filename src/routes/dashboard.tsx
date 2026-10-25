import { createFileRoute } from '@tanstack/react-router'
import { useCallback, useEffect, useState } from 'react'
import { PageIntro } from '@/components/marketplace/layout'
import { MemberGate } from '@/components/marketplace/auth'
import { Feedback, Empty } from '@/components/marketplace/common'
import { useApi, privateHead, money, type Workspace } from '@/lib/marketplace'
export const Route = createFileRoute('/dashboard')({
  head: privateHead,
  component: () => (
    <main className="wrap page-main">
      <PageIntro eyebrow="FROM AMBITION TO ACTION" title="Your workspace.">
        Manage the projects you post and follow the proposals you submit. All
        records here belong to your account.
      </PageIntro>
      <MemberGate>
        <WorkspacePage />
      </MemberGate>
    </main>
  ),
})
function WorkspacePage() {
  const result = useApi<Workspace>('me')
  return (
    <>
      <Feedback {...result} />
      {result.data && !result.loading && !result.error && (
        <>
          <div className="inline-actions">
            <a className="button" href="/jobs/new">
              Post a project
            </a>
            <a className="button secondary" href="/jobs">
              Find work
            </a>
            <a className="text-link" href="/account">
              {result.data.profile ? 'Edit profile' : 'Create your profile'} →
            </a>
          </div>
          <MessagingPanel
            jobOptions={Array.from(new Map([
              ...result.data.jobs.map((job) => [job.id, { id: job.id, title: job.title }] as const),
              ...result.data.proposals.filter((proposal) => !!proposal.jobId).map((proposal) => [proposal.jobId!, { id: proposal.jobId!, title: proposal.title || 'Project conversation' }] as const),
            ]).values())}
          />
          <h2 style={{ marginTop: 35 }}>Your projects</h2>
          {!result.data.jobs.length ? (
            <Empty
              title="Give your next idea a brief"
              href="/jobs/new"
              label="Post a project"
            >
              You haven’t posted a project yet. Share the goal, budget and
              deliverables to start receiving proposals.
            </Empty>
          ) : (
            <div className="record-list">
              {result.data.jobs.map((j) => (
                <a className="record" key={j.id} href={'/jobs/' + j.id}>
                  <span className="pill">{j.status}</span>
                  <h3>{j.title}</h3>
                  <div className="meta">
                    <span>{money(j.budget, j.currency)}</span>
                    <span>View brief & review proposals →</span>
                  </div>
                </a>
              ))}
            </div>
          )}
          <h2 style={{ marginTop: 35 }}>Your proposals</h2>
          {!result.data.proposals.length ? (
            <Empty
              title="A good fit is worth finding"
              href="/jobs"
              label="Explore projects"
            >
              Your submitted proposals appear here with their review status.
            </Empty>
          ) : (
            <div className="record-list">
              {result.data.proposals.map((p) => (
                <a className="record" key={p.id} href={'/jobs/' + p.jobId}>
                  <span className="pill">{p.status}</span>
                  <h3>{p.title}</h3>
                  <div className="meta">
                    <span>{money(p.amount, p.currency || 'USD')}</span>
                    <span>{p.days} day delivery estimate</span>
                  </div>
                </a>
              ))}
            </div>
          )}
          <div className="notice">
            Shortlisting is an expression of interest. Contracts, private
            messages, delivery and all payment processing remain planned. No
            balance or earnings are represented in this workspace.
          </div>
        </>
      )}
    </>
  )
}


type ConversationItem = {
  id: string
  subject: string
  jobId: string | null
  participantName: string
  participantUsername: string
  avatarUrl: string | null
  unreadCount: number
  lastMessage: string
  lastMessageAt: string | null
}
type ChatMessage = {
  id: string
  body: string
  senderId: string
  attachmentId: string | null
  attachmentUrl: string | null
  createdAt: string
  mine: boolean
}
async function commsRequest<T>(path: string, method = 'GET', data?: unknown): Promise<T> {
  const response = await fetch(path, {
    method,
    credentials: 'same-origin',
    headers: data === undefined ? {} : { 'Content-Type': 'application/json' },
    ...(data === undefined ? {} : { body: JSON.stringify(data) }),
  })
  const payload = await response.json().catch(() => ({})) as T & { error?: string }
  if (!response.ok) throw new Error(payload.error || 'Messaging is temporarily unavailable.')
  return payload as T
}
function MessagingPanel({ jobOptions }: { jobOptions: { id: string; title: string }[] }) {
  const [conversations, setConversations] = useState<ConversationItem[]>([])
  const [activeId, setActiveId] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [recipientUsername, setRecipientUsername] = useState('')
  const [newConversationJobId, setNewConversationJobId] = useState('')
  const [text, setText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState('')

  const refreshConversations = useCallback(async () => {
    try {
      const rows = await commsRequest<ConversationItem[]>('/api/comms/conversations')
      setConversations(rows)
      setActiveId((current) => current && rows.some((row) => row.id === current) ? current : (rows[0]?.id || ''))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load conversations.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refreshConversations()
    const timer = window.setInterval(() => void refreshConversations(), 5000)
    return () => window.clearInterval(timer)
  }, [refreshConversations])

  useEffect(() => {
    if (!file) {
      setFilePreview('')
      return
    }
    const objectUrl = URL.createObjectURL(file)
    setFilePreview(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [file])

  useEffect(() => {
    if (!activeId) {
      setMessages([])
      return
    }
    let current = true
    const loadMessages = async () => {
      try {
        const rows = await commsRequest<ChatMessage[]>(`/api/comms/conversations/${activeId}/messages`)
        if (current) setMessages(rows)
      } catch (e) {
        if (current) setError(e instanceof Error ? e.message : 'Unable to load messages.')
      }
    }
    void loadMessages()
    const timer = window.setInterval(() => void loadMessages(), 4000)
    return () => {
      current = false
      window.clearInterval(timer)
    }
  }, [activeId])

  async function createConversation(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    setError('')
    setStatus('')
    try {
      const result = await commsRequest<{ id: string }>('/api/comms/conversations', 'POST', {
        recipientUsername, jobId: newConversationJobId, subject: 'Project conversation',
      })
      setActiveId(result.id)
      setRecipientUsername('')
      setStatus('Conversation created. Messages are saved in Qamivo.')
      await refreshConversations()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to start conversation.')
    } finally {
      setPending(false)
    }
  }

  async function sendMessage(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!activeId) return
    setPending(true)
    setError('')
    setStatus('')
    try {
      let attachmentId: string | undefined
      if (file) {
        const form = new FormData()
        form.append('file', file)
        form.append('purpose', 'message_attachment')
        const uploadResponse = await fetch('/api/uploads', { method: 'POST', credentials: 'same-origin', body: form })
        const upload = await uploadResponse.json().catch(() => ({})) as { id?: string; error?: string }
        if (!uploadResponse.ok || !upload.id) throw new Error(upload.error || 'Image upload failed.')
        attachmentId = upload.id
      }
      const result = await commsRequest<ChatMessage & { emailNotifications?: string[] }>(
        `/api/comms/conversations/${activeId}/messages`, 'POST', { body: text, ...(attachmentId ? { attachmentId } : {}) },
      )
      setMessages((current) => [...current, result])
      setText('')
      setFile(null)
      if (result.emailNotifications?.some((value) => value === 'not_configured' || value === 'recipient_email_unavailable')) {
        setStatus('Message saved. Email alerts are not fully configured yet; the in-app message is available.')
      } else if (result.emailNotifications?.some((value) => value === 'failed')) {
        setStatus('Message saved, but the email notification failed. Please check the email configuration.')
      } else if (result.emailNotifications?.some((value) => value === 'sent')) {
        setStatus('Message saved. The email provider accepted a notification request; final delivery needs webhook confirmation.')
      } else {
        setStatus('Message saved in the conversation.')
      }
      await refreshConversations()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to save message.')
    } finally {
      setPending(false)
    }
  }

  return (
    <section style={{ marginTop: 32 }} aria-labelledby="messages-heading">
      <h2 id="messages-heading">Messages</h2>
      <p className="muted">Messages are stored in the database. This inbox refreshes automatically every few seconds. Only project owners and freelancers who have submitted a proposal for that project can start or access a conversation.</p>
      <div className="detail-grid">
        <aside className="detail-side">
          <h3>Conversations</h3>
          {loading && <p className="muted" role="status">Loading conversations…</p>}
          {!loading && !conversations.length && <p className="muted">No conversations yet.</p>}
          <div className="record-list">
            {conversations.map((item) => (
              <button
                type="button"
                key={item.id}
                className={activeId === item.id ? 'record' : 'record'}
                onClick={() => { setActiveId(item.id); setError(''); setStatus('') }}
                aria-pressed={activeId === item.id}
                style={{ textAlign: 'left', width: '100%', cursor: 'pointer', border: activeId === item.id ? '2px solid #087fba' : undefined, background: activeId === item.id ? '#f2f8fc' : undefined }}
              >
                <strong>{item.participantName}</strong>
                <span className="pill">{item.unreadCount ? `${item.unreadCount} unread` : 'Conversation'}</span>
                <div className="meta"><span>{item.lastMessage || item.subject}</span></div>
              </button>
            ))}
          </div>
          <h3 style={{ marginTop: 24 }}>Start a conversation</h3>
          <form onSubmit={createConversation} className="form-grid">
            <div className="full">
              <label htmlFor="message-job">Project you own or applied to</label>
              <select className="field" id="message-job" value={newConversationJobId} onChange={(e) => setNewConversationJobId(e.target.value)} required>
                <option value="">Choose a project</option>
                {jobOptions.map((job) => <option key={job.id} value={job.id}>{job.title}</option>)}
              </select>
            </div>
            <div className="full">
              <label htmlFor="message-recipient">Other member’s public username</label>
              <input className="field" id="message-recipient" value={recipientUsername} onChange={(e) => setRecipientUsername(e.target.value)} pattern="[a-z0-9]+(-[a-z0-9]+)*" minLength={3} maxLength={32} placeholder="member-username" required />
            </div>
            <button className="button" disabled={pending || !jobOptions.length}>Start conversation</button>
          </form>
          {!jobOptions.length && <p className="muted">Post a project or submit a proposal first to enable project-linked messaging.</p>}
        </aside>
        <div className="detail-main">
          {activeId ? (
            <>
              <h3>{conversations.find((item) => item.id === activeId)?.participantName || 'Conversation'}</h3>
              <div aria-live="polite" aria-label="Conversation messages" style={{ display: 'grid', gap: 12, maxHeight: 440, overflowY: 'auto', padding: 12, border: '1px solid #dbe4ee', borderRadius: 12, background: '#f8fafc' }}>
                {!messages.length && <p className="muted">No messages yet. Start the conversation below.</p>}
                {messages.map((message) => (
                  <article key={message.id} style={{ justifySelf: message.mine ? 'end' : 'start', width: 'min(100%, 420px)', background: message.mine ? '#e4f3fb' : '#fff', border: '1px solid #dbe4ee', borderRadius: 10, padding: 12 }}>
                    <p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', marginTop: 0 }}>{message.body}</p>
                    {message.attachmentUrl && <img src={message.attachmentUrl} alt="Image attachment in conversation" style={{ display: 'block', maxWidth: '100%', maxHeight: 260, objectFit: 'contain', borderRadius: 8 }} />}
                    <p className="muted" style={{ fontSize: 12, marginBottom: 0 }}>{message.mine ? 'You' : 'Member'} · {new Date(message.createdAt).toLocaleString()}</p>
                  </article>
                ))}
              </div>
              <form onSubmit={sendMessage} style={{ marginTop: 14, display: 'grid', gap: 10 }}>
                <label htmlFor="chat-message">Your message</label>
                <textarea className="field" id="chat-message" value={text} onChange={(e) => setText(e.target.value)} maxLength={4000} rows={3} placeholder="Write a clear, professional message…" />
                <label htmlFor="chat-attachment">Attach an image (optional, max 5 MB)</label>
                <input className="field" type="file" id="chat-attachment" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(e) => setFile(e.currentTarget.files?.[0] || null)} />
                {filePreview && <img src={filePreview} alt="Selected image preview; not yet uploaded" style={{ maxWidth: 180, maxHeight: 140, objectFit: 'contain', borderRadius: 8 }} />}
                <p className="muted">Images are validated and stored privately. The message and image become part of the conversation only after sending.</p>
                <button className="button" disabled={pending || (!text.trim() && !file)}>{pending ? 'Sending…' : 'Send message'}</button>
              </form>
            </>
          ) : (
            <div className="notice">Choose an existing conversation, or start one after you have a project relationship.</div>
          )}
        </div>
      </div>
      {error && <div className="notice error" role="alert" style={{ marginTop: 12 }}>{error}</div>}
      {status && <div className="notice" role="status" style={{ marginTop: 12 }}>{status}</div>}
    </section>
  )
}
