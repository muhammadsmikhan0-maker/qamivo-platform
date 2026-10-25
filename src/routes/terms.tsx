import { createFileRoute } from '@tanstack/react-router'
import { Article } from '@/components/marketplace/article'
export const Route = createFileRoute('/terms')({
  head: () => ({
    links: [
      { rel: 'canonical', href: 'https://qamivo-platform.netlify.app/terms' },
    ],
    meta: [{ title: 'Early-access terms | Qamivo' }],
  }),
  component: () => (
    <Article
      eyebrow="EARLY-ACCESS TERMS · 25 OCTOBER 2026"
      title="A clear starting point."
      intro="These early-access conditions describe the limited release. Final operator details, applicable law, marketplace policies and legal review remain launch requirements."
    >
      <h2>Available use</h2>
      <p>
        Qamivo currently supports account access, professional profiles, public
        project briefs and private proposals. Registration is free. No paid
        subscription, marketplace commission or checkout is enabled.
      </p>
      <h2>Responsible participation</h2>
      <p>
        Provide accurate information, respect other people’s intellectual
        property, and only publish work you may lawfully request or provide. Do
        not impersonate others, post prohibited or fraudulent work, collect
        sensitive data, spam users or attempt to access records without
        permission.
      </p>
      <h2>No payment or contract service</h2>
      <p>
        Project budgets and proposal amounts are estimates supplied by members.
        Shortlisting does not create a hiring contract, escrow arrangement or
        payment obligation. Qamivo does not process payments, hold funds,
        guarantee earnings or deliver refunds in this release.
      </p>
      <h2>Member content</h2>
      <p>
        You retain responsibility for the content you submit and must have the
        rights to share it. Public profiles and project briefs can be viewed by
        visitors. Do not post confidential materials. Separate project
        agreements and intellectual-property terms must be established before
        actual work begins.
      </p>
      <h2>Early-access limitations</h2>
      <p>
        Availability and features may change. Moderation operations, managed
        disputes, account-deletion tools and verified support contact details
        are not yet in place. Avoid business-critical reliance until the
        platform has completed its release and legal checks.
      </p>
      <h2>Brand status</h2>
      <p>
        Qamivo is a provisional working name. No trademark ownership, company
        registration, domain clearance or regulatory approval is asserted by
        this website.
      </p>
    </Article>
  ),
})
