import { createFileRoute } from '@tanstack/react-router'
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
