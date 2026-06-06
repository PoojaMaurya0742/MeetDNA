'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getToken } from '@/lib/api'
import { MeetingRoom } from '@/components/meeting-room'

export default function MeetingPage() {
  const { code } = useParams<{ code: string }>()
  const router = useRouter()

  useEffect(() => {
    if (!getToken()) router.replace('/')
  }, [router])

  if (!code) return null

  return <MeetingRoom code={code} />
}
