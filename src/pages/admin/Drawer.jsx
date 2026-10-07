import { useState, useEffect } from 'react'
import { QUESTION_BANK } from '../../data/questions'
import { MAX_SCORE, FAST_BONUS_THRESHOLD, FAST_BONUS_MARKS, TOTAL_Q } from '../../lib/scoring'
import { describeViolation } from '../../lib/device'
import { formatDuration, formatTime, initials } from '../../lib/format'
import { Icon, Badge, ScoreRing } from './ui'

const QMAP = Object.fromEntries(QUESTION_BANK.map((q) => [q.id, q]))

export default function Drawer({ item, onClose, onRetake, onDelete }) {
  const [wrongOnly, setWrongOnly] = useState(false)

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!item) return null
  const { sub, key, score, rawScore, bonus, correct, fastCount, answered, details } = item
  const violations = Object.values(sub.violations || {})
  const rows = wrongOnly ? details.filter((d) => !d.isCorrect) : details
  const correctCount = correct

  return (
    <div className="a-drawer-bg" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <aside className="a-drawer">
        <header className="drawer-head">
          <div className="avatar lg">{initials(sub.name)}</div>
          <div className="drawer-title">
            <h2>{sub.name}</h2>
            <p>
              {sub.school}
              {sub.grade ? ' · ' + sub.grade : ''}
            </p>
          </div>
          <button className="a-icon-btn" onClick={onClose} aria-label="Close">
            <Icon name="x" />
          </button>
        </header>

        <div className="drawer-body">
          <div className="drawer-summary">
            <ScoreRing value={score} max={MAX_SCORE} />
            <dl>
              <div>
                <dt>Correct answers</dt>
                <dd>
                  {correctCount}/{TOTAL_Q}
                </dd>
              </div>
              <div>
                <dt>Answered</dt>
                <dd>
                  {answered}/{TOTAL_Q}
                </dd>
              </div>
              <div>
                <dt>Marks (answers)</dt>
                <dd>{rawScore}</dd>
              </div>
              <div>
                <dt>Fast answers</dt>
                <dd>
                  {fastCount}
                  <small>
                    {' '}
                    (&gt;{FAST_BONUS_THRESHOLD} = +{FAST_BONUS_MARKS})
                  </small>
                </dd>
              </div>
              <div>
                <dt>Timing marks</dt>
                <dd>{bonus ? '+' + bonus : '0'}</dd>
              </div>
              <div>
                <dt>Duration</dt>
                <dd>{formatDuration(sub.startTime, sub.endTime)}</dd>
              </div>
            </dl>
          </div>

          <div className="drawer-meta">
            <Badge tone={sub.status === 'submitted' ? 'green' : 'amber'}>{sub.status}</Badge>
            {sub.autoSubmitted && <Badge tone="red">auto-submitted</Badge>}
            {(sub.violationCount || 0) > 0 && <Badge tone="red">{sub.violationCount} violations</Badge>}
            <span className="muted">Started {formatTime(sub.startTime)}</span>
          </div>

          <div className="drawer-actions">
            <button className="a-btn warn" onClick={() => onRetake(sub)}>
              <Icon name="unlock" size={16} /> Allow retake
            </button>
            <button className="a-btn danger" onClick={() => onDelete(key, sub)}>
              <Icon name="trash" size={16} /> Delete
            </button>
          </div>

          {violations.length > 0 && (
            <div className="drawer-block">
              <h4>Violations</h4>
              <ul className="viol-list">
                {violations.map((v, i) => (
                  <li key={i}>
                    <Icon name="alert" size={14} />
                    <span>{describeViolation(v.type)}</span>
                    <time>{v.time ? new Date(v.time).toLocaleTimeString() : ''}</time>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="drawer-block">
            <div className="block-head">
              <h4>Answers</h4>
              <label className="toggle">
                <input type="checkbox" checked={wrongOnly} onChange={(e) => setWrongOnly(e.target.checked)} />
                <span>Wrong / unanswered only</span>
              </label>
            </div>
            <div className="ans-list">
              {rows.map((d) => {
                const q = QMAP[d.id]
                const state = d.given === undefined ? 'skip' : d.isCorrect ? 'ok' : 'bad'
                return (
                  <div key={d.id} className={'ans-item ' + state}>
                    <div className="ans-top">
                      <span className="ans-id">{d.id}</span>
                      <span className="ans-q">{q ? q.q : ''}</span>
                      <span className="ans-marks">
                        {d.isCorrect ? '+' + d.marks : '0'}/{d.marks}
                        {d.fast ? ' ⚡' : ''}
                      </span>
                    </div>
                    <div className="ans-given">
                      {state === 'skip' ? 'No answer' : d.given}
                    </div>
                    {state !== 'ok' && <div className="ans-correct">Correct: {d.correct}</div>}
                  </div>
                )
              })}
              {rows.length === 0 && <div className="a-empty">Nothing to show.</div>}
            </div>
          </div>
        </div>
      </aside>
    </div>
  )
}
