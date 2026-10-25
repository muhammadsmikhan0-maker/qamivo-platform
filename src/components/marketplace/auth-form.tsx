import { useState, useEffect } from 'react'
import {
  login,
  requestPasswordRecovery,
  updateUser,
  getUser,
} from '@netlify/identity'
import { PageIntro } from './layout'

type SignupStartResponse = { challengeId?: string; message?: string; error?: string }
type SignupVerifyResponse = { created?: boolean; message?: string; error?: string }

export function AuthForm({
  mode,
}: {
  mode: 'login' | 'register' | 'forgot' | 'reset'
}) {
  const [pending, setPending] = useState(false),
    [error, setError] = useState(''),
    [message, setMessage] = useState(''),
    [canReset, setCanReset] = useState(false)
  const [otpStep, setOtpStep] = useState(false)
  const [registrationComplete, setRegistrationComplete] = useState(false)
  const [pendingSignup, setPendingSignup] = useState<{
    email: string
    name: string
    password: string
  } | null>(null)

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

  async function postJson<T>(
    path: string,
    body: unknown,
  ): Promise<{ response: Response; payload: T & { error?: string } }> {
    const response = await fetch(path, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const payload = (await response.json().catch(() => ({}))) as T & { error?: string }
    return { response, payload }
  }

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
        return
      }

      if (mode === 'register' && !otpStep) {
        const email = String(f.get('email')).trim().toLowerCase()
        const name = String(f.get('name')).trim()
        const password = String(f.get('password'))
        const { response, payload } = await postJson<SignupStartResponse>(
          '/api/auth/signup/start',
          { email, fullName: name },
        )
        if (!response.ok || !payload.challengeId) {
          throw new Error(payload.error || 'The verification email could not be requested.')
        }
        setPendingSignup({ email, name, password })
        setOtpStep(true)
        setMessage(
          payload.message ||
            'The provider accepted the verification email request. Delivery is tracked separately.',
        )
        return
      }

      if (mode === 'register' && otpStep) {
        if (!pendingSignup) {
          throw new Error('Registration details expired. Start registration again.')
        }
        const code = String(f.get('code') || '').trim()
        const { response, payload } = await postJson<SignupVerifyResponse>(
          '/api/auth/signup/verify',
          {
            email: pendingSignup.email,
            code,
            password: pendingSignup.password,
          },
        )
        if (!response.ok || !payload.created) {
          throw new Error(payload.error || 'Account creation could not be verified.')
        }
        setPendingSignup(null)
        setOtpStep(false)
        setRegistrationComplete(true)
        setMessage(payload.message || 'Email verified and account created. Sign in to continue.')
        return
      }

      if (mode === 'forgot') {
        await requestPasswordRecovery(String(f.get('email')))
        setMessage(
          'Recovery request accepted. If an eligible account exists, check its inbox for a recovery link.',
        )
        return
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

  async function resendOtp() {
    if (!pendingSignup) return
    setPending(true)
    setError('')
    setMessage('')
    try {
      const { response, payload } = await postJson<SignupStartResponse>(
        '/api/auth/signup/start',
        { email: pendingSignup.email, fullName: pendingSignup.name },
      )
      if (!response.ok || !payload.challengeId) {
        throw new Error(payload.error || 'A new verification code could not be requested.')
      }
      setMessage(
        payload.message ||
          'The provider accepted the verification email request. Delivery is tracked separately.',
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'A new code could not be requested.')
    } finally {
      setPending(false)
    }
  }

  return (
    <main className="wrap page-main">
      <div className="auth-panel">
        <PageIntro eyebrow="GLOBAL SKILLS. REAL OPPORTUNITIES." title={title}>
          {mode === 'register'
            ? 'Join free as a client, a professional, or both. Verify your email to create your account.'
            : 'Secure access to your Qamivo account.'}
        </PageIntro>

        {mode === 'register' && registrationComplete ? (
          <div className="form-panel">
            <div className="notice success" role="status">
              {message || 'Email verified and account created.'}
            </div>
            <a className="button" href="/login">
              Sign in to Qamivo
            </a>
          </div>
        ) : (
          <form className="form-panel" onSubmit={submit}>
            <div className="form-grid">
              {mode === 'register' && !otpStep && (
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

              {mode !== 'reset' && !(mode === 'register' && otpStep) && (
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

              {mode !== 'forgot' && !(mode === 'register' && otpStep) && (
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

              {mode === 'register' && otpStep && (
                <div className="full">
                  <p className="muted">
                    Verification request for {pendingSignup?.email}. The code expires in 10 minutes.
                  </p>
                  <label htmlFor="auth-code">Six-digit email verification code</label>
                  <input
                    id="auth-code"
                    className="field"
                    name="code"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    minLength={6}
                    maxLength={6}
                    autoComplete="one-time-code"
                    required
                  />
                  <div className="inline-actions" style={{ marginTop: 10 }}>
                    <button
                      type="button"
                      className="button secondary"
                      disabled={pending || !pendingSignup}
                      onClick={() => void resendOtp()}
                    >
                      Resend code
                    </button>
                    <button
                      type="button"
                      className="text-link"
                      disabled={pending}
                      onClick={() => {
                        setOtpStep(false)
                        setPendingSignup(null)
                        setError('')
                        setMessage('')
                      }}
                    >
                      Use a different email
                    </button>
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className="notice error" role="alert">
                {error}
              </div>
            )}
            {message && (
              <div className="notice" role="status">
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
                    register: otpStep
                      ? 'Verify code & create account'
                      : 'Send verification code',
                    forgot: 'Request recovery link',
                    reset: 'Update password',
                  }[mode]}
            </button>

            {mode === 'register' && !otpStep && (
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
        )}

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
          {mode === 'register'
            ? 'New registrations use a six-digit email verification code. Password recovery and existing Identity confirmation links remain provider-managed.'
            : 'Password recovery uses a secure email link. Numeric verification codes are used during new registration.'}
        </p>
      </div>
    </main>
  )
}
