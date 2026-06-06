'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Video, Crown, LogOut, Calendar, Clock, Users, BarChart3,
  ChevronRight, Plus, Hash, Zap, AlertCircle, RefreshCw,
  TrendingUp, CheckCircle2, Timer, Dna
} from 'lucide-react'

import {SceneBackground} from '@/components/scene-background'
import { DnaLogo, DnaSpinner } from '@/components/dna-visuals'
import { ActionButton, FieldInput } from '@/components/fields'
import {
  getToken, getStoredUser, clearAuth, apiGetMe, apiGetMeetingHistory,
  apiCreateMeeting, apiJoinMeeting,
  type Meeting, type StoredUser
} from '@/lib/api'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function formatDuration(seconds: number | null) {
  if (!seconds) return '—'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m >= 60) return `${Math.floor(m / 60)}h ${m % 60}m`
  return `${m}m ${s}s`
}

function statusColor(status: Meeting['status']) {
  return {
    waiting: { bg: 'rgba(255,170,0,0.12)', color: '#ffaa00', dot: '#ffaa00' },
    active:  { bg: 'rgba(0,255,136,0.12)', color: '#00ff88', dot: '#00ff88' },
    ended:   { bg: 'rgba(240,244,255,0.06)', color: 'rgba(240,244,255,0.45)', dot: 'rgba(240,244,255,0.25)' },
  }[status]
}

// ─── Modal: Host Meeting ──────────────────────────────────────────────────────

function HostModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: (code: string) => void }) {
  const [title, setTitle] = useState('')
  const [topic, setTopic] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleHost = async () => {
    if (!title.trim()) { setError('Meeting title is required'); return }
    setLoading(true); setError('')
    try {
      const m = await apiCreateMeeting(title.trim(), topic.trim())
      onSuccess(m.code)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create meeting')
    } finally { setLoading(false) }
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(6,8,16,0.85)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="glass-card fade-in" style={{ width: '100%', maxWidth: '440px', padding: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '10px',
            background: 'rgba(0,255,136,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Crown size={18} color="#00ff88" />
          </div>
          <div>
            <h2 style={{ fontFamily: "'Bebas Neue'", fontSize: '20px', letterSpacing: '2px', color: '#f0f4ff' }}>
              HOST MEETING
            </h2>
            <p style={{ fontSize: '12px', color: 'rgba(240,244,255,0.45)' }}>Create a new AI-powered meeting</p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <FieldInput
            label="Meeting Title"
            placeholder="e.g. Q3 Product Review"
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleHost()}
          />
          <FieldInput
            label="Topic (optional)"
            placeholder="e.g. Roadmap planning & budget"
            value={topic}
            onChange={e => setTopic(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleHost()}
          />
          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ff4466', fontSize: '13px' }}>
              <AlertCircle size={14} /> {error}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
          <ActionButton variant="ghost" onClick={onClose} style={{ flex: 1 }}>Cancel</ActionButton>
          <ActionButton variant="green" onClick={handleHost} loading={loading} icon={<Crown size={15} />} style={{ flex: 1 }}>
            Create Meeting
          </ActionButton>
        </div>
      </div>
    </div>
  )
}

// ─── Modal: Join Meeting ──────────────────────────────────────────────────────

function JoinModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: (code: string) => void }) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleJoin = async () => {
    if (!code.trim()) { setError('Meeting code is required'); return }
    setLoading(true); setError('')
    try {
      await apiJoinMeeting(code.trim().toUpperCase())
      onSuccess(code.trim().toUpperCase())
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to join meeting')
    } finally { setLoading(false) }
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(6,8,16,0.85)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="glass-card fade-in" style={{ width: '100%', maxWidth: '440px', padding: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '10px',
            background: 'rgba(255,170,0,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Video size={18} color="#ffaa00" />
          </div>
          <div>
            <h2 style={{ fontFamily: "'Bebas Neue'", fontSize: '20px', letterSpacing: '2px', color: '#f0f4ff' }}>
              JOIN MEETING
            </h2>
            <p style={{ fontSize: '12px', color: 'rgba(240,244,255,0.45)' }}>Enter a meeting code to join</p>
          </div>
        </div>

        <FieldInput
          label="Meeting Code"
          placeholder="e.g. MTG-XXXX-YYYY"
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase())}
          onKeyDown={e => e.key === 'Enter' && handleJoin()}
          style={{ fontFamily: "'DM Mono', monospace", letterSpacing: '2px' }}
        />
        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ff4466', fontSize: '13px', marginTop: '10px' }}>
            <AlertCircle size={14} /> {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
          <ActionButton variant="ghost" onClick={onClose} style={{ flex: 1 }}>Cancel</ActionButton>
          <ActionButton variant="amber" onClick={handleJoin} loading={loading} icon={<Video size={15} />} style={{ flex: 1 }}>
            Join Meeting
          </ActionButton>
        </div>
      </div>
    </div>
  )
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  label, value, icon, color, delay = 0
}: {
  label: string, value: number | string, icon: React.ReactNode, color: string, delay?: number
}) {
  return (
    <div
      className="glass-card"
      style={{
        padding: '20px', display: 'flex', alignItems: 'center', gap: '14px',
        animation: `fadeIn 0.4s ${delay}s ease both`,
      }}
    >
      <div style={{
        width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0,
        background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: `1px solid ${color}30`,
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '24px', fontWeight: 500, color: '#f0f4ff', lineHeight: 1 }}>
          {value}
        </div>
        <div style={{ fontSize: '12px', color: 'rgba(240,244,255,0.45)', marginTop: '4px' }}>{label}</div>
      </div>
    </div>
  )
}

// ─── Meeting Row ──────────────────────────────────────────────────────────────

function MeetingRow({ meeting, onClick, index }: { meeting: Meeting; onClick: () => void; index: number }) {
  const sc = statusColor(meeting.status)
  return (
    <div
      className="glass-card"
      onClick={onClick}
      style={{
        padding: '16px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center',
        gap: '16px', transition: 'all 0.2s', animation: `fadeIn 0.35s ${0.05 * index}s ease both`,
      }}
    >
      {/* Status dot */}
      <div style={{
        width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0,
        background: sc.dot,
        boxShadow: meeting.status === 'active' ? `0 0 8px ${sc.dot}` : 'none',
        animation: meeting.status === 'active' ? 'pulseDot 2s ease-in-out infinite' : 'none',
      }} />

      {/* Title + code */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: '14px', color: '#f0f4ff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {meeting.title}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
          <Hash size={11} color="rgba(240,244,255,0.3)" />
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '11px', color: 'rgba(240,244,255,0.35)', letterSpacing: '1px' }}>
            {meeting.code}
          </span>
        </div>
      </div>

      {/* Date */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
        <Calendar size={12} color="rgba(240,244,255,0.3)" />
        <span style={{ fontSize: '12px', color: 'rgba(240,244,255,0.45)' }}>{formatDate(meeting.created_at)}</span>
      </div>

      {/* Duration */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0, minWidth: '70px', justifyContent: 'flex-end' }}>
        <Clock size={12} color="rgba(240,244,255,0.3)" />
        <span style={{ fontSize: '12px', color: 'rgba(240,244,255,0.45)' }}>
          {formatDuration(meeting.duration_seconds)}
        </span>
      </div>

      {/* Participants */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
        <Users size={12} color="rgba(240,244,255,0.3)" />
        <span style={{ fontSize: '12px', color: 'rgba(240,244,255,0.45)' }}>{meeting.participants.length}</span>
      </div>

      {/* Status badge */}
      <div style={{
        padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 500,
        background: sc.bg, color: sc.color, flexShrink: 0, textTransform: 'capitalize',
      }}>
        {meeting.status}
      </div>

      {/* Score */}
      {meeting.meeting_score !== null && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
          <BarChart3 size={12} color="#4a9eff" />
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '12px', color: '#4a9eff' }}>
            {meeting.meeting_score}
          </span>
        </div>
      )}

      <ChevronRight size={14} color="rgba(240,244,255,0.2)" style={{ flexShrink: 0 }} />
    </div>
  )
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ onHost }: { onHost: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 24px', gap: '20px' }}>
      <div style={{
        width: '72px', height: '72px', borderRadius: '20px',
        background: 'rgba(0,255,136,0.07)', border: '1px solid rgba(0,255,136,0.15)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Dna size={32} color="#00ff88" strokeWidth={1.5} />
      </div>
      <div style={{ textAlign: 'center' }}>
        <h3 style={{ fontFamily: "'Bebas Neue'", fontSize: '22px', letterSpacing: '2px', color: '#f0f4ff', marginBottom: '8px' }}>
          NO MEETINGS YET
        </h3>
        <p style={{ fontSize: '14px', color: 'rgba(240,244,255,0.45)', lineHeight: 1.6, maxWidth: '320px' }}>
          Host your first AI-powered meeting and MeetDNA will extract structured intelligence from every conversation.
        </p>
      </div>
      <ActionButton
        variant="green"
        onClick={onHost}
        icon={<Plus size={16} />}
      >
        Host Your First Meeting
      </ActionButton>
    </div>
  )
}

// ─── Dashboard Page ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter()

  const [user, setUser] = useState<StoredUser | null>(null)
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [total, setTotal] = useState(0)
  const [loadingData, setLoadingData] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showHostModal, setShowHostModal] = useState(false)
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [filterStatus, setFilterStatus] = useState<'all' | Meeting['status']>('all')

  // Auth guard
  useEffect(() => {
    const token = getToken()
    if (!token) {
      router.replace('/')
      return
    }
    const stored = getStoredUser()
    if (stored) setUser(stored)
  }, [router])

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoadingData(true)
    setError(null)
    try {
      const [meRes, historyRes] = await Promise.all([
        apiGetMe(),
        apiGetMeetingHistory(),
      ])
      setUser({ id: meRes.id, name: meRes.name, email: meRes.email })
      setMeetings(historyRes.meetings)
      setTotal(historyRes.total)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load data')
    } finally {
      setLoadingData(false)
    }
  }, [])

  useEffect(() => {
    if (getToken()) fetchData()
  }, [fetchData])

  const handleSignOut = () => {
    clearAuth()
    router.replace('/')
  }

  const handleMeetingSuccess = (code: string) => {
    setShowHostModal(false)
    setShowJoinModal(false)
    router.push(`/meeting/${code}`)
  }

  // Derived stats
  const activeMeetings = meetings.filter(m => m.status === 'active').length
  const endedMeetings = meetings.filter(m => m.status === 'ended').length
  const filteredMeetings = filterStatus === 'all'
    ? meetings
    : meetings.filter(m => m.status === 'filterStatus' as unknown as Meeting['status'] || m.status === filterStatus)

  const displayMeetings = filterStatus === 'all'
    ? meetings
    : meetings.filter(m => m.status === filterStatus)

  const totalDuration = meetings.reduce((acc, m) => acc + (m.duration_seconds || 0), 0)
  const avgScore = meetings.filter(m => m.meeting_score !== null).length > 0
    ? Math.round(meetings.reduce((acc, m) => acc + (m.meeting_score || 0), 0) / meetings.filter(m => m.meeting_score !== null).length)
    : null

  if (!getToken() && typeof window !== 'undefined') return null

  return (
    <>
      <SceneBackground />

      {/* Modals */}
      {showHostModal && <HostModal onClose={() => setShowHostModal(false)} onSuccess={handleMeetingSuccess} />}
      {showJoinModal && <JoinModal onClose={() => setShowJoinModal(false)} onSuccess={handleMeetingSuccess} />}

      {/* Page */}
      <div style={{
        position: 'relative', zIndex: 1, minHeight: '100vh',
        display: 'flex', flexDirection: 'column',
      }}>

        {/* ── Top Bar ── */}
        <header style={{
          position: 'sticky', top: 0, zIndex: 50,
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(6,8,16,0.7)', backdropFilter: 'blur(20px)',
          padding: '0 24px',
        }}>
          <div style={{
            maxWidth: '1100px', margin: '0 auto',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            height: '64px',
          }}>
            <DnaLogo className="size-8" />

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              {user && (
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#f0f4ff' }}>
                    {user.name}
                  </div>
                  <div style={{ fontSize: '11px', color: 'rgba(240,244,255,0.4)' }}>{user.email}</div>
                </div>
              )}
              <ActionButton
                variant="ghost"
                onClick={handleSignOut}
                icon={<LogOut size={14} />}
                style={{ padding: '8px 14px', fontSize: '13px' }}
              >
                Sign out
              </ActionButton>
            </div>
          </div>
        </header>

        {/* ── Main Content ── */}
        <main style={{ flex: 1, padding: '32px 24px 60px', maxWidth: '1100px', width: '100%', margin: '0 auto' }}>

          {/* Welcome + CTA row */}
          <div className="fade-in" style={{ marginBottom: '32px' }}>
            <h1 style={{
              fontFamily: "'Bebas Neue'", fontSize: 'clamp(28px, 4vw, 40px)',
              letterSpacing: '3px', color: '#f0f4ff', marginBottom: '6px',
            }}>
              WELCOME BACK,{' '}
              <span style={{
                background: 'linear-gradient(135deg, #00ff88, #4a9eff)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              }}>
                {user?.name?.split(' ')[0]?.toUpperCase() ?? '...'}
              </span>
            </h1>
            <p style={{ fontSize: '14px', color: 'rgba(240,244,255,0.45)' }}>
              Your AI meeting intelligence hub — extract DNA from every conversation.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="fade-in-delay-1" style={{ display: 'flex', gap: '12px', marginBottom: '28px', flexWrap: 'wrap' }}>
            <ActionButton
              variant="green"
              icon={<Crown size={16} />}
              onClick={() => setShowHostModal(true)}
              style={{ fontSize: '14px', padding: '12px 24px' }}
            >
              Host Meeting
            </ActionButton>
            <ActionButton
              variant="amber"
              icon={<Video size={16} />}
              onClick={() => setShowJoinModal(true)}
              style={{ fontSize: '14px', padding: '12px 24px' }}
            >
              Join Meeting
            </ActionButton>
          </div>

          {/* Loading */}
          {loadingData ? (
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '80px' }}>
              <DnaSpinner size={48} label="Loading your meetings..." />
            </div>
          ) : error ? (
            /* Error state */
            <div className="glass-card" style={{ padding: '40px', textAlign: 'center' }}>
              <AlertCircle size={32} color="#ff4466" style={{ margin: '0 auto 16px' }} />
              <h3 style={{ fontFamily: "'Bebas Neue'", fontSize: '20px', letterSpacing: '2px', color: '#ff4466', marginBottom: '8px' }}>
                FAILED TO LOAD
              </h3>
              <p style={{ fontSize: '13px', color: 'rgba(240,244,255,0.45)', marginBottom: '20px' }}>{error}</p>
              <ActionButton
                variant="ghost"
                onClick={fetchData}
                icon={<RefreshCw size={14} />}
              >
                Retry
              </ActionButton>
            </div>
          ) : (
            <>
              {/* Stats Row */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '12px',
                  marginBottom: '28px',
                }}
              >
                <StatCard
                  label="Total Meetings"
                  value={total}
                  icon={<Zap size={20} color="#00ff88" />}
                  color="#00ff88"
                  delay={0.15}
                />
                <StatCard
                  label="Active Now"
                  value={activeMeetings}
                  icon={<Timer size={20} color="#4a9eff" />}
                  color="#4a9eff"
                  delay={0.2}
                />
                <StatCard
                  label="Ended"
                  value={endedMeetings}
                  icon={<CheckCircle2 size={20} color="#ffaa00" />}
                  color="#ffaa00"
                  delay={0.25}
                />
                <StatCard
                  label="Total Duration"
                  value={formatDuration(totalDuration)}
                  icon={<Clock size={20} color="#4a9eff" />}
                  color="#4a9eff"
                  delay={0.3}
                />
                {avgScore !== null && (
                  <StatCard
                    label="Avg. Score"
                    value={avgScore}
                    icon={<TrendingUp size={20} color="#00ff88" />}
                    color="#00ff88"
                    delay={0.35}
                  />
                )}
              </div>

              {/* Meetings Section */}
              <div className="fade-in-delay-3">
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  marginBottom: '14px', flexWrap: 'wrap', gap: '10px',
                }}>
                  <h2 style={{
                    fontFamily: "'Bebas Neue'", fontSize: '18px',
                    letterSpacing: '2.5px', color: '#f0f4ff',
                  }}>
                    YOUR MEETINGS
                    <span style={{
                      marginLeft: '10px', fontFamily: "'DM Mono', monospace",
                      fontSize: '13px', color: '#00ff88', letterSpacing: '1px',
                    }}>
                      ({total})
                    </span>
                  </h2>

                  {/* Filter chips */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {(['all', 'active', 'waiting', 'ended'] as const).map(s => (
                      <button
                        key={s}
                        onClick={() => setFilterStatus(s)}
                        style={{
                          padding: '5px 12px', borderRadius: '999px', fontSize: '11px',
                          fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s',
                          fontFamily: "'DM Sans', sans-serif", textTransform: 'capitalize',
                          border: filterStatus === s ? '1px solid rgba(0,255,136,0.4)' : '1px solid rgba(255,255,255,0.08)',
                          background: filterStatus === s ? 'rgba(0,255,136,0.1)' : 'transparent',
                          color: filterStatus === s ? '#00ff88' : 'rgba(240,244,255,0.45)',
                        }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Column headers */}
                {displayMeetings.length > 0 && (
                  <div style={{
                    display: 'flex', gap: '16px', padding: '0 20px 8px',
                    fontSize: '10px', color: 'rgba(240,244,255,0.3)',
                    letterSpacing: '1.5px', textTransform: 'uppercase',
                  }}>
                    <span style={{ flex: 1 }}>Title / Code</span>
                    <span style={{ flexShrink: 0 }}>Date</span>
                    <span style={{ flexShrink: 0, minWidth: '70px', textAlign: 'right' }}>Duration</span>
                    <span style={{ flexShrink: 0 }}>People</span>
                    <span style={{ flexShrink: 0 }}>Status</span>
                    <span style={{ flexShrink: 0 }}>Score</span>
                    <span style={{ width: '14px' }}></span>
                  </div>
                )}

                {/* Meeting list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {displayMeetings.length === 0 ? (
                    <div className="glass-card">
                      <EmptyState onHost={() => setShowHostModal(true)} />
                    </div>
                  ) : (
                    displayMeetings.map((m, i) => (
                      <MeetingRow
                        key={m.code}
                        meeting={m}
                        index={i}
                        onClick={() => router.push(`/meeting/${m.code}`)}
                      />
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </main>

        {/* Footer */}
        <footer style={{
          borderTop: '1px solid rgba(255,255,255,0.05)',
          padding: '16px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: '8px',
        }}>
          <div style={{
            width: '6px', height: '6px', borderRadius: '50%', background: '#00ff88',
            boxShadow: '0 0 8px #00ff88',
          }} className="pulse-dot" />
          <span style={{ fontSize: '11px', color: 'rgba(240,244,255,0.25)', letterSpacing: '1.5px' }}>
            MEETDNA · HINDSIGHT MEMORY ACTIVE
          </span>
        </footer>
      </div>
    </>
  )
}
