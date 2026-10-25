import {
  pgTable,
  text,
  uuid,
  timestamp,
  integer,
  uniqueIndex,
  index,
  check,
  boolean,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
export const profiles = pgTable('profiles', {
  id: text('id').primaryKey(),
  username: text('username').notNull().unique(),
  name: text('name').notNull(),
  headline: text('headline').notNull(),
  bio: text('bio').notNull(),
  skills: text('skills').notNull(),
  category: text('category').notNull(),
  country: text('country').notNull(),
  isPublic: boolean('is_public').notNull().default(false),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})
export const jobs = pgTable(
  'jobs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ownerId: text('owner_id').notNull(),
    title: text('title').notNull(),
    description: text('description').notNull(),
    category: text('category').notNull(),
    budget: integer('budget').notNull(),
    currency: text('currency').notNull(),
    status: text('status').notNull().default('open'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('jobs_status_created').on(t.status, t.createdAt),
    check('job_budget_positive', sql`${t.budget} > 0`),
    check('job_status_valid', sql`${t.status} in ('open', 'closed')`),
  ],
)
export const proposals = pgTable(
  'proposals',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    jobId: uuid('job_id')
      .notNull()
      .references(() => jobs.id),
    freelancerId: text('freelancer_id').notNull(),
    coverLetter: text('cover_letter').notNull(),
    amount: integer('amount').notNull(),
    days: integer('days').notNull(),
    status: text('status').notNull().default('submitted'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('one_proposal_per_job_member').on(t.jobId, t.freelancerId),
    check('proposal_price_positive', sql`${t.amount} > 0`),
    check('proposal_days_positive', sql`${t.days} > 0`),
    check(
      'proposal_status_valid',
      sql`${t.status} in ('submitted','shortlisted','rejected')`,
    ),
  ],
)
export const auditEvents = pgTable('audit_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  actorId: text('actor_id').notNull(),
  action: text('action').notNull(),
  recordId: text('record_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})
export const rateLimits = pgTable('rate_limits', {
  key: text('key').primaryKey(),
  count: integer('count').notNull(),
  windowStart: timestamp('window_start', { withTimezone: true })
    .notNull()
    .defaultNow(),
})
