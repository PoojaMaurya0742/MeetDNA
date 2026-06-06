'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Mic, MicOff, Video, VideoOff, Monitor, MessageSquare, PhoneOff,
  Users, FileText, Dna, Brain, Sun, Moon, Download, Share2,
  Crown, UserX, VolumeX, ChevronLeft, Sparkles, AlertTriangle,
  CheckCircle2, Target, Lightbulb, BookOpen, Zap,
} from 'lucide-react'
import { SceneBackground } from '@/components/scene-background'
import { DnaLogo, DnaSpinner } from '@/components/dna-visuals'
import { ActionButton } from '@/components/fields'
import { useMeetingRoom } from '@/hooks/use-meeting-room'
import { downloadSummaryPdf } from '@/lib/pdf-export'
import type { DNAStrandType } from '@/lib/api'

type Tab = 'chat' | 'transcript' | 'dna' | 'briefing'

const DNA_SECTIONS: { type: DNAStrandType; label: string; icon: typeof Target; color: string }[] = [
  { type: 'DECISION', label: 'Decisions', icon: CheckCircle2, color: '#00ff88' },
  { type: 'ACTION', label: 'Actions', icon: Zap, color: '#ffaa00' },
  { type: 'RISK', label: 'Risks', icon: AlertTriangle, color: '#ff4466' },
  { type: 'INSIGHT', label: 'Insights', icon: Lightbulb, color: '#4a9eff' },
  { type: 'CONTEXT', label: 'Context', icon: BookOpen, color: '#8b9cb8' },
]

function VideoTile({ stream, name, muted, isLocal }: {
  stream: MediaStream | null; name: string; muted?: boolean; isLocal?: boolean
}) {
  const ref = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    if (ref.current && stream) {
      ref.current.srcObject = stream
    }
  }, [stream])
  return (
    <div className="glass-card" style={{
      position: 'relative', aspectRatio: '16/10', overflow: 'hidden',
      borderRadius: '12px', background: 'rgba(0,0,0,0.4)',
    }}>
      {stream ? (
        <video ref={ref} autoPlay playsInline muted={isLocal || muted}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <div style={{
          width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(255,255,255,0.03)',
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%', background: 'rgba(0,255,136,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: "'Bebas Neue'", fontSize: 24, color: '#00ff88',
          }}>
            {name.charAt(0).toUpperCase()}
          </div>
        </div>
      )}
      <div style={{
        position: 'absolute', bottom: 8, left: 8, padding: '3px 10px',
        borderRadius: 6, background: 'rgba(0,0,0,0.6)', fontSize: 11, color: '#f0f4ff',
      }}>
        {name}{isLocal ? ' (You)' : ''}{muted ? ' 🔇' : ''}
      </div>
    </div>
  )
}

function ThemeToggle() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  useEffect(() => {
    const saved = localStorage.getItem('meetdna_theme') as 'dark' | 'light' | null
    const t = saved ?? 'dark'
    setTheme(t)
    document.documentElement.dataset.theme = t
  }, [])
  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    document.documentElement.dataset.theme = next
    localStorage.setItem('meetdna_theme', next)
  }
  return (
    <button onClick={toggle} style={{
      background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: 'var(--color-foreground)',
      display: 'flex', alignItems: 'center', gap: 6, fontSize: 12,
    }}>
      {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
      {theme === 'dark' ? 'Light' : 'Dark'}
    </button>
  )
}

export function MeetingRoom({ code }: { code: string }) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('briefing')
  const [chatInput, setChatInput] = useState('')
  const [transcriptInput, setTranscriptInput] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const room = useMeetingRoom(code)

  if (room.loading) {
    return (
      <>
        <SceneBackground />
        <div style={{ position: 'relative', zIndex: 1, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
          <DnaSpinner className="size-12" />
          <p style={{ fontSize: 13, color: 'rgba(240,244,255,0.45)' }}>Joining meeting room...</p>
        </div>
      </>
    )
  }

  if (room.error && !room.meeting) {
    return (
      <>
        <SceneBackground />
        <div style={{ position: 'relative', zIndex: 1, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
          <AlertTriangle size={36} color="#ff4466" />
          <p style={{ color: '#ff4466' }}>{room.error}</p>
          <ActionButton variant="ghost" onClick={() => router.push('/dashboard')} icon={<ChevronLeft size={14} />}>Dashboard</ActionButton>
        </div>
      </>
    )
  }

  const remoteEntries = Array.from(room.remoteStreams.entries())

  return (
    <>
      <SceneBackground />
      <div style={{ position: 'relative', zIndex: 1, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <header style={{
          borderBottom: '1px solid var(--color-glass-border)', background: 'rgba(6,8,16,0.75)',
          backdropFilter: 'blur(16px)', padding: '0 20px', height: 56,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={() => router.push('/dashboard')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
              <ChevronLeft size={14} /> Back
            </button>
            <DnaLogo className="size-7" />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{room.meeting?.title}</div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: '#00ff88', letterSpacing: 1 }}>{code}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ThemeToggle />
            <span style={{ fontSize: 11, color: 'var(--color-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Users size={12} /> {room.participants.length + 1}
            </span>
            {room.isHost && <span style={{ fontSize: 10, color: '#ffaa00', display: 'flex', alignItems: 'center', gap: 3 }}><Crown size={11} /> Host</span>}
            <span style={{
              fontSize: 10, display: 'flex', alignItems: 'center', gap: 4,
              color: room.wsConnected ? '#00ff88' : '#ff4466',
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: room.wsConnected ? '#00ff88' : '#ff4466',
              }} />
              {room.wsConnected ? 'Connected' : 'Reconnecting...'}
            </span>
          </div>
        </header>

        {/* Main */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Video area */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 16, gap: 12, overflow: 'auto' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: `repeat(auto-fit, minmax(220px, 1fr))`,
              gap: 10, flex: 1,
            }}>
              <VideoTile stream={room.localStream} name={room.userName} muted isLocal />
              {remoteEntries.map(([id, stream]) => {
                const p = room.participants.find(x => x.id === id)
                return <VideoTile key={id} stream={stream} name={p?.name ?? id.slice(0, 6)} muted={p?.isMuted} />
              })}
            </div>

            {/* Control bar */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              padding: '12px 16px', borderRadius: 16,
              background: 'var(--color-glass)', border: '1px solid var(--color-glass-border)',
            }}>
              <ControlBtn icon={room.isMuted ? MicOff : Mic} label={room.isMuted ? 'Unmute' : 'Mute'} active={room.isMuted} onClick={room.toggleMute} />
              <ControlBtn icon={room.isVideoOff ? VideoOff : Video} label="Camera" active={room.isVideoOff} onClick={room.toggleVideo} />
              <ControlBtn icon={Monitor} label="Share" active={room.isScreenSharing} onClick={room.toggleScreenShare} />
              <ControlBtn icon={MessageSquare} label="Chat" onClick={() => { setSidebarOpen(true); setTab('chat') }} />
              {room.isHost && (
                <ActionButton variant="red" onClick={room.endMeeting} loading={room.ending} icon={<PhoneOff size={14} />} style={{ padding: '8px 18px', fontSize: 12 }}>
                  End for All
                </ActionButton>
              )}
              {!room.isHost && (
                <ActionButton variant="ghost" onClick={() => router.push('/dashboard')} icon={<PhoneOff size={14} />} style={{ padding: '8px 18px', fontSize: 12 }}>
                  Leave
                </ActionButton>
              )}
            </div>
          </div>

          {/* Sidebar */}
          {sidebarOpen && (
            <aside style={{
              width: 340, borderLeft: '1px solid var(--color-glass-border)',
              background: 'rgba(6,8,16,0.6)', display: 'flex', flexDirection: 'column',
            }}>
              <div style={{ display: 'flex', borderBottom: '1px solid var(--color-glass-border)' }}>
                {([
                  { id: 'briefing' as Tab, icon: Brain, label: 'Hindsight', count: 0 },
                  { id: 'chat' as Tab, icon: MessageSquare, label: 'Chat', count: room.chatMessages.length },
                  { id: 'transcript' as Tab, icon: FileText, label: 'Live', count: room.transcript.length },
                  { id: 'dna' as Tab, icon: Dna, label: 'DNA', count: room.dnaStrands.length },
                ]).map(t => (
                  <button key={t.id} onClick={() => setTab(t.id)} style={{
                    flex: 1, padding: '10px 4px', background: tab === t.id ? 'rgba(0,255,136,0.08)' : 'transparent',
                    border: 'none', borderBottom: tab === t.id ? '2px solid #00ff88' : '2px solid transparent',
                    cursor: 'pointer', color: tab === t.id ? '#00ff88' : 'var(--color-muted)',
                    fontSize: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                    position: 'relative',
                  }}>
                    <t.icon size={14} />{t.label}
                    {t.count > 0 && (
                      <span style={{
                        position: 'absolute', top: 4, right: 6, minWidth: 14, height: 14, borderRadius: 7,
                        background: '#00ff88', color: '#060810', fontSize: 8, fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px',
                      }}>
                        {t.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <div style={{ flex: 1, overflow: 'auto', padding: 12 }}>
                {tab === 'briefing' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <h3 style={{ fontFamily: "'Bebas Neue'", letterSpacing: 2, fontSize: 16, color: '#4a9eff' }}>
                      <Sparkles size={14} style={{ display: 'inline', marginRight: 6 }} />HINDSIGHT PREP
                    </h3>
                    {room.briefing ? (
                      <>
                        <BriefBlock title="Context" text={room.briefing.context_summary} />
                        <BriefList title="Relevant History" items={room.briefing.relevant_history} />
                        <BriefList title="Pending Tasks" items={room.briefing.unresolved_items} color="#ffaa00" />
                        <BriefList title="Watch Out For" items={room.briefing.watch_out_for} color="#ff4466" />
                        <BriefList title="Talking Points" items={room.briefing.suggested_talking_points} color="#00ff88" />
                      </>
                    ) : (
                      <p style={{ fontSize: 12, color: 'var(--color-muted)' }}>No previous meeting memory yet. Complete a meeting to build Hindsight.</p>
                    )}
                  </div>
                )}

                {tab === 'chat' && (
                  <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 8 }}>
                    <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {room.chatMessages.map(m => (
                        <div key={m.id} style={{ padding: '6px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', fontSize: 12 }}>
                          <span style={{ color: '#00ff88', fontWeight: 600 }}>{m.sender}: </span>{m.text}
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input value={chatInput} onChange={e => setChatInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && (room.sendChat(chatInput), setChatInput(''))}
                        placeholder="Type a message..." style={{
                          flex: 1, padding: '8px 12px', borderRadius: 8, fontSize: 12,
                          background: 'rgba(255,255,255,0.04)', border: '1px solid var(--color-glass-border)',
                          color: 'var(--color-foreground)', outline: 'none',
                        }} />
                      <ActionButton variant="green" onClick={() => { room.sendChat(chatInput); setChatInput('') }} style={{ padding: '8px 12px' }}>Send</ActionButton>
                    </div>
                  </div>
                )}

                {tab === 'transcript' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 280 }}>
                    <p style={{ fontSize: 10, color: 'var(--color-muted)' }}>
                      {room.transcriptStatus || 'AI-filtered live speech — greetings & noise removed'}
                    </p>
                    <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 180 }}>
                      {room.transcript.map((line, i) => (
                        <div key={line.id ?? i} style={{ fontSize: 12, padding: '6px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.03)' }}>
                          <span style={{ color: '#4a9eff', fontWeight: 600 }}>{line.speaker}: </span>{line.text}
                        </div>
                      ))}
                      {room.transcript.length === 0 && (
                        <p style={{ fontSize: 12, color: 'var(--color-muted)' }}>Speak or type below...</p>
                      )}
                    </div>
                    <textarea
                      value={transcriptInput}
                      onChange={e => setTranscriptInput(e.target.value)}
                      placeholder="Budget issue hai but ROI strong hua to approve karenge"
                      rows={3}
                      style={{
                        width: '100%', padding: '8px 10px', borderRadius: 8, fontSize: 12, resize: 'none',
                        background: 'rgba(255,255,255,0.04)', border: '1px solid var(--color-glass-border)',
                        color: 'var(--color-foreground)', outline: 'none', fontFamily: 'inherit',
                      }}
                    />
                    <div style={{ display: 'flex', gap: 6 }}>
                      <ActionButton
                        variant="ghost"
                        onClick={async () => {
                          await room.addToTranscript(transcriptInput)
                          setTranscriptInput('')
                          setTab('transcript')
                        }}
                        style={{ flex: 1, fontSize: 11, padding: '8px' }}
                      >
                        Add to Transcript
                      </ActionButton>
                      <ActionButton
                        variant="green"
                        onClick={async () => {
                          await room.extractDNA()
                          setTab('dna')
                        }}
                        style={{ flex: 1, fontSize: 11, padding: '8px' }}
                      >
                        Extract DNA
                      </ActionButton>
                    </div>
                  </div>
                )}

                {tab === 'dna' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {room.dnaStrands.length === 0 && (
                      <p style={{ fontSize: 12, color: 'var(--color-muted)' }}>
                        No DNA yet — go to Live tab, add transcript, then click Extract DNA.
                      </p>
                    )}
                    {DNA_SECTIONS.map(sec => {
                      const strands = room.dnaStrands.filter(s => s.type === sec.type)
                      return (
                        <div key={sec.type}>
                          <div style={{ fontSize: 11, color: sec.color, fontWeight: 600, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <sec.icon size={12} />{sec.label} ({strands.length})
                          </div>
                          {strands.map(s => (
                            <div key={s.id} style={{ fontSize: 11, padding: '6px 8px', marginBottom: 4, borderRadius: 6, borderLeft: `2px solid ${sec.color}`, background: 'rgba(255,255,255,0.03)' }}>
                              {s.content}
                            </div>
                          ))}
                        </div>
                      )
                    })}
                    <ActionButton variant="ghost" onClick={room.refreshMeeting} style={{ fontSize: 11 }}>Refresh DNA</ActionButton>
                  </div>
                )}
              </div>

              {/* Host participant controls */}
              {room.isHost && (
                <div style={{ borderTop: '1px solid var(--color-glass-border)', padding: 10 }}>
                  <div style={{ fontSize: 10, color: '#ffaa00', marginBottom: 6, letterSpacing: 1, fontWeight: 600 }}>
                    HOST CONTROLS
                  </div>
                  {room.participants.length === 0 ? (
                    <p style={{ fontSize: 11, color: 'var(--color-muted)' }}>Waiting for participants to join...</p>
                  ) : room.participants.map(p => (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, fontSize: 11 }}>
                      <span>{p.name}{p.isMuted ? ' (muted)' : ''}</span>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button onClick={() => room.hostMute(p.id)} title="Mute participant" style={hostBtnStyle}><VolumeX size={11} /></button>
                        <button onClick={() => room.hostRemove(p.id)} title="Remove participant" style={{ ...hostBtnStyle, color: '#ff4466' }}><UserX size={11} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </aside>
          )}
        </div>

        {/* Summary modal */}
        {room.showSummary && room.summary && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(6,8,16,0.9)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
          }}>
            <div className="glass-card" style={{ maxWidth: 560, width: '100%', maxHeight: '85vh', overflow: 'auto', padding: 28 }}>
              <h2 style={{ fontFamily: "'Bebas Neue'", fontSize: 22, letterSpacing: 2, marginBottom: 12 }}>MEETING SUMMARY</h2>
              <p style={{ fontSize: 13, lineHeight: 1.7, marginBottom: 16 }}>{room.summary.executive_summary}</p>
              {room.summary.action_items?.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, color: '#ffaa00', marginBottom: 6 }}>ACTION ITEMS</div>
                  {room.summary.action_items.map((a, i) => (
                    <div key={i} style={{ fontSize: 12, marginBottom: 4 }}>• {a.task} → {a.owner}</div>
                  ))}
                </div>
              )}
              <div style={{ fontSize: 12, color: '#00ff88', marginBottom: 16 }}>
                Score: {room.summary.meeting_effectiveness_score}/100 · Saved to Hindsight memory
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <ActionButton variant="green" icon={<Download size={14} />}
                  onClick={() => downloadSummaryPdf(room.meeting?.title ?? 'Meeting', code, room.summary!)}>
                  Download PDF
                </ActionButton>
                <ActionButton variant="blue" icon={<Share2 size={14} />}
                  onClick={() => {
                    const text = room.summary!.executive_summary
                    navigator.clipboard.writeText(text)
                    window.open(`https://wa.me/?text=${encodeURIComponent(`MeetDNA Summary: ${text}`)}`, '_blank')
                  }}>
                  Share
                </ActionButton>
                <ActionButton variant="ghost" onClick={() => { room.setShowSummary(false); router.push('/dashboard') }}>
                  Dashboard
                </ActionButton>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

const hostBtnStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 6, padding: '4px 6px', cursor: 'pointer', color: 'var(--color-foreground)',
}

function ControlBtn({ icon: Icon, label, onClick, active }: {
  icon: typeof Mic; label: string; onClick: () => void; active?: boolean
}) {
  return (
    <button onClick={onClick} title={label} style={{
      width: 44, height: 44, borderRadius: '50%', border: 'none', cursor: 'pointer',
      background: active ? 'rgba(255,68,102,0.2)' : 'rgba(255,255,255,0.08)',
      color: active ? '#ff4466' : 'var(--color-foreground)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <Icon size={18} />
    </button>
  )
}

function BriefBlock({ title, text }: { title: string; text: string }) {
  return (
    <div style={{ padding: 10, borderRadius: 8, background: 'rgba(255,255,255,0.04)' }}>
      <div style={{ fontSize: 10, color: 'var(--color-muted)', marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 12, lineHeight: 1.6 }}>{text}</div>
    </div>
  )
}

function BriefList({ title, items, color = '#f0f4ff' }: { title: string; items: string[]; color?: string }) {
  if (!items?.length) return null
  return (
    <div>
      <div style={{ fontSize: 10, color, marginBottom: 4 }}>{title}</div>
      {items.map((item, i) => (
        <div key={i} style={{ fontSize: 11, marginBottom: 3, paddingLeft: 8, borderLeft: `2px solid ${color}` }}>{item}</div>
      ))}
    </div>
  )
}
