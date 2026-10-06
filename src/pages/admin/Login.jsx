import { useState } from 'react'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  setPersistence,
  browserLocalPersistence,
} from 'firebase/auth'
import { auth } from '../../lib/firebase'
import { friendlyAuthError } from '../../lib/format'

export default function Login() {
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [pass2, setPass2] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  const switchMode = (m) => {
    setMode(m)
    setErr('')
  }

  const submit = async (e) => {
    e.preventDefault()
    setErr('')
    const em = email.trim()
    if (!em || !pass) return setErr('Email and password are required.')
    if (mode === 'signup') {
      if (pass.length < 6) return setErr('Password must be at least 6 characters.')
      if (pass !== pass2) return setErr('Passwords do not match.')
    }
    setLoading(true)
    try {
      await setPersistence(auth, browserLocalPersistence)
      if (mode === 'signup') await createUserWithEmailAndPassword(auth, em, pass)
      else await signInWithEmailAndPassword(auth, em, pass)
    } catch (ex) {
      setErr(friendlyAuthError(ex))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="adm adm-login">
      <div className="login-art">
        <div className="login-art-inner">
          <span className="login-eyebrow">All Island Inter School Eco Quiz</span>
          <h1>DEMETER 26&apos;</h1>
          <p>Round 2 control room — live results, answer key, device locks and winners poster in one place.</p>
          <ul>
            <li>Live submissions &amp; leaderboard</li>
            <li>Editable answer key with instant re-scoring</li>
            <li>Per-question accuracy analytics</li>
          </ul>
        </div>
      </div>
      <div className="login-pane">
        <form className="login-form" onSubmit={submit}>
          <h2>{mode === 'signup' ? 'Create admin account' : 'Welcome back'}</h2>
          <p className="login-sub">
            {mode === 'signup' ? 'Register a new organiser account.' : 'Sign in to the admin console.'}
          </p>
          <div className="seg">
            <button type="button" className={mode === 'signin' ? 'on' : ''} onClick={() => switchMode('signin')}>
              Sign in
            </button>
            <button type="button" className={mode === 'signup' ? 'on' : ''} onClick={() => switchMode('signup')}>
              Sign up
            </button>
          </div>
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@school.edu"
            autoComplete="username"
          />
          <label>Password</label>
          <input
            type="password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            placeholder="At least 6 characters"
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          />
          {mode === 'signup' && (
            <>
              <label>Confirm password</label>
              <input
                type="password"
                value={pass2}
                onChange={(e) => setPass2(e.target.value)}
                placeholder="Repeat password"
                autoComplete="new-password"
              />
            </>
          )}
          {err && <div className="form-error">{err}</div>}
          <button className="a-btn primary block" type="submit" disabled={loading}>
            {loading ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
