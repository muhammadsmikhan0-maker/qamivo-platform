import { createFileRoute } from '@tanstack/react-router'
import { Article } from '@/components/marketplace/article'
export const Route = createFileRoute('/roadmap')({
  head: () => ({
    links: [
      { rel: 'canonical', href: 'https://qamivo-platform.netlify.app/roadmap' },
    ],
    meta: [{ title: 'Platform roadmap & availability | Qamivo' }],
  }),
  component: () => (
    <Article
      eyebrow="BUILDING WITH DISCIPLINE"
      title="A foundation with a direction."
      intro="Availability is described honestly. Implemented features require deployment and end-to-end verification before they can be called Complete and Verified."
    >
      <h2>Phase 0 — Foundation · Partially Implemented</h2>
      <p>
        The connected repository, main branch and Netlify project are confirmed.
        Architecture, design tokens, a provisional vector identity and database
        migration are prepared. Brand clearance, exact operating costs, credit
        balances and legal reviews remain pending.
      </p>
      <h2>Phase 1 — Marketplace · Implemented, Not Fully Verified</h2>
      <p>
        Distinct public routes, skill and category discovery, Identity
        registration and recovery, public opt-in profiles, project publishing,
        project closing, private proposals, shortlisting and personal workspaces
        are implemented. Service packages, portfolios, notification delivery,
        moderation operations and full account management remain incomplete.
      </p>
      <h2>Phase 2 — Operations · Planned</h2>
      <p>
        Contracts, milestones, messaging, delivery, eligible reviews and support
        precede payment activation. Real payments remain disabled until merchant
        eligibility, marketplace permissions, sandbox workflows, verified
        webhooks and owner approval are complete.
      </p>
      <h2>Phase 3 — Organisations · Planned</h2>
      <p>
        Company workspaces, invitations, scoped team permissions, moderation
        tools and separate finance and support roles require a dedicated
        security-tested milestone. No public admin credentials exist.
      </p>
      <h2>Phase 4 — AI & marketing · Deferred</h2>
      <p>
        Qamivo AI, grounded help, recommendations, first-party campaigns and
        media management follow a measured cost and privacy review. No runtime
        AI calls or external advertising spend are enabled.
      </p>
      <h2>Phase 5 — Digital ecosystem · Deferred</h2>
      <p>
        Learning, digital products and storefront capabilities depend on demand,
        provider support and a separate specification.
      </p>
      <h2>Phase 6 — Scale · Planned</h2>
      <p>
        Monitoring, accessibility audits, Urdu localisation, performance
        measurement, international legal requirements and operational support
        become release gates as usage grows.
      </p>
    </Article>
  ),
})
