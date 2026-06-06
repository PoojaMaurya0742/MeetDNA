export type MeetUser = {
  id: string
  name: string
  email: string
  createdAt: string
}

export type Meeting = {
  code: string
  title: string
  password: string | null
  hostId: string
  createdAt: string
  participants: string[]
}

const USERS_KEY = 'meetdna_users'
const USER_KEY = 'meetdna_user'

/* ----------------- password strength ----------------- */
export type StrengthResult = {
  checks: {
    length: boolean
    uppercase: boolean
    lowercase: boolean
    number: boolean
    special: boolean
  }
  score: number
  label: string
}

export function checkPasswordStrength(password: string): StrengthResult {
  const checks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  }
  const score = Object.values(checks).filter(Boolean).length
  const label = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Strong'][score] ?? ''
  return { checks, score, label }
}

/* ----------------- email validation ----------------- */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

/* ----------------- meeting code / password ----------------- */
export function generateMeetingCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const segment = () =>
    Array.from(
      { length: 3 },
      () => chars[Math.floor(Math.random() * chars.length)],
    ).join('')
  return `${segment()}-${segment()}-${segment()}`
}

export function generatePassword(): string {
  const chars =
    'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$'
  return Array.from(
    { length: 8 },
    () => chars[Math.floor(Math.random() * chars.length)],
  ).join('')
}

/* ----------------- auth (localStorage simulation) ----------------- */
function readUsers(): (MeetUser & { password: string })[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || '[]')
  } catch {
    return []
  }
}

export function getCurrentUser(): MeetUser | null {
  if (typeof window === 'undefined') return null
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || 'null')
  } catch {
    return null
  }
}

export function signIn(email: string, password: string) {
  const users = readUsers()
  const user = users.find(
    (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === btoa(password),
  )
  if (user) {
    const { password: _pw, ...safe } = user
    localStorage.setItem(USER_KEY, JSON.stringify(safe))
    return { success: true as const, user: safe }
  }
  return { success: false as const, error: 'Invalid email or password' }
}

export function signUp(name: string, email: string, password: string) {
  const users = readUsers()
  if (users.find((u) => u.email.toLowerCase() === email.toLowerCase())) {
    return { success: false as const, error: 'Email already registered' }
  }
  const newUser = {
    id: crypto.randomUUID(),
    name,
    email,
    password: btoa(password),
    createdAt: new Date().toISOString(),
  }
  users.push(newUser)
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
  const { password: _pw, ...safe } = newUser
  localStorage.setItem(USER_KEY, JSON.stringify(safe))
  return { success: true as const, user: safe }
}

/* ----------------- meetings ----------------- */
export function saveMeeting(meeting: Meeting) {
  localStorage.setItem(
    `meetdna_meeting_${meeting.code}`,
    JSON.stringify(meeting),
  )
}

export function getMeeting(code: string): Meeting | null {
  if (typeof window === 'undefined') return null
  try {
    return JSON.parse(
      localStorage.getItem(`meetdna_meeting_${code}`) || 'null',
    )
  } catch {
    return null
  }
}
