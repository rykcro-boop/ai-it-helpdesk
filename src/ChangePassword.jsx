import { useState } from 'react'
import { ApiError, changePassword } from './api.js'

function passwordStrengthError(password) {
  if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) return 'Use at least 8 characters, including a letter and a digit.'
  return ''
}

export function ChangePassword({ session, onComplete, onSessionExpired }) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event) {
    event.preventDefault()
    setError('')
    if (!current || !next || !confirm) { setError('Complete all password fields.'); return }
    const strengthError = passwordStrengthError(next)
    if (strengthError) { setError(strengthError); return }
    if (next === current) { setError('Your new password must be different from your current password.'); return }
    if (next !== confirm) { setError('The new passwords do not match.'); return }
    setBusy(true)
    try { await changePassword(session.token, current, next); onComplete() }
    catch (err) {
      if (err instanceof ApiError && err.code === 'UNAUTHORIZED') { onSessionExpired(); return }
      setError(err.message || 'Unable to change your password.')
    } finally { setBusy(false) }
  }

  return <main className="login-screen"><section className="login-card password-card">
    <div className="login-brand"><span className="brand-mark">AI</span><span className="login-brand-name">AI IT Help Desk</span></div>
    <p className="eyebrow">Account security</p><h1 className="login-title">Set a new password</h1>
    <p className="login-subtitle">For your security, choose a new password before continuing.</p>
    <form className="login-form" onSubmit={submit}>
      <div><label className="field-label" htmlFor="current-password">Current password</label><input id="current-password" className="text-input" type="password" value={current} onChange={(event) => setCurrent(event.target.value)} autoComplete="current-password" disabled={busy} /></div>
      <div><label className="field-label" htmlFor="new-password">New password</label><input id="new-password" className="text-input" type="password" value={next} onChange={(event) => setNext(event.target.value)} autoComplete="new-password" disabled={busy} /><small className="form-note">At least 8 characters, including a letter and a digit.</small></div>
      <div><label className="field-label" htmlFor="confirm-password">Confirm new password</label><input id="confirm-password" className="text-input" type="password" value={confirm} onChange={(event) => setConfirm(event.target.value)} autoComplete="new-password" disabled={busy} /></div>
      {error && <p className="error-state" role="alert">{error}</p>}
      <button className="button button-primary submit-button" type="submit" disabled={busy}>{busy && <span className="spinner" aria-hidden="true" />}{busy ? 'Updating password…' : 'Set new password'}</button>
    </form>
  </section></main>
}
