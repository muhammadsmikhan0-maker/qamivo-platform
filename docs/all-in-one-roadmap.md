# Qamivo All-in-One Platform Roadmap

**Status:** planning baseline — not a claim that every module is implemented  
**Prepared:** 25 October 2026  
**Next scheduled review:** 26 November 2026  
**Production rule:** changes must go through a reviewable branch/PR and deploy preview; never auto-merge or publish unverified changes.

## Product direction

Qamivo should become one coherent, original platform for freelancers, clients, professional services, teams and business operations. Study proven workflows from other services, but implement Qamivo's own design and code; do not copy proprietary source, exact page layouts, logos, text, or protected branding.

## Current evidence

The current codebase includes a TanStack Start/React app, Netlify Functions, Netlify Identity, Netlify Database with Drizzle, profiles, public discovery, jobs, proposals, shortlisting/rejection and a basic member workspace. The working branch now also contains a custom OTP registration endpoint, email event handling, participant-scoped conversations with unread counters and polling, plus private image storage and profile/project/message upload controls. A production deploy is marked ready in Netlify, but these branch changes have not been deployed or end-to-end verified.

The existing project ledger says **Implemented, Not Fully Verified**. The code has not been proven production-ready by an end-to-end acceptance run. Netlify Forms currently lists no forms. No configured inbound-mailbox integration was verified, and the live environment has no Resend API key, sender address, webhook secret or OTP secret registered. Payments, escrow, contracts, verified reviews, moderation/admin workflows and a full owner operations console are not implemented in the current milestone. Messaging, OTP, email hooks and uploads are code in a review branch, not live features.

## Priorities

### P0 — Safe delivery and release controls

- Add automated GitHub Actions checks for pull requests and pushes: install from the frozen pnpm lockfile, typecheck, lint, tests and production build.
- Require a reviewable PR and deploy-preview evidence before production releases.
- Keep the global noindex launch gate until the legal, brand, privacy, safety, email-delivery, support and technical release requirements are met and the owner approves the release.
- Enable MFA for the platform owner and audit account access manually in the provider dashboard.
- Do not add secrets to Git, source code, logs, screenshots or project issues.

### P1 — Onboarding, customer records and owner operations

- Build a validated public contact/early-access intake route backed by Netlify Database; capture only necessary fields (name, email, enquiry category/message, consent evidence, timestamps and source).
- Add duplicate/rate limiting, a honeypot or vetted anti-bot protection, user-safe success/errors, server-side validation and an audit trail.
- Keep lead/customer records private by default. Create a real server-authorized owner/operator console before any private lead, email or support data is viewable.
- Model permissions explicitly (owner, authorised operations/support staff, regular member). Never grant admin rights from user-editable profile metadata.
- Design retention, export, correction and deletion procedures before accumulating customer data.
- Add a transactional email provider only after an owner-approved provider account and verified sender/domain are available. Track delivery status and message type; do not silently ingest an owner's private inbox.
- If real inbound emails need to create customer records, connect an authorised mail integration/webhook and define the permitted mailbox, parsing, data retention and consent first. Netlify's Google sign-in connection alone does not prove Gmail inbox access.

### P2 — End-to-end marketplace workflow

- Add project/job editing and cancellation with an audit trail; preserve clear status transitions.
- Persistent client/freelancer messaging, participant-scoped access, unread counts and polling are implemented in the review branch; end-to-end verification is still required. Extend notifications and attachments only after the preview tests pass.
- Add contracts, scope acceptance, milestones, submissions, revision requests and completion records. Shortlisting must not be presented as accepting a contract.
- Add reporting, block/mute, abuse queues, dispute handling and support tickets with role-separated access.
- Add verified reviews only for completed eligible engagements, plus moderation and appeal handling.
- Improve search filters, pagination, saved searches, bookmarks and accessible empty/loading/error states.

### P3 — Service business and team workspace

- Add service packages and portfolios with file type/size validation, malware review where appropriate, rights/consent, storage limits and deletion workflows.
- Add client organisations, team membership, invitations and scoped permissions; support multi-person client accounts without allowing role escalation.
- Add an owner dashboard for users, leads, jobs, proposals, reports, support, system health, real usage metrics and audit events.
- Keep private account routes non-indexable and protect all reads/mutations on the server.

### P4 — Commercial and all-in-one extensions (provider/legal approval required)

- Payments, payouts, platform fees, refunds, escrow or dispute-linked holds only after provider approval, legal review, country/identity requirements, reconciliation and test-mode verification.
- AI tools for profile/job drafting, search assistance and summaries only with documented data handling, limits, abuse controls, consent and provider budget limits.
- Optional LMS/courses, digital downloads, booking/calendar, invoicing, campaign/ads and video features as independently scoped modules. Do not activate paid products, advertising spend, marketplace transactions or external posts without explicit approval.
- Connect third-party platforms through documented APIs and their terms; do not scrape private accounts or claim access without a verified connection.

## Data and access rules

- Use the existing Netlify Database and Drizzle workflow for durable application records; generate schema changes/migrations using the repo's documented generator. Never hand-apply migrations or change production records to make a demo look populated.
- Treat account email addresses, customer enquiries, proposals, messages and support tickets as private data.
- Owner and staff permissions must be checked server-side for every operation. Use an audit trail for privileged access and business-state changes.
- Never store passwords, authentication tokens or full payment credentials in application tables.
- Do not invent user counts, transactions, revenue, review scores or performance statistics; label metrics as unavailable when the provider has no evidence.
- Do not automatically switch production indexing on or make real payments active as part of routine maintenance.

## Integrations policy

- **Netlify Database:** already present in the application workflow; extend through Drizzle schema and generated migrations.
- **Netlify Identity:** existing registration/login/confirmation foundation; improve and test it rather than installing a competing identity provider by default.
- **GitHub Actions:** baseline quality workflow is being proposed in a branch/PR.
- **Netlify extensions:** install only when a concrete requirement and setup plan exist. Security extensions need code/configuration and testing; installing one by itself is not proof that the app is protected. Analytics must have a privacy/measurement decision. No extension should be installed just to increase the count.
- **Email:** Resend sender/OTP/webhook code is present on the review branch; no production provider credentials or sending-domain verification are configured. Existing Netlify Identity recovery remains provider-managed. No inbound Gmail inbox access is verified.

## Release acceptance checklist

- [ ] CI checks pass on the proposed revision.
- [ ] Netlify Deploy Preview works for public and protected flows.
- [ ] OTP registration, provider email delivery, login, recovery and logout have been end-to-end tested.
- [ ] Database persistence, duplicate handling and all new OTP/messaging/upload migrations are verified on preview.
- [ ] Cross-account access tests prove that private proposals, leads, messages and support records cannot be read by other members.
- [ ] Owner/staff authorisation is enforced on the server and audited.
- [ ] Contact forms, email delivery, spam protection and consent text are tested.
- [ ] Mobile, keyboard and screen-reader basics are checked; accessibility claims match actual evidence.
- [ ] Privacy, terms, support/reporting, retention/deletion, company/name clearance and provider approvals are resolved.
- [ ] Owner explicitly approves the release and any indexing/payment activation.

## Monthly review

On the 26th of each month, compare the live deployment, GitHub changes, CI results, current official platform announcements, security, available metrics, launch checklist and prioritised work with the previous report. Give a readiness score only with the rubric and evidence attached. Prepare low-risk fixes on a branch/PR when possible; never merge, publish, spend, apply for jobs, message customers or change permissions/billing without explicit approval.
