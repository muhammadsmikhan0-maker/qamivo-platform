import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { MemberGate } from '@/components/marketplace/auth'
import { PageIntro } from '@/components/marketplace/layout'
import { categories } from '@/lib/catalog'
import { api, privateHead, type Job } from '@/lib/marketplace'
export const Route = createFileRoute('/jobs/new')({
  head: privateHead,
  component: () => (
    <main className="wrap page-main">
      <PageIntro
        eyebrow="MAKE ROOM FOR YOUR NEXT BIG IDEA"
        title="Tell us what you’re building."
      >
        A clear brief helps the right people find your project. Only share
        information you are comfortable making public.
      </PageIntro>
      <MemberGate>
        <NewJob />
      </MemberGate>
    </main>
  ),
})
function NewJob() {
  const [pending, setPending] = useState(false),
    [error, setError] = useState('')
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    setPending(true)
    setError('')
    try {
      const result = await api<Job>('jobs', 'POST', Object.fromEntries(f))
      window.location.href = '/jobs/' + result.id
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to publish project.')
    } finally {
      setPending(false)
    }
  }
  return (
    <form className="form-panel" onSubmit={submit}>
      <div className="form-grid">
        <div className="full">
          <label htmlFor="job-title">Project title</label>
          <input
            id="job-title"
            className="field"
            name="title"
            required
            minLength={12}
            maxLength={120}
            placeholder="e.g. Build an accessible website for our design studio"
          />
        </div>
        <div>
          <label htmlFor="job-category">Category</label>
          <select id="job-category" className="field" name="category">
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="job-currency">Currency</label>
          <select id="job-currency" className="field" name="currency">
            {['USD', 'PKR', 'GBP', 'EUR'].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="full">
          <label htmlFor="job-budget">
            Total estimated fixed budget (whole currency units)
          </label>
          <input
            id="job-budget"
            name="budget"
            className="field"
            type="number"
            required
            min={1}
            max={10000000}
            step={1}
          />
        </div>
        <div className="full">
          <label htmlFor="job-description">
            Scope, deliverables and timeline
          </label>
          <textarea
            id="job-description"
            name="description"
            className="field"
            minLength={80}
            maxLength={10000}
            required
            placeholder="Describe the goal, required skills, expected deliverables and any important dates. At least 80 characters."
          />
        </div>
      </div>
      <div className="notice">
        Your brief becomes public immediately. Do not include passwords, contact
        details, confidential files or prohibited work. Payments and hiring
        contracts are not enabled in this release; publishing does not create a
        contract or charge.
      </div>
      {error && (
        <div className="notice error" role="alert">
          {error}
        </div>
      )}
      <button className="button" disabled={pending}>
        {pending ? 'Publishing…' : 'Publish project'}
      </button>
    </form>
  )
}
