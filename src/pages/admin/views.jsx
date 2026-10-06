import { useMemo, useState } from 'react'
import { QUESTION_BANK } from '../../data/questions'
import { ANSWER_KEY, MAX_SCORE, FAST_BONUS_THRESHOLD, FAST_BONUS_MARKS, TOTAL_Q, marksForQuestion } from '../../lib/scoring'
import { formatDuration, formatTime, timeAgo, initials } from '../../lib/format'
import { Icon, StatCard, Badge, Card, Empty } from './ui'

const LETTERS = ['A', 'B', 'C', 'D']

export function Overview({ stats, scored, schoolRankings, qStats, onOpen, setView }) {
  const bins = useMemo(() => {
    const b = Array.from({ length: 12 }, (_, i) => ({ from: i * 10, to: i === 11 ? 120 : i * 10 + 9, n: 0 }))
    scored
      .filter(({ sub }) => sub.status === 'submitted')
      .forEach(({ score }) => {
        b[Math.min(11, Math.floor(score / 10))].n++
      })
    return b
  }, [scored])
  const maxBin = Math.max(1, ...bins.map((b) => b.n))
  const recent = useMemo(
    () =>
      [...scored]
        .sort((a, b) => (b.sub.endTime || b.sub.startTime || 0) - (a.sub.endTime || a.sub.startTime || 0))
        .slice(0, 8),
    [scored]
  )
  const ranked = qStats.filter((q) => q.attempts > 0)
  const hardest = [...ranked].sort((a, b) => a.accuracy - b.accuracy).slice(0, 5)
  const easiest = [...ranked].sort((a, b) => b.accuracy - a.accuracy).slice(0, 5)

  return (
    <div className="view">
      <div className="stat-grid">
        <StatCard label="Submitted" value={stats.submitted} icon="check" tone="green" hint={`${stats.total} total entries`} />
        <StatCard label="In progress" value={stats.inProgress} icon="clock" tone="amber" hint="Live right now" />
        <StatCard label="Average score" value={stats.avg} icon="trophy" hint={`of ${MAX_SCORE}`} />
        <StatCard label="Top score" value={stats.top} icon="trophy" tone="gold" hint={stats.topName || '—'} />
        <StatCard label="Auto-submitted" value={stats.auto} icon="alert" tone="red" hint="Rule violations / timeouts" />
        <StatCard label="Locked devices" value={stats.devices} icon="device" hint="One attempt per device" />
      </div>

      <div className="grid-2">
        <Card title="Score distribution" action={<span className="muted">Submitted quizzes</span>}>
          {stats.submitted === 0 ? (
            <Empty>No submissions yet.</Empty>
          ) : (
            <div className="histo">
              {bins.map((b) => (
                <div className="histo-col" key={b.from}>
                  <span className="histo-n">{b.n || ''}</span>
                  <div className="histo-bar" style={{ height: (b.n / maxBin) * 100 + '%' }} />
                  <span className="histo-x">{b.from}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card
          title="Top schools"
          action={
            <button className="a-link" onClick={() => setView('leaderboard')}>
              View all
            </button>
          }
        >
          {schoolRankings.length === 0 ? (
            <Empty>No results yet.</Empty>
          ) : (
            <ol className="rank-list">
              {schoolRankings.slice(0, 5).map((r, i) => (
                <li key={r.school}>
                  <span className={'rank-no r' + (i + 1)}>{i + 1}</span>
                  <div className="rank-main">
                    <b>{r.school}</b>
                    <small>{r.name}</small>
                  </div>
                  <span className="rank-score">{r.score}</span>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>

      <div className="grid-3">
        <Card title="Hardest questions">
          {hardest.length === 0 ? <Empty>Waiting for answers.</Empty> : <MiniQ list={hardest} tone="red" />}
        </Card>
        <Card title="Easiest questions">
          {easiest.length === 0 ? <Empty>Waiting for answers.</Empty> : <MiniQ list={easiest} tone="green" />}
        </Card>
        <Card
          title="Recent activity"
          action={
            <button className="a-link" onClick={() => setView('submissions')}>
              All
            </button>
          }
        >
          {recent.length === 0 ? (
            <Empty>No activity yet.</Empty>
          ) : (
            <ul className="recent">
              {recent.map((it) => (
                <li key={it.key} onClick={() => onOpen(it.key)}>
                  <div className="avatar">{initials(it.sub.name)}</div>
                  <div className="rank-main">
                    <b>{it.sub.name}</b>
                    <small>{it.sub.school}</small>
                  </div>
                  <div className="recent-right">
                    <b>{it.score}</b>
                    <small>{timeAgo(it.sub.endTime || it.sub.startTime)}</small>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}

function MiniQ({ list, tone }) {
  return (
    <ul className="miniq">
      {list.map((q) => (
        <li key={q.id}>
          <div className="miniq-top">
            <span className="miniq-id">Q{q.id}</span>
            <span className="miniq-pct">{Math.round(q.accuracy * 100)}%</span>
          </div>
          <div className="miniq-text">{q.q}</div>
          <div className="bar">
            <div className={'bar-fill ' + tone} style={{ width: q.accuracy * 100 + '%' }} />
          </div>
        </li>
      ))}
    </ul>
  )
}

const FILTERS = [
  ['all', 'All'],
  ['submitted', 'Submitted'],
  ['in-progress', 'In progress'],
  ['auto', 'Auto-submitted'],
  ['flagged', 'Violations'],
]

export function Submissions({ scored, onOpen, onExport }) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [sort, setSort] = useState('score-desc')

  const counts = useMemo(
    () => ({
      all: scored.length,
      submitted: scored.filter(({ sub }) => sub.status === 'submitted').length,
      'in-progress': scored.filter(({ sub }) => sub.status === 'in-progress').length,
      auto: scored.filter(({ sub }) => sub.autoSubmitted).length,
      flagged: scored.filter(({ sub }) => (sub.violationCount || 0) > 0).length,
    }),
    [scored]
  )

  const list = useMemo(() => {
    let l = [...scored]
    const q = search.trim().toLowerCase()
    if (q)
      l = l.filter(
        ({ sub }) =>
          (sub.name || '').toLowerCase().includes(q) ||
          (sub.school || '').toLowerCase().includes(q) ||
          (sub.grade || '').toLowerCase().includes(q)
      )
    if (filter === 'submitted') l = l.filter(({ sub }) => sub.status === 'submitted')
    if (filter === 'in-progress') l = l.filter(({ sub }) => sub.status === 'in-progress')
    if (filter === 'auto') l = l.filter(({ sub }) => sub.autoSubmitted)
    if (filter === 'flagged') l = l.filter(({ sub }) => (sub.violationCount || 0) > 0)
    l.sort((a, b) => {
      if (sort === 'score-desc') return b.score - a.score
      if (sort === 'score-asc') return a.score - b.score
      if (sort === 'recent') return (b.sub.endTime || b.sub.startTime || 0) - (a.sub.endTime || a.sub.startTime || 0)
      if (sort === 'violations') return (b.sub.violationCount || 0) - (a.sub.violationCount || 0)
      return (a.sub.name || '').localeCompare(b.sub.name || '')
    })
    return l
  }, [scored, search, filter, sort])

  return (
    <div className="view">
      <Card className="table-card">
        <div className="toolbar">
          <div className="search">
            <Icon name="search" size={16} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, school or index" />
          </div>
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="score-desc">Score: high → low</option>
            <option value="score-asc">Score: low → high</option>
            <option value="recent">Most recent</option>
            <option value="violations">Most violations</option>
            <option value="name">Name A–Z</option>
          </select>
          <button className="a-btn" onClick={onExport}>
            <Icon name="download" size={16} /> CSV
          </button>
        </div>
        <div className="chips">
          {FILTERS.map(([k, label]) => (
            <button key={k} className={'chip' + (filter === k ? ' on' : '')} onClick={() => setFilter(k)}>
              {label} <span>{counts[k]}</span>
            </button>
          ))}
        </div>
        {list.length === 0 ? (
          <Empty>No submissions match.</Empty>
        ) : (
          <div className="table-wrap">
            <table className="a-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>School</th>
                  <th className="num">Score</th>
                  <th className="num">Fast</th>
                  <th className="num">Viol.</th>
                  <th>Status</th>
                  <th>Time</th>
                  <th>Finished</th>
                </tr>
              </thead>
              <tbody>
                {list.map(({ key, sub, score, fastCount }) => (
                  <tr key={key} onClick={() => onOpen(key)}>
                    <td>
                      <div className="cell-user">
                        <div className="avatar">{initials(sub.name)}</div>
                        <div>
                          <b>{sub.name}</b>
                          <small>{sub.grade || '—'}</small>
                        </div>
                      </div>
                    </td>
                    <td>{sub.school}</td>
                    <td className="num">
                      <b className="score-pill">{score}</b>
                    </td>
                    <td className="num">{fastCount}</td>
                    <td className="num">{sub.violationCount ? <Badge tone="red">{sub.violationCount}</Badge> : '0'}</td>
                    <td>
                      {sub.status === 'submitted' ? (
                        sub.autoSubmitted ? (
                          <Badge tone="red">auto</Badge>
                        ) : (
                          <Badge tone="green">done</Badge>
                        )
                      ) : (
                        <Badge tone="amber">live</Badge>
                      )}
                    </td>
                    <td>{formatDuration(sub.startTime, sub.endTime)}</td>
                    <td>{formatTime(sub.endTime)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

export function Leaderboard({ scored, schoolRankings, onOpen, onPoster, bgFile, setBgFile, posterBusy }) {
  const top = useMemo(
    () =>
      scored
        .filter(({ sub }) => sub.status === 'submitted')
        .sort((a, b) => b.score - a.score)
        .slice(0, 15),
    [scored]
  )
  const podium = top.slice(0, 3)
  const order = [1, 0, 2].filter((i) => podium[i])

  return (
    <div className="view">
      {podium.length > 0 && (
        <div className="podium">
          {order.map((i) => (
            <div key={podium[i].key} className={'podium-col p' + (i + 1)} onClick={() => onOpen(podium[i].key)}>
              <div className="avatar xl">{initials(podium[i].sub.name)}</div>
              <b>{podium[i].sub.name}</b>
              <small>{podium[i].sub.school}</small>
              <div className="podium-step">
                <span>{i + 1}</span>
                <strong>{podium[i].score}</strong>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid-2">
        <Card title="Top students">
          {top.length === 0 ? (
            <Empty>No results yet.</Empty>
          ) : (
            <ol className="rank-list">
              {top.map((it, i) => (
                <li key={it.key} className="clickable" onClick={() => onOpen(it.key)}>
                  <span className={'rank-no r' + (i + 1)}>{i + 1}</span>
                  <div className="rank-main">
                    <b>{it.sub.name}</b>
                    <small>{it.sub.school}</small>
                  </div>
                  <span className="rank-score">{it.score}</span>
                </li>
              ))}
            </ol>
          )}
        </Card>

        <div className="stack">
          <Card title="Winning schools" action={<span className="muted">Best student per school</span>}>
            {schoolRankings.length === 0 ? (
              <Empty>No results yet.</Empty>
            ) : (
              <ol className="rank-list">
                {schoolRankings.map((r, i) => (
                  <li key={r.school}>
                    <span className={'rank-no r' + (i + 1)}>{i + 1}</span>
                    <div className="rank-main">
                      <b>{r.school}</b>
                      <small>{r.name}</small>
                    </div>
                    <span className="rank-score">{r.score}</span>
                  </li>
                ))}
              </ol>
            )}
          </Card>

          <Card title="Winners poster">
            <p className="muted">Generates a 1080×1350 PNG of the top 5 schools. Optionally upload a background photo.</p>
            <div className="poster-row">
              <label className="a-btn file">
                <Icon name="image" size={16} />
                {bgFile ? bgFile.name : 'Choose background'}
                <input type="file" accept="image/*" onChange={(e) => setBgFile(e.target.files[0] || null)} hidden />
              </label>
              {bgFile && (
                <button className="a-btn ghost" onClick={() => setBgFile(null)}>
                  Clear
                </button>
              )}
              <button className="a-btn primary" onClick={onPoster} disabled={posterBusy || schoolRankings.length === 0}>
                <Icon name="download" size={16} /> {posterBusy ? 'Rendering…' : 'Download poster'}
              </button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

export function Questions({ qStats, keyMap, draft, setDraft, dirtyCount, onSave, onReset, saving, keyError }) {
  const [filter, setFilter] = useState('all')

  const list = qStats.filter((q) => {
    if (filter === 'changed') return draft[q.id] !== ANSWER_KEY[q.id]
    if (filter === 'image') return !!q.img
    if (filter === 'hard') return q.attempts > 0 && q.accuracy < 0.4
    return true
  })

  return (
    <div className="view">
      {keyError && (
        <div className="notice red">
          <Icon name="alert" size={16} /> {keyError}
        </div>
      )}
      <div className="notice">
        <b>Answer key.</b> Pick the correct option for each question and save — every submission is re-scored instantly. Defaults
        were set from the question list; double-check the ones you are unsure of.
      </div>
      <div className="chips">
        {[
          ['all', 'All 50'],
          ['changed', 'Changed from default'],
          ['image', 'With image'],
          ['hard', 'Hard (<40%)'],
        ].map(([k, label]) => (
          <button key={k} className={'chip' + (filter === k ? ' on' : '')} onClick={() => setFilter(k)}>
            {label}
          </button>
        ))}
      </div>

      <div className="q-list">
        {list.map((q) => {
          const picked = draft[q.id]
          const changed = picked !== ANSWER_KEY[q.id]
          const saved = keyMap[q.id] === picked
          return (
            <article key={q.id} className={'q-card' + (changed ? ' changed' : '')}>
              <header>
                <span className="q-no">{q.id}</span>
                <p>{q.q}</p>
                <div className="q-tags">
                  <Badge tone="neutral">{marksForQuestion(q.id)}m</Badge>
                  {q.img && <Badge tone="blue">image</Badge>}
                  {changed && <Badge tone={saved ? 'green' : 'amber'}>{saved ? 'saved' : 'unsaved'}</Badge>}
                  {q.attempts > 0 && <Badge tone={q.accuracy >= 0.6 ? 'green' : q.accuracy >= 0.4 ? 'amber' : 'red'}>{Math.round(q.accuracy * 100)}%</Badge>}
                </div>
              </header>
              <div className="q-body">
                  {q.img && <img src={q.img} alt="" className="q-thumb" />}
                  <div className="q-options">
                    {q.options.map((opt, i) => {
                      const n = q.counts[opt] || 0
                      const pct = q.attempts ? (n / q.attempts) * 100 : 0
                      const isKey = picked === opt
                      return (
                        <button
                          key={opt}
                          type="button"
                          className={'q-opt' + (isKey ? ' key' : '')}
                          onClick={() => setDraft((d) => ({ ...d, [q.id]: opt }))}
                        >
                          <span className="q-opt-fill" style={{ width: pct + '%' }} />
                          <span className="q-letter">{isKey ? <Icon name="check" size={14} /> : LETTERS[i]}</span>
                          <span className="q-opt-text">{opt}</span>
                          <span className="q-opt-n">
                            {n} · {Math.round(pct)}%
                          </span>
                        </button>
                      )
                    })}
                  </div>
              </div>
            </article>
          )
        })}
        {list.length === 0 && <Empty>No questions in this filter.</Empty>}
      </div>

      {dirtyCount > 0 && (
        <div className="save-bar">
          <span>
            <b>{dirtyCount}</b> unsaved change{dirtyCount > 1 ? 's' : ''}
          </span>
          <div>
            <button className="a-btn ghost" onClick={onReset} disabled={saving}>
              Discard
            </button>
            <button className="a-btn primary" onClick={onSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save answer key'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export function Devices({ devices, fingerprints, subsByDevice, onUnlockDevice, onUnlockFp, onClearAll, busy }) {
  const dev = Object.entries(devices)
  const fps = Object.entries(fingerprints)
  return (
    <div className="view">
      <div className="grid-2">
        <Card
          title={`Locked devices (${dev.length})`}
          action={
            <button className="a-btn danger sm" onClick={onClearAll} disabled={busy || (!dev.length && !fps.length)}>
              Clear all locks
            </button>
          }
        >
          {dev.length === 0 ? (
            <Empty>No locked devices.</Empty>
          ) : (
            <ul className="dev-list">
              {dev.map(([id, v]) => {
                const s = subsByDevice[id]
                return (
                  <li key={id}>
                    <div className="rank-main">
                      <b>{s ? s.name : 'Unlinked device'}</b>
                      <small>
                        {id.slice(0, 18)}… · {formatTime(v && v.reservedAt)}
                      </small>
                    </div>
                    <button className="a-btn sm" onClick={() => onUnlockDevice(id)} disabled={busy}>
                      <Icon name="unlock" size={14} /> Unlock
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>
        <Card title={`Fingerprints (${fps.length})`}>
          {fps.length === 0 ? (
            <Empty>No fingerprints stored.</Empty>
          ) : (
            <ul className="dev-list">
              {fps.map(([fp, v]) => (
                <li key={fp}>
                  <div className="rank-main">
                    <b>{fp}</b>
                    <small>{formatTime(v && v.reservedAt)}</small>
                  </div>
                  <button className="a-btn sm" onClick={() => onUnlockFp(fp)} disabled={busy}>
                    <Icon name="unlock" size={14} /> Unlock
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}

export function Settings({ user, onExport, onClearAll, onDeleteAll, onSignOut, busy, total }) {
  const [confirmText, setConfirmText] = useState('')
  return (
    <div className="view">
      <div className="grid-2">
        <div className="stack">
          <Card title="Scoring rules">
            <ul className="rules">
              <li>
                <b>Q1–15</b> · 1 mark each
              </li>
              <li>
                <b>Q16–35</b> · 2 marks each
              </li>
              <li>
                <b>Q36–50</b> · 4 marks each
              </li>
              <li>
                <b>Bonus</b> · +{FAST_BONUS_MARKS} if more than {FAST_BONUS_THRESHOLD} fast answers
              </li>
              <li>
                <b>Maximum</b> · {MAX_SCORE} ({TOTAL_Q} questions)
              </li>
            </ul>
          </Card>
          <Card title="Export">
            <p className="muted">Download every submission with scores, violations and timings.</p>
            <button className="a-btn primary" onClick={onExport}>
              <Icon name="download" size={16} /> Export CSV
            </button>
          </Card>
          <Card title="Account">
            <p className="muted">Signed in as {user.email}</p>
            <button className="a-btn" onClick={onSignOut}>
              <Icon name="logout" size={16} /> Sign out
            </button>
          </Card>
        </div>

        <Card title="Start a new round" className="danger-zone">
          <p className="muted">Use these before a fresh sitting. Both actions are permanent.</p>
          <div className="dz-row">
            <div>
              <b>Clear device locks</b>
              <small>Everyone can attempt again.</small>
            </div>
            <button className="a-btn warn" onClick={onClearAll} disabled={busy}>
              Clear locks
            </button>
          </div>
          <div className="dz-row col">
            <div>
              <b>Delete all {total} submissions</b>
              <small>Type DELETE to confirm.</small>
            </div>
            <div className="dz-confirm">
              <input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="DELETE" />
              <button
                className="a-btn danger"
                disabled={busy || confirmText !== 'DELETE' || total === 0}
                onClick={() => {
                  onDeleteAll()
                  setConfirmText('')
                }}
              >
                <Icon name="trash" size={16} /> Delete all
              </button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
