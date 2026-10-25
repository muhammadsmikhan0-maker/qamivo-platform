import { useEffect, useState } from 'react'
import { getUser, handleAuthCallback, logout } from '@netlify/identity'
import type { User } from '@netlify/identity'
export function useMember() {
  const [user, setUser] = useState<User | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState('')
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const u = await getUser()
        if (alive) setUser(u)
      } catch {
        if (alive)
          setError(
            'Your sign-in link could not be processed. Try signing in again.',
          )
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [])
  return { user, loading, error }
}
export function MemberGate({ children }: { children: React.ReactNode }) {
  const { user, loading, error } = useMember()
  if (loading)
    return (
      <div className="loading-state" role="status">
        <span className="sr-only">Checking your session…</span>
      </div>
    )
  if (!user)
    return (
      <div className="empty-state">
        <h3>Let’s make it official.</h3>
        <p>
          {error ||
            'Sign in or create a free account to manage projects and your professional profile.'}
        </p>
        <div className="inline-actions" style={{ justifyContent: 'center' }}>
          <a className="button" href="/login">
            Sign in
          </a>
          <a className="button secondary" href="/register">
            Create an account
          </a>
        </div>
      </div>
    )
  if (!user.confirmedAt)
    return (
      <div className="notice">
        Verify your email using the confirmation link before publishing or
        applying to projects. If your link has expired, return to registration
        to request a new confirmation.
      </div>
    )
  return (
    <>
      <div className="account-bar">
        <span>Signed in as {user.email}</span>
        <a href="/dashboard">Workspace</a>
        <a href="/account">Edit profile</a>
        <button
          onClick={async () => {
            await logout()
            window.location.href = '/'
          }}
        >
          Sign out
        </button>
      </div>
      {children}
    </>
  )
}

export function AuthCallback() {
  const [error, setError] = useState('')
  useEffect(() => {
    if (
      !/(confirmation_token|recovery_token|invite_token|access_token|email_change_token|error)=/.test(
        window.location.hash,
      )
    )
      return
    ;(async () => {
      try {
        const result = await handleAuthCallback()
        if (result?.type === 'recovery') {
          window.location.href = '/reset-password'
          return
        }
        if (result?.type === 'invite') {
          setError('Invitation acceptance is not available in this release.')
          return
        }
        if (result?.user) window.location.href = '/dashboard'
      } catch {
        setError(
          'This account link is invalid or expired. Return to sign-in or request a new recovery link.',
        )
      }
    })()
  }, [])
  return error ? (
    <div className="wrap">
      <div className="notice error" role="alert">
        {error}{' '}
        <a className="text-link" href="/login">
          Sign in →
        </a>
      </div>
    </div>
  ) : null
}
