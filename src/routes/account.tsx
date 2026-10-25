import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { PageIntro } from '@/components/marketplace/layout'
import { MemberGate } from '@/components/marketplace/auth'
import { Feedback } from '@/components/marketplace/common'
import { useApi, api, privateHead, type Workspace } from '@/lib/marketplace'
import { categories } from '@/lib/catalog'
export const Route = createFileRoute('/account')({
  head: privateHead,
  component: () => (
    <main className="wrap page-main">
      <PageIntro
        eyebrow="YOUR EXPERTISE. YOUR STORY."
        title="Build your professional profile."
      >
        Make it easy for the right people to understand what you do. Your
        account can post projects and submit proposals.
      </PageIntro>
      <MemberGate>
        <ProfileEditor />
      </MemberGate>
    </main>
  ),
})
function ProfileEditor() {
  const result = useApi<Workspace>('me')
  const [pending, setPending] = useState(false),
    [error, setError] = useState(''),
    [saved, setSaved] = useState(false)
  const [isPublic, setIsPublic] = useState(false)
  useEffect(() => {
    if (result.data?.profile) setIsPublic(!!result.data.profile.isPublic)
  }, [result.data])
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    setError('')
    setSaved(false)
    const f = new FormData(e.currentTarget)
    try {
      await api('profile', 'PUT', { ...Object.fromEntries(f), isPublic })
      setSaved(true)
      await result.reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to save profile.')
    } finally {
      setPending(false)
    }
  }
  if (result.loading || result.error) return <Feedback {...result} />
  const p = result.data?.profile
  return (
    <form
      className="form-panel"
      key={p?.updatedAt}
      onSubmit={submit}
    >
      <div className="form-grid">
        <div>
          <label htmlFor="profile-name">Professional display name</label>
          <input
            className="field"
            id="profile-name"
            name="name"
            required
            minLength={2}
            maxLength={70}
            defaultValue={p?.name}
          />
        </div>
        <div>
          <label htmlFor="profile-username">Public username</label>
          <input
            className="field"
            id="profile-username"
            name="username"
            required
            minLength={3}
            maxLength={32}
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            defaultValue={p?.username}
            placeholder="lowercase-letters-and-numbers"
          />
        </div>
        <div className="full">
          <label htmlFor="profile-headline">Professional headline</label>
          <input
            id="profile-headline"
            name="headline"
            className="field"
            required
            minLength={10}
            maxLength={120}
            defaultValue={p?.headline}
          />
        </div>
        <div>
          <label htmlFor="profile-category">Primary category</label>
          <select
            id="profile-category"
            name="category"
            className="field"
            defaultValue={p?.category}
          >
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="profile-country">Country</label>
          <input
            id="profile-country"
            className="field"
            name="country"
            required
            minLength={2}
            maxLength={70}
            defaultValue={p?.country}
          />
        </div>
        <div className="full">
          <label htmlFor="profile-skills">Skills (comma separated)</label>
          <input
            id="profile-skills"
            className="field"
            name="skills"
            required
            minLength={2}
            maxLength={300}
            defaultValue={p?.skills}
          />
        </div>
        <div className="full">
          <label htmlFor="profile-bio">About your work</label>
          <textarea
            id="profile-bio"
            className="field"
            name="bio"
            required
            minLength={60}
            maxLength={4000}
            defaultValue={p?.bio}
          />
        </div>
        <div className="full">
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <input
              style={{ marginTop: 3 }}
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
            />
            <span>
              Make my profile public and discoverable. My display name, country,
              skills and biography will be visible to everyone.
            </span>
          </label>
        </div>
      </div>
      <p className="muted">
        Keep contact details and sensitive information out of your profile.
        Turning public visibility off removes the profile from discovery;
        project owners can still read proposals you submitted.
      </p>
      {error && (
        <div className="notice error" role="alert">
          {error}
        </div>
      )}
      {saved && (
        <div className="notice success" role="status">
          Your profile was saved.
        </div>
      )}
      <button className="button" disabled={pending}>
        {pending ? 'Saving…' : 'Save profile'}
      </button>
    </form>
  )
}
