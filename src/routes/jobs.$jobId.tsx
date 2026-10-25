import { createFileRoute, notFound, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { useMember, MemberGate } from '@/components/marketplace/auth'
import { PageIntro } from '@/components/marketplace/layout'
import { Feedback } from '@/components/marketplace/common'
import {
  useApi,
  api,
  money,
  type Job,
  type Workspace,
  type Proposal,
} from '@/lib/marketplace'
import { publicJob } from '@/lib/public.functions'
export const Route = createFileRoute('/jobs/$jobId')({
  loader: async ({ params }) => {
    const job = await publicJob({ data: params.jobId })
    if (!job) throw notFound()
    return job
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: (loaderData?.title || 'Project brief') + ' | Qamivo' },
      {
        name: 'description',
        content:
          loaderData?.description.slice(0, 155) ||
          'Explore a project brief on Qamivo.',
      },
    ],
    links: loaderData
      ? [
          {
            rel: 'canonical',
            href: 'https://qamivo-platform.netlify.app/jobs/' + loaderData.id,
          },
        ]
      : [],
  }),
  component: JobDetail,
})
function JobDetail() {
  const job = Route.useLoaderData()
  const router = useRouter()
  const result = {
    data: job,
    error: '',
    reload: async () => {
      await router.invalidate()
    },
  }
  return (
    <main className="wrap page-main">
      <a className="text-link" href="/jobs">
        ← All opportunities
      </a>
      {result.data && !result.error && (
        <>
          <PageIntro
            eyebrow={'PROJECT BRIEF · ' + result.data.status.toUpperCase()}
            title={result.data.title}
          >
            {result.data.category} · Fixed project budget{' '}
            {money(result.data.budget, result.data.currency)}
          </PageIntro>
          <div className="detail-grid">
            <div>
              <article className="record">
                <h2>What this project needs</h2>
                <p>{result.data.description}</p>
              </article>
              <MemberGate>
                <ProjectActions job={result.data} reload={result.reload} />
              </MemberGate>
            </div>
            <aside className="detail-side">
              <span className="pill">
                {result.data.status === 'open'
                  ? 'Open for proposals'
                  : 'Closed'}
              </span>
              <h2>{money(result.data.budget, result.data.currency)}</h2>
              <p>Estimated fixed project budget</p>
              <p className="muted">
                Member-provided project brief. Qamivo does not guarantee the
                client’s identity, funding or suitability. Never share
                credentials or pay an application fee.
              </p>
              <a className="text-link" href="/help">
                Read our safety guidance →
              </a>
            </aside>
          </div>
        </>
      )}
    </main>
  )
}
function ProjectActions({
  job,
  reload,
}: {
  job: Job
  reload: () => Promise<void>
}) {
  const workspace = useApi<Workspace>('me')
  const { user } = useMember()
  if (workspace.loading) return <Feedback {...workspace} />
  if (workspace.error) return <Feedback {...workspace} />
  if (workspace.data?.jobs.some((j) => j.id === job.id))
    return <OwnerActions job={job} reload={reload} />
  if (workspace.data?.proposals.some((p) => p.jobId === job.id))
    return (
      <div className="notice success">
        Your proposal is recorded. Check your workspace for its review status.
      </div>
    )
  if (!user) return null
  if (job.status !== 'open')
    return (
      <div className="notice">This project is closed to new proposals.</div>
    )
  return <ProposalForm job={job} />
}
function ProposalForm({ job }: { job: Job }) {
  const [pending, setPending] = useState(false),
    [error, setError] = useState(''),
    [done, setDone] = useState(false)
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    setPending(true)
    setError('')
    try {
      await api('jobs/' + job.id + '/proposals', 'POST', Object.fromEntries(f))
      setDone(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to submit proposal.')
    } finally {
      setPending(false)
    }
  }
  if (done)
    return (
      <div className="notice success" role="status">
        Your proposal is saved. The project owner can review it in their
        workspace. No contract or payment has been created.
      </div>
    )
  return (
    <form className="form-panel" style={{ marginTop: 25 }} onSubmit={submit}>
      <h2>Make your proposal.</h2>
      <p className="muted">
        Create your{' '}
        <a className="text-link" href="/account">
          professional profile
        </a>{' '}
        before applying. You can submit once per project.
      </p>
      <div className="form-grid">
        <div className="full">
          <label htmlFor="proposal-letter">Approach and scope</label>
          <textarea
            className="field"
            id="proposal-letter"
            name="coverLetter"
            required
            minLength={60}
            maxLength={6000}
          />
        </div>
        <div>
          <label htmlFor="proposal-amount">
            Your fixed price ({job.currency})
          </label>
          <input
            id="proposal-amount"
            className="field"
            name="amount"
            type="number"
            min={1}
            max={10000000}
            step={1}
            required
          />
        </div>
        <div>
          <label htmlFor="proposal-days">Delivery estimate (days)</label>
          <input
            id="proposal-days"
            className="field"
            name="days"
            type="number"
            min={1}
            max={730}
            step={1}
            required
          />
        </div>
      </div>
      {error && (
        <div className="notice error" role="alert">
          {error}
        </div>
      )}
      <button className="button" disabled={pending}>
        {pending ? 'Submitting…' : 'Submit proposal'}
      </button>
    </form>
  )
}
function OwnerActions({
  job,
  reload,
}: {
  job: Job
  reload: () => Promise<void>
}) {
  const result = useApi<Proposal[]>('jobs/' + job.id + '/proposals')
  const [error, setError] = useState(''),
    [pending, setPending] = useState(false)
  async function act(path: string, body: unknown) {
    setPending(true)
    setError('')
    try {
      await api(path, 'PATCH', body)
      await result.reload()
      await reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to update record.')
    } finally {
      setPending(false)
    }
  }
  return (
    <section style={{ marginTop: 30 }}>
      <div className="record-heading">
        <h2>Project proposals</h2>
        {job.status === 'open' && (
          <button
            className="button secondary"
            disabled={pending}
            onClick={() => {
              if (
                window.confirm(
                  'Close this project to new proposals? This cannot be undone.',
                )
              )
                void act('jobs/' + job.id, { status: 'closed' })
            }}
          >
            Close project
          </button>
        )}
      </div>
      <p className="muted">
        Shortlisting records your interest. Hiring, contracts and payments are
        not enabled.
      </p>
      {error && (
        <div className="notice error" role="alert">
          {error}
        </div>
      )}
      <Feedback {...result} />
      {result.data?.length === 0 && (
        <div className="notice">
          No proposals yet. You can share this project’s public URL.
        </div>
      )}
      {result.data?.map((p) => (
        <article className="record" key={p.id}>
          <span className="pill">{p.status}</span>
          <h3>{p.name || 'Qamivo member'}</h3>
          <p>{p.coverLetter}</p>
          <div className="meta">
            <span>{money(p.amount, job.currency)}</span>
            <span>{p.days} days</span>
          </div>
          {job.status === 'open' && p.status !== 'rejected' && (
            <div className="inline-actions" style={{ marginTop: 18 }}>
              {p.status !== 'shortlisted' && (
                <button
                  className="button"
                  disabled={pending}
                  onClick={() =>
                    void act('proposals/' + p.id, { status: 'shortlisted' })
                  }
                >
                  Shortlist
                </button>
              )}
              <button
                className="button secondary"
                disabled={pending}
                onClick={() =>
                  void act('proposals/' + p.id, { status: 'rejected' })
                }
              >
                Decline
              </button>
            </div>
          )}
        </article>
      ))}
    </section>
  )
}
