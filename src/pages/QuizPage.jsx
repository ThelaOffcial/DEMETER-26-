import { useState, useEffect, useRef, useCallback } from 'react'
import { ref, get, set, update, push } from 'firebase/database'
import { db } from '../lib/firebase'
import { QUESTION_BANK } from '../data/questions'
import { TRANSLATIONS_SI, UI_SI } from '../data/translations'
import { UI_EN } from '../lib/uiStrings'
import {
  getDeviceId,
  getFingerprint,
  shuffle,
  describeViolation,
} from '../lib/device'

const READ_SECONDS = 10
const ANSWER_SECONDS = 20
const MAX_VIOLATIONS = 3
const FS_GRACE_SECONDS = 5
const FAST_ADVANCE_DELAY = 1200

const deviceId = getDeviceId()
const fingerprint = getFingerprint()

function Brand({ lang }) {
  return (
    <div className="brand">
      <div className="eyebrow">All Island Inter School Eco Quiz</div>
      <h1>DEMETER 26&apos;</h1>
      <p>{lang === 'si' ? UI_EN.brandSubSi : UI_EN.brandSub}</p>
      <div className="powered-by">
        <span>Powered by SSCICTS</span>
      </div>
    </div>
  )
}

export default function QuizPage() {
  const [screen, setScreen] = useState('loading')
  const [lang, setLang] = useState('en')
  const [name, setName] = useState('')
  const [school, setSchool] = useState('')
  const [grade, setGrade] = useState('')
  const [regError, setRegError] = useState('')
  const [starting, setStarting] = useState(false)
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState({})
  const [shuffledOptions, setShuffledOptions] = useState({})
  const [phase, setPhase] = useState('reading')
  const [phaseTimeLeft, setPhaseTimeLeft] = useState(READ_SECONDS)
  const [toast, setToast] = useState(null)
  const [fsGrace, setFsGrace] = useState(null)
  const [doneInfo, setDoneInfo] = useState({ auto: false, reason: null })

  const submissionKeyRef = useRef(null)
  const submittedRef = useRef(false)
  const answersRef = useRef({})
  const phaseRef = useRef('reading')
  const currentRef = useRef(0)
  const answerPhaseStartRef = useRef(null)
  const violationCountRef = useRef(0)
  const questionIntervalRef = useRef(null)
  const fastAdvanceRef = useRef(null)
  const fsGraceTimerRef = useRef(null)
  const fsGraceLeftRef = useRef(0)
  const devtoolsWarnedRef = useRef(false)
  const langRef = useRef('en')

  const t = useCallback((key) => {
    if (langRef.current === 'si' && UI_SI?.[key]) return UI_SI[key]
    return UI_EN[key] || key
  }, [])

  useEffect(() => {
    answersRef.current = answers
  }, [answers])
  useEffect(() => {
    phaseRef.current = phase
  }, [phase])
  useEffect(() => {
    currentRef.current = current
  }, [current])
  useEffect(() => {
    langRef.current = lang
  }, [lang])

  const showToast = useCallback((msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3200)
  }, [])

  const checkDeviceEligibility = useCallback(async () => {
    try {
      const snap1 = await get(ref(db, 'devices/' + deviceId))
      const snap2 = await get(ref(db, 'deviceFingerprints/' + fingerprint))
      const locked = snap1.exists() || snap2.exists()
      if (!locked) {
        localStorage.removeItem('demeter_submitted')
        return true
      }
      return false
    } catch (e) {
      console.error('Eligibility check failed', e)
      return localStorage.getItem('demeter_submitted') !== 'true'
    }
  }, [])

  useEffect(() => {
    ;(async () => {
      const eligible = await checkDeviceEligibility()
      setScreen(eligible ? 'reg' : 'locked')
    })()
  }, [checkDeviceEligibility])

  const cancelFullscreenGrace = useCallback(() => {
    if (fsGraceTimerRef.current) {
      clearInterval(fsGraceTimerRef.current)
      fsGraceTimerRef.current = null
    }
    fsGraceLeftRef.current = 0
    setFsGrace(null)
  }, [])

  const finalizeSubmit = useCallback(
    async (auto, reason) => {
      if (submittedRef.current) return
      submittedRef.current = true
      if (questionIntervalRef.current) clearInterval(questionIntervalRef.current)
      if (fastAdvanceRef.current) clearTimeout(fastAdvanceRef.current)
      cancelFullscreenGrace()
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {})
      }
      localStorage.setItem('demeter_submitted', 'true')
      if (submissionKeyRef.current) {
        try {
          await update(ref(db, 'submissions/' + submissionKeyRef.current), {
            status: 'submitted',
            endTime: Date.now(),
            autoSubmitted: !!auto,
            autoSubmitReason: reason || null,
          })
        } catch (e) {
          console.error(e)
        }
      }
      setDoneInfo({ auto: !!auto && reason !== 'completed', reason })
      setScreen('done')
    },
    [cancelFullscreenGrace]
  )

  const logViolation = useCallback(
    (type) => {
      if (submittedRef.current) return
      violationCountRef.current += 1
      const entry = { type, time: Date.now() }
      if (submissionKeyRef.current) {
        push(ref(db, `submissions/${submissionKeyRef.current}/violations`), entry)
        update(ref(db, `submissions/${submissionKeyRef.current}`), {
          violationCount: violationCountRef.current,
        })
      }
      showToast(
        `Violation ${violationCountRef.current}/${MAX_VIOLATIONS}: ${describeViolation(type)}`
      )
      if (violationCountRef.current >= MAX_VIOLATIONS) {
        finalizeSubmit(true, type)
      }
    },
    [showToast, finalizeSubmit]
  )

  const requestFullscreenSafe = useCallback(() => {
    const el = document.documentElement
    const req =
      el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen
    if (req) {
      try {
        req.call(el)
      } catch (e) {}
    }
  }, [])

  const startFullscreenGrace = useCallback(() => {
    if (submittedRef.current) return
    if (fsGraceTimerRef.current) return
    fsGraceLeftRef.current = FS_GRACE_SECONDS
    setFsGrace(FS_GRACE_SECONDS)
    fsGraceTimerRef.current = setInterval(() => {
      fsGraceLeftRef.current -= 1
      setFsGrace(fsGraceLeftRef.current)
      if (fsGraceLeftRef.current <= 0) {
        clearInterval(fsGraceTimerRef.current)
        fsGraceTimerRef.current = null
        logViolation('fullscreen-exit')
        finalizeSubmit(true, 'fullscreen-exit-timeout')
      }
    }, 1000)
  }, [logViolation, finalizeSubmit])

  const buildQuestions = useCallback((quizLang) => {
    const map = {}
    QUESTION_BANK.forEach((q) => {
      const labels =
        quizLang === 'si' && TRANSLATIONS_SI[q.id]
          ? TRANSLATIONS_SI[q.id].options
          : q.options
      const pairs = q.options.map((val, i) => ({
        value: val,
        label: labels[i] || val,
      }))
      map[q.id] = shuffle(pairs)
    })
    setShuffledOptions(map)
  }, [])

  const advanceQuestion = useCallback(() => {
    if (submittedRef.current) return
    if (currentRef.current < QUESTION_BANK.length - 1) {
      const next = currentRef.current + 1
      setCurrent(next)
      currentRef.current = next
      setPhase('reading')
      phaseRef.current = 'reading'
      setPhaseTimeLeft(READ_SECONDS)
      answerPhaseStartRef.current = null
      if (fastAdvanceRef.current) clearTimeout(fastAdvanceRef.current)
    } else {
      finalizeSubmit(false, 'completed')
    }
  }, [finalizeSubmit])

  useEffect(() => {
    if (screen !== 'quiz' || submittedRef.current) return
    if (questionIntervalRef.current) clearInterval(questionIntervalRef.current)
    questionIntervalRef.current = setInterval(() => {
      if (submittedRef.current) {
        clearInterval(questionIntervalRef.current)
        return
      }
      setPhaseTimeLeft((prev) => {
        if (prev <= 1) {
          if (phaseRef.current === 'reading') {
            phaseRef.current = 'answering'
            setPhase('answering')
            answerPhaseStartRef.current = Date.now()
            return ANSWER_SECONDS
          }
          clearInterval(questionIntervalRef.current)
          advanceQuestion()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => {
      if (questionIntervalRef.current) clearInterval(questionIntervalRef.current)
    }
  }, [screen, current, advanceQuestion])

  useEffect(() => {
    if (screen !== 'quiz') return
    const onVis = () => {
      if (document.hidden && !submittedRef.current) logViolation('tab-switch')
    }
    const onBlur = () => {
      if (!submittedRef.current) logViolation('window-blur')
    }
    const onFs = () => {
      if (submittedRef.current) return
      if (!document.fullscreenElement) {
        logViolation('fullscreen-exit')
        startFullscreenGrace()
      } else {
        cancelFullscreenGrace()
      }
    }
    const onCtx = (e) => e.preventDefault()
    const blockClipboard = (e) => e.preventDefault()
    const onKey = (e) => {
      const blocked =
        e.key === 'F12' ||
        (e.ctrlKey &&
          e.shiftKey &&
          ['I', 'J', 'C', 'K'].includes(e.key.toUpperCase())) ||
        (e.ctrlKey && ['u', 's', 'p'].includes(e.key.toLowerCase())) ||
        (e.metaKey && e.shiftKey)
      if (blocked) {
        e.preventDefault()
        logViolation('blocked-key')
      }
    }
    const onKeyUp = (e) => {
      if (e.key === 'PrintScreen') {
        if (navigator.clipboard?.writeText) {
          navigator.clipboard.writeText('').catch(() => {})
        }
        logViolation('printscreen')
      }
    }
    const devtoolsIv = setInterval(() => {
      const threshold = 160
      if (
        (window.outerWidth - window.innerWidth > threshold ||
          window.outerHeight - window.innerHeight > threshold) &&
        !devtoolsWarnedRef.current
      ) {
        devtoolsWarnedRef.current = true
        logViolation('devtools')
        setTimeout(() => {
          devtoolsWarnedRef.current = false
        }, 8000)
      }
    }, 1500)
    const onBeforeUnload = (e) => {
      if (!submittedRef.current) {
        logViolation('window-blur')
        e.preventDefault()
        e.returnValue = ''
      }
    }
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('blur', onBlur)
    document.addEventListener('fullscreenchange', onFs)
    document.addEventListener('contextmenu', onCtx)
    ;['copy', 'cut', 'paste'].forEach((evt) =>
      document.addEventListener(evt, blockClipboard)
    )
    document.addEventListener('keydown', onKey)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('blur', onBlur)
      document.removeEventListener('fullscreenchange', onFs)
      document.removeEventListener('contextmenu', onCtx)
      ;['copy', 'cut', 'paste'].forEach((evt) =>
        document.removeEventListener(evt, blockClipboard)
      )
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('beforeunload', onBeforeUnload)
      clearInterval(devtoolsIv)
    }
  }, [screen, logViolation, startFullscreenGrace, cancelFullscreenGrace])

  const selectAnswer = useCallback(
    (qId, value) => {
      if (phaseRef.current !== 'answering' || submittedRef.current) return
      if (answersRef.current[qId]) return
      const elapsed = Date.now() - (answerPhaseStartRef.current || Date.now())
      const fast = elapsed <= (ANSWER_SECONDS / 2) * 1000
      const entry = { value, fast, at: Date.now() }
      setAnswers((prev) => {
        const next = { ...prev, [qId]: entry }
        answersRef.current = next
        return next
      })
      if (submissionKeyRef.current) {
        set(ref(db, `submissions/${submissionKeyRef.current}/answers/${qId}`), entry)
      }
      if (fastAdvanceRef.current) clearTimeout(fastAdvanceRef.current)
      fastAdvanceRef.current = setTimeout(() => {
        if (submittedRef.current || phaseRef.current !== 'answering') return
        if (questionIntervalRef.current) clearInterval(questionIntervalRef.current)
        advanceQuestion()
      }, FAST_ADVANCE_DELAY)
    },
    [advanceQuestion]
  )

  const startQuiz = async () => {
    setRegError('')
    if (!name.trim() || !school.trim()) {
      setRegError(t('regErrorMissing'))
      return
    }
    setStarting(true)
    const eligible = await checkDeviceEligibility()
    if (!eligible) {
      setScreen('locked')
      setStarting(false)
      return
    }
    try {
      await set(ref(db, 'devices/' + deviceId), { reservedAt: Date.now() })
      await set(ref(db, 'deviceFingerprints/' + fingerprint), {
        reservedAt: Date.now(),
      })
      const newRef = push(ref(db, 'submissions'))
      submissionKeyRef.current = newRef.key
      await set(newRef, {
        name: name.trim(),
        school: school.trim(),
        grade: grade.trim(),
        lang,
        deviceId,
        fingerprint,
        status: 'in-progress',
        startTime: Date.now(),
        endTime: null,
        answers: {},
        violations: [],
        violationCount: 0,
        autoSubmitted: false,
        userAgent: navigator.userAgent,
      })
      await update(ref(db, 'devices/' + deviceId), {
        submissionKey: newRef.key,
      })
      buildQuestions(lang)
      setCurrent(0)
      currentRef.current = 0
      setPhase('reading')
      phaseRef.current = 'reading'
      setPhaseTimeLeft(READ_SECONDS)
      setAnswers({})
      answersRef.current = {}
      violationCountRef.current = 0
      submittedRef.current = false
      requestFullscreenSafe()
      setScreen('quiz')
    } catch (e) {
      console.error(e)
      setRegError('Could not start quiz. Check your connection and try again.')
    } finally {
      setStarting(false)
    }
  }

  if (screen === 'loading') {
    return (
      <div className="student-shell">
        <Brand lang={lang} />
        <div className="card" style={{ textAlign: 'center', color: 'var(--fern)' }}>
          {UI_EN.loading}
        </div>
      </div>
    )
  }

  if (screen === 'locked') {
    return (
      <div className="student-shell">
        <Brand lang={lang} />
        <div className="locked-card">
          <h2>{t('lockTitle')}</h2>
          <p>{t('lockMsg')}</p>
        </div>
      </div>
    )
  }

  if (screen === 'done') {
    const title = doneInfo.auto ? t('autoSubmitTitle') : t('doneTitle')
    const msg = doneInfo.auto
      ? `${t('autoSubmitMsgPrefix')} (${describeViolation(doneInfo.reason)}). ${t('autoSubmitMsgSuffix')}`
      : t('doneMsg')
    return (
      <div className="student-shell">
        <Brand lang={lang} />
        <div className="card done-card">
          <h2>{title}</h2>
          <p>{msg}</p>
        </div>
      </div>
    )
  }

  if (screen === 'reg') {
    const rules = [1, 2, 3, 4, 5, 6, 7, 8].map((i) => t('rule' + i))
    return (
      <div className="student-shell">
        <Brand lang={lang} />
        <div className="card">
          <div className="lang-switch">
            <button
              type="button"
              className={'lang-btn' + (lang === 'en' ? ' active' : '')}
              onClick={() => setLang('en')}
            >
              English
            </button>
            <button
              type="button"
              className={'lang-btn' + (lang === 'si' ? ' active' : '')}
              onClick={() => setLang('si')}
            >
              සිංහල
            </button>
          </div>
          <label>{t('lblName')}</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. K. D. Perera"
            autoComplete="off"
          />
          <label>{t('lblSchool')}</label>
          <input
            value={school}
            onChange={(e) => setSchool(e.target.value)}
            placeholder="e.g. Visakha Vidyalaya, Colombo"
            autoComplete="off"
          />
          <label>{t('lblGrade')}</label>
          <input
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            placeholder="e.g. Grade 10 — 4521"
            autoComplete="off"
          />
          <div className="rules">
            <b>{t('ruleHeading')}</b>
            <br />
            {rules.map((r, i) => (
              <span key={i}>
                • {r}
                <br />
              </span>
            ))}
          </div>
          {regError && <div className="error">{regError}</div>}
          <button className="btn-primary" disabled={starting} onClick={startQuiz}>
            {starting ? t('starting') : t('startBtn')}
          </button>
        </div>
      </div>
    )
  }

  const q = QUESTION_BANK[current]
  const translatedQ =
    lang === 'si' && TRANSLATIONS_SI[q.id] ? TRANSLATIONS_SI[q.id].q : q.q
  const lockedIn = phase === 'answering' && !!answers[q.id]
  const options = shuffledOptions[q.id] || []
  const letters = ['A', 'B', 'C', 'D']
  let phaseLabelText = t('readPhase')
  if (phase === 'answering' && lockedIn) phaseLabelText = t('lockedPhase')
  else if (phase === 'answering') phaseLabelText = t('answerPhase')

  return (
    <div className="student-shell">
      <div className="quiz-wrap">
        {toast && <div className="toast">{toast}</div>}
        {fsGrace !== null && (
          <div className="overlay">
            <h2>{t('fsTitle')}</h2>
            <div className="count">{fsGrace}</div>
            <p>{t('fsMsg')}</p>
          </div>
        )}
        <div className="top-bar">
          <div style={{ minWidth: 110 }}>
            <div
              className={
                'phase-label' + (phase === 'answering' ? ' answering' : '')
              }
            >
              {phaseLabelText}
            </div>
            <div style={{ fontSize: 12, color: 'var(--fern)', marginTop: 2 }}>
              Q{q.id} / {QUESTION_BANK.length}
            </div>
          </div>
          <div className="progress-track">
            <div
              className="progress-fill"
              style={{ width: (current / QUESTION_BANK.length) * 100 + '%' }}
            />
          </div>
          <div
            className={'phase-timer' + (phaseTimeLeft <= 3 ? ' low' : '')}
          >
            {phaseTimeLeft}
          </div>
        </div>
        <div className="question-card">
          <span className="q-num">Question {q.id}</span>
          <p className="q-text">{translatedQ}</p>
          {q.img && <img className="q-image" src={q.img} alt="" />}
          <div className="options">
            {options.map((pair, i) => {
              const isSelected =
                answers[q.id] && answers[q.id].value === pair.value
              const disabled = phase === 'reading' || lockedIn
              return (
                <button
                  key={pair.value + i}
                  type="button"
                  className={'option' + (isSelected ? ' selected' : '')}
                  disabled={disabled}
                  onClick={() => selectAnswer(q.id, pair.value)}
                >
                  <span className="letter">{letters[i]}</span>
                  <span>{pair.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
