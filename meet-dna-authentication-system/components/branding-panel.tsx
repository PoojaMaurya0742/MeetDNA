'use client'

import { useEffect, useRef, useState } from 'react'
import { Brain, Dna, Zap } from 'lucide-react'
import { DnaLogo, HelixLines } from './dna-visuals'

function useCountUp(target: number, duration = 1600) {
  const [value, setValue] = useState(0)
  const started = useRef(false)
  useEffect(() => {
    if (started.current) return
    started.current = true
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setValue(Math.round(target * eased))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])
  return value
}

const pills = [
  { icon: Dna, label: 'AI DNA Extraction' },
  { icon: Brain, label: 'Hindsight Memory' },
  { icon: Zap, label: 'Real-time Copilot' },
]

function Stat({ target, suffix, label }: { target: number; suffix?: string; label: string }) {
  const value = useCountUp(target)
  return (
    <div>
      <div className="font-mono text-xl font-semibold text-foreground sm:text-2xl">
        {value.toLocaleString()}
        {suffix}
      </div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  )
}

export function BrandingPanel() {
  return (
    <aside className="relative flex h-full flex-col overflow-hidden">
      {/* drifting helix in the panel */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.05]">
        <HelixLines className="helix-drift h-[160%] w-full text-accent-green" />
      </div>

      {/* logo */}
      <div className="relative z-10 flex items-center gap-2.5">
        <DnaLogo className="size-8" />
        <span className="font-display text-3xl tracking-wide text-foreground">
          MeetDNA
        </span>
      </div>

      {/* center copy */}
      <div className="relative z-10 mt-auto">
        <h1 className="font-display text-5xl leading-[1.05] text-foreground text-balance lg:text-6xl">
          Intelligence in
          <br />
          every meeting
        </h1>
        <p className="mt-4 max-w-sm text-pretty text-base leading-relaxed text-muted">
          Extract decisions. Store memory. Brief the future.
        </p>

        <div className="mt-7 flex flex-wrap gap-2.5">
          {pills.map(({ icon: Icon, label }) => (
            <span
              key={label}
              className="glass-input inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium text-foreground/90"
            >
              <Icon className="size-3.5 text-accent-green" />
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* stats */}
      <div className="relative z-10 mt-auto grid grid-cols-3 gap-4 border-t border-glass-border pt-6">
        <Stat target={2847} label="Meetings Analyzed" />
        <Stat target={18392} label="DNA Strands Stored" />
        <Stat target={94} suffix="%" label="Context Retained" />
      </div>
    </aside>
  )
}
