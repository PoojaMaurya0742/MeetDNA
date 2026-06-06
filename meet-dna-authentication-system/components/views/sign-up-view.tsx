'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft, Briefcase, Building2, Check, Lock, Mail, User } from 'lucide-react'
import {
  ActionButton,
  BaseInput,
  Field,
  GlassCheckbox,
  PasswordToggle,
  usePasswordVisibility,
} from '../fields'
import { DnaLogo, DnaSpinner } from '../dna-visuals'
import { checkPasswordStrength, isValidEmail } from '@/lib/meetdna'
import { apiSignUp } from '@/lib/api'
import type { View } from '../meetdna-app'

const steps = ['Account', 'Security', 'Profile']
const strengthColors = ['#5a6a88', '#ff4466', '#ffaa00', '#ffd000', '#00ff88', '#00ff88']

function ProgressBar({ step }: { step: number }) {
  return (
    <div className="mb-6 flex items-center">
      {steps.map((label, i) => {
        const idx = i + 1
        const done = step > idx
        const active = step === idx
        return (
          <div key={label} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <span
                className={`flex size-7 items-center justify-center rounded-full text-xs font-bold transition-all ${
                  done
                    ? 'bg-accent-green text-black'
                    : active
                      ? 'border-2 border-accent-green text-accent-green'
                      : 'border border-glass-border text-muted'
                }`}
              >
                {done ? <Check className="size-3.5" strokeWidth={3} /> : idx}
              </span>
              <span className={`text-[11px] ${active || done ? 'text-foreground' : 'text-muted'}`}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className="mx-2 h-0.5 flex-1 overflow-hidden rounded-full bg-glass-border">
                <div
                  className="h-full bg-accent-green transition-all duration-500"
                  style={{ width: step > idx ? '100%' : '0%' }}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function SuccessScreen({ name, onDone }: { name: string; onDone: () => void }) {
  const [progress, setProgress] = useState(0)
  useEffect(() => {
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const p = Math.min((now - start) / 2000, 1)
      setProgress(p * 100)
      if (p < 1) raf = requestAnimationFrame(tick)
      else onDone()
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <div className="flex flex-col items-center py-8 text-center">
      <svg viewBox="0 0 120 120" className="size-24">
        <circle cx="60" cy="60" r="50" fill="none" stroke="#00ff88" strokeWidth="5" className="circle-draw" />
        <path d="M38 62 L54 78 L84 44" fill="none" stroke="#00ff88" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" className="check-draw" />
      </svg>
      <h2 className="mt-5 font-display text-4xl text-accent-green">Account Created!</h2>
      <p className="mt-1 text-foreground">Welcome to MeetDNA, {name}</p>
      <p className="mt-4 text-sm text-muted">Redirecting to dashboard...</p>
      <div className="mt-3 h-1.5 w-48 overflow-hidden rounded-full bg-glass-border">
        <div className="h-full bg-accent-green" style={{ width: `${progress}%` }} />
      </div>
    </div>
  )
}

export function SignUpView({
  onBack,
  onNavigate,
  onAuthed,
}: {
  onBack: () => void
  onNavigate: (v: View) => void
  onAuthed: () => void
}) {
  const [step, setStep] = useState(1)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formErr, setFormErr] = useState('')

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [org, setOrg] = useState('')
  const [hear, setHear] = useState('')
  const [agree, setAgree] = useState(false)

  const pw = usePasswordVisibility()
  const cpw = usePasswordVisibility()

  const nameValid = name.trim().length >= 2 && !/\d/.test(name)
  const emailValid = isValidEmail(email)
  const strength = checkPasswordStrength(password)
  const allChecks = strength.score === 5
  const confirmMatch = confirm.length > 0 && confirm === password

  const checkList = [
    { key: 'length', label: 'At least 8 characters' },
    { key: 'uppercase', label: 'One uppercase letter (A-Z)' },
    { key: 'lowercase', label: 'One lowercase letter (a-z)' },
    { key: 'number', label: 'One number (0-9)' },
    { key: 'special', label: 'One special character (!@#$...)' },
  ] as const

  function next() {
    setFormErr('')
    if (step === 1) {
      if (!nameValid || !emailValid) return setFormErr('Please complete the fields correctly')
      setStep(2)
    } else if (step === 2) {
      if (!allChecks) return setFormErr('Password does not meet all requirements')
      if (!confirmMatch) return setFormErr('Passwords do not match')
      setStep(3)
    }
  }

  async function create() {
    setFormErr('')
    if (!agree) return setFormErr('You must agree to the Terms to continue')
    setLoading(true)
    try {
      await apiSignUp(name.trim(), email, password)
      setSuccess(true)
    } catch (err) {
      setFormErr(err instanceof Error ? err.message : 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="glass-card w-full max-w-[480px] p-7 sm:p-8">
        <SuccessScreen name={name.trim().split(' ')[0]} onDone={onAuthed} />
      </div>
    )
  }

  return (
    <div className="glass-card w-full max-w-[480px] p-7 sm:p-8">
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={() => (step > 1 ? setStep(step - 1) : onBack())}
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

      <ProgressBar step={step} />

      <div key={step} className="animate-view-in">
        {step === 1 && (
          <div className="flex flex-col gap-4">
            <h2 className="font-display text-3xl text-foreground">Create your account</h2>
            <Field label="Full name" icon={<User className="size-4" />} accent="green" valid={nameValid}
              error={name.length > 0 && !nameValid ? 'Min 2 characters, no numbers' : ''}>
              <BaseInput placeholder="Jane Doe" value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="Email address" icon={<Mail className="size-4" />} accent="green" valid={emailValid}
              error={email.length > 0 && !emailValid ? 'Enter a valid email address' : ''}>
              <BaseInput type="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-4">
            <h2 className="font-display text-3xl text-foreground">Secure your account</h2>
            <Field label="Password" icon={<Lock className="size-4" />} accent="green"
              trailing={<PasswordToggle shown={pw.shown} onToggle={pw.toggle} />}>
              <BaseInput type={pw.type} placeholder="Create a strong password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </Field>

            {/* strength meter */}
            <div>
              <div className="flex gap-1.5">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="h-1.5 flex-1 overflow-hidden rounded-full bg-glass-border">
                    <div
                      className="h-full transition-all duration-300"
                      style={{
                        width: strength.score > i ? '100%' : '0%',
                        backgroundColor: strengthColors[strength.score],
                      }}
                    />
                  </div>
                ))}
              </div>
              {password.length > 0 && (
                <p className="mt-1.5 text-xs font-medium" style={{ color: strengthColors[strength.score] }}>
                  {strength.label}
                </p>
              )}
            </div>

            <ul className="grid gap-1.5">
              {checkList.map((c) => {
                const met = strength.checks[c.key]
                return (
                  <li key={c.key} className={`flex items-center gap-2 text-xs ${met ? 'text-accent-green' : 'text-muted'}`}>
                    <span className={`flex size-4 items-center justify-center rounded-full ${met ? 'bg-accent-green/20' : 'bg-white/5'}`}>
                      {met ? <Check className="size-2.5" strokeWidth={3} /> : <span className="text-[10px]">·</span>}
                    </span>
                    {c.label}
                  </li>
                )
              })}
            </ul>

            <Field label="Confirm password" icon={<Lock className="size-4" />} accent="green" valid={confirmMatch}
              error={confirm.length > 0 && !confirmMatch ? 'Passwords do not match' : ''}
              trailing={<PasswordToggle shown={cpw.shown} onToggle={cpw.toggle} />}>
              <BaseInput type={cpw.type} placeholder="Re-enter password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </Field>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-4">
            <h2 className="font-display text-3xl text-foreground">Tell us about you</h2>
            <Field label="Job title (optional)" icon={<Briefcase className="size-4" />} accent="green">
              <BaseInput placeholder="Product Manager" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
            </Field>
            <Field label="Organization (optional)" icon={<Building2 className="size-4" />} accent="green">
              <BaseInput placeholder="Acme Inc." value={org} onChange={(e) => setOrg(e.target.value)} />
            </Field>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-muted">How did you hear about us?</label>
              <div className="glass-input rounded-xl px-3 py-1 focus-within:border-accent-green">
                <select
                  value={hear}
                  onChange={(e) => setHear(e.target.value)}
                  className="w-full bg-transparent py-2 text-[15px] text-foreground focus:outline-none [&>option]:bg-bg-secondary"
                >
                  <option value="">Select an option</option>
                  <option value="search">Search engine</option>
                  <option value="social">Social media</option>
                  <option value="friend">Friend or colleague</option>
                  <option value="blog">Blog or article</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            <GlassCheckbox
              checked={agree}
              onChange={setAgree}
              label={<span className="text-sm text-muted">I agree to the Terms of Service and Privacy Policy</span>}
            />
          </div>
        )}
      </div>

      {formErr && (
        <p className="mt-4 flex items-center gap-1.5 rounded-lg border border-accent-red/30 bg-accent-red/10 px-3 py-2 text-sm text-accent-red">
          {formErr}
        </p>
      )}

      <div className="mt-6">
        {step < 3 ? (
          <ActionButton variant="green" onClick={next}>
            Continue
          </ActionButton>
        ) : (
          <ActionButton variant="green" loading={loading} onClick={create}>
            {loading ? (
              <>
                <DnaSpinner /> Creating your account...
              </>
            ) : (
              'Create Account'
            )}
          </ActionButton>
        )}
      </div>

      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{' '}
        <button onClick={() => onNavigate('signin')} className="font-semibold text-accent-blue hover:underline">
          Sign in
        </button>
      </p>
    </div>
  )
}
