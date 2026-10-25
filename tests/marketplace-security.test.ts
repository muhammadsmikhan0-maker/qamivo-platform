// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ getUser: vi.fn(), database: vi.fn() }))
vi.mock('@netlify/identity', () => ({ getUser: mocks.getUser }))
vi.mock('../db/index.js', () => ({ database: mocks.database }))
import handler from '../netlify/functions/marketplace.mts'
import { jobSchema, proposalSchema, profileSchema } from '../src/lib/validation'
const host = 'https://qamivo-platform.netlify.app'
function request(path: string, method: string, body?: unknown, origin = host) {
  return new Request(host + '/api/marketplace/' + path, {
    method,
    headers: { origin, 'content-type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
}
beforeEach(() => vi.resetAllMocks())
describe('API security boundaries', () => {
  it('rejects cross-origin mutation before touching identity or storage', async () => {
    const response = await handler(
      request('jobs', 'POST', {}, 'https://untrusted.example'),
    )
    expect(response.status).toBe(403)
    expect(mocks.database).not.toHaveBeenCalled()
    expect(mocks.getUser).not.toHaveBeenCalled()
  })
  it('rejects unauthenticated writes', async () => {
    mocks.getUser.mockResolvedValue(null)
    expect((await handler(request('jobs', 'POST', {}))).status).toBe(401)
    expect(mocks.database).not.toHaveBeenCalled()
  })
  it('rejects unverified-account writes', async () => {
    mocks.getUser.mockResolvedValue({ id: 'member' })
    expect((await handler(request('jobs', 'POST', {}))).status).toBe(403)
    expect(mocks.database).not.toHaveBeenCalled()
  })
  it('rejects malformed JSON without issuing a success', async () => {
    const response = await handler(
      new Request(host + '/api/marketplace/jobs', {
        method: 'POST',
        headers: { origin: host, 'content-type': 'application/json' },
        body: '{',
      }),
    )
    expect(response.status).toBe(400)
  })
  it('keeps anonymous workspace access private', async () => {
    mocks.database.mockReturnValue({})
    mocks.getUser.mockResolvedValue(null)
    expect((await handler(request('me', 'GET'))).status).toBe(401)
  })
  it('does not expose database diagnostics', async () => {
    mocks.database.mockImplementation(() => {
      throw new Error('private database diagnostics')
    })
    const response = await handler(request('jobs', 'GET'))
    expect(response.status).toBe(503)
    expect(await response.text()).not.toContain('private database diagnostics')
  })
  it('denies proposal-list access to another member', async () => {
    const query = { select: vi.fn(), from: vi.fn(), where: vi.fn() }
    query.select.mockReturnValue(query)
    query.from.mockReturnValue(query)
    query.where.mockResolvedValue([
      { id: 'b970c587-df39-4545-b192-ad532c386452', ownerId: 'owner' },
    ])
    mocks.database.mockReturnValue(query)
    mocks.getUser.mockResolvedValue({ id: 'other' })
    expect(
      (
        await handler(
          request('jobs/b970c587-df39-4545-b192-ad532c386452/proposals', 'GET'),
        )
      ).status,
    ).toBe(404)
  })
})
describe('untrusted marketplace inputs', () => {
  const validJob = {
    title: 'Build a responsive company website',
    description:
      'A clear description of the website scope and required deliverables, with enough detail for a useful proposal.',
    category: 'development',
    currency: 'PKR',
    budget: '15000',
  }
  it('accepts whole-unit PKR budgets without floating-point conversion', () =>
    expect(jobSchema.parse(validJob).budget).toBe(15000))
  it.each([-1, 0, 1.25, 10000001, Infinity])(
    'rejects invalid budgets: %s',
    (budget) =>
      expect(jobSchema.safeParse({ ...validJob, budget }).success).toBe(false),
  )
  it('rejects unsupported currencies', () =>
    expect(
      jobSchema.safeParse({ ...validJob, currency: 'UNKNOWN' }).success,
    ).toBe(false))
  it('does not let request metadata set ownership or publication state', () => {
    const parsed = jobSchema.parse({
      ...validJob,
      ownerId: 'other',
      status: 'paid',
    })
    expect(parsed).not.toHaveProperty('ownerId')
    expect(parsed).not.toHaveProperty('status')
  })
  it('requires a meaningful proposal and bounded delivery estimate', () => {
    expect(
      proposalSchema.safeParse({ coverLetter: 'hi', amount: 100, days: 0 })
        .success,
    ).toBe(false)
  })
  it('rejects a path-like public username', () =>
    expect(
      profileSchema.safeParse({
        username: '../admin',
        name: 'Professional',
        headline: 'Experienced web developer',
        bio: 'I build accessible business websites with clear requirements and well documented delivery.',
        skills: 'React',
        category: 'development',
        country: 'Pakistan',
        isPublic: true,
      }).success,
    ).toBe(false))
})
