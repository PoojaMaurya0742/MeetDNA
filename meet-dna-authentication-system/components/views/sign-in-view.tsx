'use client'

import { useState } from 'react'
import { ArrowLeft, CheckCircle2, Lock, Mail } from 'lucide-react'
import {
  ActionButton,
  BaseInput,
  Field,
  GlassCheckbox,
  PasswordToggle,
  usePasswordVisibility,
} from '../fields'
import { DnaLogo, DnaSpinner } from '../dna-visuals'
import { isValidEmail } from '@/lib/meetdna'
import { apiSignIn } from '@/lib/api'
import type { View } from '../meetdna-app'

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z" />
    </svg>
  )
}
function MicrosoftIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4">
      <path fill="#F25022" d="M3 3h8.5v8.5H3z" />
      <path fill="#7FBA00" d="M12.5 3H21v8.5h-8.5z" />
      <path fill="#00A4EF" d="M3 12.5h8.5V21H3z" />
      <path fill="#FFB900" d="M12.5 12.5H21V21h-8.5z" />
    </svg>
  )
}

export function SignInView({
  onBack,
  onNavigate,
  onAuthed,
}: {
  onBack: () => void
  onNavigate: (v: View) => void
  onAuthed: () => void
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [emailErr, setEmailErr] = useState('')
  const [pwErr, setPwErr] = useState('')
  const [formErr, setFormErr] = useState('')
  const [loading, setLoading] = useState(false)
  const [shake, setShake] = useState(false)
  const pw = usePasswordVisibility()

  const [forgotOpen, setForgotOpen] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotSent, setForgotSent] = useState(false)

  const emailValid = isValidEmail(email)

  function triggerShake() {
    setShake(true)
    setTimeout(() => setShake(false), 450)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormErr('')
    let ok = true
    if (!emailValid) {
      setEmailErr('Enter a valid email address')
      ok = false
    } else setEmailErr('')
    if (!password) {
      setPwErr('Password is required')
      ok = false
    } else setPwErr('')
    if (!ok) return triggerShake()

    setLoading(true)
    try {
      await apiSignIn(email, password)
      onAuthed()
    } catch (err) {
      setFormErr(err instanceof Error ? err.message : 'Sign in failed')
      triggerShake()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`glass-card w-full max-w-[460px] p-7 sm:p-8 ${shake ? 'animate-shake border-accent-red' : ''}`}>
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={onBack}
          aria-label="Back"
          className="flex size-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-white/5 hover:text-foreground"
        >
          <ArrowLeft className="size-5" />
        </button>
        <div className="flex items-center gap-1.5">
          <DnaLogo className="size-5" />
          <span className="font-display text-lg tracking-wide text-foreground">MeetDNA</span>
        </div>
        <div className="size-9" />
      </div>

      <h2 className="font-display text-4xl text-foreground">Welcome back</h2>
      <p className="mt-1 text-sm text-muted">Sign in to your intelligence hub</p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4" noValidate>
        <Field
          label="Email address"
          icon={<Mail className="size-4" />}
          error={emailErr}
          valid={emailValid && email.length > 0}
          accent="blue"
        >
          <BaseInput
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              if (emailErr) setEmailErr('')
            }}
            autoComplete="email"
          />
        </Field>

        <Field
          label="Password"
          icon={<Lock className="size-4" />}
          error={pwErr}
          accent="blue"
          trailing={<PasswordToggle shown={pw.shown} onToggle={pw.toggle} />}
        >
          <BaseInput
            type={pw.type}
            placeholder="••••••••"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              if (pwErr) setPwErr('')
            }}
            autoComplete="current-password"
          />
        </Field>

        <div className="flex items-center justify-between">
          <GlassCheckbox checked={remember} onChange={setRemember} label="Remember me for 30 days" />
          <button
            type="button"
            onClick={() => setForgotOpen((o) => !o)}
            className="text-sm text-accent-blue transition-colors hover:underline"
          >
            Forgot password?
          </button>
        </div>

        {forgotOpen && (
          <div className="animate-fade-up rounded-xl border border-glass-border bg-white/[0.03] p-4">
            {forgotSent ? (
              <p className="flex items-center gap-2 text-sm text-accent-green">
                <CheckCircle2 className="size-4" /> Check your email for a reset link
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                <Field icon={<Mail className="size-4" />} accent="blue">
                  <BaseInput
                    type="email"
                    placeholder="Enter your account email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                  />
                </Field>
                <button
                  type="button"
                  disabled={!isValidEmail(forgotEmail)}
                  onClick={() => setForgotSent(true)}
                  className="h-10 rounded-xl border border-accent-blue text-sm font-semibold text-accent-blue transition-colors hover:bg-accent-blue/10 disabled:opacity-50"
                >
                  Send Reset Link
                </button>
              </div>
            )}
          </div>
        )}

        {formErr && (
          <p className="flex items-center gap-1.5 rounded-lg border border-accent-red/30 bg-accent-red/10 px-3 py-2 text-sm text-accent-red">
            {formErr}
          </p>
        )}

        <ActionButton type="submit" variant="green" loading={loading}>
          {loading ? (
            <>
              <DnaSpinner /> Signing in...
            </>
          ) : (
            'Sign In'
          )}
        </ActionButton>
      </form>

      <div className="my-6 flex items-center gap-3 text-xs text-muted">
        <span className="h-px flex-1 bg-glass-border" />
        or continue with
        <span className="h-px flex-1 bg-glass-border" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          { icon: <GoogleIcon />, label: 'Google' },
          { icon: <MicrosoftIcon />, label: 'Microsoft' },
        ].map((s) => (
          <button
            key={s.label}
            type="button"
            className="glass-input flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-medium text-foreground transition-colors hover:bg-glass-hover"
          >
            {s.icon}
            {s.label}
          </button>
        ))}
      </div>

      <p className="mt-6 text-center text-sm text-muted">
        Don&apos;t have an account?{' '}
        <button onClick={() => onNavigate('signup')} className="font-semibold text-accent-green hover:underline">
          Create one
        </button>
      </p>
    </div>
  )
}
