import { createFileRoute } from '@tanstack/react-router'
import { Article } from '@/components/marketplace/article'
export const Route = createFileRoute('/about')({
  head: () => ({
    links: [
      { rel: 'canonical', href: 'https://qamivo-platform.netlify.app/about' },
    ],
    meta: [{ title: 'Our beginning | Qamivo' }],
  }),
  component: () => (
    <Article
      eyebrow="PAKISTANI ROOTS. INTERNATIONAL AMBITION."
      title="Opportunity should travel further."
      intro="Qamivo is a new professional marketplace built around a simple idea: good work deserves the chance to cross borders."
    >
      <h2>Global Skills. Real Opportunities.</h2>
      <p>
        We’re building a place where clients can explain what they need and
        independent professionals can show how they can help. Pakistan is our
        starting point; international collaboration is our ambition.
      </p>
      <h2>A considered beginning</h2>
      <p>
        This early release supports professional profiles, public project briefs
        and private proposals. Members can work as both clients and freelancers
        from one account. We do not invent user numbers, reviews, credentials or
        completed work.
      </p>
      <h2>Trust is work, too</h2>
      <p>
        Member information is self-reported. Profiles are not identity
        verification, shortlisting is not a contract, and a proposed budget is
        not evidence of available funds. Payments, escrow and automatic payouts
        are not available.
      </p>
      <h2>Building in stages</h2>
      <p>
        Contracts, milestones, communication, moderation tools and approved
        payment integrations come before the wider AI, marketing and learning
        ecosystem. Qamivo remains a provisional working name pending formal name
        and trademark clearance.
      </p>
      <a className="button" href="/roadmap">
        Explore the roadmap
      </a>
    </Article>
  ),
})
