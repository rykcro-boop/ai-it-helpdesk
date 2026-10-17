import { useCallback, useState } from 'react'
import './App.css'
import { Login } from './Login.jsx'
import { ChangePassword } from './ChangePassword.jsx'
import { NewTicket } from './NewTicket.jsx'
import { Layout } from './Layout.jsx'
import { Reports } from './Reports.jsx'
import { TicketDetail } from './TicketDetail.jsx'
import { TicketList } from './TicketList.jsx'
import { Users } from './Users.jsx'

const SESSION_KEY = 'ai-helpdesk-session'

function getSavedSession() {
  try {
    const saved = sessionStorage.getItem(SESSION_KEY)
    if (!saved) return null
    const session = JSON.parse(saved)
    if (session?.token && ['Employee', 'Technician'].includes(session.role)) return session
  } catch {
    sessionStorage.removeItem(SESSION_KEY)
  }
  sessionStorage.removeItem(SESSION_KEY)
  return null
}

function App() {
  const [session, setSession] = useState(getSavedSession)
  const [loginMessage, setLoginMessage] = useState('')
  const [page, setPage] = useState(() => getSavedSession()?.role === 'Technician' ? 'tickets' : 'my-tickets')
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [createUserSignal, setCreateUserSignal] = useState(0)
  const [ticketNotice, setTicketNotice] = useState('')

  function handleLogin(user) {
    if (!['Employee', 'Technician'].includes(user.role)) {
      setLoginMessage('This account does not have a recognized role.')
      return
    }
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(user))
    setLoginMessage('')
    setSession(user)
    setPage(user.role === 'Technician' ? 'tickets' : 'my-tickets')
  }

  const logout = useCallback((expired = false) => {
    sessionStorage.removeItem(SESSION_KEY)
    setSession(null)
    setSelectedTicket(null)
    setLoginMessage(expired ? 'Session expired, please log in again' : '')
  }, [])

  const onSessionExpired = useCallback(() => logout(true), [logout])
  const onTicketMissing = useCallback(() => {
    setSelectedTicket(null)
    setTicketNotice('Ticket not found after refresh. Returned to the ticket list.')
    setPage(session?.role === 'Technician' ? 'tickets' : 'my-tickets')
  }, [session?.role])
  function openTicket(ticket) { setSelectedTicket(ticket); setPage('ticket-detail') }
  function changePasswordComplete() {
    setSession((current) => {
      const updated = { ...current, must_change_password: false }
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(updated))
      return updated
    })
  }

  if (!session) return <Login onLogin={handleLogin} initialMessage={loginMessage} />
  if (session.must_change_password) return <ChangePassword session={session} onComplete={changePasswordComplete} onSessionExpired={onSessionExpired} />

  const isTechnician = session.role === 'Technician'
  const title = page === 'tickets' || page === 'ticket-detail' ? 'Service Desk — Incidents'
    : page === 'reports' ? 'Reports'
      : page === 'users' ? 'User Management'
        : page === 'my-tickets' ? 'My tickets' : 'New ticket'
  const headerAction = page === 'users'
    ? <button className="button button-primary" type="button" onClick={() => setCreateUserSignal((value) => value + 1)}>+ Create User</button>
    : page === 'my-tickets'
      ? <button className="button button-primary" type="button" onClick={() => setPage('new-ticket')}>+ New ticket</button>
      : null

  return <Layout session={session} page={page} setPage={(next) => { setPage(next); if (next !== 'ticket-detail') setSelectedTicket(null) }} onLogout={() => logout()} title={title} action={headerAction}>
    {page === 'tickets' && <TicketList token={session.token} technician={session.name} isTechnician onSessionExpired={onSessionExpired} onOpen={openTicket} notice={ticketNotice} onClearNotice={() => setTicketNotice('')} />}
    {page === 'ticket-detail' && selectedTicket && <TicketDetail ticket={selectedTicket} token={session.token} technician={session.name} isTechnician={isTechnician} onSessionExpired={onSessionExpired} onBack={() => setPage(isTechnician ? 'tickets' : 'my-tickets')} onMissingTicket={onTicketMissing} />}
    {page === 'reports' && isTechnician && <Reports token={session.token} onSessionExpired={onSessionExpired} />}
    {page === 'users' && isTechnician && <Users token={session.token} session={session} onSessionExpired={onSessionExpired} openCreateSignal={createUserSignal} />}
    {page === 'my-tickets' && !isTechnician && <TicketList token={session.token} isTechnician={false} onSessionExpired={onSessionExpired} onOpen={openTicket} notice={ticketNotice} onClearNotice={() => setTicketNotice('')} />}
    {page === 'new-ticket' && !isTechnician && <NewTicket token={session.token} onSessionExpired={onSessionExpired} />}
  </Layout>
}

export default App
