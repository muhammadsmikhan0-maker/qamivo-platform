# Qamivo architecture and conventions

Qamivo is a provisional international marketplace, built from a previously empty connected Netlify project. Keep the existing repository and hosting project. Do not claim production readiness, trademark clearance, verified users or payment functionality without evidence.

## Architecture

- `src/routes/`: separate TanStack file routes. The root document owns shared header/footer, global metadata and providers. The build generates `routeTree.gen.ts`; do not hand-edit it.
- `src/components/marketplace/`: layout, public directory, reusable feedback, authentication forms and a client session gate. Gates are UX only; the server must independently enforce ownership.
- `src/lib/catalog.ts`: editorial categories, not business records.
- `src/lib/validation.ts`: server validation schemas. Budget values are positive whole currency units, not cents. No live financial calculations exist.
- `src/lib/marketplace.ts`: browser API client, record types and loading/error hook.
- `src/lib/public.functions.ts`: server-only public detail reads and metadata-safe projections. Invalid/missing detail records become router not-found responses. Keep database imports inside server handlers.
- `db/schema.ts`: Drizzle source of truth. `db/index.ts` creates request-scoped adapters; no shared customer state in module globals.
- `netlify/database/migrations/`: deployment-applied migrations generated with Drizzle Kit; do not apply migrations manually.
- `netlify/functions/marketplace.mts`: public reads and authenticated mutations. Same-origin JSON writes, verified Identity users, per-member persistent action limits, IP rate-limit configuration, explicit owner checks, row locks, duplicate-proposal constraint and audit events.
- `public/brand/`: original proposed SVG marks. Hero and category art are code-native illustrations, not real people, projects or data.
- `tests/marketplace-security.test.ts`: authored API-boundary and validation coverage. `docs/` is the single project ledger and research record.

## Business rules

Profiles are private by default. Public reads expose an allowlisted projection, never account emails or internal user IDs. Proposals are private to their author and project owner. Members can be both clients and professionals; user-editable metadata never authorises elevated roles. No company/admin roles are exposed. Netlify Identity 2.0 uses `confirmedAt` for email confirmation; use the installed package types as authority.

Jobs move from open to closed, irreversibly in this milestone. Proposal creation locks its job row so closing and applying cannot race. One proposal per member per job is enforced in the database. The project owner may shortlist or reject; rejection is terminal. Shortlisting is not acceptance, contract creation or a payment event. Reopening, editing published jobs and withdrawing proposals need separate workflows.

## Style and security

Use TypeScript, React function components, `@/` source aliases and the shared Manrope/navy/cyan design tokens. Keep real empty, loading, failure and success states. Never render user content as HTML. Use visible labels, keyboard focus and reduced-motion support. Import server code only through appropriate server handlers. Update schema and migration together. Keep secrets and PII out of logs and documentation.

Do not enable payments, paid tools, ad spend, runtime AI or production indexing without the corresponding provider verification and owner approvals. The whole app inherits provisional `noindex`; private routes also specify `noindex,nofollow`. Public directories currently use client fetching; details are server rendered. Lists are bounded and lack pagination. Support operations, moderation tooling, deletion/export and email-delivery verification remain launch blockers.

## Working and verification

Use `pnpm install` and `netlify dev --port 8889` for local setup outside constrained platform runs. Normal verification scripts are listed in README. During this Netlify agent run, do not run builds, dev servers, typechecks or test commands; the pipeline performs validation. Never label authored tests as passed. A migration generator is allowed because it creates required source artifacts.
