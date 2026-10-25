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
          <PageIntro eyebrow="PROFESSIONAL PROFILE" title={result.data.name}>
            {result.data.headline}
          </PageIntro>
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
