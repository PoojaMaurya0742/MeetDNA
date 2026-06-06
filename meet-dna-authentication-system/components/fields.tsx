'use client'

import {
  forwardRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  useState,
} from 'react'
import { Check, Eye, EyeOff, X } from 'lucide-react'

type Accent = 'green' | 'blue' | 'amber'

const focusRing: Record<Accent, string> = {
  green:
    'focus-within:border-accent-green focus-within:shadow-[0_0_0_3px_rgba(0,255,136,0.12)]',
  blue: 'focus-within:border-accent-blue focus-within:shadow-[0_0_0_3px_rgba(74,158,255,0.12)]',
  amber:
    'focus-within:border-accent-amber focus-within:shadow-[0_0_0_3px_rgba(255,170,0,0.12)]',
}

export function Field({
  label,
  icon,
  error,
  valid,
  accent = 'blue',
  trailing,
  children,
}: {
  label?: string
  icon?: ReactNode
  error?: string
  valid?: boolean
  accent?: Accent
  trailing?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="w-full">
      {label && (
        <label className="mb-1.5 block text-[13px] font-medium text-muted">
          {label}
        </label>
      )}
      <div
        className={`glass-input flex items-center gap-2.5 rounded-xl px-3.5 py-3 ${
          error
            ? 'border-accent-red shadow-[0_0_0_3px_rgba(255,68,102,0.1)]'
            : focusRing[accent]
        }`}
      >
        {icon && <span className="shrink-0 text-muted">{icon}</span>}
        {children}
        {valid && !error && (
          <Check className="size-4 shrink-0 text-accent-green" />
        )}
        {trailing}
      </div>
      {error && (
        <p className="mt-1.5 flex items-center gap-1 text-xs text-accent-red">
          <X className="size-3.5" />
          {error}
        </p>
      )}
    </div>
  )
}

export const BaseInput = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(function BaseInput(props, ref) {
  return (
    <input
      ref={ref}
      {...props}
      className={`w-full bg-transparent text-[15px] text-foreground placeholder:text-muted/70 focus:outline-none ${
        props.className ?? ''
      }`}
    />
  )
})

export function PasswordToggle({
  shown,
  onToggle,
}: {
  shown: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={shown ? 'Hide password' : 'Show password'}
      className="shrink-0 text-muted transition-colors hover:text-foreground"
    >
      {shown ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
    </button>
  )
}

export function usePasswordVisibility() {
  const [shown, setShown] = useState(false)
  return { shown, toggle: () => setShown((s) => !s), type: shown ? 'text' : 'password' }
}

/* ---------------- Buttons ---------------- */
type Variant = 'green' | 'blue' | 'amber' | 'red' | 'ghost'

interface ActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  loading?: boolean
  icon?: React.ReactNode
  fullWidth?: boolean
}

const variantStyles: Record<Variant, string> = {
  green: 'bg-[#00ff88] text-[#060810] hover:bg-[#00e87a] shadow-[0_0_24px_rgba(0,255,136,0.3)] hover:shadow-[0_0_32px_rgba(0,255,136,0.5)]',
  blue: 'bg-[#4a9eff] text-[#060810] hover:bg-[#3a8ef0] shadow-[0_0_24px_rgba(74,158,255,0.3)] hover:shadow-[0_0_32px_rgba(74,158,255,0.5)]',
  amber: 'bg-[#ffaa00] text-[#060810] hover:bg-[#f0a000] shadow-[0_0_24px_rgba(255,170,0,0.3)] hover:shadow-[0_0_32px_rgba(255,170,0,0.5)]',
  red: 'bg-[#ff4466] text-white hover:bg-[#e63d5c] shadow-[0_0_24px_rgba(255,68,102,0.3)]',
  ghost: 'bg-transparent border border-[rgba(255,255,255,0.12)] text-[rgba(240,244,255,0.7)] hover:bg-[rgba(255,255,255,0.06)] hover:text-[#f0f4ff]',
}

export function ActionButton({
  variant = 'green',
  loading = false,
  icon,
  fullWidth = false,
  children,
  disabled,
  className = '',
  ...props
}: ActionButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={[
        'inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 font-semibold text-sm',
        'transition-all duration-200 ease-out cursor-pointer',
        'disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none',
        variantStyles[variant],
        fullWidth ? 'w-full' : '',
        className,
      ].join(' ')}
      style={{ fontFamily: "'DM Sans', sans-serif" }}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin" width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="6" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2.5" />
          <path d="M8 2a6 6 0 0 1 6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      ) : icon ? (
        <span className="flex-shrink-0">{icon}</span>
      ) : null}
      {children}
    </button>
  )
}

/* ---------------- Checkbox ---------------- */
export function GlassCheckbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: ReactNode
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-sm text-foreground/90">
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`flex size-5 shrink-0 items-center justify-center rounded-md border transition-all ${
          checked
            ? 'border-accent-green bg-accent-green'
            : 'border-glass-border bg-glass'
        }`}
      >
        {checked && <Check className="size-3.5 text-black" strokeWidth={3} />}
      </button>
      <span>{label}</span>
    </label>
  )
}

/* ---------------- Toggle switch ---------------- */
export function ToggleSwitch({
  checked,
  onChange,
}: {
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
        checked ? 'bg-accent-green' : 'bg-white/10'
      }`}
    >
      <span
        className={`absolute top-0.5 size-5 rounded-full bg-white transition-transform ${
          checked ? 'translate-x-[22px]' : 'translate-x-0.5'
        }`}
      />
    </button>
  )
}

interface FieldInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const FieldInput = forwardRef<HTMLInputElement, FieldInputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            className="text-xs font-medium tracking-wider uppercase"
            style={{ color: 'rgba(240,244,255,0.5)' }}
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={[
            'w-full rounded-xl px-4 py-3 text-sm outline-none transition-all duration-150',
            'bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)]',
            'text-[#f0f4ff] placeholder:text-[rgba(240,244,255,0.25)]',
            'focus:border-[rgba(0,255,136,0.4)] focus:bg-[rgba(0,255,136,0.04)]',
            'focus:shadow-[0_0_0_3px_rgba(0,255,136,0.08)]',
            error ? 'border-[#ff4466] focus:border-[#ff4466]' : '',
            className,
          ].join(' ')}
          style={{ fontFamily: "'DM Sans', sans-serif" }}
          {...props}
        />
        {error && (
          <p className="text-xs" style={{ color: '#ff4466' }}>{error}</p>
        )}
      </div>
    )
  }
)
FieldInput.displayName = 'FieldInput'
