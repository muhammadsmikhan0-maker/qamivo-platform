# Qamivo

Qamivo — Global Skills. Real Opportunities. A Pakistan-first, international professional marketplace foundation. The name and visual identity are provisional.

This milestone implements public discovery, email-confirmed accounts, professional profiles, project publishing and closing, proposals, shortlisting and an account workspace. It does not implement payment processing, contracts, escrow, messaging, verification badges, company teams or runtime AI.

## Stack and local setup

Node 24, pnpm, React 19, TypeScript, TanStack Start and Router, Vite, Netlify Functions, Netlify Identity, and Netlify Database with Drizzle ORM. CSS provides a responsive Manrope-based visual system; Lucide provides icons.

```sh
pnpm install
netlify dev --port 8889
```

Use the Netlify CLI linked to the existing project for Identity, database and function emulation. The app’s Vite process is managed by Netlify Dev. The platform supplies database connection configuration; never put credentials in frontend configuration. Identity confirmation and recovery use provider-managed email links, not numeric OTPs.

The installed versions of `@netlify/identity` expose `confirmedAt`; account verification checks use that field. Registration is free and a single account can both post projects and apply to other members’ projects.

## Database changes

Schema: `db/schema.ts`. Adapter: `db/index.ts`. Generate changes using:

```sh
pnpm exec drizzle-kit generate --name describe_the_change
```

Commit generated migration assets through the platform workflow. Netlify applies migrations during deployment. Do not push schema changes or apply migrations manually. Never rewrite an applied migration. There are no seeded people, projects, ratings or transactions.

## Verification and release

Normal developer checks are `pnpm test`, `pnpm run typecheck`, `pnpm run lint` and `pnpm run build`. They were **not run in this agent session** because this environment reserves validation for the platform pipeline. The new security and validation tests are authored, not verified passing. Review the pipeline and test a deploy preview before approving any production release.

All pages currently inherit `noindex` while brand, legal and operational approval remain pending. A sitemap and per-page canonical URLs prepare the public routes for later launch. Remove the global indexing restriction only after the launch gates in `docs/project-ledger.md` are satisfied. Never remove private-page indexing restrictions.

Read `docs/project-ledger.md` for product specification, implementation status, security and test records; `docs/routes.md` for current and planned routes; `docs/providers-and-roadmap.md` for payments, AI, research and costs; and `docs/brand.md` for the proposed identity.
