export function formatDuration(start, end) {
  if (!start) return '—'
  const ms = (end || Date.now()) - start
  const m = Math.floor(ms / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  return `${m}m ${String(s).padStart(2, '0')}s`
}

export function formatTime(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function timeAgo(ts) {
  if (!ts) return '—'
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000))
  if (s < 60) return s + 's ago'
  if (s < 3600) return Math.floor(s / 60) + 'm ago'
  if (s < 86400) return Math.floor(s / 3600) + 'h ago'
  return Math.floor(s / 86400) + 'd ago'
}

export function initials(name) {
  const parts = String(name || '?')
    .replace(/[^\p{L}\s]/gu, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (!parts.length) return '?'
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase()
}

export function friendlyAuthError(ex) {
  const code = (ex && ex.code) || ''
  const map = {
    'auth/invalid-email': 'Invalid email address.',
    'auth/user-disabled': 'This account has been disabled.',
    'auth/user-not-found': 'No account found for this email. Use Sign up to create one.',
    'auth/wrong-password': 'Incorrect password. Try again.',
    'auth/invalid-credential': 'Wrong email or password. If you are new, use Sign up.',
    'auth/invalid-login-credentials': 'Wrong email or password. If you are new, use Sign up.',
    'auth/too-many-requests': 'Too many attempts. Wait a few minutes and try again.',
    'auth/network-request-failed': 'Network error. Check your connection.',
    'auth/email-already-in-use': 'An account already exists for this email. Use Sign in.',
    'auth/weak-password': 'Password must be at least 6 characters.',
    'auth/operation-not-allowed': 'Email/password sign-in is disabled in Firebase Console.',
    'auth/missing-password': 'Please enter a password.',
    'auth/missing-email': 'Please enter an email.',
  }
  if (map[code]) return map[code]
  const msg = ex?.message ? String(ex.message) : String(ex || 'Unknown error')
  return (
    msg
      .replace(/^Firebase:\s*/i, '')
      .replace(/\(auth\/[^)]+\)\.?/, '')
      .trim() || 'Authentication failed.'
  )
}

export function downloadText(filename, text, type = 'text/csv') {
  const blob = new Blob([text], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
