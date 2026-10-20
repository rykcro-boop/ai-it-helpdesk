import { useState } from 'react'
import { ApiError, createTicket, UNREACHABLE_MESSAGE } from './api.js'
import { Badge, Spinner } from './Layout.jsx'

function Steps({ steps }) {
  const lines = String(steps || '').split('\n').map((line) => line.replace(/^\s*\d+[.)]\s*/, '').trim()).filter(Boolean)
  return lines.length ? <ol className="steps-list">{lines.map((line, index) => <li key={`${index}-${line}`}>{line}</li>)}</ol> : <p className="muted">No troubleshooting suggestions available.</p>
}

function cleanDescriptionText(value) {
  return value.split('').filter((character) => {
    const code = character.charCodeAt(0)
    return code > 31 && code !== 127
  }).join('')
}

export function NewTicket({ token, requester, onSessionExpired }) {
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  async function submit(event) {
    event.preventDefault()
    setError(''); setResult(null)
    const cleanDescription = cleanDescriptionText(description).trim()
    if (cleanDescription.length < 10) { setError('Describe the issue in at least 10 characters.'); return }
    if (!/[A-Za-z]/.test(cleanDescription)) { setError('Describe the issue using words, not only punctuation or digits.'); return }
    setLoading(true)
    try { setResult(await createTicket(token, cleanDescription, requester)); setDescription('') }
    catch (err) {
      if (err instanceof ApiError && err.code === 'UNAUTHORIZED') { onSessionExpired(); return }
      setError(err.message || UNREACHABLE_MESSAGE)
    } finally { setLoading(false) }
  }

  return <div className="new-ticket-layout"><section className="content-card new-ticket-card">
    <div className="card-heading"><div><h2>Tell us what you need help with</h2><p className="muted">Share a few details so we can route your request to the right team.</p></div></div>
    <form onSubmit={submit}><label className="field-label" htmlFor="ticket-description">Describe the problem</label><textarea id="ticket-description" className="text-area new-ticket-textarea" maxLength={2000} value={description} onChange={(event) => setDescription(cleanDescriptionText(event.target.value))} placeholder="What were you doing? What happened? Include any error message…" disabled={loading} /><div className="character-row"><small>Minimum 10 characters. Maximum 2000.</small><small>{description.length}/2000</small></div>
      {error && <div className="error-state" role="alert">{error}{(errCanRetry(error)) && <button type="button" className="button button-secondary retry-button" onClick={submit}>Retry</button>}</div>}
      {loading ? <div className="analysis-wait" role="status"><Spinner /><span><strong>Analyzing your ticket, this can take up to a minute...</strong><small>Please keep this page open while we prepare your request.</small></span></div> : <button className="button button-primary" type="submit">Submit ticket</button>}
    </form>
  </section>
  {result && <section className="content-card ticket-result-card" aria-live="polite"><div className="ticket-result-header"><span className="ticket-number">{result.ticket_id}</span><div><Badge tone={`priority-${String(result.priority || '').toLowerCase()}`}>{result.priority}</Badge><Badge tone="badge-neutral">{result.category}</Badge></div></div><h2>{result.summary}</h2><p className="muted">Your ticket has been submitted. We’ll keep you updated as it progresses.</p><div className="result-steps"><h3>Suggested troubleshooting</h3><Steps steps={result.troubleshooting_steps} /></div></section>}
  </div>
}

function errCanRetry(message) {
  return message === UNREACHABLE_MESSAGE || message.includes('timed out')
}
