import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useApi, money, type Job } from '@/lib/marketplace'
import { categories } from '@/lib/catalog'
import { PageIntro } from '@/components/marketplace/layout'
import { Feedback, Empty } from '@/components/marketplace/common'
export const Route = createFileRoute('/jobs/')({
  head: () => ({
    links: [
      { rel: 'canonical', href: 'https://qamivo-platform.netlify.app/jobs' },
    ],
    meta: [{ title: 'Project opportunities | Qamivo' }],
  }),
  component: Jobs,
})
function Jobs() {
  const [q, setQ] = useState(''),
    [category, setCategory] = useState(''),
    [search, setSearch] = useState('')
  const result = useApi<Job[]>('jobs?' + search)
  return (
    <main className="wrap page-main">
      <PageIntro
        eyebrow="YOUR SKILLS. YOUR NEXT OPPORTUNITY."
        title="Find work worth doing."
      >
        Explore open project briefs from the Qamivo community. Submit a proposal
        with a clear scope, budget and delivery estimate.
      </PageIntro>
      <div className="inline-actions">
        <a className="button" href="/jobs/new">
          Post a project
        </a>
        <a className="text-link" href="/dashboard">
          Your workspace →
        </a>
      </div>
      <form
        className="toolbar"
        onSubmit={(e) => {
          e.preventDefault()
          setSearch('q=' + encodeURIComponent(q) + '&category=' + category)
        }}
      >
        <input
          className="field"
          aria-label="Search projects"
          placeholder="Search projects and skills"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          className="field"
          aria-label="Project category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
        <button className="button">Find work</button>
      </form>
      <Feedback {...result} />
      {result.data &&
        !result.loading &&
        !result.error &&
        (result.data.length ? (
          <div className="record-list">
            {result.data.map((j) => (
              <a className="record" href={'/jobs/' + j.id} key={j.id}>
                <div className="record-heading">
                  <span className="pill">
                    {categories.find((c) => c.slug === j.category)?.name}
                  </span>
                  <strong>{money(j.budget, j.currency)}</strong>
                </div>
                <h3>{j.title}</h3>
                <p>
                  {j.description.slice(0, 240)}
                  {j.description.length > 240 ? '…' : ''}
                </p>
                <div className="meta">
                  <span>Fixed project budget</span>
                  <span>
                    Posted{' '}
                    {new Date(j.createdAt).toLocaleDateString('en', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      timeZone: 'UTC',
                    })}
                  </span>
                  <span>View project →</span>
                </div>
              </a>
            ))}
          </div>
        ) : (
          <Empty
            title="The next opportunity starts with a brief"
            href="/jobs/new"
            label="Post the first matching project"
          >
            No open projects match this search yet. Qamivo is at the beginning
            of its journey; only real member posts appear here.
          </Empty>
        ))}
    </main>
  )
}
