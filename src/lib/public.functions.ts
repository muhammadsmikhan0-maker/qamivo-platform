import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
export const publicJob = createServerFn({ method: 'GET' })
  .validator(z.string().max(80))
  .handler(async ({ data }) => {
    if (!z.string().uuid().safeParse(data).success) return null
    const [{ database }, { jobs }, { eq }] = await Promise.all([
      import('../../db/index.js'),
      import('../../db/schema.js'),
      import('drizzle-orm'),
    ])
    const [job] = await database()
      .select({
        id: jobs.id,
        title: jobs.title,
        description: jobs.description,
        category: jobs.category,
        budget: jobs.budget,
        currency: jobs.currency,
        status: jobs.status,
        createdAt: jobs.createdAt,
      })
      .from(jobs)
      .where(eq(jobs.id, data))
    return job ? { ...job, createdAt: job.createdAt.toISOString() } : null
  })
export const publicProfile = createServerFn({ method: 'GET' })
  .validator(z.string().max(80))
  .handler(async ({ data }) => {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(data) || data.length > 32)
      return null
    const [{ database }, { profiles }, { eq, and }] = await Promise.all([
      import('../../db/index.js'),
      import('../../db/schema.js'),
      import('drizzle-orm'),
    ])
    const [profile] = await database()
      .select({
        username: profiles.username,
        name: profiles.name,
        headline: profiles.headline,
        bio: profiles.bio,
        skills: profiles.skills,
        category: profiles.category,
        country: profiles.country,
      })
      .from(profiles)
      .where(and(eq(profiles.username, data), eq(profiles.isPublic, true)))
    return profile || null
  })
