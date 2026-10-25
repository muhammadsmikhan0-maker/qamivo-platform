# Route and feature inventory

Every implemented URL has a dedicated route module, with shared components for layout, authentication and directory queries. No planned route is published as an empty shell. Future dynamic IDs shown below are product notation; TanStack file routes use `$parameter` filenames.

Status key: **I** = Implemented, Not Fully Verified; **P** = Planned; **D** = Deferred. No route is Complete and Verified without pipeline, preview, refresh, mobile, invalid-parameter, metadata and access-control evidence.

## Current routes

| URL                           | Status | Access / behaviour / dependency                                                                |
| ----------------------------- | ------ | ---------------------------------------------------------------------------------------------- |
| `/`                           | I      | Public original homepage; functional search and category links                                 |
| `/about`                      | I      | Public provisional brand and honest availability                                               |
| `/how-it-works`               | I      | Public client/professional journey and scope limits                                            |
| `/categories`                 | I      | Public editorial category directory                                                            |
| `/services`                   | I      | Public profile discovery, explicitly not package checkout; DB API                              |
| `/freelancers`                | I      | Public opt-in talent directory; DB API                                                         |
| `/freelancers/:username`      | I      | Public only for published profile; server loader and not-found; public allowlist               |
| `/jobs`                       | I      | Public open-project search; DB API                                                             |
| `/jobs/:jobId`                | I      | Public server-rendered brief; invalid/missing record not-found; private gated proposal actions |
| `/jobs/new`                   | I      | Email-confirmed members; server publication checks and persistent budget/scope                 |
| `/login`                      | I      | Identity sign-in; noindex                                                                      |
| `/register`                   | I      | Free ordinary member signup; email confirmation; noindex                                       |
| `/forgot-password`            | I      | Identity recovery request; noindex                                                             |
| `/reset-password`             | I      | Authenticated recovery session; noindex; full recovery journey needs verification              |
| `/account`                    | I      | Own profile only; private-by-default visibility; noindex; DB and Identity                      |
| `/dashboard`                  | I      | Own projects/proposals, links to owner review; noindex; DB and Identity                        |
| `/help`                       | I      | Public safety/usage guidance and support limitations                                           |
| `/privacy`                    | I      | Public early-access data notice, pending final legal review                                    |
| `/terms`                      | I      | Public early-access terms, pending final operator/legal review                                 |
| `/roadmap`                    | I      | Public actual/planned feature status                                                           |
| Not-found                     | I      | Framework root not-found; unknown URLs and missing detail records                              |
| `/sitemap.xml`, `/robots.txt` | I      | Static preparation; no Search Console submission claimed                                       |

The root currently applies provisional `noindex,follow` to the whole site. Private routes specify `noindex,nofollow`. All canonical URLs use the assigned HTTPS production host and must change consistently if an approved custom domain is connected. No login information is rendered in public server responses; private data loads through authenticated API calls. Private page shells can return HTTP 200 to visitors with a sign-in gate; their API data returns 401 when unauthenticated. This is explicit UI gating, not server authorisation bypass.

## Planned public URLs

| Routes                                                      | Status | Phase / access / dependencies                                     |
| ----------------------------------------------------------- | ------ | ----------------------------------------------------------------- |
| `/explore`, `/categories/:slug`                             | P      | 1; public taxonomy views and meaningful category content          |
| `/services/:slug`                                           | P      | 1–2; moderated service/package records and actual scope/pricing   |
| `/companies`, `/companies/:slug`                            | P      | 3; public profiles, verified organisation membership model        |
| `/portfolio`, `/portfolio/:slug`                            | P      | 1–2; media rights, upload validation, public opt-in storage       |
| `/pricing`, `/fees`, `/enterprise`                          | P      | 2–3; owner-approved real terms; never speculative pricing         |
| `/for-clients`, `/for-freelancers`                          | P      | 1; useful dedicated onboarding content                            |
| `/contact`, `/faq`                                          | P      | 1–2; staffed, verified support delivery and specific help content |
| `/blog`, `/blog/:slug`                                      | P      | 3; original editorial publishing/moderation                       |
| `/success-stories`                                          | D      | Publish only with genuine consented evidence                      |
| `/community`                                                | D      | Community operations and moderation                               |
| `/cookies`                                                  | P      | 1; complete session/consent inventory and legal review            |
| `/refund-policy`, `/cancellation-policy`, `/payment-policy` | P      | 2; approved payment/refund workflows and legal terms              |
| `/intellectual-property`                                    | P      | 2; content/contract/takedown policy                               |
| `/accessibility`                                            | P      | 1–2; audited statement and verified contact channel               |
| `/safety`, `/report-abuse`                                  | P      | 1–2; staffed report queue, retention and moderator permissions    |
| `/status`                                                   | P      | 3; real provider/application health evidence                      |

## Planned account routes

| Routes                                       | Status | Access / dependencies                                                          |
| -------------------------------------------- | ------ | ------------------------------------------------------------------------------ |
| `/register/client`, `/register/freelancer`   | P      | Ordinary-account onboarding variations; no role escalation                     |
| `/register/company`                          | P      | 3; organisation ownership and team security                                    |
| `/verify-email`                              | P      | Dedicated explanatory page; current provider callback is handled globally      |
| `/verify-otp`, `/resend-otp`                 | P      | Actual OTP provider, expiry, retry and abuse controls; not exposed now         |
| `/logout`                                    | P      | Dedicated route if useful; current sign-out button invokes real SDK logout     |
| `/account/profile`, `/account/security`      | P      | Profile currently at `/account`; later security settings require provider APIs |
| `/account/notifications`, `/account/privacy` | P      | Persistent preferences and real notification/retention controls                |
| `/account/sessions`, `/account/delete`       | P      | Provider revocation, deletion/export and marketplace lifecycle rules           |

## Planned client workspace URLs

All require a signed-in member and object ownership; organisation variants additionally require scoped membership.

| Routes                                                                     | Status | Phase / dependencies                                                                       |
| -------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------ |
| `/dashboard/profile`                                                       | P      | 1; existing editor at `/account`                                                           |
| `/dashboard/jobs`, `/dashboard/jobs/new`, `/dashboard/jobs/:jobId`         | P      | 1; distinct workspace views; existing actions at `/dashboard`, `/jobs/new`, `/jobs/:jobId` |
| `/dashboard/jobs/:jobId/proposals`                                         | P      | 1; dedicated review view; owner review currently at project detail                         |
| `/dashboard/proposals`, `/dashboard/proposals/:proposalId`                 | P      | 1–2; current summary at `/dashboard`; private detail expansion                             |
| `/dashboard/freelancers`, `/dashboard/favorites`                           | P      | 2; private persisted saved records                                                         |
| `/dashboard/orders`, `/dashboard/orders/:orderId`                          | P      | 2; contracts and state transitions                                                         |
| `/dashboard/projects`, `/dashboard/projects/:projectId`                    | P      | 2; accepted scope and project lifecycle                                                    |
| `/dashboard/milestones`, `/dashboard/deliverables`, `/dashboard/revisions` | P      | 2; versioned files, review and private access                                              |
| `/dashboard/quotes`, `/dashboard/quotes/:quoteId`                          | P      | 2; scope approval and history                                                              |
| `/dashboard/invoices`, `/dashboard/invoices/:invoiceId`                    | P      | 2; immutable historical financial terms                                                    |
| `/dashboard/payments`                                                      | P      | 2; approved provider, verified events and ledger                                           |
| `/dashboard/messages`, `/dashboard/messages/:conversationId`               | P      | 2; participant checks and real delivery semantics                                          |
| `/dashboard/notifications`                                                 | P      | 2; persisted event state and verified sending                                              |
| `/dashboard/reviews`                                                       | P      | 2; completion eligibility and moderation                                                   |
| `/dashboard/support`                                                       | P      | 2; staffed private support queue                                                           |
| `/dashboard/settings`                                                      | P      | 2; meaningful scoped account preferences                                                   |

## Planned freelancer workspace URLs

| Routes                                                                                                | Status | Phase / dependencies                                                     |
| ----------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------ |
| `/freelancer/dashboard`, `/freelancer/profile`                                                        | P      | 1; current unified `/dashboard` and `/account`; deliberate future views  |
| `/freelancer/portfolio`, `/freelancer/skills`                                                         | P      | 1–2; profile expansion and safe media                                    |
| `/freelancer/services`, `/freelancer/services/new`, `/freelancer/services/:serviceId/edit`            | P      | 1–2; owner-scoped listing drafts, moderation and publication             |
| `/freelancer/jobs`, `/freelancer/proposals`, `/freelancer/proposals/:proposalId`                      | P      | 1–2; current jobs/workspace suffice for initial workflow                 |
| `/freelancer/orders`, `/freelancer/orders/:orderId`                                                   | P      | 2; contracts, delivery and financial state                               |
| `/freelancer/projects`, `/freelancer/milestones`, `/freelancer/deliverables`, `/freelancer/revisions` | P      | 2; scoped project participants and private assets                        |
| `/freelancer/messages`                                                                                | P      | 2; private conversation membership                                       |
| `/freelancer/earnings`, `/freelancer/payouts`, `/freelancer/invoices`                                 | P      | 2; approved payout capability and auditable ledger; no invented balances |
| `/freelancer/reviews`                                                                                 | P      | 2; eligible genuine transactions                                         |
| `/freelancer/availability`, `/freelancer/analytics`, `/freelancer/settings`                           | P      | 2–3; real preferences and measured activity                              |

## Planned company and agency URLs

All are Phase 3, Planned. Require organisation-scoped permissions with owner/admin/hiring/member distinctions; invitation expiry/revocation and removal semantics; no personal metadata authorises team administration.

`/company`, `/company/dashboard`, `/company/profile`, `/company/team`, `/company/team/invitations`, `/company/roles`, `/company/jobs`, `/company/jobs/new`, `/company/projects`, `/company/orders`, `/company/proposals`, `/company/messages`, `/company/billing`, `/company/invoices`, `/company/payments`, `/company/analytics`, `/company/settings`.

Agency registration/workspace is a later organisation subtype, not an exposed unsupported role. Billing/payment routes additionally require provider and finance permissions.

## Planned administration

All are Phase 3 unless marked otherwise, Planned. Every page and operation requires a server-issued least-privilege permission. No `/admin` shell or administrator credentials are published.

| Proposed route                                                             | Responsibility / dependency                                                       |
| -------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `/admin`                                                                   | Operational overview from real measurements                                       |
| `/admin/users`, `/admin/roles`                                             | Account review and audited server role assignment                                 |
| `/admin/clients`, `/admin/freelancers`, `/admin/companies`, `/admin/teams` | Scoped account/org operations                                                     |
| `/admin/categories`, `/admin/skills`                                       | Taxonomy changes with integrity checks                                            |
| `/admin/services`, `/admin/jobs`, `/admin/proposals`                       | Content/moderation permissions                                                    |
| `/admin/projects`, `/admin/orders`, `/admin/milestones`                    | Server-enforced lifecycle review                                                  |
| `/admin/payments`, `/admin/transactions`, `/admin/invoices`                | Separate finance permissions; provider-approved ledger                            |
| `/admin/refunds`, `/admin/payouts`, `/admin/disputes`                      | Verified financial events and human approval                                      |
| `/admin/support`, `/admin/reviews`, `/admin/reports`                       | Staffed queue, privacy and internal-note controls                                 |
| `/admin/content`, `/admin/knowledge-base`                                  | Reviewed public/help publishing                                                   |
| `/admin/promotions`, `/admin/advertising`, `/admin/media`                  | Phase 4; approved first-party campaigns, rights, scheduling and measured delivery |
| `/admin/ai`                                                                | Phase 4; sanitised usage metadata, quotas and explicit limits                     |
| `/admin/integrations`                                                      | Provider health without exposing credentials                                      |
| `/admin/analytics`                                                         | Real conversion/activity events with consent                                      |
| `/admin/audit`, `/admin/security`                                          | Restricted event review and retention                                             |
| `/admin/settings`, `/admin/feature-flags`                                  | Owner-reviewed configuration; no autonomous AI control                            |

## API routes and checks

Single function prefix `/api/marketplace/` implements `GET profiles`, `GET profiles/:username`, `GET jobs`, `GET jobs/:id`, `GET jobs/:id/proposals` (owner only), `GET me` (self only), `PUT profile` (self only), `POST jobs`, `PATCH jobs/:id` (owner close only), `POST jobs/:id/proposals` (verified other member with a profile), and `PATCH proposals/:id` (relevant job owner). Server functions expose only public job/profile detail projections. There is no generic arbitrary-table endpoint.

Every route remains subject to unrun preview checks: direct URL, refresh, browser history, parameter tampering, absent records, outage recovery, mobile keyboard access, metadata, noindex, auth expiry and wrong-account access. Planned routes intentionally return the framework’s not-found rather than misleading content.
