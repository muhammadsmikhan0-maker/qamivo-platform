import { useState, useEffect } from 'react'
import {
  login,
  signup,
  requestPasswordRecovery,
  updateUser,
  getUser,
} from '@netlify/identity'
import { PageIntro } from './layout'
export function AuthForm({
  mode,
}: {
  mode: 'login' | 'register' | 'forgot' | 'reset'
}) {
  const [pending, setPending] = useState(false),
    [error, setError] = useState(''),
    [message, setMessage] = useState(''),
    [canReset, setCanReset] = useState(false)
  useEffect(() => {
    if (mode !== 'reset') return
    ;(async () => {
      const user = await getUser()
      setCanReset(!!user)
      if (!user) setError('Open the recovery link from your email first.')
    })()
  }, [mode])
  const title = {
    login: 'Welcome back.',
    register: 'Your next chapter starts here.',
    forgot: 'Let’s get you back in.',
    reset: 'Choose a new password.',
  }[mode]
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    setError('')
    setMessage('')
    const f = new FormData(e.currentTarget)
    try {
      if (mode === 'login') {
        await login(String(f.get('email')), String(f.get('password')))
        window.location.href = '/dashboard'
      }
      if (mode === 'register') {
        const u = await signup(
          String(f.get('email')),
          String(f.get('password')),
          { full_name: String(f.get('name')) },
        )
        if (u.confirmedAt) window.location.href = '/dashboard'
        else
          setMessage(
            'Registration accepted. Check your inbox for a confirmation link. Email delivery has not been independently confirmed; check spam or try again later if it does not arrive.',
          )
      }
      if (mode === 'forgot') {
        await requestPasswordRecovery(String(f.get('email')))
        setMessage(
          'Recovery request accepted. If an eligible account exists, check its inbox for a recovery link.',
        )
      }
      if (mode === 'reset') {
        await updateUser({ password: String(f.get('password')) })
        setMessage('Password updated. You can now return to your workspace.')
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Account access is temporarily unavailable. Please try again later.',
      )
    } finally {
      setPending(false)
    }
  }
  return (
    <main className="wrap page-main">
      <div className="auth-panel">
        <PageIntro eyebrow="GLOBAL SKILLS. REAL OPPORTUNITIES." title={title}>
          {mode === 'register'
            ? 'Join free as a client, a professional, or both. A verified email unlocks your workspace.'
            : 'Secure access to your Qamivo account.'}
        </PageIntro>
        <form className="form-panel" onSubmit={submit}>
          <div className="form-grid">
            {mode === 'register' && (
              <div>
                <label htmlFor="auth-name">Your name</label>
                <input
                  id="auth-name"
                  className="field"
                  name="name"
                  required
                  minLength={2}
                  maxLength={70}
                  autoComplete="name"
                />
              </div>
            )}
            {mode !== 'reset' && (
              <div>
                <label htmlFor="auth-email">Email address</label>
                <input
                  id="auth-email"
                  className="field"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                />
              </div>
            )}
            {mode !== 'forgot' && (
              <div>
                <label htmlFor="auth-password">
                  {mode === 'reset' ? 'New password' : 'Password'}
                </label>
                <input
                  id="auth-password"
                  className="field"
                  name="password"
                  type="password"
                  minLength={10}
                  maxLength={128}
                  required
                  autoComplete={
                    mode === 'login' ? 'current-password' : 'new-password'
                  }
                />
                {mode !== 'login' && (
                  <p className="muted">
                    Use at least 10 characters and a unique password.
                  </p>
                )}
              </div>
            )}
          </div>
          {error && (
            <div className="notice error" role="alert">
              {error}
            </div>
          )}
          {message && (
            <div className="notice success" role="status">
              {message}
            </div>
          )}
          <button
            className="button"
            disabled={pending || (mode === 'reset' && !canReset)}
          >
            {pending
              ? 'Please wait…'
              : {
                  login: 'Sign in',
                  register: 'Create free account',
                  forgot: 'Request recovery link',
                  reset: 'Update password',
                }[mode]}
          </button>
          {mode === 'register' && (
            <p className="muted">
              By registering, you acknowledge the{' '}
              <a className="text-link" href="/terms">
                early-access terms
              </a>{' '}
              and{' '}
              <a className="text-link" href="/privacy">
                privacy notice
              </a>
              .
            </p>
          )}
        </form>
        <p className="muted">
          {mode === 'login' ? (
            <>
              <a className="text-link" href="/forgot-password">
                Forgot password?
              </a>{' '}
              · New here?{' '}
              <a className="text-link" href="/register">
                Join Qamivo
              </a>
            </>
          ) : (
            <a
              className="text-link"
              href={mode === 'reset' ? '/dashboard' : '/login'}
            >
              {mode === 'reset'
                ? 'Go to workspace →'
                : 'Already a member? Sign in →'}
            </a>
          )}
        </p>
        <p className="muted">
          Email confirmation uses a secure link. Numeric OTP and social sign-in
          are not enabled.
        </p>
      </div>
    </main>
  )
}
