import { createFileRoute } from '@tanstack/react-router'
import { Article } from '@/components/marketplace/article'
export const Route = createFileRoute('/how-it-works')({
  head: () => ({
    links: [
      {
        rel: 'canonical',
        href: 'https://qamivo-platform.netlify.app/how-it-works',
      },
    ],
    meta: [{ title: 'How it works | Qamivo' }],
  }),
  component: () => (
    <Article
      eyebrow="CLEAR EXPECTATIONS. BETTER WORK."
      title="Start with a conversation worth having."
      intro="A practical guide to the workflows available in this early release."
    >
      <h2>For clients</h2>
      <ol>
        <li>
          Create a free account and confirm your email using the verification
          link.
        </li>
        <li>
          Post a public project brief with a category, fixed budget, currency
          and detailed scope. Leave out confidential information.
        </li>
        <li>
          Open your project from your workspace to review private proposals.
        </li>
        <li>
          Shortlist suitable proposals or decline others. Close your project
          when you no longer want applications.
        </li>
      </ol>
      <h2>For independent professionals</h2>
      <ol>
        <li>
          Create and verify your account, then complete a professional profile.
        </li>
        <li>
          Choose whether your profile appears in the public talent directory.
        </li>
        <li>
          Explore open projects and submit a proposal explaining your approach,
          fixed price and delivery estimate.
        </li>
        <li>
          Follow the proposal’s review status in your workspace. One proposal is
          allowed per project.
        </li>
      </ol>
      <h2>What happens after shortlisting?</h2>
      <p>
        This release stops at proposal review. Shortlisting does not accept a
        contract, reserve funds or guarantee work. Ordering, private messages,
        milestones, delivery and payment processing are not enabled. Do not send
        money on the assumption that Qamivo holds or protects it.
      </p>
      <div className="inline-actions">
        <a className="button" href="/register">
          Join Qamivo
        </a>
        <a className="button secondary" href="/jobs">
          Explore projects
        </a>
      </div>
    </Article>
  ),
})
