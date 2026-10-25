import { getStore } from '@netlify/blobs'
import { getUser } from '@netlify/identity'
import type { Config } from '@netlify/functions'
import { and, arrayContains, eq } from 'drizzle-orm'
import { z } from 'zod'
import { database } from '../../db/index.js'
import { uploads, profiles, messages, conversationMembers, jobs, proposals } from '../../db/schema.js'

const purposes = new Set([
  'avatar', 'company_logo', 'portfolio', 'job_reference',
  'message_attachment', 'support_attachment', 'course_image', 'ad_creative',
])
const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const MAX_BYTES = 5 * 1024 * 1024
const uuid = z.string().uuid()

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } })
}
function detectImage(bytes: Uint8Array): string | null {
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) return 'image/png'
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg'
  if (bytes.length >= 6 && String.fromCharCode(...bytes.slice(0, 6)).match(/^GIF8[79]a$/)) return 'image/gif'
  if (bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP') return 'image/webp'
  return null
}
function sameOrigin(req: Request, url: URL) {
  return req.headers.get('origin') === url.origin
}

export default async (req: Request) => {
  const url = new URL(req.url)
  const parts = url.pathname.replace(/^\/api\/uploads\/?/, '').split('/').filter(Boolean)
  const db = database()

  if (req.method === 'POST' && parts.length === 0) {
    if (!sameOrigin(req, url)) return json({ error: 'Same-origin uploads are required.' }, 403)
    const user = await getUser()
    if (!user) return json({ error: 'Sign in to upload an image.' }, 401)
    if (!user.confirmedAt) return json({ error: 'Verify your email before uploading.' }, 403)
    try {
      const form = await req.formData()
      const file = form.get('file')
      const purpose = String(form.get('purpose') || '')
      const isPublic = String(form.get('isPublic') || 'false') === 'true'
      if (!(file instanceof File)) return json({ error: 'Choose an image file first.' }, 422)
      if (!purposes.has(purpose)) return json({ error: 'Unsupported upload purpose.' }, 422)
      if (file.size < 1 || file.size > MAX_BYTES) return json({ error: 'Images must be 1 byte to 5 MB.' }, 413)
      if (isPublic && !['company_logo', 'portfolio'].includes(purpose)) return json({ error: 'Only portfolio images and company logos can be explicitly public.' }, 422)
      const bytes = new Uint8Array(await file.arrayBuffer())
      const detected = detectImage(bytes)
      if (!detected || !allowedTypes.has(detected) || (file.type && file.type !== detected)) return json({ error: 'Use a valid JPEG, PNG, WebP or GIF image. SVG and other file types are not accepted.' }, 415)

      const id = crypto.randomUUID()
      const storeKey = `${user.id}/${id}`
      const blob = new Blob([bytes.buffer as ArrayBuffer], { type: detected })
      const store = getStore('qamivo-user-uploads')
      await store.set(storeKey, blob, { metadata: { uploadId: id, ownerId: user.id, purpose, contentType: detected } })
      try {
        const [asset] = await db.insert(uploads).values({
          id, ownerId: user.id, storeKey, purpose, contentType: detected, fileSize: file.size, isPublic,
        }).returning()
        return json({ id: asset.id, url: `/api/uploads/${asset.id}`, purpose, contentType: asset.contentType, size: asset.fileSize }, 201)
      } catch (e) {
        await store.delete(storeKey).catch(() => undefined)
        throw e
      }
    } catch (e) {
      return json({ error: e instanceof Error ? e.message : 'Upload failed. Please try again.' }, 503)
    }
  }

  if (parts.length !== 1 || !uuid.safeParse(parts[0]).success) return json({ error: 'Upload not found.' }, 404)
  const id = parts[0]
  const [asset] = await db.select().from(uploads).where(eq(uploads.id, id)).limit(1)
  if (!asset) return json({ error: 'Upload not found.' }, 404)

  const user = await getUser()
  let permitted = false
  let publicAsset = false
  if (asset.purpose === 'avatar') {
    const [publicProfile] = await db.select({ id: profiles.id })
      .from(profiles).where(and(eq(profiles.avatarKey, id), eq(profiles.isPublic, true))).limit(1)
    publicAsset = !!publicProfile
  }
  if (['portfolio', 'company_logo'].includes(asset.purpose) && asset.isPublic) publicAsset = true

  if (user && user.id === asset.ownerId) permitted = true
  if (user && !permitted && asset.purpose === 'message_attachment') {
    const [message] = await db.select({ conversationId: messages.conversationId }).from(messages)
      .where(eq(messages.attachmentId, id)).limit(1)
    if (message) {
      const [member] = await db.select({ id: conversationMembers.id }).from(conversationMembers)
        .where(and(eq(conversationMembers.conversationId, message.conversationId), eq(conversationMembers.memberId, user.id))).limit(1)
      permitted = !!member
    }
  }
  if (user && !permitted && asset.purpose === 'job_reference') {
    const [job] = await db.select({ id: jobs.id }).from(jobs)
      .where(arrayContains(jobs.referenceImageIds, [id])).limit(1)
    if (job) {
      if (job.id) {
        const [ownerOrProposal] = await db.select({ id: jobs.id }).from(jobs)
          .leftJoin(proposals, and(eq(proposals.jobId, jobs.id), eq(proposals.freelancerId, user.id)))
          .where(and(eq(jobs.id, job.id), sql`${jobs.ownerId} = ${user.id} OR ${proposals.id} IS NOT NULL`)).limit(1)
        permitted = !!ownerOrProposal
      }
    }
  }

  if (req.method === 'DELETE') {
    if (!sameOrigin(req, url)) return json({ error: 'Same-origin requests are required.' }, 403)
    if (!user || user.id !== asset.ownerId) return json({ error: 'Upload not found.' }, 404)
    const [profileRef] = await db.select({ id: profiles.id }).from(profiles).where(eq(profiles.avatarKey, id)).limit(1)
    const [messageRef] = await db.select({ id: messages.id }).from(messages).where(eq(messages.attachmentId, id)).limit(1)
    if (profileRef || messageRef) return json({ error: 'This image is still in use. Remove it from its profile or message first.' }, 409)
    await getStore('qamivo-user-uploads').delete(asset.storeKey)
    await db.delete(uploads).where(eq(uploads.id, id))
    return json({ deleted: true })
  }

  if (req.method !== 'GET') return json({ error: 'Method not allowed.' }, 405)
  if (!permitted && !publicAsset) return json({ error: 'Upload not found.' }, 404)
  const data = await getStore('qamivo-user-uploads').get(asset.storeKey, { type: 'arrayBuffer' })
  if (data === null) return json({ error: 'Stored image is missing.' }, 404)
  return new Response(data, {
    headers: {
      'Content-Type': asset.contentType,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': publicAsset ? 'public, max-age=300, stale-while-revalidate=600' : 'private, no-store',
      'Content-Security-Policy': "default-src 'none'; sandbox",
    },
  })
}
export const config: Config = {
  path: '/api/uploads/*',
  rateLimit: { windowLimit: 20, windowSize: 60, aggregateBy: ['ip', 'domain'] },
}
