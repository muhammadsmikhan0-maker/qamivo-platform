import { createFileRoute, notFound } from '@tanstack/react-router'
import { publicProfile } from '@/lib/public.functions'
import { PageIntro } from '@/components/marketplace/layout'
export const Route = createFileRoute('/freelancers/$username')({
  loader: async ({ params }) => {
    const profile = await publicProfile({ data: params.username })
    if (!profile) throw notFound()
    return profile
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: (loaderData?.name || 'Professional profile') + ' | Qamivo' },
      {
        name: 'description',
        content: loaderData?.headline || 'Independent professional on Qamivo.',
      },
    ],
    links: loaderData
      ? [
          {
            rel: 'canonical',
            href:
              'https://qamivo-platform.netlify.app/freelancers/' +
              loaderData.username,
          },
        ]
      : [],
  }),
  component: ProfilePage,
})
function ProfilePage() {
  const result = { data: Route.useLoaderData(), error: '' }
  return (
    <main className="wrap page-main">
      {result.data && !result.error && (
        <>
          <div style={{ display: 'flex', gap: 18, alignItems: 'center', marginBottom: 24 }}>
            {result.data.avatarKey ? (
              <img
                src={`/api/uploads/${result.data.avatarKey}`}
                alt={`${result.data.name}'s profile picture`}
                style={{ width: 104, height: 104, borderRadius: '50%', objectFit: 'cover', objectPosition: result.data.avatarPosition || 'center' }}
              />
            ) : (
              <div aria-label="Default profile avatar" style={{ width: 104, height: 104, borderRadius: '50%', background: '#e7eef5', display: 'grid', placeItems: 'center', fontSize: 30, fontWeight: 700 }}>
                {result.data.name.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div style={{ flex: 1 }}>
              <PageIntro eyebrow="PROFESSIONAL PROFILE" title={result.data.name}>
                {result.data.headline}
              </PageIntro>
            </div>
          </div>
          <div className="detail-grid">
            <article className="prose">
              <h2>About</h2>
              <p style={{ whiteSpace: 'pre-wrap' }}>{result.data.bio}</p>
              <h2>Skills</h2>
              <p>{result.data.skills}</p>
              <p className="muted">
                Profile information is provided by the member. Identity, skills
                and transaction history have not been independently verified.
              </p>
            </article>
            <aside className="detail-side">
              <span className="pill">Independent professional</span>
              <p>Based in {result.data.country}</p>
              <p>
                Have a project in mind? Publish a clear brief so professionals
                can propose a scope and timeline.
              </p>
              <a className="button" href="/jobs/new">
                Post a project
              </a>
            </aside>
          </div>
        </>
      )}
    </main>
  )
}
