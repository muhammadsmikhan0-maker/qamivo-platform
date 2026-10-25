import { createFileRoute } from '@tanstack/react-router'
import { Article } from '@/components/marketplace/article'
export const Route = createFileRoute('/privacy')({
  head: () => ({
    links: [
      { rel: 'canonical', href: 'https://qamivo-platform.netlify.app/privacy' },
    ],
    meta: [{ title: 'Early-access privacy notice | Qamivo' }],
  }),
  component: () => (
    <Article
      eyebrow="EARLY-ACCESS PRIVACY NOTICE · 25 OCTOBER 2026"
      title="Know what you share."
      intro="This notice describes the implemented foundation. A final operator identity, legal review, retention schedule and rights-request channel are required before a general public launch."
    >
      <h2>Information used</h2>
      <p>
        Account access is handled by Netlify Identity. Your email and
        authentication information support registration, confirmation, recovery
        and sign-in. Qamivo stores your professional profile, public-visibility
        preference, project briefs, proposals, selected review states and
        security audit events in managed Postgres.
      </p>
      <h2>Public and private records</h2>
      <p>
        A public profile exposes your chosen name, username, headline,
        biography, skills, category and country. Profiles are private by
        default. Public project briefs include title, description, budget,
        currency, category, publication date and open or closed status.
        Proposals are accessible to their author and the relevant project owner.
        Project owners can read proposal authors’ professional names even when
        their directory profiles are private.
      </p>
      <h2>Infrastructure and sessions</h2>
      <p>
        Netlify provides hosting, authentication and database infrastructure.
        Authentication uses session cookies and the provider’s browser session
        storage. Browser storage is not the source of truth for marketplace
        records. Hosting infrastructure may process request and security
        metadata. No advertising trackers, analytics accounts or runtime AI
        provider are connected by this implementation.
      </p>
      <h2>Controls and current limits</h2>
      <p>
        You can edit your profile and remove it from public discovery. Published
        projects remain public after closing. Proposal deletion, account
        deletion, exports and a verified privacy-request channel are not yet
        implemented. Do not submit sensitive personal data. Final retention,
        deletion and international-processing arrangements require operator
        approval.
      </p>
      <h2>Protection</h2>
      <p>
        Server operations check the signed-in member and record ownership. The
        platform does not expose proposal lists in public search. No
        implementation guarantees absolute security; independent review and
        deployed permission testing are still required.
      </p>
    </Article>
  ),
})
