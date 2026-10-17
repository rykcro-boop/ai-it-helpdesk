import { useState } from 'react'
import { login } from './api.js'

export function Login({ onLogin, initialMessage = '' }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(initialMessage)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    if (!username.trim() || !password) { setError('Enter your username and password to continue.'); return }
    setLoading(true)
    try { onLogin(await login(username, password)) }
    catch (err) { setError(err.message || 'Unable to log in. Please try again.') }
    finally { setLoading(false) }
  }

  return <main className="login-screen">
    <section className="login-card" aria-labelledby="login-title">
      <div className="login-brand"><span className="brand-mark">AI</span><span className="login-brand-name">AI IT Help Desk</span></div>
      <p className="eyebrow">IT support, made simpler</p><h1 className="login-title" id="login-title">Welcome back</h1>
      <p className="login-subtitle">Sign in to submit a request or manage support tickets.</p>
      <form className="login-form" onSubmit={handleSubmit}>
        <div><label className="field-label" htmlFor="username">Username</label><input className="text-input" id="username" name="username" autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Enter your username" disabled={loading} /></div>
        <div><label className="field-label" htmlFor="password">Password</label><input className="text-input" id="password" name="password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" disabled={loading} /></div>
        {error && <p className="error-state login-error" role="alert">{error}</p>}
        <button className="button button-primary submit-button" type="submit" disabled={loading}>{loading && <span className="spinner" aria-hidden="true" />}{loading ? 'Signing in…' : 'Log in'}</button>
      </form>
      <aside className="login-hint"><strong>Demo accounts</strong><span>employee1 or tech1 · password demo1234</span></aside>
    </section>
  </main>
}
