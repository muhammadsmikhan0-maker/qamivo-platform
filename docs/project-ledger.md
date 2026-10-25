# Qamivo project ledger — initial milestone

Date: 25 October 2026. Overall status: **Implemented, Not Fully Verified**. This is an incremental marketplace foundation, not the entire requested platform or a launch approval.

## Discovery evidence

The supplied site configuration and a successful live, allowlisted `getSite` read agree on project `qamivo-platform`, ID `d35f56e9-0355-4f37-b230-1bab772bc1fb`, repository `muhammad-smi-khan/qamivo-platform`, branch `main`. The connected Git service is the private Netlify Git URL supplied in project configuration, not a verified GitHub integration. No duplicate repository or site was created. The workspace initially had no application files. File writes, template scaffolding and dependency installation succeeded.

The snapshot names account plan `nf_team_dev`, account type Free, Node 24, Functions region us-east-2 and enabled AI usage/Gateway capabilities. Those fields do not establish credits, service quotas or billing entitlements. Only the environment-variable name `DEPRECATED` was exposed by the safe site query; no values were printed. This is not a complete audit of scoped environment variables. No Google, email-domain, video or merchant account connection was verified. Netlify Database is available per run guidance; its initial provisioning and migration application await the deploy lifecycle.

The active coding agent is Codex. Dashboard-selectable alternatives, the precise configured inference model/reasoning setting, remaining credits, recharge policy and effective per-service limits are not exposed through available tool interfaces. No agent switch, parallel agent run, credit purchase or paid service activation was attempted. Broad credit-sensitive provider research is documented as pending rather than invented.

## Product specification

The smallest useful workflow is: a visitor discovers categories; a member registers and confirms an email; a professional saves a profile and opts into public discovery; a client publishes a project; another verified member with a profile submits one proposal; the owner privately reads, shortlists or declines it and closes the project. Both client and professional capabilities belong to the same ordinary account. There are no company, finance, support or administrator capabilities yet.

Jobs contain a public title, description, category, whole-unit fixed budget, currency, creation time and open/closed status. Proposals contain private scope text, whole-unit amount in the job currency, delivery days and submitted/shortlisted/rejected status. A proposal never creates a contract. No project deadline or attachment field is exposed because its enforcement/storage is not implemented. Closed jobs remain publicly readable.

Acceptance requires persisted records surviving refresh, independently authenticated requests, enforced ownership, private proposal access, clear errors, database uniqueness, consistent concurrent close/apply behaviour and real preview evidence. These criteria are not yet verified in a deployed environment.

## Architecture and decisions

The supported basic template supplied TanStack Start, React 19, TypeScript, Vite, Tailwind 4 and Netlify’s framework adapter. Existing supported UI primitives were retained. Custom CSS and Lucide create the navy/cyan Manrope visual system. The homepage carries editorial artwork and category links, with no fake production records.

Netlify Functions provide the marketplace API. Netlify Identity handles provider-managed email confirmation links, password login, recovery and session handling. The activation script reported success. The installed Identity 2.0 types use `confirmedAt`, which the implementation checks. Numeric OTP, OAuth, account deletion and email/session management are not claimed.

Netlify Database and Drizzle beta use the native `netlify-db` adapter. The mandated beta versions installed with upstream deprecation notices recommending release candidates; this milestone follows the currently supplied platform adapter instructions. Compatibility needs pipeline verification before release. Request-scoped clients avoid user-state caches. No external database or in-memory business persistence was added.

Public detail pages use server functions with explicit public projections, route loaders, record-specific metadata and not-found responses. Public directory filtering uses the API in the browser. Private operations use the same-origin API; client gates are convenience only. No uploaded files are accepted. Future binaries belong in Netlify Blobs after access/retention design; high-volume video needs a separately approved delivery provider.

Deployment stays on the connected Git/Netlify workflow. No manual production deploy, DNS edit, secret edit, git commit or merge was performed.

## Data model

| Table        | Purpose and important rules                                                                     |
| ------------ | ----------------------------------------------------------------------------------------------- |
| profiles     | Identity subject as primary key; unique public username; explicit private-by-default visibility |
| jobs         | Stable UUID; owner subject; positive fixed budget; open/closed constraint; status/date index    |
| proposals    | Job foreign key; subject; positive amount/days; state constraint; unique member/job index       |
| audit_events | Actor, action, record identifier and timestamp for job/proposal operations                      |
| rate_limits  | Atomic per-member hourly mutation count; obsolete windows removed on writes                     |

The generated migration and snapshot exist under `netlify/database/migrations/20261025140944_create_marketplace_foundation/`. Generation succeeded. No schema SQL was applied manually. Provider-level account records remain in Identity. Database subjects deliberately are not SQL foreign keys to an external provider. Account deletion and orphan handling require a later lifecycle design.

## Feature matrix

| Capability                                                                    | Status                          | Evidence / limits                                                                                   |
| ----------------------------------------------------------------------------- | ------------------------------- | --------------------------------------------------------------------------------------------------- |
| Product and route architecture                                                | Partially Implemented           | This ledger, route inventory, dedicated modules; wider specification remains planned                |
| Provisional SVG identity and responsive website                               | Implemented, Not Fully Verified | Original vectors and CSS; visual/device audit pending                                               |
| Account registration, login, confirmation links, recovery, logout             | Implemented, Not Fully Verified | Maintained Identity SDK; enable script succeeded; email delivery and sessions not end-to-end tested |
| Numeric OTP, resend limits, OAuth, email change, session management, deletion | Planned                         | No inactive form disguises these as available                                                       |
| Profile editing and explicit public visibility                                | Implemented, Not Fully Verified | Server schema, unique handle, allowlisted public reads; deployed checks pending                     |
| Category/skill/name search                                                    | Implemented, Not Fully Verified | Parameterised queries, bounded results; no semantic ranking or pagination                           |
| Public service packages and portfolio uploads                                 | Planned                         | `/services` explicitly provides professional discovery, not ordering                                |
| Job publishing and closing                                                    | Implemented, Not Fully Verified | Owner checks, immutable close transition, transaction/audit writes                                  |
| Proposals and owner shortlisting/declining                                    | Implemented, Not Fully Verified | One per member/job; no self-applications; closed-job lock and ownership checks                      |
| Private account workspace                                                     | Implemented, Not Fully Verified | Own jobs and proposals; no invented revenue metrics                                                 |
| Contracts, orders, milestones, delivery, reviews, messaging, notifications    | Planned                         | No operational pages exposed                                                                        |
| Company workspaces, admin and support operations                              | Planned                         | No elevated registration or admin credentials                                                       |
| Payments and payouts                                                          | Requires Provider Approval      | No payment code or financial balances; all real payments disabled                                   |
| Qamivo AI, ads, video and giveaways                                           | Deferred                        | No runtime inference, campaign spending or live-media claims                                        |
| LMS and commerce                                                              | Deferred                        | Separate future specifications required                                                             |
| Sitemap, canonical URLs, metadata and robots                                  | Implemented, Not Fully Verified | Static sitemap and record metadata; global provisional noindex                                      |
| Google accounts and verified transactional custom email                       | Blocked by Credentials          | No authorised account connection/delivery evidence                                                  |
| Name, legal and company clearance                                             | Planned                         | No clearance search completed; no irreversible brand decisions                                      |

No feature is labelled **Complete and Verified** solely on source inspection. `Blocked by Permissions` applies to agent-setting/credit visibility through this environment; owner dashboard evidence is still needed.

## Security review and required follow-up

Source controls: same-origin JSON mutation checks; server-authenticated, email-confirmed members; input length/range/category/currency checks; HTML text escaping; owner-scoped queries; public projection allowlists; no elevated roles derived from user metadata; unique proposal constraint; row locks around competing job transitions; transactional audit events; bounded queries; 60 actions per member per hourly window; configured API IP limit of 120 requests per 60 seconds; no-store API responses; generic infrastructure errors; frame, content-type, referrer and permissions headers. Rate-limit enforcement and plan support need preview verification. Hourly window rate limits can permit a burst at the boundary and are not a comprehensive anti-abuse service.

The CSP intentionally allows inline scripts/styles needed by the framework; nonce-based hardening remains pending. Font CSS is fetched from Google Fonts. No analytics is installed. Provider email/registration rate limits, delivery, revocation and anti-enumeration behaviour have not been independently verified. Recovery mutation requires an authenticated provider recovery session; test the full callback journey.

High-priority prelaunch gaps: no moderation/report queue or staffed support; immediate publication of user content; no automated content classification; no account deletion/export/retention programme; no independent auth/object-access/concurrency audit; no verified transactional email delivery; no dependency audit; no staging migration verification. Restrict initial use to approved early-access evaluation until these are resolved. Do not interpret a successful build as sufficient security evidence.

## Testing record

Commands actually run: supported `basic` scaffold; dependency installation via pnpm; filtered live `netlify api getSite`; `pnpm exec drizzle-kit generate --name create_marketplace_foundation`; Identity activation script; read-only source inspection and official URL retrieval. Scaffold succeeded using its local mirror after remote clone fallback. Installation succeeded with three transitive deprecation warnings plus the mandated Drizzle beta notices. Migration generation and Identity activation reported success.

Authored tests in `tests/marketplace-security.test.ts` cover cross-origin writes, missing/unconfirmed sessions, malformed JSON, anonymous workspace denial, proposal-list ownership, safe infrastructure errors, whole-unit budget boundaries, unsupported currency, forged ownership/state fields, invalid proposal bounds and unsafe handles. Existing template tests remain. None were run in this session.

Build, typecheck, lint, dependency audit, unit/integration/browser tests and dev servers were **not run**, as platform instructions reserve validation for the pipeline. No test or build result is asserted. Source review caught and fixed mismatches between suggested `emailVerified` and installed `confirmedAt`, and between a newer server-function validator name and the installed `.validator()` API. Confirmation and recovery callbacks are handled globally so provider links returning to the homepage are consumed.

Before release: run the pipeline and audit; create two test members; confirm email/recovery; create opt-in and private profiles; test refresh/direct navigation/mobile and keyboard; publish/apply/shortlist/decline/close; verify duplicate/self/closed applications fail; issue another member’s IDs directly; race close against apply; test limits, database outage and migration rollback strategy. Confirm private page/API cache and noindex behaviour. Test the real preview, not only mocks.

## Release record and approvals

Assigned preview URL: `https://6ade0ce3da196474f7a5c65f--qamivo-platform.netlify.app`. Intended production URL: `https://qamivo-platform.netlify.app`. Neither was verified serving this implementation. The platform handles subsequent validation and deployment. No production-release approval was inferred. No manual production deployment occurred.

Rollback: use the Netlify deployment history to restore a previously verified compatible application build; this is a fresh project with no verified prior release recorded. Applied database migrations require forward fixes, not deletion. Restoring application code alone does not roll back data. Before wider release establish backups, recovery permissions and a rehearsed rollback.

Authorised: implement the first marketplace foundation using the connected workflow, Identity and managed persistence. Still needed: final brand, legal/operator details, data retention, operational support, production release and indexing, all merchant/financial activation, connected Google accounts, paid integrations and advertising spend. See the provider report for costs and the route inventory for planned features.
