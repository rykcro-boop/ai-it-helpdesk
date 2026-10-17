import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ApiError, assignTicket, getAllTickets, getMyTickets, getUsers, saveTicketDraft, updateTicket, UNREACHABLE_MESSAGE } from './api.js'
import { Badge, ConfirmDialog, Spinner } from './Layout.jsx'

const RESOLUTION_CODES = ['Fixed', 'Workaround applied', 'User error / training given', 'Hardware replaced', 'Cannot reproduce', 'Duplicate ticket', 'Not an IT issue']
const CLOSINGS = {
  'Simple closing': 'The issue has been resolved. Please contact the help desk if it happens again.',
  'Full closing': 'We investigated the reported issue and applied a fix. Please confirm that everything is working as expected. This ticket will now be closed.',
  'User action needed': 'Please complete the requested steps and reply to this ticket if you need further assistance.',
}
const DRAFT_PREFIX = 'ai-helpdesk-resolution-draft:'
const PRIORITIES = new Set(['Critical', 'High', 'Medium', 'Low'])

function stripControls(value, max = 2000) {
  return String(value ?? '').split('').filter((character) => {
    const code = character.charCodeAt(0)
    return code > 31 && code !== 127
  }).join('').slice(0, max)
}

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en-PH', { timeZone: 'Asia/Manila', year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date)
}

function validDate(value) {
  const time = new Date(value).getTime()
  return Number.isFinite(time) ? time : 0
}

function resolutionNotesValid(value) {
  const notes = value.trim()
  const repeated = notes.length > 0 && /^(.)\1+$/.test(notes)
  return notes.length >= 30 && notes.length <= 2000 && notes.split(/\s+/).filter(Boolean).length >= 5 && !repeated && !Object.values(CLOSINGS).some((closing) => notes.toLowerCase() === closing.toLowerCase())
}

function allowedStatuses(status) {
  if (status === 'Open' || status === 'Needs Review') return ['In Progress']
  if (status === 'In Progress') return ['Waiting on User', 'Open']
  if (status === 'Waiting on User') return ['In Progress']
  if (status === 'Resolved' || status === 'Closed') return ['In Progress']
  return []
}

function Steps({ steps }) {
  const list = String(steps || '').split('\n').map((line) => stripControls(line).replace(/^\s*\d+[.)]\s*/, '').trim()).filter(Boolean)
  return list.length ? <ol className="steps-list">{list.map((step, index) => <li key={`${index}-${step}`}>{step}</li>)}</ol> : <p className="muted">No steps available.</p>
}

function Field({ label, children }) {
  return <div className="detail-field"><span className="detail-label">{label}</span><span>{children || '—'}</span></div>
}

function ChecklistItem({ passed, children }) {
  return <li className={passed ? 'check-pass' : 'check-fail'}><span aria-hidden="true">{passed ? '✓' : '×'}</span>{children}</li>
}

export function TicketDetail({ ticket: initialTicket, token, technician, isTechnician, onSessionExpired, onBack, onMissingTicket }) {
  const [ticket, setTicket] = useState(initialTicket)
  const [tickets, setTickets] = useState([])
  const [users, setUsers] = useState([])
  const [notes, setNotes] = useState(() => sessionStorage.getItem(`${DRAFT_PREFIX}${initialTicket.ticket_id}`) || initialTicket.resolution_draft || '')
  const [resolutionCode, setResolutionCode] = useState('')
  const [duplicateOf, setDuplicateOf] = useState('')
  const [closingChoice, setClosingChoice] = useState('')
  const [verified, setVerified] = useState(false)
  const [nextStatus, setNextStatus] = useState('')
  const [transitionReason, setTransitionReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [confirm, setConfirm] = useState('')
  const [closedTooLongAgo, setClosedTooLongAgo] = useState(false)
  const draftInitialized = useRef(false)

  const load = useCallback(async (initial = false) => {
    if (initial) setLoading(true)
    try {
      const [ticketList, userList] = await Promise.all([isTechnician ? getAllTickets(token) : getMyTickets(token), isTechnician ? getUsers(token) : Promise.resolve([])])
      const fresh = ticketList.find((item) => item.ticket_id === initialTicket.ticket_id)
      if (!fresh) {
        onMissingTicket?.()
        return
      }
      setTicket(fresh)
      setTickets(ticketList)
      setUsers(userList)
      if (!draftInitialized.current) {
        setNotes(sessionStorage.getItem(`${DRAFT_PREFIX}${fresh.ticket_id}`) || fresh.resolution_draft || '')
        draftInitialized.current = true
      }
      setError('')
    } catch (err) {
      if (err instanceof ApiError && err.code === 'UNAUTHORIZED') { onSessionExpired(); return }
      if (err instanceof ApiError && ['NOT_FOUND', 'FORBIDDEN'].includes(err.code) && !isTechnician) {
        setError('Ticket not found')
        return
      }
      setError(err.message || UNREACHABLE_MESSAGE)
    } finally { setLoading(false) }
  }, [initialTicket.ticket_id, isTechnician, token, onMissingTicket, onSessionExpired])

  useEffect(() => {
    const timer = window.setTimeout(() => load(true), 0)
    return () => window.clearTimeout(timer)
  }, [load])
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setClosedTooLongAgo(ticket.status === 'Closed' && Date.now() - validDate(ticket.closed_at || ticket.updated_at) > 30 * 86400000)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [ticket.closed_at, ticket.status, ticket.updated_at])

  const assignedToMe = isTechnician && ticket.assigned_to === technician
  const terminal = ticket.status === 'Resolved' || ticket.status === 'Closed'
  const statuses = allowedStatuses(ticket.status)
  const notesValid = resolutionNotesValid(notes)
  const waitingReasonValid = transitionReason.trim().length >= 10
  const checklist = [
    [assignedToMe, 'Assigned to me'],
    [['In Progress', 'Waiting on User'].includes(ticket.status), 'Status allows resolving'],
    [Boolean(resolutionCode), 'Resolution code chosen'],
    [notesValid, 'Resolution notes are valid (30+ characters, 5+ words)'],
    [verified, 'Fix verification confirmed'],
    [resolutionCode !== 'Duplicate ticket' || (Boolean(duplicateOf) && duplicateOf !== ticket.ticket_id && tickets.some((item) => item.ticket_id === duplicateOf)), 'Duplicate ticket reference is valid'],
  ]
  const canResolve = checklist.every(([passed]) => passed) && !busy
  const requester = users.find((user) => user.username === ticket.requester_username)
  const requesterName = requester?.name || ticket.requester || ticket.requester_username || 'Unknown'
  const sortedEvents = useMemo(() => [...(Array.isArray(ticket.events) ? ticket.events : [])].sort((a, b) => validDate(b.at) - validDate(a.at)), [ticket.events])

  function conflictMessage(err) {
    if (err.code === 'CONFLICT' || err.status === 409) {
      setMessage('This ticket was changed by someone else. Reloaded.')
      setError('')
      void load(true)
      return true
    }
    return false
  }

  async function performWrite(task, successMessage) {
    if (busy) return
    setBusy(true); setError(''); setMessage('')
    try {
      const updated = await task()
      if (updated?.ticket_id) setTicket(updated)
      setMessage(successMessage)
      await load()
      return updated
    } catch (err) {
      if (err.code === 'UNAUTHORIZED' || err.status === 401) { onSessionExpired(); return undefined }
      if (!conflictMessage(err)) {
        if (err.message?.startsWith('Ticket is already assigned to ')) {
          setMessage(`${err.message} Reloaded.`)
          setError('')
          void load(true)
        } else setError(err.message || UNREACHABLE_MESSAGE)
      }
      return undefined
    } finally { setBusy(false) }
  }

  async function saveDraft() {
    const saved = await performWrite(
      () => saveTicketDraft(token, ticket.ticket_id, notes.trim(), ticket.updated_at),
      'Draft saved.'
    )
    if (saved) sessionStorage.setItem(`${DRAFT_PREFIX}${ticket.ticket_id}`, notes.trim())
  }

  async function assign() {
    if (!ticket.assigned_to && !terminal) await performWrite(
      () => assignTicket(token, ticket.ticket_id, 'assign_me', ticket.updated_at),
      'Ticket assigned to you.'
    )
  }

  async function unassign() {
    const inProgress = ticket.status === 'In Progress'
    if (inProgress && !window.confirm('Unassign this In Progress ticket and move it back to Open?')) return
    await performWrite(
      () => assignTicket(token, ticket.ticket_id, 'unassign', ticket.updated_at, { confirm_in_progress: inProgress }),
      'Ticket unassigned.'
    )
  }

  async function applyStatus() {
    if (!nextStatus || !statuses.includes(nextStatus) || !assignedToMe) return
    if (nextStatus === 'In Progress' && ['Resolved', 'Closed'].includes(ticket.status)) {
      if (transitionReason.trim().length < 10) { setError('Enter a reopen reason of at least 10 characters.'); return }
      setConfirm('reopen')
      return
    }
    if (nextStatus === 'Waiting on User' && !waitingReasonValid) { setError('Enter what you are waiting for in at least 10 characters.'); return }
    const updated = await performWrite(
      () => updateTicket(token, ticket.ticket_id, { status: nextStatus, reason: transitionReason.trim(), expected_updated_at: ticket.updated_at }),
      `Ticket moved to ${nextStatus}.`
    )
    if (updated) { setNextStatus(''); setTransitionReason('') }
  }

  async function confirmReopen() {
    const updated = await performWrite(
      () => updateTicket(token, ticket.ticket_id, { status: 'In Progress', reason: transitionReason.trim(), expected_updated_at: ticket.updated_at }),
      'Ticket reopened and moved to In Progress.'
    )
    if (updated) { setConfirm(''); setNextStatus(''); setTransitionReason('') }
  }

  async function closeTicket() {
    await performWrite(
      () => updateTicket(token, ticket.ticket_id, { status: 'Closed', expected_updated_at: ticket.updated_at }),
      'Ticket closed.'
    )
  }

  async function resolveTicket() {
    if (!canResolve) return
    setConfirm('resolve')
  }

  async function confirmResolve() {
    const updated = await performWrite(
      () => updateTicket(token, ticket.ticket_id, {
        status: 'Resolved',
        resolution: notes.trim(),
        resolution_code: resolutionCode,
        closing_message: CLOSINGS[closingChoice] || '',
        duplicate_of: duplicateOf,
        verified,
        expected_updated_at: ticket.updated_at,
      }),
      'Ticket resolved successfully.'
    )
    if (updated) {
      sessionStorage.removeItem(`${DRAFT_PREFIX}${ticket.ticket_id}`)
      setConfirm('')
    }
  }

  const unknownStatus = !['Open', 'Needs Review', 'In Progress', 'Waiting on User', 'Resolved', 'Closed'].includes(ticket.status)
  const category = typeof ticket.category === 'string' && ticket.category.trim() ? ticket.category : 'Other'
  const priority = PRIORITIES.has(ticket.priority) ? ticket.priority : 'Medium'
  const reopenHint = ticket.status === 'Closed' && closedTooLongAgo ? 'This ticket was closed more than 30 days ago. Create a new ticket instead.' : 'A reopen reason of at least 10 characters is required.'
  const transitionHint = !assignedToMe ? 'Only the assigned technician can modify this ticket.' : terminal ? `This ticket is ${ticket.status.toLowerCase()}. Use the available close or reopen action.` : ''
  const selectableDuplicateTickets = tickets.filter((item) => item.ticket_id !== ticket.ticket_id)

  return <div className="detail-page">
    <button type="button" className="back-link" onClick={onBack}>← Back to tickets</button>
    <div className="detail-heading">
      <div><p className="breadcrumb">{category} · {unknownStatus ? 'Unknown' : ticket.status}</p><h2><span className="ticket-number">{ticket.ticket_id}</span> — {ticket.summary || 'Support request'}</h2></div>
      {isTechnician && <div className="detail-assignment">
        {assignedToMe ? <><span className="assigned-tag">✓ Assigned to you</span><button className="button button-secondary" disabled={busy || terminal} title={terminal ? 'Resolved or closed tickets cannot be unassigned.' : ''} onClick={unassign}>{busy ? <Spinner label="Unassigning" /> : 'Unassign'}</button></>
          : !ticket.assigned_to && !terminal ? <button className="button button-primary" disabled={busy} onClick={assign}>{busy ? <Spinner label="Assigning" /> : 'Assign to me'}</button>
            : <span className="assigned-name">Assigned to {ticket.assigned_to || '—'}</span>}
      </div>}
    </div>
    {message && <p className="inline-success" role="status">{message}</p>}
    {error && <div className="error-state" role="alert">{error}{(error === UNREACHABLE_MESSAGE || error.includes('timed out')) && <button type="button" className="button button-secondary retry-button" disabled={busy} onClick={() => load(true)}>Retry</button>}</div>}
    {loading && <div className="state-panel"><Spinner /><span>Loading ticket…</span></div>}
    {!loading && <div className="detail-grid">
      <div className="detail-main">
        <section className="content-card"><h3>Details</h3><div className="field-grid">
          <Field label="Status"><Badge tone={unknownStatus ? '' : `status-${String(ticket.status).toLowerCase().replace(/\s+/g, '-')}`}>{unknownStatus ? 'Unknown' : ticket.status}</Badge></Field>
          <Field label="Category">{category}</Field><Field label="Priority"><Badge tone={`priority-${priority.toLowerCase()}`}>{priority}</Badge></Field>
          <Field label="Created">{formatDate(ticket.created_at)}</Field>
          <Field label="SLA due">{validDate(ticket.created_at) ? formatDate(new Date(validDate(ticket.created_at) + ({ Critical: 4, High: 8, Medium: 24, Low: 72 }[priority]) * 3600000).toISOString()) : '—'}</Field>
          <Field label="Assignment">{ticket.assigned_to || 'Unclaimed'}</Field>
        </div></section>
        <section className="content-card"><h3>Description</h3><p className="pre-wrap">{stripControls(ticket.description) || 'No description provided.'}</p></section>
        <section className="content-card"><div className="card-title-row"><h3>{isTechnician ? 'AI analysis' : 'Self-help suggestions'}</h3>{ticket.escalation_required && isTechnician && <Badge tone="badge-escalated">Escalation recommended</Badge>}</div>
          {ticket.summary && <p className="analysis-summary">{stripControls(ticket.summary)}</p>}<Steps steps={ticket.troubleshooting_steps} />
        </section>
        {ticket.resolution && <section className="content-card"><h3>Resolution</h3><Field label="Resolution code">{ticket.resolution_code || '—'}</Field><p className="pre-wrap resolution-copy">{stripControls(ticket.resolution)}</p>{ticket.closing_message && <><span className="detail-label">Closing message to requester</span><p className="pre-wrap">{stripControls(ticket.closing_message)}</p></>}</section>}
        {isTechnician && ['In Progress', 'Waiting on User'].includes(ticket.status) && <section className="content-card resolve-panel">
          <h3>Resolve ticket</h3>
          <label className="field-label" htmlFor="resolution-code">Resolution code <span className="required">*</span></label>
          <select id="resolution-code" className="select-input" value={resolutionCode} onChange={(event) => setResolutionCode(event.target.value)} disabled={!assignedToMe || terminal || busy}><option value="">Choose a resolution code…</option>{RESOLUTION_CODES.map((code) => <option key={code}>{code}</option>)}</select>
          {resolutionCode === 'Duplicate ticket' && <div className="resolve-field"><label className="field-label" htmlFor="duplicate-ticket">Duplicate of <span className="required">*</span></label><select id="duplicate-ticket" className="select-input" value={duplicateOf} onChange={(event) => setDuplicateOf(event.target.value)} disabled={!assignedToMe || busy}><option value="">Choose a ticket…</option>{selectableDuplicateTickets.map((item) => <option key={item.ticket_id} value={item.ticket_id}>{item.ticket_id} — {item.summary || 'Ticket'}</option>)}</select></div>}
          <div className="resolve-field"><label className="field-label" htmlFor="resolution-notes">What was the cause and what did you do to fix it? <span className="required">*</span></label><textarea id="resolution-notes" className="text-area" maxLength={2000} value={notes} onChange={(event) => setNotes(stripControls(event.target.value))} placeholder="Describe the cause and the work performed…" disabled={!assignedToMe || terminal || busy} /><div className="character-row"><small>At least 30 characters and 5 words. Canned closings do not count.</small><small>{notes.length}/2000</small></div></div>
          <div className="resolve-field"><label className="field-label" htmlFor="closing-message">Closing message to requester</label><select id="closing-message" className="select-input" value={closingChoice} onChange={(event) => setClosingChoice(event.target.value)} disabled={!assignedToMe || terminal || busy}><option value="">No closing message</option>{Object.keys(CLOSINGS).map((closing) => <option key={closing}>{closing}</option>)}</select>{closingChoice && <div className="closing-preview" aria-label="Closing message preview">{CLOSINGS[closingChoice]}</div>}<small className="form-note">The closing message is added after your notes. A sign-off alone does not close a ticket.</small></div>
          <label className="verification-check"><input type="checkbox" checked={verified} onChange={(event) => setVerified(event.target.checked)} disabled={!assignedToMe || terminal || busy} /><span>I verified the fix with the requester or confirmed the service is working.</span></label>
          <ul className="resolve-checklist">{checklist.map(([passed, label]) => <ChecklistItem key={label} passed={passed}>{label}</ChecklistItem>)}</ul>
          {!assignedToMe && <p className="workflow-hint">Assign this ticket to yourself before saving a draft or resolving it.</p>}
          <div className="resolve-actions"><button type="button" className="button button-secondary" disabled={!assignedToMe || terminal || busy} title={!assignedToMe ? 'Only the assigned technician can save a draft.' : ''} onClick={saveDraft}>{busy ? <Spinner label="Saving draft" /> : 'Save draft notes'}</button><button type="button" className="button button-primary" disabled={!canResolve} title={!canResolve ? 'Complete every checklist requirement before resolving.' : ''} onClick={resolveTicket}>{busy ? <Spinner label="Resolving" /> : 'Resolve ticket'}</button></div>
        </section>}
        <section className="content-card"><h3>Activity</h3>{sortedEvents.length ? <ol className="activity-list">{sortedEvents.map((event, index) => <li key={`${event.at}-${event.action}-${index}`}><div><strong>{stripControls(event.by || 'Unknown', 60)}</strong><span>{stripControls(event.action || 'Updated ticket', 100)}</span><p>{stripControls(event.detail || '')}</p></div><time>{formatDate(event.at)}</time></li>)}</ol> : <p className="muted">No activity recorded.</p>}</section>
      </div>
      <aside className="detail-aside">
        <section className="content-card"><h3>Requester</h3>{isTechnician && loading ? <Spinner /> : <><Field label="Name">{requester?.name || ticket.requester || 'Unknown'}</Field><Field label="Username">{requester?.username || ticket.requester_username || 'Unknown'}</Field><Field label="Email">{requester?.email || 'Unknown'}</Field><Field label="Department">{requester?.department || 'Unknown'}</Field></>}</section>
        {isTechnician && <section className="content-card"><h3>Workflow</h3>
          <label className="field-label" htmlFor="workflow-status">Next status</label>
          <select id="workflow-status" className="select-input" value={nextStatus} onChange={(event) => setNextStatus(event.target.value)} disabled={!assignedToMe || !statuses.length || busy}><option value="">Select an allowed transition…</option>{statuses.map((option) => <option key={option}>{option}</option>)}</select>
          {transitionHint && <p className="workflow-hint">{transitionHint}</p>}
          {nextStatus === 'Waiting on User' && <div className="resolve-field"><label className="field-label" htmlFor="transition-reason">What are you waiting for?</label><textarea id="transition-reason" className="text-area compact-textarea" maxLength={2000} value={transitionReason} onChange={(event) => setTransitionReason(stripControls(event.target.value))} /><div className="character-row"><small>At least 10 characters required.</small><small>{transitionReason.length}/2000</small></div></div>}
          {(ticket.status === 'Resolved' || ticket.status === 'Closed') && nextStatus === 'In Progress' && <div className="resolve-field"><label className="field-label" htmlFor="reopen-reason">Reopen reason</label><textarea id="reopen-reason" className="text-area compact-textarea" maxLength={2000} value={transitionReason} onChange={(event) => setTransitionReason(stripControls(event.target.value))} /><div className="character-row"><small>{reopenHint}</small><small>{transitionReason.length}/2000</small></div></div>}
          <button type="button" className="button button-primary full-button" disabled={busy || !assignedToMe || !nextStatus || !statuses.includes(nextStatus) || (nextStatus === 'Waiting on User' && !waitingReasonValid) || ((ticket.status === 'Resolved' || ticket.status === 'Closed') && (closedTooLongAgo || transitionReason.trim().length < 10))} title={transitionHint || (!nextStatus ? 'Select a valid next status.' : '')} onClick={applyStatus}>{busy && <Spinner label="Updating status" />}{busy ? 'Updating…' : ticket.status === 'Resolved' && nextStatus === 'Closed' ? 'Close ticket' : ['Resolved', 'Closed'].includes(ticket.status) && nextStatus === 'In Progress' ? 'Reopen ticket' : 'Update status'}</button>
          {ticket.status === 'Resolved' && <button type="button" className="button button-secondary full-button" disabled={busy || !assignedToMe} title={!assignedToMe ? 'Only the assigned technician can close this ticket.' : ''} onClick={closeTicket}>{busy ? <Spinner label="Closing ticket" /> : 'Close ticket'}</button>}
        </section>}
      </aside>
    </div>}
    {confirm === 'resolve' && <ConfirmDialog title="Confirm ticket resolution" confirmLabel="Resolve ticket" busy={busy} onCancel={() => setConfirm('')} onConfirm={confirmResolve}>
      <p><strong>Code:</strong> {resolutionCode}</p><p><strong>Notes:</strong> {notes.trim()}</p><p><strong>Requester:</strong> {requesterName}</p>{closingChoice && <p><strong>Closing message:</strong> {CLOSINGS[closingChoice]}</p>}<p>Confirm that the fix was verified before resolving.</p>
    </ConfirmDialog>}
    {confirm === 'reopen' && <ConfirmDialog title="Confirm reopen" confirmLabel="Reopen ticket" busy={busy} onCancel={() => setConfirm('')} onConfirm={confirmReopen}>
      <p><strong>Reason:</strong> {transitionReason.trim()}</p>{closedTooLongAgo && <p>This ticket was closed more than 30 days ago. Create a new ticket instead.</p>}
    </ConfirmDialog>}
  </div>
}
