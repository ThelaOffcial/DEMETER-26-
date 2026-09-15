import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  setPersistence,
  browserLocalPersistence,
} from 'firebase/auth'
import { ref, onValue, remove, off } from 'firebase/database'
import { auth, db } from '../lib/firebase'
import {
  scoreSubmission,
  TOTAL_Q,
  FAST_BONUS_THRESHOLD,
  FAST_BONUS_MARKS,
} from '../lib/scoring'

function friendlyAuthError(ex) {
  const code = (ex && ex.code) || ''
  const map = {
    'auth/invalid-email': 'Invalid email address.',
    'auth/user-disabled': 'This account has been disabled.',
    'auth/user-not-found':
      'No account found for this email. Use Sign up to create one.',
    'auth/wrong-password': 'Incorrect password. Try again.',
    'auth/invalid-credential':
      'Wrong email or password. If you are new, use Sign up.',
    'auth/invalid-login-credentials':
      'Wrong email or password. If you are new, use Sign up.',
    'auth/too-many-requests':
      'Too many attempts. Wait a few minutes and try again.',
    'auth/network-request-failed': 'Network error. Check your connection.',
    'auth/email-already-in-use':
      'An account already exists for this email. Use Sign in.',
    'auth/weak-password': 'Password must be at least 6 characters.',
    'auth/operation-not-allowed':
      'Email/password sign-in is disabled in Firebase Console.',
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

function formatDuration(start, end) {
  if (!start) return '—'
  const ms = (end || Date.now()) - start
  const m = Math.floor(ms / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  return `${m}m ${s}s`
}

function LoginScreen() {
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [pass2, setPass2] = useState('')
  const [err, setErr] = useState('')
  const [ok, setOk] = useState('')
  const [loading, setLoading] = useState(false)

  const switchMode = (m) => {
    setMode(m)
    setErr('')
    setOk('')
  }

  const submit = async (e) => {
    e.preventDefault()
    setErr('')
    setOk('')
    const em = email.trim()
    if (!em || !pass) {
      setErr('Email and password are required.')
      return
    }
    if (mode === 'signup') {
      if (pass.length < 6) {
        setErr('Password must be at least 6 characters.')
        return
      }
      if (pass !== pass2) {
        setErr('Passwords do not match.')
        return
      }
    }
    setLoading(true)
    try {
      await setPersistence(auth, browserLocalPersistence)
      if (mode === 'signup') {
        await createUserWithEmailAndPassword(auth, em, pass)
        setOk('Account created. You are signed in.')
      } else {
        await signInWithEmailAndPassword(auth, em, pass)
      }
    } catch (ex) {
      setErr(friendlyAuthError(ex))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="admin-login">
      <div className="login-card">
        <h1>DEMETER 26&apos;</h1>
        <p className="sub">
          {mode === 'signup'
            ? 'Create an admin account'
            : 'Sign in to manage results & retakes'}
        </p>
        <div className="auth-tabs">
          <button
            type="button"
            className={'auth-tab' + (mode === 'signin' ? ' active' : '')}
            onClick={() => switchMode('signin')}
          >
            Sign in
          </button>
          <button
            type="button"
            className={'auth-tab' + (mode === 'signup' ? ' active' : '')}
            onClick={() => switchMode('signup')}
          >
            Sign up
          </button>
        </div>
        <form onSubmit={submit}>
          <div className="field">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@school.edu"
              autoComplete="username"
              required
            />
          </div>
          <div className="field">
            <label>Password</label>
            <input
              type="password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              placeholder="At least 6 characters"
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              required
              minLength={6}
            />
          </div>
          {mode === 'signup' && (
            <div className="field">
              <label>Confirm password</label>
              <input
                type="password"
                value={pass2}
                onChange={(e) => setPass2(e.target.value)}
                placeholder="Repeat password"
                autoComplete="new-password"
                required
                minLength={6}
              />
            </div>
          )}
          <button type="submit" disabled={loading}>
            {loading
              ? mode === 'signup'
                ? 'Creating account…'
                : 'Signing in…'
              : mode === 'signup'
                ? 'Create admin account'
                : 'Sign in'}
          </button>
          {err && <div className="login-error">{err}</div>}
          {ok && <div className="login-ok">{ok}</div>}
        </form>
        <p className="auth-hint">
          {mode === 'signup'
            ? 'Creates a Firebase email/password account. Enable Email/Password in Firebase Console → Authentication.'
            : 'Session stays signed in on this browser until you sign out.'}
        </p>
      </div>
    </div>
  )
}

function DetailModal({ sub, subKey, onClose, onRetake, onDelete }) {
  if (!sub) return null
  const { score, rawScore, bonus, fastCount, details } = scoreSubmission(sub)
  const violations = sub.violations || []

  return (
    <div
      className="modal-bg"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="modal">
        <button className="modal-close" onClick={onClose}>
          ✕
        </button>
        <h2>{sub.name}</h2>
        <p style={{ color: 'var(--fern)', marginTop: -8 }}>
          {sub.school} · {sub.grade || '—'}
        </p>
        <p style={{ fontSize: 13 }}>
          Score: <strong>{score}/120</strong> · Raw: {rawScore}/115 · Fast:{' '}
          {fastCount}/{TOTAL_Q} (need &gt;{FAST_BONUS_THRESHOLD} for +
          {FAST_BONUS_MARKS}) · Bonus: {bonus ? '+' + bonus : '0'}
        </p>
        <p className="muted">
          Device: {sub.deviceId || '—'} · Status: {sub.status} ·{' '}
          {sub.autoSubmitted ? 'Auto-submitted' : 'Manual'} · Duration:{' '}
          {formatDuration(sub.startTime, sub.endTime)}
        </p>
        <div className="action-row">
          <button className="btn alert sm" onClick={() => onRetake(sub)}>
            Allow device to retake
          </button>
          <button
            className="btn outline sm"
            onClick={() => {
              if (
                confirm(
                  'Permanently delete this submission? This cannot be undone.'
                )
              )
                onDelete(subKey)
            }}
          >
            Delete submission
          </button>
        </div>
        {violations.length > 0 && (
          <>
            <h3 style={{ fontSize: 15 }}>Violations ({violations.length})</h3>
            {Object.values(violations).map((v, i) => (
              <div key={i} className="viol-item">
                {v.type} — {v.time ? new Date(v.time).toLocaleTimeString() : ''}
              </div>
            ))}
          </>
        )}
        <h3 style={{ fontSize: 15, marginTop: 18 }}>Answers</h3>
        {details.map((d) => (
          <div key={d.id} className="qa-row">
            <div className="qtxt">
              {d.id}. {d.qtext}{' '}
              <span style={{ color: 'var(--fern)', fontWeight: 400 }}>
                ({d.marks} mark{d.marks > 1 ? 's' : ''}
                {d.fast ? ' · fast' : ''})
              </span>
            </div>
            <div
              className={
                'ans ' +
                (d.given === undefined
                  ? 'unanswered'
                  : d.isCorrect
                    ? 'correct'
                    : 'wrong')
              }
            >
              Given: {d.given === undefined ? 'No answer' : d.given}
            </div>
            {!d.isCorrect && (
              <div className="ans" style={{ color: '#555' }}>
                Correct: {d.correct}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function AdminPage() {
  const [user, setUser] = useState(null)
  const [authReady, setAuthReady] = useState(false)
  const [subs, setSubs] = useState({})
  const [devices, setDevices] = useState({})
  const [fingerprints, setFingerprints] = useState({})
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('score-desc')
  const [filterStatus, setFilterStatus] = useState('all')
  const [tab, setTab] = useState('results')
  const [selected, setSelected] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u)
      setAuthReady(true)
    })
    return () => unsub()
  }, [])

  useEffect(() => {
    if (!user) return
    const r = ref(db, 'submissions')
    const cb = (snap) => setSubs(snap.val() || {})
    onValue(r, cb)
    return () => off(r, 'value', cb)
  }, [user])

  useEffect(() => {
    if (!user) return
    const dRef = ref(db, 'devices')
    const fRef = ref(db, 'deviceFingerprints')
    const dCb = (snap) => setDevices(snap.val() || {})
    const fCb = (snap) => setFingerprints(snap.val() || {})
    onValue(dRef, dCb)
    onValue(fRef, fCb)
    return () => {
      off(dRef, 'value', dCb)
      off(fRef, 'value', fCb)
    }
  }, [user])

  const scored = useMemo(
    () =>
      Object.entries(subs).map(([key, sub]) => {
        const sc = scoreSubmission(sub)
        return { key, sub, ...sc }
      }),
    [subs]
  )

  const stats = useMemo(() => {
    let submitted = 0
    let inProgress = 0
    let auto = 0
    let scoreSum = 0
    scored.forEach(({ sub, score }) => {
      if (sub.status === 'submitted') {
        submitted++
        scoreSum += score
        if (sub.autoSubmitted) auto++
      } else if (sub.status === 'in-progress') inProgress++
    })
    return {
      total: submitted,
      inProgress,
      avg: submitted ? (scoreSum / submitted).toFixed(1) : '0',
      auto,
      devices: Object.keys(devices).length,
    }
  }, [scored, devices])

  const filtered = useMemo(() => {
    let list = [...scored]
    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter(
        ({ sub }) =>
          (sub.name || '').toLowerCase().includes(q) ||
          (sub.school || '').toLowerCase().includes(q) ||
          (sub.grade || '').toLowerCase().includes(q)
      )
    }
    if (filterStatus === 'submitted')
      list = list.filter(({ sub }) => sub.status === 'submitted')
    if (filterStatus === 'in-progress')
      list = list.filter(({ sub }) => sub.status === 'in-progress')
    if (filterStatus === 'auto')
      list = list.filter(({ sub }) => sub.autoSubmitted)

    list.sort((a, b) => {
      if (sort === 'score-desc') return b.score - a.score
      if (sort === 'score-asc') return a.score - b.score
      if (sort === 'time-desc')
        return (
          (b.sub.endTime || b.sub.startTime || 0) -
          (a.sub.endTime || a.sub.startTime || 0)
        )
      if (sort === 'violations-desc')
        return (b.sub.violationCount || 0) - (a.sub.violationCount || 0)
      if (sort === 'name')
        return (a.sub.name || '').localeCompare(b.sub.name || '')
      return 0
    })
    return list
  }, [scored, search, sort, filterStatus])

  const leaderboard = useMemo(
    () =>
      scored
        .filter(({ sub }) => sub.status === 'submitted')
        .sort((a, b) => b.score - a.score)
        .slice(0, 15),
    [scored]
  )

  // Top schools by best student score (winning school ranking)
  const schoolRankings = useMemo(() => {
    const map = {}
    scored
      .filter(({ sub }) => sub.status === 'submitted')
      .forEach(({ sub, score }) => {
        const school = (sub.school || 'Unknown').trim()
        if (!map[school] || score > map[school].score) {
          map[school] = {
            school,
            score,
            name: sub.name || '—',
            grade: sub.grade || '',
          }
        }
      })
    return Object.values(map)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
  }, [scored])

  const topStudents = useMemo(
    () =>
      scored
        .filter(({ sub }) => sub.status === 'submitted')
        .sort((a, b) => b.score - a.score)
        .slice(0, 10),
    [scored]
  )

  const allowRetake = useCallback(async (sub) => {
    if (
      !confirm(
        'Allow this device to take the quiz again?\n\nRemoves server-side device lock. Previous submission stays. Student refreshes the quiz page — local storage clears automatically.'
      )
    )
      return
    setBusy(true)
    try {
      if (sub.deviceId) await remove(ref(db, 'devices/' + sub.deviceId))
      if (sub.fingerprint)
        await remove(ref(db, 'deviceFingerprints/' + sub.fingerprint))
      alert('Device unlocked. Student can refresh and retake.')
    } catch (e) {
      alert('Failed: ' + e.message)
    } finally {
      setBusy(false)
    }
  }, [])

  const deleteSubmission = useCallback(async (key) => {
    setBusy(true)
    try {
      await remove(ref(db, 'submissions/' + key))
      setSelected(null)
    } catch (e) {
      alert('Delete failed: ' + e.message)
    } finally {
      setBusy(false)
    }
  }, [])

  const unlockDevice = useCallback(async (deviceId) => {
    if (!confirm('Unlock device ' + deviceId + '?')) return
    setBusy(true)
    try {
      await remove(ref(db, 'devices/' + deviceId))
    } catch (e) {
      alert(e.message)
    } finally {
      setBusy(false)
    }
  }, [])

  const unlockFingerprint = useCallback(async (fp) => {
    if (!confirm('Unlock fingerprint?')) return
    setBusy(true)
    try {
      await remove(ref(db, 'deviceFingerprints/' + fp))
    } catch (e) {
      alert(e.message)
    } finally {
      setBusy(false)
    }
  }, [])

  const clearAllDevices = useCallback(async () => {
    if (
      !confirm(
        'Remove ALL device locks? Every student will be able to retake after refresh.'
      )
    )
      return
    setBusy(true)
    try {
      await remove(ref(db, 'devices'))
      await remove(ref(db, 'deviceFingerprints'))
      alert('All device locks cleared.')
    } catch (e) {
      alert(e.message)
    } finally {
      setBusy(false)
    }
  }, [])

  const exportCsv = useCallback(() => {
    const rows = [
      [
        'Name',
        'School',
        'Grade',
        'Score /120',
        'Raw /115',
        'Bonus',
        'Fast Answers',
        'Violations',
        'Status',
        'Auto-Submitted',
        'Start Time',
        'End Time',
        'Device ID',
      ],
    ]
    scored.forEach(({ sub, score, rawScore, bonus, fastCount }) => {
      rows.push([
        sub.name,
        sub.school,
        sub.grade,
        score,
        rawScore,
        bonus,
        fastCount + '/' + TOTAL_Q,
        sub.violationCount || 0,
        sub.status,
        sub.autoSubmitted ? 'Yes' : 'No',
        sub.startTime ? new Date(sub.startTime).toISOString() : '',
        sub.endTime ? new Date(sub.endTime).toISOString() : '',
        sub.deviceId || '',
      ])
    })
    const csv = rows
      .map((r) =>
        r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')
      )
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'demeter26_results.csv'
    a.click()
    URL.revokeObjectURL(url)
  }, [scored])

  const exportWinnersPoster = useCallback(() => {
    if (schoolRankings.length === 0) {
      alert('No submitted results yet to generate a poster.')
      return
    }

    const W = 1080
    const H = 1350
    const canvas = document.createElement('canvas')
    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext('2d')

    // Background gradient
    const bg = ctx.createLinearGradient(0, 0, W, H)
    bg.addColorStop(0, '#0A1F18')
    bg.addColorStop(0.45, '#173D2E')
    bg.addColorStop(1, '#0F2A20')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, W, H)

    // Soft gold glow top
    const glow = ctx.createRadialGradient(W * 0.5, 80, 20, W * 0.5, 120, 420)
    glow.addColorStop(0, 'rgba(217,164,65,0.28)')
    glow.addColorStop(1, 'rgba(217,164,65,0)')
    ctx.fillStyle = glow
    ctx.fillRect(0, 0, W, 500)

    // Corner accent lines
    ctx.strokeStyle = 'rgba(217,164,65,0.35)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(48, 48)
    ctx.lineTo(180, 48)
    ctx.moveTo(48, 48)
    ctx.lineTo(48, 180)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(W - 48, H - 48)
    ctx.lineTo(W - 180, H - 48)
    ctx.moveTo(W - 48, H - 48)
    ctx.lineTo(W - 48, H - 180)
    ctx.stroke()

    // Eyebrow
    ctx.fillStyle = '#D9A441'
    ctx.font = '600 22px "Work Sans", system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.letterSpacing = '6px'
    ctx.fillText('ALL ISLAND INTER SCHOOL ECO QUIZ', W / 2, 100)

    // Title
    ctx.fillStyle = '#F1F3EA'
    ctx.font = '700 72px "Fraunces", Georgia, serif'
    ctx.fillText("DEMETER 26'", W / 2, 185)

    // Subtitle
    ctx.fillStyle = 'rgba(241,243,234,0.75)'
    ctx.font = '500 28px "Work Sans", system-ui, sans-serif'
    ctx.fillText('TOP 5 WINNING SCHOOLS', W / 2, 240)

    // Gold divider
    ctx.strokeStyle = '#D9A441'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(W / 2 - 80, 268)
    ctx.lineTo(W / 2 + 80, 268)
    ctx.stroke()

    const medals = ['#D9A441', '#C0C7CE', '#C47B3A', '#7C9A8E', '#7C9A8E']
    const startY = 320
    const rowH = 150

    schoolRankings.forEach((row, i) => {
      const y = startY + i * rowH
      // Card background
      ctx.fillStyle = i === 0 ? 'rgba(217,164,65,0.14)' : 'rgba(255,255,255,0.05)'
      roundRect(ctx, 64, y, W - 128, 128, 20)
      ctx.fill()
      ctx.strokeStyle = i === 0 ? 'rgba(217,164,65,0.55)' : 'rgba(255,255,255,0.08)'
      ctx.lineWidth = 1.5
      roundRect(ctx, 64, y, W - 128, 128, 20)
      ctx.stroke()

      // Rank circle
      ctx.beginPath()
      ctx.arc(130, y + 64, 32, 0, Math.PI * 2)
      ctx.fillStyle = medals[i] || '#7C9A8E'
      ctx.fill()
      ctx.fillStyle = i < 3 ? '#0F2A20' : '#F1F3EA'
      ctx.font = '700 28px "Fraunces", Georgia, serif'
      ctx.textAlign = 'center'
      ctx.fillText(String(i + 1), 130, y + 74)

      // School name
      ctx.textAlign = 'left'
      ctx.fillStyle = '#F1F3EA'
      ctx.font = '600 32px "Work Sans", system-ui, sans-serif'
      const schoolName = truncate(ctx, row.school, W - 360)
      ctx.fillText(schoolName, 190, y + 52)

      // Student
      ctx.fillStyle = 'rgba(241,243,234,0.65)'
      ctx.font = '500 22px "Work Sans", system-ui, sans-serif'
      const studentLine = row.grade
        ? `${row.name}  ·  ${row.grade}`
        : row.name
      ctx.fillText(truncate(ctx, studentLine, W - 360), 190, y + 90)

      // Score
      ctx.textAlign = 'right'
      ctx.fillStyle = '#D9A441'
      ctx.font = '700 40px "Fraunces", Georgia, serif'
      ctx.fillText(String(row.score), W - 100, y + 72)
      ctx.fillStyle = 'rgba(241,243,234,0.5)'
      ctx.font = '500 16px "Work Sans", system-ui, sans-serif'
      ctx.fillText('/ 120', W - 100, y + 98)
    })

    // Footer
    ctx.textAlign = 'center'
    ctx.fillStyle = 'rgba(241,243,234,0.45)'
    ctx.font = '500 20px "Work Sans", system-ui, sans-serif'
    ctx.fillText('First Round Results  ·  Powered by SSCICTS', W / 2, H - 56)

    canvas.toBlob((blob) => {
      if (!blob) {
        alert('Could not create image.')
        return
      }
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'demeter26-top5-schools.png'
      a.click()
      URL.revokeObjectURL(url)
    }, 'image/png')
  }, [schoolRankings])

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.arcTo(x + w, y, x + w, y + h, r)
    ctx.arcTo(x + w, y + h, x, y + h, r)
    ctx.arcTo(x, y + h, x, y, r)
    ctx.arcTo(x, y, x + w, y, r)
    ctx.closePath()
  }

  function truncate(ctx, text, maxW) {
    if (ctx.measureText(text).width <= maxW) return text
    let s = text
    while (s.length > 0 && ctx.measureText(s + '…').width > maxW) {
      s = s.slice(0, -1)
    }
    return s + '…'
  }

  if (!authReady) {
    return <div className="auth-loading">Checking session…</div>
  }
  if (!user) return <LoginScreen />

  return (
    <div className="dash">
      <div className="header">
        <div>
          <div className="eyebrow">Live results · React admin</div>
          <h1>DEMETER 26&apos; Dashboard</h1>
          <p className="sub">
            Real-time submissions · Retake controls · Device management
          </p>
        </div>
        <div className="header-actions">
          <span className="muted">{user.email}</span>
          <button className="btn outline" onClick={() => signOut(auth)}>
            Sign out
          </button>
        </div>
      </div>

      <div className="stats">
        <div className="stat">
          <div className="num">{stats.total}</div>
          <div className="label">Submitted</div>
        </div>
        <div className="stat">
          <div className="num">{stats.inProgress}</div>
          <div className="label">In progress</div>
        </div>
        <div className="stat">
          <div className="num">{stats.avg}</div>
          <div className="label">Avg score</div>
        </div>
        <div className="stat">
          <div className="num">{stats.auto}</div>
          <div className="label">Auto-submitted</div>
        </div>
        <div className="stat">
          <div className="num">{stats.devices}</div>
          <div className="label">Locked devices</div>
        </div>
      </div>

      <div className="tabs">
        {['results', 'leaderboard', 'winners', 'devices', 'tools'].map((id) => (
          <button
            key={id}
            className={'tab' + (tab === id ? ' active' : '')}
            onClick={() => setTab(id)}
          >
            {id === 'results'
              ? 'Results'
              : id === 'leaderboard'
                ? 'Top Students'
                : id === 'winners'
                  ? 'Winning Schools'
                  : id === 'devices'
                    ? 'Devices & Retakes'
                    : 'Tools'}
          </button>
        ))}
      </div>

      {tab === 'results' && (
        <>
          <div className="toolbar">
            <input
              type="text"
              placeholder="Search name, school or grade…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="score-desc">Score (high→low)</option>
              <option value="score-asc">Score (low→high)</option>
              <option value="time-desc">Newest first</option>
              <option value="violations-desc">Most violations</option>
              <option value="name">Name A–Z</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All statuses</option>
              <option value="submitted">Submitted only</option>
              <option value="in-progress">In progress</option>
              <option value="auto">Auto-submitted</option>
            </select>
            <button className="btn" onClick={exportCsv}>
              Export CSV
            </button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>School</th>
                  <th>Grade</th>
                  <th>Score /120</th>
                  <th>Fast</th>
                  <th>Violations</th>
                  <th>Status</th>
                  <th>Duration</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr className="empty-row">
                    <td colSpan={8}>
                      {Object.keys(subs).length
                        ? 'No results match your filters.'
                        : 'No submissions yet.'}
                    </td>
                  </tr>
                ) : (
                  filtered.map(({ key, sub, score, fastCount }) => (
                    <tr key={key} onClick={() => setSelected({ key, sub })}>
                      <td>{sub.name}</td>
                      <td>{sub.school}</td>
                      <td>{sub.grade || '—'}</td>
                      <td>
                        <strong>{score}</strong>
                      </td>
                      <td>
                        {fastCount}/{TOTAL_Q}
                      </td>
                      <td>{sub.violationCount || 0}</td>
                      <td>
                        {sub.status === 'submitted' ? (
                          sub.autoSubmitted ? (
                            <span className="badge warn">Auto</span>
                          ) : (
                            <span className="badge ok">Submitted</span>
                          )
                        ) : (
                          <span className="badge mid">In progress</span>
                        )}
                      </td>
                      <td>{formatDuration(sub.startTime, sub.endTime)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'leaderboard' && (
        <div className="panel">
          <h3>Top scores</h3>
          <p>Live ranking of submitted quizzes (max 120).</p>
          <div className="leaderboard">
            {leaderboard.length === 0 && (
              <p className="muted">No submitted scores yet.</p>
            )}
            {leaderboard.map(({ sub, score }, i) => (
              <div key={i} className="lb-row">
                <div className="lb-rank">#{i + 1}</div>
                <div className="lb-name">
                  {sub.name}{' '}
                  <span className="muted">· {sub.school}</span>
                </div>
                <div className="lb-score">{score}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'winners' && (
        <>
          <div className="panel">
            <h3>Top 5 winning schools</h3>
            <p>
              Ranked by each school&apos;s highest student score. Export a
              modern shareable poster for social media.
            </p>
            <button
              className="btn"
              onClick={exportWinnersPoster}
              disabled={schoolRankings.length === 0}
            >
              Export Top 5 poster (PNG)
            </button>
          </div>
          <div className="panel">
            <div className="leaderboard">
              {schoolRankings.length === 0 && (
                <p className="muted">No submitted results yet.</p>
              )}
              {schoolRankings.map((row, i) => (
                <div key={row.school} className="lb-row">
                  <div className="lb-rank">#{i + 1}</div>
                  <div className="lb-name">
                    {row.school}
                    <div className="muted">
                      Top student: {row.name}
                      {row.grade ? ` · ${row.grade}` : ''}
                    </div>
                  </div>
                  <div className="lb-score">{row.score}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="panel">
            <h3>Top students (for reference)</h3>
            <div className="leaderboard">
              {topStudents.map(({ sub, score }, i) => (
                <div key={i} className="lb-row">
                  <div className="lb-rank">#{i + 1}</div>
                  <div className="lb-name">
                    {sub.name}{' '}
                    <span className="muted">· {sub.school}</span>
                  </div>
                  <div className="lb-score">{score}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {tab === 'devices' && (
        <>
          <div className="panel">
            <h3>Device locks</h3>
            <p>
              Unlock a device so the student can refresh and retake. Previous
              submissions stay on record unless deleted.
            </p>
            <button
              className="btn alert sm"
              onClick={clearAllDevices}
              disabled={busy}
            >
              Clear ALL device locks
            </button>
          </div>
          <div className="panel">
            <h3>Active device IDs ({Object.keys(devices).length})</h3>
            <ul className="device-list">
              {Object.keys(devices).length === 0 && (
                <li className="muted">None locked</li>
              )}
              {Object.entries(devices).map(([id, data]) => (
                <li key={id}>
                  <div>
                    <code style={{ fontSize: 12 }}>{id}</code>
                    <div className="muted">
                      {data.submissionKey
                        ? 'Submission: ' + data.submissionKey
                        : 'Reserved'}{' '}
                      ·{' '}
                      {data.reservedAt
                        ? new Date(data.reservedAt).toLocaleString()
                        : ''}
                    </div>
                  </div>
                  <button
                    className="btn outline sm"
                    onClick={() => unlockDevice(id)}
                    disabled={busy}
                  >
                    Unlock
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div className="panel">
            <h3>Fingerprints ({Object.keys(fingerprints).length})</h3>
            <ul className="device-list">
              {Object.keys(fingerprints).length === 0 && (
                <li className="muted">None locked</li>
              )}
              {Object.entries(fingerprints).map(([fp, data]) => (
                <li key={fp}>
                  <div>
                    <code style={{ fontSize: 11 }}>{fp.slice(0, 24)}…</code>
                    <div className="muted">
                      {data.reservedAt
                        ? new Date(data.reservedAt).toLocaleString()
                        : ''}
                    </div>
                  </div>
                  <button
                    className="btn outline sm"
                    onClick={() => unlockFingerprint(fp)}
                    disabled={busy}
                  >
                    Unlock
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      {tab === 'tools' && (
        <>
          <div className="panel">
            <h3>Export</h3>
            <p>Download all submissions as CSV.</p>
            <button className="btn" onClick={exportCsv}>
              Export CSV
            </button>
          </div>
          <div className="panel">
            <h3>Retake how-to</h3>
            <p>
              1. Open a result → Allow device to retake
              <br />
              2. Or Devices tab → Unlock
              <br />
              3. Student refreshes the quiz (/) — local flag clears when server
              lock is gone
            </p>
          </div>
          <div className="panel">
            <h3>Scoring</h3>
            <p>
              Q1–15: 1 mark · Q16–35: 2 · Q36–50: 4 (=115). +5 if more than{' '}
              {FAST_BONUS_THRESHOLD} fast answers. Max 120.
            </p>
          </div>
        </>
      )}

      {selected && (
        <DetailModal
          sub={selected.sub}
          subKey={selected.key}
          onClose={() => setSelected(null)}
          onRetake={(sub) => allowRetake(sub)}
          onDelete={(key) => deleteSubmission(key)}
        />
      )}
    </div>
  )
}
