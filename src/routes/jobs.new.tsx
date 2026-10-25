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
  const [referenceImages, setReferenceImages] = useState<{ id: string; url: string; name: string }[]>([])
  const [imagePending, setImagePending] = useState(false)
  const [imageError, setImageError] = useState('')
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    setPending(true)
    setError('')
    try {
      const result = await api<Job>('jobs', 'POST', { ...Object.fromEntries(f), referenceImageIds: referenceImages.map((image) => image.id) })
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
      <div className="full" style={{ marginTop: 18, marginBottom: 18 }}>
        <label htmlFor="job-reference-images">Upload project reference images (JPEG, PNG, WebP or GIF; up to 5 images, 5 MB each)</label>
        <input
          id="job-reference-images"
          className="field"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          disabled={imagePending || pending || referenceImages.length >= 5}
          onChange={async (event) => {
            const files = Array.from(event.currentTarget.files || [])
            event.currentTarget.value = ''
            setImageError('')
            const remaining = 5 - referenceImages.length
            if (files.length > remaining) {
              setImageError(`You can attach up to 5 images. ${remaining} slot(s) remain.`)
            }
            setImagePending(true)
            for (const file of files.slice(0, remaining)) {
              if (file.size > 5 * 1024 * 1024) {
                setImageError(`${file.name}: images must be 5 MB or smaller.`)
                continue
              }
              try {
                const form = new FormData()
                form.append('file', file)
                form.append('purpose', 'job_reference')
                const response = await fetch('/api/uploads', { method: 'POST', credentials: 'same-origin', body: form })
                const payload = await response.json().catch(() => ({})) as { id?: string; url?: string; error?: string }
                if (!response.ok || !payload.id || !payload.url) throw new Error(payload.error || `Unable to upload ${file.name}.`)
                setReferenceImages((current) => [...current, { id: payload.id!, url: payload.url!, name: file.name }])
              } catch (error) {
                setImageError(error instanceof Error ? error.message : `Unable to upload ${file.name}.`)
              }
            }
            setImagePending(false)
          }}
        />
        <p className="muted">Project references remain private. They can be viewed only by the project owner and members who have submitted a proposal for the project.</p>
        {imagePending && <p className="muted" role="status">Uploading and validating images…</p>}
        {imageError && <div className="notice error" role="alert">{imageError}</div>}
        {referenceImages.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 12 }}>
            {referenceImages.map((image) => (
              <div key={image.id} style={{ width: 140 }}>
                <img src={image.url} alt={image.name} style={{ width: 140, height: 100, objectFit: 'cover', borderRadius: 8 }} />
                <p className="muted" style={{ overflowWrap: 'anywhere' }}>{image.name}</p>
                <button type="button" className="button secondary" disabled={pending || imagePending} onClick={async () => {
                  await fetch(image.url, { method: 'DELETE', credentials: 'same-origin' }).catch(() => undefined)
                  setReferenceImages((current) => current.filter((item) => item.id !== image.id))
                }}>Remove</button>
              </div>
            ))}
          </div>
        )}
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
      <button className="button" disabled={pending || imagePending}>
        {pending ? 'Publishing…' : 'Publish project'}
      </button>
    </form>
  )
}
