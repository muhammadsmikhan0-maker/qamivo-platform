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
  const [avatarKey, setAvatarKey] = useState<string | null>(null)
  const [avatarPosition, setAvatarPosition] = useState<'center' | 'top' | 'bottom'>('center')
  const [photoPreview, setPhotoPreview] = useState('')
  const [photoPending, setPhotoPending] = useState(false)
  const [photoError, setPhotoError] = useState('')
  const [photoStatus, setPhotoStatus] = useState('')
  useEffect(() => {
    if (result.data?.profile) {
      setIsPublic(!!result.data.profile.isPublic)
      setAvatarKey(result.data.profile.avatarKey || null)
      setAvatarPosition(result.data.profile.avatarPosition || 'center')
    }
  }, [result.data])
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    setError('')
    setSaved(false)
    const f = new FormData(e.currentTarget)
    const previousAvatarKey = result.data?.profile?.avatarKey || null
    try {
      await api('profile', 'PUT', { ...Object.fromEntries(f), isPublic, avatarKey, avatarPosition })
      if (previousAvatarKey && previousAvatarKey !== avatarKey) {
        await fetch(`/api/uploads/${previousAvatarKey}`, {
          method: 'DELETE',
          credentials: 'same-origin',
        }).catch(() => undefined)
      }
      setSaved(true)
      setPhotoStatus('Profile and saved picture settings were updated.')
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
      <section aria-labelledby="avatar-heading" style={{ display: 'grid', gap: 12, marginBottom: 24 }}>
        <h2 id="avatar-heading" style={{ margin: 0 }}>Profile picture</h2>
        {photoPreview || avatarKey ? (
          <img
            src={photoPreview || `/api/uploads/${avatarKey}`}
            alt="Profile picture preview"
            style={{ width: 112, height: 112, borderRadius: '50%', objectFit: 'cover', objectPosition: avatarPosition, border: '1px solid #dbe4ee' }}
          />
        ) : (
          <div aria-label="Default avatar" style={{ width: 112, height: 112, borderRadius: '50%', display: 'grid', placeItems: 'center', background: '#e7eef5', color: '#34516b', fontSize: 32, fontWeight: 700 }}>
            {(p?.name || 'Q').slice(0, 1).toUpperCase()}
          </div>
        )}
        <div>
          <label htmlFor="profile-avatar">Upload picture (JPEG, PNG, WebP or GIF; max 5 MB)</label>
          <input
            id="profile-avatar"
            className="field"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            disabled={photoPending}
            onChange={async (event) => {
              const file = event.currentTarget.files?.[0]
              event.currentTarget.value = ''
              if (!file) return
              setPhotoError('')
              setPhotoStatus('')
              if (file.size > 5 * 1024 * 1024) {
                setPhotoError('Choose an image no larger than 5 MB.')
                return
              }
              const previousKey = avatarKey
              const savedKey = result.data?.profile?.avatarKey || null
              const localPreview = URL.createObjectURL(file)
              setPhotoPreview(localPreview)
              setPhotoPending(true)
              try {
                const form = new FormData()
                form.append('file', file)
                form.append('purpose', 'avatar')
                const response = await fetch('/api/uploads', { method: 'POST', credentials: 'same-origin', body: form })
                const payload = await response.json().catch(() => ({})) as { id?: string; error?: string }
                if (!response.ok || !payload.id) throw new Error(payload.error || 'Image upload failed.')
                setAvatarKey(payload.id)
                setPhotoPreview(`/api/uploads/${payload.id}`)
                URL.revokeObjectURL(localPreview)
                if (previousKey && previousKey !== savedKey && previousKey !== payload.id) {
                  await fetch(`/api/uploads/${previousKey}`, {
                    method: 'DELETE',
                    credentials: 'same-origin',
                  }).catch(() => undefined)
                }
                setPhotoStatus('Image stored privately. Click Save profile to attach it to your account.')
              } catch (error) {
                URL.revokeObjectURL(localPreview)
                setPhotoPreview('')
                setPhotoError(error instanceof Error ? error.message : 'Image upload failed.')
              } finally {
                setPhotoPending(false)
              }
            }}
          />
          <p className="muted">The local preview is not a saved profile picture. The image is attached to your profile only after you click Save profile.</p>
        </div>
        <div style={{ maxWidth: 260 }}>
          <label htmlFor="profile-avatar-position">Picture framing</label>
          <select id="profile-avatar-position" className="field" value={avatarPosition} onChange={(e) => setAvatarPosition(e.target.value as 'center' | 'top' | 'bottom')}>
            <option value="center">Center</option>
            <option value="top">Top</option>
            <option value="bottom">Bottom</option>
          </select>
        </div>
        {(avatarKey || photoPreview) && (
          <button type="button" className="button secondary" onClick={async () => {
            const currentKey = avatarKey
            const savedKey = result.data?.profile?.avatarKey || null
            setAvatarKey(null)
            setPhotoPreview('')
            setPhotoStatus('Picture removal will apply after you save the profile.')
            if (currentKey && currentKey !== savedKey) {
              await fetch(`/api/uploads/${currentKey}`, {
                method: 'DELETE',
                credentials: 'same-origin',
              }).catch(() => undefined)
            }
          }}>
            Remove picture
          </button>
        )}
        {photoPending && <p className="muted" role="status">Uploading and validating image…</p>}
        {photoError && <div className="notice error" role="alert">{photoError}</div>}
        {photoStatus && <div className="notice" role="status">{photoStatus}</div>}
      </section>
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
