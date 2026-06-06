'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  getToken, getStoredUser,
  apiJoinMeeting, apiGetMeeting, apiEndMeeting, apiGenerateBriefing,
  apiAppendTranscript, apiExtractDNA, apiTranscribeChunk,
  type Meeting, type MeetingSummary, type Briefing, type TranscriptLine, type DNAStrand,
} from '@/lib/api'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

export type ChatMessage = { id: string; sender: string; text: string; time: string }
export type RemoteParticipant = { id: string; name: string; isMuted: boolean; isVideoOff: boolean }

export function useMeetingRoom(code: string) {
  const [meeting, setMeeting] = useState<Meeting | null>(null)
  const [participantId, setParticipantId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isHost, setIsHost] = useState(false)
  const [wsConnected, setWsConnected] = useState(false)

  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map())
  const [participants, setParticipants] = useState<RemoteParticipant[]>([])
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOff, setIsVideoOff] = useState(false)
  const [isScreenSharing, setIsScreenSharing] = useState(false)

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [transcript, setTranscript] = useState<TranscriptLine[]>([])
  const [dnaStrands, setDnaStrands] = useState<DNAStrand[]>([])
  const [briefing, setBriefing] = useState<Briefing | null>(null)
  const [transcriptStatus, setTranscriptStatus] = useState<string>('')

  const [summary, setSummary] = useState<MeetingSummary | null>(null)
  const [showSummary, setShowSummary] = useState(false)
  const [ending, setEnding] = useState(false)

  const wsRef = useRef<WebSocket | null>(null)
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map())
  const localStreamRef = useRef<MediaStream | null>(null)
  const screenStreamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const participantIdRef = useRef('')
  const codeRef = useRef(code)
  const userNameRef = useRef(getStoredUser()?.name ?? 'Guest')

  codeRef.current = code

  const sendWs = useCallback((type: string, data: Record<string, unknown>) => {
    const ws = wsRef.current
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type, data }))
      return true
    }
    return false
  }, [])

  const syncParticipants = useCallback((m: Meeting, selfId: string) => {
    const list = (m.participants as unknown as { id: string; name: string; is_muted?: boolean; is_video_off?: boolean }[] ?? [])
      .filter(p => p.id !== selfId)
      .map(p => ({
        id: p.id,
        name: p.name,
        isMuted: p.is_muted ?? false,
        isVideoOff: p.is_video_off ?? false,
      }))
    setParticipants(list)
  }, [])

  const addTranscriptLine = useCallback((speaker: string, text: string) => {
    const line: TranscriptLine = {
      id: `${Date.now()}`,
      speaker,
      text,
      timestamp: new Date().toISOString(),
      is_final: true,
    }
    setTranscript(prev => [...prev, line])
    sendWs('transcript_line', { transcript_line: line })
  }, [sendWs])

  const createPeer = useCallback((targetId: string, initiator: boolean) => {
    if (peersRef.current.has(targetId) || targetId === participantIdRef.current) return
    const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] })
    peersRef.current.set(targetId, pc)

    const stream = localStreamRef.current
    if (stream) stream.getTracks().forEach(t => pc.addTrack(t, stream))

    pc.ontrack = (ev) => {
      setRemoteStreams(prev => { const n = new Map(prev); n.set(targetId, ev.streams[0]); return n })
    }
    pc.onicecandidate = (ev) => {
      if (ev.candidate) sendWs('webrtc_ice_candidate', { target_id: targetId, candidate: ev.candidate })
    }
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        peersRef.current.delete(targetId)
        setRemoteStreams(prev => { const n = new Map(prev); n.delete(targetId); return n })
      }
    }

    if (initiator) {
      pc.createOffer().then(offer => {
        pc.setLocalDescription(offer)
        sendWs('webrtc_offer', { target_id: targetId, offer })
      }).catch(console.error)
    }
  }, [sendWs])

  const cleanup = useCallback(() => {
    if (recorderRef.current?.state !== 'inactive') recorderRef.current?.stop()
    recorderRef.current = null
    wsRef.current?.close()
    wsRef.current = null
    peersRef.current.forEach(pc => pc.close())
    peersRef.current.clear()
    localStreamRef.current?.getTracks().forEach(t => t.stop())
    screenStreamRef.current?.getTracks().forEach(t => t.stop())
  }, [])

  const handleWsMessage = useCallback(async (msg: { type: string; data: Record<string, unknown>; sender_id: string }) => {
    const { type, data, sender_id: from } = msg

    if (type === 'webrtc_offer') {
      createPeer(from, false)
      const pc = peersRef.current.get(from)
      if (!pc) return
      await pc.setRemoteDescription(new RTCSessionDescription(data.offer as RTCSessionDescriptionInit))
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      sendWs('webrtc_answer', { target_id: from, answer })
    } else if (type === 'webrtc_answer') {
      const pc = peersRef.current.get(from)
      if (pc) await pc.setRemoteDescription(new RTCSessionDescription(data.answer as RTCSessionDescriptionInit))
    } else if (type === 'webrtc_ice_candidate') {
      const pc = peersRef.current.get(from)
      if (pc && data.candidate) await pc.addIceCandidate(new RTCIceCandidate(data.candidate as RTCIceCandidateInit))
    } else if (type === 'participant_joined') {
      const joined = (data.participant_id as string) || from
      const name = (data.name as string) || 'Participant'
      if (joined !== participantIdRef.current) {
        setParticipants(prev => prev.some(p => p.id === joined) ? prev : [...prev, { id: joined, name, isMuted: false, isVideoOff: false }])
        if (participantIdRef.current < joined) createPeer(joined, true)
      }
    } else if (type === 'participant_left') {
      const left = (data.participant_id as string) || from
      peersRef.current.get(left)?.close()
      peersRef.current.delete(left)
      setRemoteStreams(prev => { const n = new Map(prev); n.delete(left); return n })
      setParticipants(prev => prev.filter(p => p.id !== left))
    } else if (type === 'chat_message') {
      const sender = (data.sender_name as string) || from
      const text = data.text as string
      if (from !== participantIdRef.current) {
        setChatMessages(prev => [...prev, { id: `${Date.now()}-${from}`, sender, text, time: new Date().toISOString() }])
      }
    } else if (type === 'transcript_line') {
      const line = (data.transcript_line || data) as TranscriptLine
      if (line?.text && from !== participantIdRef.current) setTranscript(prev => [...prev, line])
    } else if (type === 'host_mute') {
      localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = false })
      setIsMuted(true)
    } else if (type === 'host_kicked') {
      cleanup()
      setError('You were removed from the meeting by the host')
    } else if (type === 'meeting_ended') {
      const s = data.summary as MeetingSummary
      if (s) { setSummary(s); setShowSummary(true) }
      cleanup()
    } else if (type === 'action_detected' || type === 'risk_alert') {
      const strand = data.strand as DNAStrand
      if (strand) setDnaStrands(prev => [...prev, strand])
    } else if (type === 'mute_toggle') {
      const pid = data.participant_id as string
      if (pid) setParticipants(prev => prev.map(p => p.id === pid ? { ...p, isMuted: !!data.is_muted } : p))
    }
  }, [createPeer, sendWs, cleanup])

  const connectWs = useCallback(() => {
    const token = getToken()
    if (!token || !participantIdRef.current) return
    const wsBase = API_URL.replace(/^http/, 'ws')
    const url = `${wsBase}/ws/meeting/${codeRef.current}?token=${token}&participant_id=${participantIdRef.current}`
    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      setWsConnected(true)
      ws.send(JSON.stringify({
        type: 'participant_joined',
        data: { participant_id: participantIdRef.current, name: userNameRef.current },
      }))
    }
    ws.onclose = () => setWsConnected(false)
    ws.onerror = () => setWsConnected(false)
    ws.onmessage = (ev) => {
      try { void handleWsMessage(JSON.parse(ev.data as string)) } catch { /* ignore */ }
    }
  }, [handleWsMessage])

  const startLiveTranscription = useCallback((stream: MediaStream) => {
    const audioTracks = stream.getAudioTracks()
    if (!audioTracks.length) {
      setTranscriptStatus('No microphone — type in the box below')
      return
    }
    const mimeTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus']
    const mime = mimeTypes.find(t => MediaRecorder.isTypeSupported(t))
    if (!mime) {
      setTranscriptStatus('Live speech needs Chrome — or type in the box below')
      return
    }
    try {
      const recorder = new MediaRecorder(new MediaStream(audioTracks), { mimeType: mime })
      recorderRef.current = recorder
      recorder.ondataavailable = async (ev) => {
        if (!ev.data.size || !participantIdRef.current) return
        try {
          const res = await apiTranscribeChunk(
            codeRef.current, userNameRef.current, participantIdRef.current, ev.data,
          )
          if (res.transcript_line?.text) {
            setTranscript(prev => [...prev, res.transcript_line!])
            setTranscriptStatus('Live transcription active')
          }
        } catch {
          setTranscriptStatus('Set GROQ_API_KEY in backend .env for live speech — use text box below')
        }
      }
      recorder.start(6000)
      setTranscriptStatus('Listening — speak now')
    } catch {
      setTranscriptStatus('Could not start mic — type in the box below')
    }
  }, [])

  // Main init — only re-run when meeting code changes
  useEffect(() => {
    let cancelled = false
    userNameRef.current = getStoredUser()?.name ?? 'Guest'

    ;(async () => {
      try {
        const joinRes = await apiJoinMeeting(code, userNameRef.current)
        if (cancelled) return

        participantIdRef.current = joinRes.participant_id
        setParticipantId(joinRes.participant_id)

        const m = joinRes.meeting as Meeting
        setMeeting(m)
        setTranscript(m.transcript ?? [])
        setDnaStrands(Array.isArray(m.dna_strands) ? m.dna_strands : [])
        setIsHost(m.host_id === getStoredUser()?.id)
        syncParticipants(m, joinRes.participant_id)

        try {
          const briefRes = await apiGenerateBriefing(m.topic || m.title, (m.participants as unknown as { name: string }[] ?? []).map(p => p.name))
          if (!cancelled) setBriefing(briefRes.briefing)
        } catch { /* optional */ }

        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true }).catch(() =>
          navigator.mediaDevices.getUserMedia({ video: false, audio: true })
        )
        if (cancelled) return
        localStreamRef.current = stream
        setLocalStream(stream)
        if (!stream.getVideoTracks().length) setIsVideoOff(true)

        connectWs()
        startLiveTranscription(stream)

        for (const p of m.participants as unknown as { id: string }[] ?? []) {
          if (p.id !== joinRes.participant_id && joinRes.participant_id < p.id) {
            createPeer(p.id, true)
          }
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to join meeting')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    const poll = setInterval(async () => {
      try {
        const m = await apiGetMeeting(codeRef.current)
        if (participantIdRef.current) syncParticipants(m, participantIdRef.current)
        setDnaStrands(Array.isArray(m.dna_strands) ? m.dna_strands : [])
      } catch { /* ignore */ }
    }, 12000)

    return () => { cancelled = true; clearInterval(poll); cleanup() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code])

  const toggleMute = useCallback(() => {
    const next = !isMuted
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = !next })
    setIsMuted(next)
    sendWs('mute_toggle', { is_muted: next, participant_id: participantIdRef.current })
  }, [isMuted, sendWs])

  const toggleVideo = useCallback(() => {
    const next = !isVideoOff
    localStreamRef.current?.getVideoTracks().forEach(t => { t.enabled = !next })
    setIsVideoOff(next)
    sendWs('video_toggle', { is_video_off: next, participant_id: participantIdRef.current })
  }, [isVideoOff, sendWs])

  const toggleScreenShare = useCallback(async () => {
    if (isScreenSharing) {
      screenStreamRef.current?.getTracks().forEach(t => t.stop())
      screenStreamRef.current = null
      const cam = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      localStreamRef.current = cam
      setLocalStream(cam)
      peersRef.current.forEach(pc => {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video')
        const track = cam.getVideoTracks()[0]
        if (sender && track) sender.replaceTrack(track)
      })
      setIsScreenSharing(false)
      sendWs('screen_share_stop', {})
      return
    }
    try {
      const screen = await navigator.mediaDevices.getDisplayMedia({ video: true })
      screenStreamRef.current = screen
      const track = screen.getVideoTracks()[0]
      peersRef.current.forEach(pc => {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video')
        if (sender) sender.replaceTrack(track)
      })
      setLocalStream(new MediaStream([track, ...(localStreamRef.current?.getAudioTracks() ?? [])]))
      setIsScreenSharing(true)
      sendWs('screen_share_start', {})
      track.onended = () => { void toggleScreenShare() }
    } catch { /* cancelled */ }
  }, [isScreenSharing, sendWs])

  const sendChat = useCallback((text: string) => {
    if (!text.trim()) return
    const msg = { id: `${Date.now()}-me`, sender: userNameRef.current, text: text.trim(), time: new Date().toISOString() }
    setChatMessages(prev => [...prev, msg])
    if (!sendWs('chat_message', { text: text.trim(), sender_name: userNameRef.current })) {
      setTranscriptStatus('Chat failed — WebSocket not connected')
    }
  }, [sendWs])

  const addToTranscript = useCallback(async (text: string) => {
    if (!text.trim()) return
    try {
      await apiAppendTranscript(codeRef.current, text.trim(), userNameRef.current)
      addTranscriptLine(userNameRef.current, text.trim())
      setTranscriptStatus('Added to transcript')
    } catch (e) {
      setTranscriptStatus(e instanceof Error ? e.message : 'Failed to add transcript')
    }
  }, [addTranscriptLine])

  const extractDNA = useCallback(async () => {
    try {
      await apiExtractDNA(codeRef.current)
      const m = await apiGetMeeting(codeRef.current)
      setDnaStrands(Array.isArray(m.dna_strands) ? m.dna_strands : [])
      setTranscriptStatus('DNA extracted')
    } catch (e) {
      setTranscriptStatus(e instanceof Error ? e.message : 'Extract DNA failed — add transcript first')
    }
  }, [])

  const hostMute = useCallback((targetId: string) => {
    if (!sendWs('host_mute', { target_id: targetId })) {
      setTranscriptStatus('Host action failed — WebSocket not connected')
    }
  }, [sendWs])

  const hostRemove = useCallback((targetId: string) => {
    if (!sendWs('host_remove', { target_id: targetId })) {
      setTranscriptStatus('Host action failed — WebSocket not connected')
    }
    setParticipants(prev => prev.filter(p => p.id !== targetId))
  }, [sendWs])

  const endMeeting = useCallback(async () => {
    setEnding(true)
    try {
      const res = await apiEndMeeting(codeRef.current)
      setSummary(res.summary)
      setShowSummary(true)
      sendWs('meeting_ended', { summary: res.summary })
      cleanup()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to end meeting')
    } finally {
      setEnding(false)
    }
  }, [sendWs, cleanup])

  const refreshMeeting = useCallback(async () => {
    const m = await apiGetMeeting(codeRef.current)
    setMeeting(m)
    setDnaStrands(Array.isArray(m.dna_strands) ? m.dna_strands : [])
    setTranscript(m.transcript ?? [])
    if (participantIdRef.current) syncParticipants(m, participantIdRef.current)
  }, [syncParticipants])

  return {
    meeting, participantId, loading, error, isHost, wsConnected,
    localStream, remoteStreams, participants,
    isMuted, isVideoOff, isScreenSharing,
    chatMessages, transcript, dnaStrands, briefing, transcriptStatus,
    summary, showSummary, setShowSummary, ending,
    toggleMute, toggleVideo, toggleScreenShare,
    sendChat, addToTranscript, extractDNA, hostMute, hostRemove, endMeeting, refreshMeeting,
    userName: userNameRef.current,
  }
}
