import { useCallback, useEffect, useMemo, useState } from 'react'
import { ApiError, getAllTickets, getMyTickets, UNREACHABLE_MESSAGE } from './api.js'
import { Badge, Spinner } from './Layout.jsx'

const PRIORITY_ORDER = { Critical: 0, High: 1, Medium: 2, Low: 3 }
const SLA_HOURS = { Critical: 4, High: 8, Medium: 24, Low: 72 }
const priorityLabel = { Critical: 'P1 Critical', High: 'P2 High', Medium: 'P3 Moderate', Low: 'P4 Low' }
function normalizedPriority(priority) {
  return Object.prototype.hasOwnProperty.call(PRIORITY_ORDER, priority) ? priority : 'Medium'
}

function normalizedCategory(category) {
  return typeof category === 'string' && category.trim() ? category : 'Other'
}

function formatDate(value, includeTime = true) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en-PH', { timeZone: 'Asia/Manila', year: 'numeric', month: 'short', day: 'numeric', ...(includeTime ? { hour: 'numeric', minute: '2-digit' } : {}) }).format(date)
}

function priorityTone(priority) {
  return `priority-${String(priority || '').toLowerCase()}`
}

function statusTone(status) {
  return `status-${String(status || '').toLowerCase().replace(/\s+/g, '-')}`
}

function slaInfo(ticket) {
  const created = new Date(ticket.created_at).getTime()
  if (!Number.isFinite(created)) return { label: '—', tone: '' }
  if (['Resolved', 'Closed'].includes(ticket.status)) {
    const due = created + (SLA_HOURS[ticket.priority] || 24) * 3600000
    const completed = new Date(ticket.resolved_at || ticket.updated_at || ticket.created_at).getTime()
    if (!Number.isFinite(completed)) return { label: '—', tone: '' }
    return { label: completed <= due ? 'Met' : 'Breached', tone: completed <= due ? 'sla-met' : 'sla-overdue' }
  }
  const remaining = Math.ceil((created + (SLA_HOURS[ticket.priority] || 24) * 3600000 - Date.now()) / 3600000)
  return remaining < 0
    ? { label: `Overdue ${Math.abs(remaining)}h`, tone: 'sla-overdue' }
    : { label: `${remaining}h`, tone: remaining <= 2 ? 'sla-soon' : '' }
}

function categorySubtext(ticket) {
  if (ticket.subcategory) return ticket.subcategory
  return String(ticket.summary || '').trim().split(/\s+/).slice(0, 3).join(' ') || 'General support'
}

function LoadingPanel() {
  return <div className="state-panel"><Spinner /><span>Loading tickets…</span></div>
}

export function TicketList({ token, technician, isTechnician, onSessionExpired, onOpen, notice = '', onClearNotice }) {
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState('open')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [priority, setPriority] = useState('All')
  const [category, setCategory] = useState('All')
  const [assignment, setAssignment] = useState('All')
  const [appliedFilters, setAppliedFilters] = useState({ priority: 'All', category: 'All', assignment: 'All' })

  const refresh = useCallback(async (withSpinner = false) => {
    if (withSpinner) setLoading(true)
    try {
      setTickets(isTechnician ? await getAllTickets(token) : await getMyTickets(token))
      setError('')
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) { onSessionExpired(); return }
      setError(err.message || UNREACHABLE_MESSAGE)
    } finally {
      setLoading(false)
    }
  }, [isTechnician, token, onSessionExpired])

  useEffect(() => {
    const timer = window.setTimeout(() => refresh(true), 0)
    return () => window.clearTimeout(timer)
  }, [refresh])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim().toLowerCase())
      setAppliedFilters({ priority, category, assignment })
    }, 250)
    return () => window.clearTimeout(timer)
  }, [search, priority, category, assignment])

  const openCount = tickets.filter((ticket) => !['Resolved', 'Closed'].includes(ticket.status)).length
  const completedCount = tickets.length - openCount
  const categories = useMemo(() => [...new Set(tickets.map((ticket) => normalizedCategory(ticket.category)))].sort(), [tickets])
  const shown = useMemo(() => {
    const term = debouncedSearch
    return tickets
      .filter((ticket) => isTechnician ? (tab === 'open' ? !['Resolved', 'Closed'].includes(ticket.status) : ['Resolved', 'Closed'].includes(ticket.status)) : true)
      .filter((ticket) => appliedFilters.priority === 'All' || normalizedPriority(ticket.priority) === appliedFilters.priority)
      .filter((ticket) => appliedFilters.category === 'All' || normalizedCategory(ticket.category) === appliedFilters.category)
      .filter((ticket) => !isTechnician || appliedFilters.assignment === 'All' || (appliedFilters.assignment === 'Unassigned' ? !ticket.assigned_to : appliedFilters.assignment === 'Mine' ? ticket.assigned_to === technician : true))
      .filter((ticket) => !term || [ticket.ticket_id, ticket.summary, ticket.description, ticket.category, ticket.requester, ticket.requester_username].some((value) => String(value || '').toLowerCase().includes(term)))
      .sort((a, b) => isTechnician && tab === 'open'
        ? PRIORITY_ORDER[normalizedPriority(a.priority)] - PRIORITY_ORDER[normalizedPriority(b.priority)] || new Date(b.created_at) - new Date(a.created_at)
        : new Date(b.created_at) - new Date(a.created_at))
  }, [tickets, isTechnician, tab, appliedFilters, technician, debouncedSearch])

  function clearFilters() {
    setSearch('')
    setPriority('All')
    setCategory('All')
    setAssignment('All')
    if (isTechnician) setTab('open')
  }

  return <>
    {isTechnician && <div className="section-tabs" role="tablist" aria-label="Ticket status">
      <button type="button" role="tab" aria-selected={tab === 'open'} className={tab === 'open' ? 'selected' : ''} onClick={() => setTab('open')}>Open <span className="tab-count">{openCount}</span></button>
      <button type="button" role="tab" aria-selected={tab === 'completed'} className={tab === 'completed' ? 'selected' : ''} onClick={() => setTab('completed')}>Completed <span className="tab-count">{completedCount}</span></button>
    </div>}
    {notice && <p className="inline-success" role="status">{notice}<button type="button" className="text-action" onClick={onClearNotice}>Dismiss</button></p>}
    <div className="list-toolbar">
      <label className="search-field"><span aria-hidden="true">⌕</span><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search tickets…" aria-label="Search tickets" /></label>
      <div className="filter-controls">
        <label className="sr-only" htmlFor="priority-filter">Filter by priority</label><select id="priority-filter" value={priority} onChange={(event) => setPriority(event.target.value)}><option value="All">All priorities</option>{Object.keys(PRIORITY_ORDER).map((item) => <option key={item}>{item}</option>)}</select>
        <label className="sr-only" htmlFor="category-filter">Filter by category</label><select id="category-filter" value={category} onChange={(event) => setCategory(event.target.value)}><option value="All">All categories</option>{categories.map((item) => <option key={item}>{item}</option>)}</select>
        {isTechnician && <><label className="sr-only" htmlFor="assignment-filter">Filter by assignment</label><select id="assignment-filter" value={assignment} onChange={(event) => setAssignment(event.target.value)}><option>All</option><option>Unassigned</option><option>Mine</option></select></>}
      </div>
    </div>
    {loading ? <LoadingPanel /> : error ? <div className="error-state" role="alert">{error}{(error === UNREACHABLE_MESSAGE || error.includes('timed out')) && <button type="button" className="button button-secondary retry-button" onClick={() => refresh(true)}>Retry</button>}</div> : shown.length === 0 ? <div className="empty-state">{tickets.length ? <><span>No tickets match your filters</span><button type="button" className="button button-secondary" onClick={clearFilters}>Clear filters</button></> : 'No tickets yet.'}</div> : (
      <div className="table-card"><div className="table-scroll"><table className="data-table ticket-table">
        <thead><tr><th>Number</th><th>Category</th><th>Summary</th><th>Priority</th><th>Status</th><th>Assignment</th>{isTechnician && <th>SLA</th>}<th>Created</th></tr></thead>
        <tbody>{shown.map((ticket) => {
          const sla = slaInfo(ticket)
          return <tr key={ticket.ticket_id} className="clickable-row" tabIndex={0} onClick={() => onOpen(ticket)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onOpen(ticket) } }}>
            <td><span className="ticket-number">{ticket.ticket_id}</span></td>
            <td><strong>{normalizedCategory(ticket.category)}</strong><small className="cell-subtext">{categorySubtext(ticket)}</small></td>
            <td><span className="summary-cell">{ticket.summary || ticket.description || 'No summary'}</span>{ticket.escalation_required && isTechnician && <Badge tone="badge-escalated">Escalated</Badge>}</td>
            <td><Badge tone={priorityTone(normalizedPriority(ticket.priority))}>{isTechnician ? priorityLabel[normalizedPriority(ticket.priority)] : normalizedPriority(ticket.priority)}</Badge></td>
            <td><Badge tone={['Open', 'Needs Review', 'In Progress', 'Waiting on User', 'Resolved', 'Closed'].includes(ticket.status) ? statusTone(ticket.status) : ''}>{['Open', 'Needs Review', 'In Progress', 'Waiting on User', 'Resolved', 'Closed'].includes(ticket.status) ? ticket.status : 'Unknown'}</Badge></td>
            <td><span className={ticket.assigned_to ? 'assigned-name' : 'unclaimed'}>{isTechnician ? (ticket.assigned_to || 'Unclaimed — open & Assign') : (ticket.assigned_to ? `Assigned to ${ticket.assigned_to}` : 'Waiting for a technician')}</span></td>
            {isTechnician && <td><span className={`sla-value ${sla.tone}`}>{sla.label}</span></td>}
            <td>{formatDate(ticket.created_at)}</td>
          </tr>
        })}</tbody>
      </table></div></div>
    )}
  </>
}
