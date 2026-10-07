import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { ref, onValue, remove, set, off } from 'firebase/database'
import { auth, db } from '../lib/firebase'
import { QUESTION_BANK } from '../data/questions'
import { ANSWER_KEY, TOTAL_Q, MAX_SCORE, mergeKey, scoreSubmission, normalizeSubmission } from '../lib/scoring'
import { generatePoster } from '../lib/poster'
import { downloadText } from '../lib/format'
import { exportResultsPdf } from '../lib/pdfExport'
import Login from './admin/Login'
import Drawer from './admin/Drawer'
import { Icon } from './admin/ui'
import { Overview, Submissions, Leaderboard, Questions, Devices, Settings } from './admin/views'
import '../styles/admin.css'

const NAV = [
  ['overview', 'Overview', 'grid'],
  ['submissions', 'Submissions', 'users'],
  ['leaderboard', 'Leaderboard', 'trophy'],
  ['questions', 'Answer key', 'key'],
  ['devices', 'Devices', 'device'],
  ['settings', 'Settings', 'gear'],
]

const TITLES = {
  overview: ['Overview', 'Live snapshot of Round 2'],
  submissions: ['Submissions', 'Every attempt, searchable and sortable'],
  leaderboard: ['Leaderboard', 'Top students, winning schools and poster'],
  questions: ['Answer key', 'Edit correct answers and review question accuracy'],
  devices: ['Devices', 'One attempt per device — manage locks'],
  settings: ['Settings', 'Scoring, export and round reset'],
}

export default function AdminPage() {
  const [user, setUser] = useState(null)
  const [authReady, setAuthReady] = useState(false)
  const [subs, setSubs] = useState({})
  const [devices, setDevices] = useState({})
  const [fingerprints, setFingerprints] = useState({})
  const [keyOverride, setKeyOverride] = useState({})
  const [keyError, setKeyError] = useState('')
  const [draft, setDraft] = useState(ANSWER_KEY)
  const prevKeyRef = useRef(ANSWER_KEY)
  const [view, setView] = useState('overview')
  const [selectedKey, setSelectedKey] = useState(null)
  const [busy, setBusy] = useState(false)
  const [saving, setSaving] = useState(false)
  const [posterBusy, setPosterBusy] = useState(false)
  const [bgFile, setBgFile] = useState(null)
  const [toast, setToast] = useState(null)
  const [navOpen, setNavOpen] = useState(false)

  const notify = useCallback((msg, type = 'ok') => {
    setToast({ msg, type, id: Date.now() })
  }, [])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3400)
    return () => clearTimeout(t)
  }, [toast])

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u)
      setAuthReady(true)
    })
    return () => unsub()
  }, [])

  useEffect(() => {
    if (!user) return
    const subscribe = (path, cb, errCb) => {
      const r = ref(db, path)
      onValue(r, cb, errCb)
      return () => off(r, 'value', cb)
    }
    const offs = [
      subscribe('submissions', (s) => setSubs(s.val() || {})),
      subscribe('devices', (s) => setDevices(s.val() || {})),
      subscribe('deviceFingerprints', (s) => setFingerprints(s.val() || {})),
      subscribe(
        'config/answerKey',
        (s) => {
          setKeyOverride(s.val() || {})
          setKeyError('')
        },
        (e) => setKeyError('Could not read the saved answer key: ' + e.message)
      ),
    ]
    return () => offs.forEach((f) => f())
  }, [user])

  const keyMap = useMemo(() => mergeKey(keyOverride), [keyOverride])

  useEffect(() => {
    const prev = prevKeyRef.current
    setDraft((d) => (QUESTION_BANK.some((q) => d[q.id] !== prev[q.id]) ? d : keyMap))
    prevKeyRef.current = keyMap
  }, [keyMap])

  const dirtyCount = useMemo(
    () => QUESTION_BANK.filter((q) => draft[q.id] !== keyMap[q.id]).length,
    [draft, keyMap]
  )

  const scored = useMemo(
    () =>
      Object.entries(subs).map(([key, sub]) => ({
        key,
        sub,
        ...scoreSubmission(normalizeSubmission(sub), keyMap),
      })),
    [subs, keyMap]
  )

  const stats = useMemo(() => {
    let submitted = 0
    let inProgress = 0
    let auto = 0
    let sum = 0
    let top = 0
    let topName = ''
    scored.forEach(({ sub, score }) => {
      if (sub.status === 'submitted') {
        submitted++
        sum += score
        if (sub.autoSubmitted) auto++
        if (score > top) {
          top = score
          topName = sub.name
        }
      } else if (sub.status === 'in-progress') inProgress++
    })
    return {
      total: scored.length,
      submitted,
      inProgress,
      auto,
      top,
      topName,
      avg: submitted ? (sum / submitted).toFixed(1) : '0',
      devices: Object.keys(devices).length,
    }
  }, [scored, devices])

  const schoolRankings = useMemo(() => {
    const map = {}
    scored
      .filter(({ sub }) => sub.status === 'submitted')
      .forEach(({ sub, score }) => {
        const school = (sub.school || 'Unknown').trim()
        if (!map[school] || score > map[school].score) {
          map[school] = { school, score, name: sub.name || '—', grade: sub.grade || '' }
        }
      })
    return Object.values(map)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
  }, [scored])

  const qStats = useMemo(
    () =>
      QUESTION_BANK.map((q) => {
        const counts = {}
        let attempts = 0
        let correct = 0
        scored.forEach(({ sub: rawSub }) => {
          const sub = normalizeSubmission(rawSub)
          const a = sub.answers && sub.answers[q.id]
          const v = a && typeof a === 'object' ? a.value : a
          if (v === undefined) return
          attempts++
          counts[v] = (counts[v] || 0) + 1
          if (v === draft[q.id]) correct++
        })
        return { ...q, counts, attempts, accuracy: attempts ? correct / attempts : 0 }
      }),
    [scored, draft]
  )

  const subsByDevice = useMemo(() => {
    const m = {}
    Object.values(subs).forEach((s) => {
      if (s.deviceId) m[s.deviceId] = s
    })
    return m
  }, [subs])

  const selected = useMemo(() => scored.find((s) => s.key === selectedKey) || null, [scored, selectedKey])

  const run = useCallback(
    async (fn, okMsg) => {
      setBusy(true)
      try {
        await fn()
        if (okMsg) notify(okMsg)
      } catch (e) {
        notify(e.message || 'Something went wrong', 'err')
      } finally {
        setBusy(false)
      }
    },
    [notify]
  )

  const allowRetake = useCallback(
    (sub) => {
      if (!confirm('Allow this device to take the quiz again? The previous submission stays.')) return
      run(async () => {
        if (sub.deviceId) await remove(ref(db, 'devices/' + sub.deviceId))
        if (sub.fingerprint) await remove(ref(db, 'deviceFingerprints/' + sub.fingerprint))
      }, 'Device unlocked — student can refresh and retake.')
    },
    [run]
  )

  const deleteSubmission = useCallback(
    (key, sub) => {
      if (!confirm(`Permanently delete ${sub.name}'s submission?`)) return
      run(async () => {
        await remove(ref(db, 'submissions/' + key))
        setSelectedKey(null)
      }, 'Submission deleted.')
    },
    [run]
  )

  const unlockDevice = useCallback(
    (id) => {
      if (!confirm('Unlock this device?')) return
      run(() => remove(ref(db, 'devices/' + id)), 'Device unlocked.')
    },
    [run]
  )

  const unlockFp = useCallback(
    (fp) => {
      if (!confirm('Unlock this fingerprint?')) return
      run(() => remove(ref(db, 'deviceFingerprints/' + fp)), 'Fingerprint unlocked.')
    },
    [run]
  )

  const clearLocks = useCallback(() => {
    if (!confirm('Remove ALL device locks? Everyone can retake after a refresh.')) return
    run(async () => {
      await remove(ref(db, 'devices'))
      await remove(ref(db, 'deviceFingerprints'))
    }, 'All device locks cleared.')
  }, [run])

  const deleteAll = useCallback(() => {
    run(() => remove(ref(db, 'submissions')), 'All submissions deleted.')
  }, [run])

  const saveKey = useCallback(async () => {
    setSaving(true)
    try {
      const overrides = {}
      QUESTION_BANK.forEach((q) => {
        if (draft[q.id] !== ANSWER_KEY[q.id]) overrides[q.id] = draft[q.id]
      })
      await set(ref(db, 'config/answerKey'), Object.keys(overrides).length ? overrides : null)
      notify('Answer key saved — all scores updated.')
    } catch (e) {
      notify('Save failed: ' + e.message, 'err')
    } finally {
      setSaving(false)
    }
  }, [draft, notify])

  const exportCsv = useCallback(() => {
    const rows = [
      [
        'Name',
        'School',
        'Grade',
        `Correct /${TOTAL_Q}`,
        'Answer Marks',
        'Timing Marks',
        `Total /${MAX_SCORE}`,
        'Fast Answers',
        'Answered',
        'Violations',
        'Status',
        'Auto-Submitted',
        'Start Time',
        'End Time',
        'Device ID',
      ],
    ]
    ;[...scored]
      .sort((a, b) => b.score - a.score)
      .forEach(({ sub, score, rawScore, bonus, correct, fastCount, answered }) => {
        rows.push([
          sub.name,
          sub.school,
          sub.grade,
          correct + '/' + TOTAL_Q,
          rawScore,
          bonus,
          score,
          fastCount,
          answered + '/' + TOTAL_Q,
          sub.violationCount || 0,
          sub.status,
          sub.autoSubmitted ? 'Yes' : 'No',
          sub.startTime ? new Date(sub.startTime).toISOString() : '',
          sub.endTime ? new Date(sub.endTime).toISOString() : '',
          sub.deviceId || '',
        ])
      })
    const csv = rows.map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
    downloadText('demeter26_round2_results.csv', '\ufeff' + csv)
  }, [scored])

  const exportPdf = useCallback(() => {
    exportResultsPdf(scored, { maxScore: MAX_SCORE, totalQ: TOTAL_Q })
  }, [scored])

  const makePoster = useCallback(async () => {
    setPosterBusy(true)
    try {
      await generatePoster(schoolRankings.slice(0, 5), bgFile)
      notify('Poster downloaded.')
    } catch (e) {
      notify(e.message, 'err')
    } finally {
      setPosterBusy(false)
    }
  }, [schoolRankings, bgFile, notify])

  const go = (v) => {
    setView(v)
    setNavOpen(false)
    window.scrollTo({ top: 0 })
  }

  if (!authReady) return <div className="adm adm-boot">Checking session…</div>
  if (!user) return <Login />

  const [title, subtitle] = TITLES[view]

  return (
    <div className="adm">
      <aside className={'a-side' + (navOpen ? ' open' : '')}>
        <div className="side-brand">
          <span className="logo">D</span>
          <div>
            <b>DEMETER 26&apos;</b>
            <small>Round 2 · Admin</small>
          </div>
        </div>
        <nav>
          {NAV.map(([k, label, icon]) => (
            <button key={k} className={view === k ? 'on' : ''} onClick={() => go(k)}>
              <Icon name={icon} />
              <span>{label}</span>
              {k === 'submissions' && stats.inProgress > 0 && <em>{stats.inProgress} live</em>}
              {k === 'questions' && dirtyCount > 0 && <em className="warn">{dirtyCount}</em>}
            </button>
          ))}
        </nav>
        <div className="side-foot">
          <div className="live">
            <i /> Live sync
          </div>
          <div className="who">{user.email}</div>
          <button className="signout" onClick={() => signOut(auth)}>
            <Icon name="logout" size={16} /> Sign out
          </button>
        </div>
      </aside>
      {navOpen && <div className="side-scrim" onClick={() => setNavOpen(false)} />}

      <main className="a-main">
        <header className="a-top">
          <button className="a-icon-btn menu" onClick={() => setNavOpen(true)} aria-label="Menu">
            <Icon name="menu" />
          </button>
          <div>
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
          <div className="top-right">
            <span className="pill">
              <i /> {stats.inProgress} in progress
            </span>
            <button className="a-btn" onClick={exportCsv}>
              <Icon name="download" size={16} /> Export
            </button>
            <button className="a-btn" onClick={exportPdf}>
              <Icon name="download" size={16} /> PDF
            </button>
          </div>
        </header>

        {view === 'overview' && (
          <Overview
            stats={stats}
            scored={scored}
            schoolRankings={schoolRankings}
            qStats={qStats}
            onOpen={setSelectedKey}
            setView={go}
          />
        )}
        {view === 'submissions' && <Submissions scored={scored} onOpen={setSelectedKey} onExport={exportCsv} onExportPdf={exportPdf} />}
        {view === 'leaderboard' && (
          <Leaderboard
            scored={scored}
            schoolRankings={schoolRankings}
            onOpen={setSelectedKey}
            onPoster={makePoster}
            bgFile={bgFile}
            setBgFile={setBgFile}
            posterBusy={posterBusy}
          />
        )}
        {view === 'questions' && (
          <Questions
            qStats={qStats}
            keyMap={keyMap}
            draft={draft}
            setDraft={setDraft}
            dirtyCount={dirtyCount}
            onSave={saveKey}
            onReset={() => setDraft(keyMap)}
            saving={saving}
            keyError={keyError}
          />
        )}
        {view === 'devices' && (
          <Devices
            devices={devices}
            fingerprints={fingerprints}
            subsByDevice={subsByDevice}
            onUnlockDevice={unlockDevice}
            onUnlockFp={unlockFp}
            onClearAll={clearLocks}
            busy={busy}
          />
        )}
        {view === 'settings' && (
          <Settings
            user={user}
            onExport={exportCsv}
            onClearAll={clearLocks}
            onDeleteAll={deleteAll}
            onSignOut={() => signOut(auth)}
            busy={busy}
            total={stats.total}
          />
        )}
      </main>

      {selected && (
        <Drawer
          item={selected}
          onClose={() => setSelectedKey(null)}
          onRetake={allowRetake}
          onDelete={deleteSubmission}
        />
      )}

      {toast && (
        <div key={toast.id} className={'a-toast ' + toast.type}>
          <Icon name={toast.type === 'err' ? 'alert' : 'check'} size={16} /> {toast.msg}
        </div>
      )}
    </div>
  )
}
