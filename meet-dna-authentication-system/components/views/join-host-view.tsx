'use client'

import { useEffect, useRef, useState } from 'react'
import {
  ArrowLeft,
  Camera,
  CameraOff,
  Check,
  Copy,
  Crown,
  Eye,
  EyeOff,
  Mail as MailIcon,
  Mic,
  MicOff,
  RefreshCw,
  User,
  Video,
} from 'lucide-react'
import {
  ActionButton,
  BaseInput,
  Field,
  PasswordToggle,
  ToggleSwitch,
  usePasswordVisibility,
} from '../fields'
import { DnaLogo, DnaSpinner } from '../dna-visuals'
import {
  generateMeetingCode,
  generatePassword,
  getCurrentUser,
  getMeeting,
  saveMeeting,
} from '@/lib/meetdna'

type Tab = 'join' | 'host'

function formatCode(raw: string) {
  let v = raw.toUpperCase().replace(/[^A-Z0-9]/g, '')
  // link paste detection
  if (raw.includes('meetdna.app/join/')) {
    v = raw.split('meetdna.app/join/')[1].toUpperCase().replace(/[^A-Z0-9]/g, '')
  }
  v = v.slice(0, 9)
  return v.replace(/(.{3})(.{1,3})?(.{1,3})?/, (_, a, b, c) =>
    [a, b, c].filter(Boolean).join('-'),
  )
}

/* ---------------- Camera preview ---------------- */
function MediaPreview({
  camOn,
  micOn,
  onToggleCam,
  onToggleMic,
  name,
}: {
  camOn: boolean
  micOn: boolean
  onToggleCam: () => void
  onToggleMic: () => void
  name: string
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [denied, setDenied] = useState(false)

  useEffect(() => {
    let active = true
    async function start() {
      if (!camOn) {
        streamRef.current?.getTracks().forEach((t) => t.stop())
        streamRef.current = null
        return
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        if (!active) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) videoRef.current.srcObject = stream
        setDenied(false)
      } catch {
        setDenied(true)
      }
    }
    start()
    return () => {
      active = false
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [camOn])

  const initial = name.trim().charAt(0).toUpperCase() || '?'

  return (
    <div className="overflow-hidden rounded-2xl border border-glass-border bg-black/40">
      <div className="relative flex aspect-video items-center justify-center">
        {camOn && !denied ? (
          <video ref={videoRef} autoPlay playsInline muted className="size-full -scale-x-100 object-cover" />
        ) : (
          <div className="flex size-16 items-center justify-center rounded-full bg-accent-green/15 font-display text-3xl text-accent-green">
            {initial}
          </div>
        )}
        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2">
          <button
            onClick={onToggleMic}
            aria-label="Toggle microphone"
            className={`flex size-9 items-center justify-center rounded-full backdrop-blur ${micOn ? 'bg-white/15 text-foreground' : 'bg-accent-red text-white'}`}
          >
            {micOn ? <Mic className="size-4" /> : <MicOff className="size-4" />}
          </button>
          <button
            onClick={onToggleCam}
            aria-label="Toggle camera"
            className={`flex size-9 items-center justify-center rounded-full backdrop-blur ${camOn ? 'bg-white/15 text-foreground' : 'bg-accent-red text-white'}`}
          >
            {camOn ? <Camera className="size-4" /> : <CameraOff className="size-4" />}
          </button>
        </div>
      </div>
      <p className="px-3 py-2 text-center text-xs text-accent-green">
        {denied
          ? 'Camera unavailable — using avatar'
          : camOn
            ? 'Camera ready · Microphone ready'
            : 'Camera off'}
      </p>
    </div>
  )
}

/* ---------------- Join tab ---------------- */
function JoinTab({ onJoin }: { onJoin: (code: string) => void }) {
  const [code, setCode] = useState('')
  const [pwField, setPwField] = useState('')
  const [name, setName] = useState('')
  const [camOn, setCamOn] = useState(false)
  const [micOn, setMicOn] = useState(true)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [shake, setShake] = useState(false)
  const pw = usePasswordVisibility()

  useEffect(() => {
    const u = getCurrentUser()
    if (u) setName(u.name)
  }, [])

  const cleanLen = code.replace(/-/g, '').length
  const codeComplete = cleanLen === 9
  const showPw = cleanLen >= 3

  function triggerShake() {
    setShake(true)
    setTimeout(() => setShake(false), 450)
  }

  async function join() {
    setErr('')
    if (!codeComplete) return (setErr('Enter a complete 9-character code'), triggerShake())
    if (!name.trim()) return (setErr('Please enter your name'), triggerShake())
    setLoading(true)
    await new Promise((r) => setTimeout(r, 900))
    const meeting = getMeeting(code)
    setLoading(false)
    if (!meeting || (meeting.password && meeting.password !== pwField)) {
      setErr('Meeting not found or incorrect password')
      return triggerShake()
    }
    onJoin(code)
  }

  return (
    <div className={`flex flex-col gap-4 ${shake ? 'animate-shake' : ''}`}>
      <div className="text-center">
        <span className="mb-2 inline-flex size-11 items-center justify-center rounded-2xl bg-accent-green/15 text-accent-green">
          <Video className="size-5" />
        </span>
        <h2 className="font-display text-3xl text-foreground">Join a meeting</h2>
        <p className="text-sm text-muted">Enter the meeting code or link to join</p>
      </div>

      <Field accent="green" valid={codeComplete}>
        <BaseInput
          value={code}
          onChange={(e) => setCode(formatCode(e.target.value))}
          placeholder="ABC-123-XYZ"
          className="text-center font-mono text-2xl tracking-[0.15em]"
          inputMode="text"
        />
      </Field>

      {showPw && (
        <div className="animate-fade-up">
          <Field label="Meeting password (if required)" accent="green"
            trailing={<PasswordToggle shown={pw.shown} onToggle={pw.toggle} />}>
            <BaseInput type={pw.type} value={pwField} onChange={(e) => setPwField(e.target.value)} placeholder="Optional" />
          </Field>
        </div>
      )}

      <Field label="Your name" icon={<User className="size-4" />} accent="green">
        <BaseInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter your name" />
      </Field>

      <MediaPreview camOn={camOn} micOn={micOn} onToggleCam={() => setCamOn((v) => !v)} onToggleMic={() => setMicOn((v) => !v)} name={name} />

      {err && (
        <p className="rounded-lg border border-accent-red/30 bg-accent-red/10 px-3 py-2 text-sm text-accent-red">{err}</p>
      )}

      <ActionButton variant="green" loading={loading} onClick={join}>
        {loading ? (<><DnaSpinner /> Joining...</>) : 'Join Meeting'}
      </ActionButton>
    </div>
  )
}

/* ---------------- Host tab ---------------- */
function HostTab({ onStart }: { onStart: (code: string) => void }) {
  const [title, setTitle] = useState('')
  const [scheduled, setScheduled] = useState(false)
  const [datetime, setDatetime] = useState('')
  const [requirePw, setRequirePw] = useState(false)
  const [meetPw, setMeetPw] = useState('')
  const [limit, setLimit] = useState(10)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [created, setCreated] = useState<null | { code: string; title: string; password: string | null }>(null)
  const pw = usePasswordVisibility()

  async function create() {
    setErr('')
    if (!title.trim()) return setErr('Please enter a meeting title')
    if (requirePw && !meetPw) return setErr('Set a password or disable the requirement')
    setLoading(true)
    await new Promise((r) => setTimeout(r, 1000))
    const code = generateMeetingCode()
    const user = getCurrentUser()
    saveMeeting({
      code,
      title: title.trim(),
      password: requirePw ? meetPw : null,
      hostId: user?.id || 'guest',
      createdAt: new Date().toISOString(),
      participants: [],
    })
    setLoading(false)
    setCreated({ code, title: title.trim(), password: requirePw ? meetPw : null })
  }

  if (created) return <CreatedPanel meeting={created} onStart={onStart} />

  return (
    <div className="flex flex-col gap-4">
      <div className="text-center">
        <span className="mb-2 inline-flex size-11 items-center justify-center rounded-2xl bg-accent-amber/15 text-accent-amber">
          <Crown className="size-5" />
        </span>
        <h2 className="font-display text-3xl text-foreground">Host a meeting</h2>
        <p className="text-sm text-muted">Create a new meeting room instantly</p>
      </div>

      <Field label="Meeting title" accent="amber">
        <BaseInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Q3 Strategy Review" />
      </Field>

      {/* schedule */}
      <div className="rounded-xl border border-glass-border bg-white/[0.02] p-3.5">
        <div className="flex items-center justify-between">
          <span className="text-sm text-foreground">{scheduled ? 'Schedule for later' : 'Start immediately'}</span>
          <ToggleSwitch checked={scheduled} onChange={setScheduled} />
        </div>
        {scheduled && (
          <div className="animate-fade-up mt-3">
            <input
              type="datetime-local"
              value={datetime}
              onChange={(e) => setDatetime(e.target.value)}
              className="glass-input w-full rounded-xl px-3.5 py-2.5 text-sm text-foreground focus:border-accent-amber focus:outline-none [color-scheme:dark]"
            />
          </div>
        )}
      </div>

      {/* security */}
      <div className="rounded-xl border border-glass-border bg-white/[0.02] p-3.5">
        <div className="flex items-center justify-between">
          <span className="text-sm text-foreground">Require meeting password</span>
          <ToggleSwitch checked={requirePw} onChange={(v) => { setRequirePw(v); if (v && !meetPw) setMeetPw(generatePassword()) }} />
        </div>
        {requirePw && (
          <div className="animate-fade-up mt-3">
            <Field accent="amber" trailing={
              <div className="flex items-center gap-1.5">
                <button type="button" onClick={() => setMeetPw(generatePassword())} aria-label="Generate password" className="text-muted hover:text-accent-amber">
                  <RefreshCw className="size-4" />
                </button>
                <PasswordToggle shown={pw.shown} onToggle={pw.toggle} />
              </div>
            }>
              <BaseInput type={pw.type} value={meetPw} onChange={(e) => setMeetPw(e.target.value)} placeholder="Password" className="font-mono" />
            </Field>
          </div>
        )}
      </div>

      {/* participant limit */}
      <div className="rounded-xl border border-glass-border bg-white/[0.02] p-3.5">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm text-foreground">Participant limit</span>
          <span className="font-mono text-2xl text-accent-green">{limit}</span>
        </div>
        <input
          type="range"
          min={2}
          max={50}
          value={limit}
          onChange={(e) => setLimit(Number(e.target.value))}
          className="dna-range w-full"
          style={{ background: `linear-gradient(to right, #00ff88 ${((limit - 2) / 48) * 100}%, rgba(255,255,255,0.1) ${((limit - 2) / 48) * 100}%)` }}
        />
      </div>

      {err && (
        <p className="rounded-lg border border-accent-red/30 bg-accent-red/10 px-3 py-2 text-sm text-accent-red">{err}</p>
      )}

      <ActionButton variant="amber" loading={loading} onClick={create}>
        {loading ? (<><DnaSpinner /> Creating room...</>) : 'Create Meeting'}
      </ActionButton>
    </div>
  )
}

/* ---------------- Created success panel ---------------- */
function CreatedPanel({
  meeting,
  onStart,
}: {
  meeting: { code: string; title: string; password: string | null }
  onStart: (code: string) => void
}) {
  const link = `meetdna.app/join/${meeting.code}`
  const [copied, setCopied] = useState(false)
  const [showPw, setShowPw] = useState(false)

  function copy(text: string) {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="animate-fade-up flex flex-col items-center gap-4 text-center">
      <svg viewBox="0 0 120 120" className="size-20">
        <circle cx="60" cy="60" r="50" fill="none" stroke="#00ff88" strokeWidth="5" className="circle-draw" />
        <path d="M38 62 L54 78 L84 44" fill="none" stroke="#00ff88" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" className="check-draw" />
      </svg>
      <div>
        <h2 className="font-display text-3xl text-accent-green">Meeting created!</h2>
        <p className="mt-1 text-foreground">{meeting.title}</p>
      </div>

      <div className="w-full rounded-2xl border border-accent-green/40 bg-accent-green/5 px-4 py-5 shadow-[0_0_30px_rgba(0,255,136,0.1)]">
        <p className="font-mono text-3xl tracking-[0.1em] text-accent-green">{meeting.code}</p>
      </div>

      <div className="flex w-full items-center justify-between gap-2 rounded-xl border border-glass-border bg-white/[0.03] px-3 py-2.5">
        <span className="truncate font-mono text-sm text-muted">{link}</span>
        <button onClick={() => copy(`https://${link}`)} aria-label="Copy link" className="shrink-0 text-muted hover:text-accent-green">
          {copied ? <Check className="size-4 text-accent-green" /> : <Copy className="size-4" />}
        </button>
      </div>

      {meeting.password && (
        <div className="flex w-full items-center justify-between rounded-xl border border-glass-border bg-white/[0.03] px-3 py-2.5 text-sm">
          <span className="text-muted">
            Password: <span className="font-mono text-foreground">{showPw ? meeting.password : '••••••••'}</span>
          </span>
          <button onClick={() => setShowPw((s) => !s)} aria-label="Reveal password" className="text-muted hover:text-foreground">
            {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      )}

      <div className="grid w-full grid-cols-2 gap-3">
        <button
          onClick={() => copy(`https://${link}`)}
          className="glass-input flex h-12 items-center justify-center gap-2 rounded-xl text-sm font-medium text-foreground transition-colors hover:bg-glass-hover"
        >
          {copied ? <><Check className="size-4 text-accent-green" /> Copied!</> : <><Copy className="size-4" /> Copy Invite Link</>}
        </button>
        <ActionButton variant="green" className="!h-12" onClick={() => onStart(meeting.code)}>
          Start Meeting Now
        </ActionButton>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xs text-muted">Share:</span>
        {[
          { label: 'Copy', icon: <Copy className="size-4" />, action: () => copy(`https://${link}`) },
          { label: 'WhatsApp', icon: <WhatsAppIcon />, action: () => window.open(`https://wa.me/?text=${encodeURIComponent(`Join my MeetDNA meeting: https://${link}`)}`, '_blank') },
          { label: 'Email', icon: <MailIcon className="size-4" />, action: () => window.open(`mailto:?subject=${encodeURIComponent('Join my MeetDNA meeting')}&body=${encodeURIComponent(`Join here: https://${link}`)}`) },
        ].map((s) => (
          <button key={s.label} onClick={s.action} aria-label={s.label} className="glass-input flex size-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-glass-hover hover:text-foreground">
            {s.icon}
          </button>
        ))}
      </div>
    </div>
  )
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="currentColor">
      <path d="M17.5 14.4c-.3-.15-1.7-.84-1.96-.94-.26-.1-.45-.15-.64.15-.19.29-.74.94-.9 1.13-.17.19-.33.21-.62.07-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.75-1.64-2.05-.17-.29-.02-.45.13-.6.13-.13.3-.34.44-.51.15-.17.2-.29.3-.48.1-.19.05-.36-.02-.51-.08-.15-.64-1.55-.88-2.12-.23-.55-.47-.48-.64-.49h-.55c-.19 0-.5.07-.76.36s-1 .98-1 2.38 1.02 2.76 1.17 2.95c.15.19 2.01 3.08 4.88 4.32.68.29 1.21.47 1.63.6.68.22 1.31.19 1.8.11.55-.08 1.7-.69 1.94-1.36.24-.67.24-1.24.17-1.36-.07-.12-.26-.19-.55-.34Z" />
      <path d="M12 2a10 10 0 0 0-8.5 15.3L2 22l4.8-1.5A10 10 0 1 0 12 2Zm0 18a8 8 0 0 1-4.1-1.1l-.3-.18-2.85.9.93-2.78-.2-.32A8 8 0 1 1 12 20Z" />
    </svg>
  )
}

/* ---------------- Wrapper with tabs ---------------- */
export function JoinHostView({
  onBack,
  onJoin,
}: {
  onBack: () => void
  onJoin: (code: string) => void
}) {
  const [tab, setTab] = useState<Tab>('join')

  return (
    <div className="glass-card w-full max-w-[500px] p-7 sm:p-8">
      <div className="mb-6 flex items-center justify-between">
        <button onClick={onBack} aria-label="Back" className="flex size-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-white/5 hover:text-foreground">
          <ArrowLeft className="size-5" />
        </button>
        <div className="flex items-center gap-1.5">
          <DnaLogo className="size-5" />
          <span className="font-display text-lg tracking-wide text-foreground">MeetDNA</span>
        </div>
        <div className="size-9" />
      </div>

      {/* tabs */}
      <div className="relative mb-6 grid grid-cols-2 rounded-xl border border-glass-border bg-white/[0.02] p-1">
        <span
          className="absolute inset-y-1 w-[calc(50%-4px)] rounded-lg bg-accent-green/15 transition-transform duration-300"
          style={{ transform: tab === 'host' ? 'translateX(calc(100% + 8px))' : 'translateX(0)' }}
        />
        {(['join', 'host'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`relative z-10 rounded-lg py-2 text-sm font-semibold transition-colors ${tab === t ? 'text-accent-green' : 'text-muted hover:text-foreground'}`}
          >
            {t === 'join' ? 'Join Meeting' : 'Host Meeting'}
          </button>
        ))}
      </div>

      <div key={tab} className="animate-view-in">
        {tab === 'join' ? <JoinTab onJoin={onJoin} /> : <HostTab onStart={onJoin} />}
      </div>
    </div>
  )
}
