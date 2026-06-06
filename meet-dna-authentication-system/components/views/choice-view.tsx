'use client'

import { KeyRound, Sparkles, Video } from 'lucide-react'
import type { View } from '../meetdna-app'

const cards = [
  {
    id: 'signin' as View,
    icon: KeyRound,
    accent: 'blue',
    title: 'Welcome Back',
    sub: 'Access your meeting intelligence',
    cta: 'Sign In',
    btn: 'border border-accent-blue text-accent-blue hover:bg-accent-blue/10 hover:shadow-[0_0_24px_rgba(74,158,255,0.2)]',
    iconColor: 'text-accent-blue',
    ring: '',
  },
  {
    id: 'signup' as View,
    icon: Sparkles,
    accent: 'green',
    title: 'Get Started',
    sub: 'Create your MeetDNA account',
    cta: 'Create Account',
    btn: 'bg-gradient-to-r from-accent-green to-[#00cc6a] text-black font-bold shadow-[0_6px_24px_rgba(0,255,136,0.25)] hover:shadow-[0_8px_30px_rgba(0,255,136,0.45)]',
    iconColor: 'text-accent-green',
    ring: 'border-accent-green/40 shadow-[0_0_40px_rgba(0,255,136,0.12)]',
    featured: true,
  },
  {
    id: 'join' as View,
    icon: Video,
    accent: 'amber',
    title: 'Join a Meeting',
    sub: 'Enter code or link to join',
    cta: 'Join Now',
    btn: 'border border-accent-amber text-accent-amber hover:bg-accent-amber/10 hover:shadow-[0_0_24px_rgba(255,170,0,0.2)]',
    iconColor: 'text-accent-amber',
    ring: '',
  },
]

export function ChoiceView({ onSelect }: { onSelect: (v: View) => void }) {
  return (
    <div className="w-full max-w-5xl">
      <div className="mb-8 text-center lg:hidden">
        <h2 className="font-display text-4xl text-foreground">Choose your path</h2>
        <p className="mt-1 text-sm text-muted">Sign in, create an account, or join a meeting.</p>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {cards.map((c, i) => {
          const Icon = c.icon
          return (
            <div
              key={c.id}
              style={{ animationDelay: `${i * 90}ms` }}
              className={`glass-card animate-fade-up relative flex flex-col p-6 ${c.ring} ${
                'featured' in c && c.featured ? 'md:-translate-y-3' : ''
              }`}
            >
              {'featured' in c && c.featured && (
                <span className="absolute right-4 top-4 rounded-full bg-accent-green/15 px-2.5 py-0.5 text-[11px] font-bold tracking-wide text-accent-green">
                  FREE
                </span>
              )}
              <span
                className={`mb-5 inline-flex size-12 items-center justify-center rounded-2xl bg-white/5 ${c.iconColor}`}
              >
                <Icon className="size-6" />
              </span>
              <h3 className="text-xl font-bold text-foreground">{c.title}</h3>
              <p className="mt-1 text-sm text-muted">{c.sub}</p>
              <button
                onClick={() => onSelect(c.id)}
                className={`mt-6 flex h-12 w-full items-center justify-center rounded-xl text-[15px] transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${c.btn}`}
              >
                {c.cta}
              </button>
            </div>
          )
        })}
      </div>

      <p className="mt-8 text-center text-xs text-muted">
        By continuing, you agree to MeetDNA&apos;s Terms of Service
      </p>
    </div>
  )
}
