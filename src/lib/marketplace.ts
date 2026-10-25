import { useEffect, useState, useCallback } from 'react'
export type Profile = {
  updatedAt?: string
  id?: string
  username: string
  name: string
  headline: string
  bio: string
  skills: string
  category: string
  country: string
  isPublic?: boolean
}
export type Job = {
  id: string
  title: string
  description: string
  category: string
  budget: number
  currency: string
  status: string
  createdAt: string
}
export type Proposal = {
  id: string
  jobId?: string
  title?: string
  status: string
  amount: number
  currency?: string
  days: number
  coverLetter?: string
  name?: string
  username?: string
}
export type Workspace = {
  profile: Profile | null
  jobs: Job[]
  proposals: Proposal[]
}
export async function api<T>(
  path: string,
  method = 'GET',
  data?: unknown,
): Promise<T> {
  const response = await fetch('/api/marketplace/' + path, {
    method,
    credentials: 'same-origin',
    headers: method === 'GET' ? {} : { 'Content-Type': 'application/json' },
    ...(data === undefined ? {} : { body: JSON.stringify(data) }),
  })
  let body
  try {
    body = await response.json()
  } catch {
    throw new Error(
      'The marketplace could not be reached. Please try again later.',
    )
  }
  if (!response.ok)
    throw new Error(body.error || 'This action could not be completed.')
  return body as T
}
export function useApi<T>(path: string) {
  const [data, setData] = useState<T | null>(null),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(true)
  const reload = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setData(await api<T>(path))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load records.')
    } finally {
      setLoading(false)
    }
  }, [path])
  useEffect(() => {
    void reload()
  }, [reload])
  return { data, error, loading, reload }
}
export function money(amount: number, currency: string) {
  return new Intl.NumberFormat('en', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}
export const privateHead = () => ({
  meta: [{ name: 'robots', content: 'noindex,nofollow' }],
})
