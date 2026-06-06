const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface StoredUser {
    id: string
    name: string
    email: string
  }

export type DNAStrandType = 'DECISION' | 'ACTION' | 'RISK' | 'INSIGHT' | 'CONTEXT'
export type DNASeverity = 'LOW' | 'MEDIUM' | 'HIGH'

export interface DNAStrand {
    id: string
    type: DNAStrandType
    content: string
    source_quote?: string
    speaker?: string
    assignee?: string
    due_date?: string
    severity?: DNASeverity
    confidence: number          // 0–1
    keywords: string[]
    meeting_code?: string
    extracted_at?: string
    stored_to_hindsight: boolean
  }
  
  export interface TranscriptLine {
    id: string
    speaker: string
    text: string
    timestamp: string
    is_final: boolean
  }
  
  export interface SummaryDecision {
    decision: string
    made_by: string
    impact: string
  }
  
  export interface SummaryActionItem {
    task: string
    owner: string
    due_date: string
    priority: string
  }
  
  export interface SummaryRisk {
    risk: string
    severity: string
    mitigation: string
  }
  
  export interface SummarySpeaker {
    name: string
    speaking_percentage: number
    key_contributions: string[]
  }
  
  export interface MeetingSummary {
    executive_summary: string
    key_outcomes: string[]
    decisions: SummaryDecision[]
    action_items: SummaryActionItem[]
    risks_identified: SummaryRisk[]
    key_insights: string[]
    meeting_effectiveness_score: number
    follow_up_required: boolean
    next_meeting_agenda: string[]
    speaker_summary: SummarySpeaker[]
  }
   export interface Meeting {
    code: string
    title: string
    topic: string
    status: 'waiting' | 'active' | 'ended'
    created_at: string
    started_at: string | null
    ended_at: string | null
    duration_seconds: number | null
    participants: string[]
    summary: MeetingSummary | null
    meeting_score: number | null
    host_id: string
    max_participants: number
    action_items: string[]
    dna_strands: DNAStrand[]
    transcript: TranscriptLine[]
  }
  
  export interface MeetingHistoryResponse {
    meetings: Meeting[]
    total: number
  }
  
  export interface MeResponse {
    id: string
    name: string
    email: string
    created_at: string
  }

  export interface TranscriptAppendResponse {
    lines_added: number
    transcript: TranscriptLine[]
  }
  
  export interface ExtractDNAResponse {
    new_strands: DNAStrand[]
    total_strands: number
  }
  
  export interface EndMeetingResponse {
    summary: MeetingSummary
    meeting: Meeting
  }

export type ApiUser = {
  id: string
  name: string
  email: string
  created_at?: string
}

export type AuthResponse = {
  token: string
  user: ApiUser
}

const TOKEN_KEY = 'meetdna_token'
const USER_KEY = 'meetdna_user'

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY)
}

export function setAuth(token: string, user: ApiUser) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export function getStoredUser(): ApiUser | null {
  if (typeof window === 'undefined') return null
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || 'null')
  } catch {
    return null
  }
}

async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`${API_URL}${path}`, { ...options, headers })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Request failed' }))
    const message =
      typeof err.detail === 'string'
        ? err.detail
        : Array.isArray(err.detail)
          ? err.detail[0]?.msg ?? 'Request failed'
          : 'Request failed'
    throw new Error(message)
  }

  return res.json()
}

export async function apiSignUp(name: string, email: string, password: string) {
  const data = await apiRequest<AuthResponse>('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  })
  setAuth(data.token, data.user)
  return data
}

export async function apiSignIn(email: string, password: string) {
  const url = `${API_URL}/api/auth/signin`
  const body = JSON.stringify({ email, password })
  // #region agent log
  fetch('http://127.0.0.1:7806/ingest/2a494289-8704-4dd3-b5b9-c45b4670d0ef',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'bff9bd'},body:JSON.stringify({sessionId:'bff9bd',location:'api.ts:apiSignIn:pre',message:'signin request start',data:{apiUrl:API_URL,url,email,emailLen:email.length,passwordLen:password.length,bodyLen:body.length},timestamp:Date.now(),hypothesisId:'B,D'})}).catch(()=>{});
  // #endregion
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  })
  // #region agent log
  fetch('http://127.0.0.1:7806/ingest/2a494289-8704-4dd3-b5b9-c45b4670d0ef',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'bff9bd'},body:JSON.stringify({sessionId:'bff9bd',location:'api.ts:apiSignIn:post',message:'signin response',data:{status:res.status,ok:res.ok},timestamp:Date.now(),hypothesisId:'A,C,D'})}).catch(()=>{});
  // #endregion
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Request failed' }))
    const message =
      typeof err.detail === 'string'
        ? err.detail
        : Array.isArray(err.detail)
          ? err.detail[0]?.msg ?? 'Request failed'
          : 'Request failed'
    throw new Error(message)
  }
  const data = (await res.json()) as AuthResponse
  setAuth(data.token, data.user)
  return data
}

export async function apiGetMe() {
  return apiRequest<ApiUser>('/api/auth/me')
}

// ─── Meeting API ──────────────────────────────────────────────────────────────

export async function apiGetMeetingHistory(): Promise<MeetingHistoryResponse> {
    return apiRequest<MeetingHistoryResponse>('/api/meetings/history')
  }
  
  export async function apiCreateMeeting(title: string, topic: string) {
    const data = await apiRequest<{
      meeting_code: string
      meeting_id: string
      join_link: string
    }>('/api/meetings/create', {
      method: 'POST',
      body: JSON.stringify({
        title,
        topic,
        password_enabled: false,
        max_participants: 50,
      }),
    })
    // dashboard expects m.code
    return { code: data.meeting_code } as Meeting
  }
  
export interface JoinMeetingResponse {
  meeting: Meeting
  participant_id: string
}

export interface Briefing {
  brief_title: string
  context_summary: string
  relevant_history: string[]
  suggested_talking_points: string[]
  watch_out_for: string[]
  unresolved_items: string[]
  memories_used: number
  confidence_score: number
}

export interface BriefingResponse {
  briefing: Briefing
  memories_used: unknown[]
}

function participantStorageKey(code: string) {
  return `meetdna_participant_${code}`
}

export function getStoredParticipantId(code: string): string | null {
  if (typeof window === 'undefined') return null
  return sessionStorage.getItem(participantStorageKey(code))
}

export function setStoredParticipantId(code: string, participantId: string) {
  sessionStorage.setItem(participantStorageKey(code), participantId)
}

export async function apiJoinMeeting(code: string, participantName?: string): Promise<JoinMeetingResponse> {
  const user = getStoredUser()
  const storedParticipantId = getStoredParticipantId(code)
  const data = await apiRequest<JoinMeetingResponse>('/api/meetings/join', {
    method: 'POST',
    body: JSON.stringify({
      code,
      participant_name: participantName || user?.name || 'Guest',
      participant_id: storedParticipantId ?? undefined,
    }),
  })
  setStoredParticipantId(code, data.participant_id)
  return data
}

export async function apiGenerateBriefing(topic: string, participants: string[]): Promise<BriefingResponse> {
  return apiRequest<BriefingResponse>('/api/briefing/generate', {
    method: 'POST',
    body: JSON.stringify({ upcoming_topic: topic, participants }),
  })
}

export async function apiTranscribeChunk(
  meetingCode: string,
  speakerName: string,
  speakerId: string,
  audioBlob: Blob,
): Promise<{ transcript_line: TranscriptLine | null; filtered?: boolean; is_important?: boolean }> {
  const token = getToken()
  const form = new FormData()
  form.append('audio_chunk', audioBlob, 'chunk.webm')
  form.append('meeting_code', meetingCode)
  form.append('speaker_name', speakerName)
  form.append('speaker_id', speakerId)
  const res = await fetch(`${API_URL}/api/transcription/chunk`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Transcription failed' }))
    throw new Error(typeof err.detail === 'string' ? err.detail : 'Transcription failed')
  }
  return res.json()
}

  export async function apiGetMeeting(code: string): Promise<Meeting> {
    return apiRequest<Meeting>(`/api/meetings/${code}`)
  }
  
  export async function apiAppendTranscript(
    code: string,
    text: string,
    speaker?: string
  ): Promise<TranscriptAppendResponse> {
    return apiRequest<TranscriptAppendResponse>(`/api/meetings/${code}/transcript`, {
      method: 'POST',
      body: JSON.stringify({ text, speaker }),
    })
  }
  
  export async function apiExtractDNA(meetingCode: string): Promise<ExtractDNAResponse> {
    return apiRequest<ExtractDNAResponse>('/api/extraction/extract', {
      method: 'POST',
      body: JSON.stringify({ meeting_code: meetingCode }),
    })
  }
  
  export async function apiEndMeeting(meetingCode: string): Promise<EndMeetingResponse> {
    return apiRequest<EndMeetingResponse>(`/api/meetings/${meetingCode}/end`, {
      method: 'POST',
    })
  }
  