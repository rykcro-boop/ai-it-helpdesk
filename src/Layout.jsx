import { useState } from 'react'

const ICONS = {
  tickets: <><rect x="4" y="5" width="16" height="14" rx="2" /><path d="M8 9h8M8 13h5" /></>,
  reports: <><path d="M5 19V9m7 10V5m7 14v-7" /><path d="M3 19h18" /></>,
  users: <><circle cx="9" cy="8" r="3" /><path d="M3 19v-1a6 6 0 0 1 12 0v1M16 5.5a3 3 0 0 1 0 5.8M18 14a5 5 0 0 1 3 4v1" /></>,
  add: <><path d="M12 5v14M5 12h14" /></>,
  practice: <><rect x="3" y="4" width="18" height="13" rx="2" /><path d="M8 21h8m-4-4v4m-5-12 2 2 4-4" /></>,
  directory: <><circle cx="9" cy="8" r="3" /><path d="M3 19v-1a6 6 0 0 1 12 0v1m2-11h4m-2-2v4m-2 7h4m-2-2v4" /></>,
}

function NavIcon({ name }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{ICONS[name] || ICONS.tickets}</svg>
}

export function Layout({ session, page, setPage, onLogout, title, tabs, activeTab, setActiveTab, action, children }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const technician = session.role === 'Technician'
  const items = technician
    ? [{ id: 'tickets', label: 'Tickets', icon: 'tickets' }, { id: 'directory', label: 'Active Directory', icon: 'directory' }, { id: 'practice', label: 'Training lab', icon: 'practice' }, { id: 'reports', label: 'Reports', icon: 'reports' }]
    : [{ id: 'my-tickets', label: 'My tickets', icon: 'tickets' }, { id: 'new-ticket', label: 'New ticket', icon: 'add' }]

  function navigate(id) {
    setPage(id)
    setMenuOpen(false)
  }

  return (
    <div className="app-layout">
      <aside className={`sidebar${menuOpen ? ' sidebar-open' : ''}`}>
        <div className="sidebar-brand">
          <span className="brand-mark">AI</span>
          <span><strong>AI IT Help Desk</strong><small>Service workspace</small></span>
        </div>
        <nav className="sidebar-nav" aria-label="Main navigation">
          <span className="nav-section-label">Workspace</span>
          {items.map((item) => <button key={item.id} type="button" className={`nav-item${page === item.id || (page === 'ticket-detail' && item.id === 'tickets') ? ' active' : ''}`} onClick={() => navigate(item.id)}><NavIcon name={item.icon} />{item.label}</button>)}
          {technician && <>
            <span className="nav-section-label administration-label">Administration</span>
            <button type="button" className={`nav-item${page === 'users' ? ' active' : ''}`} onClick={() => navigate('users')}><NavIcon name="users" />Users</button>
          </>}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <span className="user-avatar">{session.name?.charAt(0) || '?'}</span>
            <span className="sidebar-user-copy"><strong>{session.name}</strong><span className={`role-badge ${technician ? 'role-tech' : ''}`}>{session.role}</span></span>
          </div>
          <button type="button" className="signout-button" onClick={onLogout}><span aria-hidden="true">↪</span> Sign out</button>
        </div>
      </aside>
      <div className="workspace">
        <header className="mobile-topbar">
          <button className="menu-button" type="button" aria-label="Toggle navigation menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>☰</button>
          <strong>AI IT Help Desk</strong>
          {action && <div className="mobile-action">{action}</div>}
        </header>
        <main className="page-area">
          <header className="page-header">
            <div className="page-header-main"><h1>{title}</h1>{tabs?.length > 0 && <div className="page-tabs" role="tablist">{tabs.map((tab) => <button key={tab.id} type="button" role="tab" aria-selected={activeTab === tab.id} className={activeTab === tab.id ? 'selected' : ''} onClick={() => setActiveTab(tab.id)}>{tab.label}{tab.count !== undefined && <span className="tab-count">{tab.count}</span>}</button>)}</div>}</div>
            {action && <div className="page-header-action">{action}</div>}
          </header>
          {children}
        </main>
      </div>
    </div>
  )
}

export function Badge({ children, tone = '' }) {
  return <span className={`badge ${tone}`}>{children}</span>
}

export function Spinner({ label = 'Loading' }) {
  return <span className="spinner" role="status" aria-label={label} />
}

export function Modal({ title, onClose, children }) {
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-title"><header className="modal-heading"><h2 id="modal-title">{title}</h2><button type="button" className="icon-button" aria-label="Close dialog" onClick={onClose}>×</button></header>{children}</section></div>
}

export function ConfirmDialog({ title, children, confirmLabel = 'Confirm', busy = false, onCancel, onConfirm, danger = false }) {
  return <Modal title={title} onClose={() => !busy && onCancel()}>
    <div className="confirm-content">{children}</div>
    <div className="modal-actions">
      <button type="button" className="button button-secondary" disabled={busy} onClick={onCancel}>Cancel</button>
      <button type="button" className={`button ${danger ? 'button-danger' : 'button-primary'}`} disabled={busy} onClick={onConfirm}>{busy && <Spinner label="Saving" />}{busy ? 'Working…' : confirmLabel}</button>
    </div>
  </Modal>
}

export function StatCard({ label, value, detail }) {
  return <div className="stat-card"><span className="stat-label">{label}</span><strong className="stat-value">{value ?? 0}</strong>{detail && <span className="muted">{detail}</span>}</div>
}
