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
  email: text('email'),
  avatarKey: text('avatar_key'),
  avatarPosition: text('avatar_position').notNull().default('center'),
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
    referenceImageIds: text('reference_image_ids').array().notNull().default(sql`'{}'::text[]`),
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


export const uploads = pgTable(
  'uploads',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ownerId: text('owner_id').notNull(),
    storeKey: text('store_key').notNull().unique(),
    purpose: text('purpose').notNull(),
    contentType: text('content_type').notNull(),
    fileSize: integer('file_size').notNull(),
    isPublic: boolean('is_public').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    check('upload_size_valid', sql`${t.fileSize} > 0 AND ${t.fileSize} <= 5242880`),
    check('upload_purpose_valid', sql`${t.purpose} in ('avatar','company_logo','portfolio','job_reference','message_attachment','support_attachment','course_image','ad_creative')`),
    index('uploads_owner_created').on(t.ownerId, t.createdAt),
  ],
)

export const conversations = pgTable(
  'conversations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    jobId: uuid('job_id').references(() => jobs.id),
    subject: text('subject').notNull().default('Qamivo conversation'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index('conversations_created').on(t.createdAt)],
)

export const conversationMembers = pgTable(
  'conversation_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversations.id),
    memberId: text('member_id').notNull(),
    unreadCount: integer('unread_count').notNull().default(0),
    lastReadAt: timestamp('last_read_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('conversation_member_unique').on(t.conversationId, t.memberId),
    index('conversation_members_member_created').on(t.memberId, t.createdAt),
    check('conversation_unread_nonnegative', sql`${t.unreadCount} >= 0`),
  ],
)

export const messages = pgTable(
  'messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversations.id),
    senderId: text('sender_id').notNull(),
    body: text('body').notNull().default(''),
    attachmentId: text('attachment_id'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('messages_conversation_created').on(t.conversationId, t.createdAt),
    check('message_body_or_attachment', sql`length(trim(${t.body})) > 0 OR ${t.attachmentId} IS NOT NULL`),
    check('message_body_length', sql`length(${t.body}) <= 4000`),
  ],
)

export const emailEvents = pgTable(
  'email_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    eventType: text('event_type').notNull(),
    recipient: text('recipient').notNull(),
    status: text('status').notNull().default('pending'),
    providerId: text('provider_id'),
    errorCode: text('error_code'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('email_events_status_created').on(t.status, t.createdAt),
  ],
)


export const verificationChallenges = pgTable(
  'verification_challenges',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull(),
    fullName: text('full_name').notNull(),
    codeHash: text('code_hash').notNull(),
    status: text('status').notNull().default('pending'),
    attempts: integer('attempts').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    consumedAt: timestamp('consumed_at', { withTimezone: true }),
  },
  (t) => [
    index('verification_challenges_email_created').on(t.email, t.createdAt),
    index('verification_challenges_status_expires').on(t.status, t.expiresAt),
    check('verification_attempts_valid', sql`${t.attempts} >= 0 AND ${t.attempts} <= 5`),
    check('verification_status_valid', sql`${t.status} in ('pending','sent','failed','consumed','expired','locked','superseded')`),
  ],
)
