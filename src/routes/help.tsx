import { createFileRoute } from '@tanstack/react-router'
import { Article } from '@/components/marketplace/article'
export const Route = createFileRoute('/help')({
  head: () => ({
    links: [
      { rel: 'canonical', href: 'https://qamivo-platform.netlify.app/help' },
    ],
    meta: [{ title: 'Help & safety | Qamivo' }],
  }),
  component: () => (
    <Article
      eyebrow="WORK WITH CARE"
      title="A safer start to working together."
      intro="Use the marketplace with clear expectations. This early release does not offer payment protection, identity checks or managed disputes."
    >
      <h2>Account access</h2>
      <p>
        Registration requires email confirmation through a secure link. Check
        your inbox and spam folder. An accepted request does not prove delivery.
        If the link expires, request registration again using the same details.
        Use password recovery if you already have a confirmed account.
      </p>
      <h2>Your information</h2>
      <p>
        Keep passwords, identity documents, payment details, private contact
        information and client secrets out of public profiles, briefs and
        proposals. Your email is used for account access and is not part of the
        public profile directory.
      </p>
      <h2>Recognise unsafe requests</h2>
      <p>
        Never pay an application fee, share an account OTP, install unknown
        software or transfer money because someone claims to be Qamivo support.
        A profile is not a verified identity badge. Review scope, ownership and
        legal suitability before committing to work.
      </p>
      <h2>Project and proposal issues</h2>
      <p>
        Only a project owner can review its proposals, shortlist or decline a
        submission, or close the project. A closed project cannot receive
        proposals. You cannot apply to your own project. Complete a professional
        profile before applying.
      </p>
      <h2>Support availability</h2>
      <p>
        A staffed support channel, abuse-reporting queue and dispute resolution
        are not yet configured. Do not use this early-access release for
        sensitive or financially consequential work. An owner-managed reporting
        channel and moderation review are release blockers for a wider public
        launch.
      </p>
      <h2>Accessibility</h2>
      <p>
        The interface uses semantic landmarks, visible focus states, labelled
        fields, keyboard-accessible controls and responsive layouts. Formal
        assistive-technology and WCAG 2.2 AA audits remain pending.
      </p>
      <a className="text-link" href="/roadmap">
        See current availability →
      </a>
    </Article>
  ),
})
