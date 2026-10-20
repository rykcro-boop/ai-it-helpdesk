import { useMemo, useState } from 'react'
import { Badge } from './Layout.jsx'

const DIRECTORY_USERS = [
  { name: 'Maya Patel', username: 'mpatel', title: 'Operations Coordinator', department: 'Operations', email: 'maya.patel@northline.corp', office: 'Northline · Floor 2', status: 'Active', lastSignIn: 'Today, 9:14 AM', computer: 'WKS-NORTHLINE-07', locked: false },
  { name: 'Jordan Lee', username: 'jlee', title: 'People Operations Associate', department: 'People Operations', email: 'jordan.lee@northline.corp', office: 'Northline · Floor 2', status: 'Active', lastSignIn: 'Today, 8:52 AM', computer: 'WKS-NORTHLINE-14', locked: false },
  { name: 'Chris Morgan', username: 'cmorgan', title: 'Financial Analyst', department: 'Finance', email: 'chris.morgan@northline.corp', office: 'Northline · Floor 4', status: 'Active', lastSignIn: 'Yesterday, 4:38 PM', computer: 'WKS-NORTHLINE-12', locked: true },
  { name: 'Avery Brooks', username: 'abrooks', title: 'Customer Support Lead', department: 'Customer Support', email: 'avery.brooks@northline.corp', office: 'West Office · Floor 1', status: 'Active', lastSignIn: 'Today, 8:31 AM', computer: 'WKS-WEST-03', locked: false },
  { name: 'Riley Santos', username: 'rsantos', title: 'IT Support Technician', department: 'IT Support', email: 'riley.santos@northline.corp', office: 'Northline · Floor 1', status: 'Active', lastSignIn: 'Today, 7:58 AM', computer: 'WKS-IT-02', locked: false },
]

const DIRECTORY_COMPUTERS = [
  { name: 'WKS-NORTHLINE-07', user: 'Maya Patel', department: 'Operations', os: 'Windows 11 Enterprise', address: '10.24.18.107', lastSeen: '2 min ago', status: 'Online', issue: 'Intermittent Wi-Fi' },
  { name: 'WKS-NORTHLINE-14', user: 'Jordan Lee', department: 'People Operations', os: 'Windows 11 Enterprise', address: '10.24.18.114', lastSeen: '5 min ago', status: 'Online', issue: 'Shared printer offline' },
  { name: 'WKS-NORTHLINE-12', user: 'Chris Morgan', department: 'Finance', os: 'Windows 11 Enterprise', address: '10.24.22.112', lastSeen: '18 min ago', status: 'Online', issue: 'Account sign-in locked' },
  { name: 'WKS-WEST-03', user: 'Avery Brooks', department: 'Customer Support', os: 'Windows 11 Enterprise', address: '10.26.11.103', lastSeen: '1 hr ago', status: 'Online', issue: 'No active incident' },
  { name: 'WKS-IT-02', user: 'Riley Santos', department: 'IT Support', os: 'Windows 11 Enterprise', address: '10.24.10.102', lastSeen: 'Just now', status: 'Online', issue: 'No active incident' },
]

const DIRECTORY_GROUPS = [
  { name: 'GG-Helpdesk-Technicians', scope: 'Global · Security', members: 4, description: 'Service desk technicians with simulated workstation support access.' },
  { name: 'GG-Finance-Users', scope: 'Global · Security', members: 18, description: 'Standard access group for the Finance department.' },
  { name: 'GG-Operations-Users', scope: 'Global · Security', members: 32, description: 'Standard access group for Operations.' },
  { name: 'GG-Printer-Floor2', scope: 'Global · Security', members: 26, description: 'Access to the second-floor shared printer queue.' },
]

const REMOTE_ACTIONS = [
  { id: 'network', label: 'Check network status', result: 'Network adapter is enabled. Connected to NORTHLINE-CORP. Signal quality: 82%.' },
  { id: 'updates', label: 'Review device health', result: 'Workstation is online. Operating system updates are current. No restart is pending.' },
  { id: 'session', label: 'Refresh user session', result: 'User session refreshed in the simulation. Existing files and settings remain unchanged.' },
]

function StateBadge({ status }) {
  return <Badge tone={status === 'Online' || status === 'Active' ? 'user-active' : status === 'Locked' ? 'priority-high' : 'badge-neutral'}>{status}</Badge>
}

export function ActiveDirectory({ technician }) {
  const [tab, setTab] = useState('users')
  const [search, setSearch] = useState('')
  const [selectedUser, setSelectedUser] = useState(DIRECTORY_USERS[0])
  const [lockedUsers, setLockedUsers] = useState(() => new Set(DIRECTORY_USERS.filter((user) => user.locked).map((user) => user.username)))
  const [remoteComputer, setRemoteComputer] = useState(null)
  const [remoteLog, setRemoteLog] = useState([])
  const [notice, setNotice] = useState('')
  const filteredUsers = useMemo(() => DIRECTORY_USERS.filter((user) => [user.name, user.username, user.department, user.email, user.computer].some((value) => value.toLowerCase().includes(search.toLowerCase()))), [search])
  const filteredComputers = useMemo(() => DIRECTORY_COMPUTERS.filter((computer) => [computer.name, computer.user, computer.department, computer.address, computer.issue].some((value) => value.toLowerCase().includes(search.toLowerCase()))), [search])
  const filteredGroups = useMemo(() => DIRECTORY_GROUPS.filter((group) => [group.name, group.scope, group.description].some((value) => value.toLowerCase().includes(search.toLowerCase()))), [search])

  function unlockSelectedUser() {
    if (!selectedUser || !lockedUsers.has(selectedUser.username)) return
    setLockedUsers((current) => {
      const next = new Set(current)
      next.delete(selectedUser.username)
      return next
    })
    setNotice(`${selectedUser.username} was unlocked in the simulation.`)
  }

  function startRemoteSession(computer) {
    setRemoteComputer(computer)
    setRemoteLog([{ id: 'start', message: `Secure training session opened for ${computer.name}.`, kind: 'system' }])
    setNotice('')
  }

  function runRemoteAction(action) {
    setRemoteLog((current) => [{ id: `${action.id}-${Date.now()}`, message: `${action.label}: ${action.result}`, kind: 'success' }, ...current])
  }

  return <div className="directory-page">
    {!remoteComputer ? <>
      <section className="directory-banner">
        <div className="directory-banner-main"><div className="directory-icon">AD</div><div><span className="practice-eyebrow">NORTHLINE.CORP · TRAINING ENVIRONMENT</span><h2>Directory & device management</h2><p>Look up fictional staff accounts, check workstation status, and launch a simulated remote support session.</p></div></div>
        <div className="directory-controller"><span className="directory-online-dot" /><span><small>DOMAIN CONTROLLER</small><strong>DC-NORTH-01 · Online</strong><small>Last sync: just now</small></span></div>
      </section>
      <div className="directory-stats">
        <div className="content-card"><span className="directory-stat-icon">♙</span><span><small>DIRECTORY USERS</small><strong>248</strong><em>5 sample profiles</em></span></div>
        <div className="content-card"><span className="directory-stat-icon directory-device-icon">▣</span><span><small>MANAGED DEVICES</small><strong>186</strong><em>5 sample workstations</em></span></div>
        <div className="content-card"><span className="directory-stat-icon directory-group-icon">◉</span><span><small>SECURITY GROUPS</small><strong>42</strong><em>4 sample groups</em></span></div>
      </div>
      <div className="directory-toolbar">
        <div className="section-tabs" role="tablist" aria-label="Directory object type">
          {[['users', 'Users'], ['computers', 'Computers'], ['groups', 'Groups']].map(([id, label]) => <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? 'selected' : ''} onClick={() => { setTab(id); setSearch('') }}>{label}<span className="tab-count">{id === 'users' ? 248 : id === 'computers' ? 186 : 42}</span></button>)}
        </div>
        <label className="search-field directory-search"><span aria-hidden="true">⌕</span><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Search ${tab}…`} aria-label={`Search ${tab}`} /></label>
      </div>
      {notice && <p className="inline-success" role="status">{notice}<button type="button" className="text-action" onClick={() => setNotice('')}>Dismiss</button></p>}
      {tab === 'users' && <div className="directory-content-grid">
        <section className="table-card directory-table-card"><div className="table-scroll"><table className="data-table directory-table"><thead><tr><th>NAME</th><th>USERNAME</th><th>DEPARTMENT</th><th>STATUS</th><th>DEVICE</th></tr></thead><tbody>{filteredUsers.map((user) => <tr key={user.username} className={`clickable-row${selectedUser.username === user.username ? ' directory-row-selected' : ''}`} onClick={() => setSelectedUser(user)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelectedUser(user) } }} tabIndex={0}><td><strong>{user.name}</strong><small className="cell-subtext">{user.title}</small></td><td className="directory-code">{user.username}</td><td>{user.department}</td><td><StateBadge status={lockedUsers.has(user.username) ? 'Locked' : user.status} /></td><td className="directory-code">{user.computer}</td></tr>)}</tbody></table>{filteredUsers.length === 0 && <div className="directory-empty">No users match this search.</div>}</div></section>
        <aside className="directory-profile content-card"><div className="directory-profile-heading"><span className="user-avatar directory-avatar">{selectedUser.name.charAt(0)}</span><span><strong>{selectedUser.name}</strong><small>{selectedUser.title}</small></span></div><div className="directory-profile-state"><StateBadge status={lockedUsers.has(selectedUser.username) ? 'Locked' : selectedUser.status} /><span className="directory-code">{selectedUser.username}</span></div><div className="directory-profile-fields"><span><small>EMAIL</small><strong>{selectedUser.email}</strong></span><span><small>DEPARTMENT</small><strong>{selectedUser.department}</strong></span><span><small>OFFICE</small><strong>{selectedUser.office}</strong></span><span><small>LAST SIGN-IN</small><strong>{selectedUser.lastSignIn}</strong></span><span><small>COMPUTER</small><strong>{selectedUser.computer}</strong></span><span><small>ORGANIZATIONAL UNIT</small><strong>Northline / Staff / {selectedUser.department}</strong></span></div><div className="directory-profile-actions">{lockedUsers.has(selectedUser.username) ? <button type="button" className="button button-primary full-button" onClick={unlockSelectedUser}>Unlock account (simulation)</button> : <button type="button" className="button button-secondary full-button" disabled>Account active</button>}<button type="button" className="button button-secondary full-button" onClick={() => { const device = DIRECTORY_COMPUTERS.find((item) => item.name === selectedUser.computer); if (device) startRemoteSession(device) }}>Start remote session</button></div></aside>
      </div>}
      {tab === 'computers' && <section className="table-card directory-table-card"><div className="table-scroll"><table className="data-table directory-table"><thead><tr><th>COMPUTER</th><th>PRIMARY USER</th><th>OPERATING SYSTEM</th><th>LAST CHECK-IN</th><th>STATUS</th><th>REMOTE</th></tr></thead><tbody>{filteredComputers.map((computer) => <tr key={computer.name}><td><strong className="directory-code">{computer.name}</strong><small className="cell-subtext">{computer.address}</small></td><td>{computer.user}<small className="cell-subtext">{computer.department}</small></td><td>{computer.os}</td><td>{computer.lastSeen}</td><td><StateBadge status={computer.status} /></td><td><button type="button" className="button button-secondary directory-connect" onClick={() => startRemoteSession(computer)}>Connect</button></td></tr>)}</tbody></table>{filteredComputers.length === 0 && <div className="directory-empty">No devices match this search.</div>}</div></section>}
      {tab === 'groups' && <section className="table-card directory-table-card"><div className="table-scroll"><table className="data-table directory-table"><thead><tr><th>GROUP</th><th>SCOPE</th><th>MEMBERS</th><th>DESCRIPTION</th></tr></thead><tbody>{filteredGroups.map((group) => <tr key={group.name}><td><strong className="directory-code">{group.name}</strong></td><td>{group.scope}</td><td>{group.members}</td><td>{group.description}</td></tr>)}</tbody></table>{filteredGroups.length === 0 && <div className="directory-empty">No groups match this search.</div>}</div></section>}
      <p className="practice-disclaimer"><span aria-hidden="true">ⓘ</span> Fictional training directory. Account actions only change this page’s temporary simulation state.</p>
    </> : <section className="directory-remote">
      <div className="directory-remote-top"><button type="button" className="back-link" onClick={() => { setRemoteComputer(null); setRemoteLog([]) }}>← Back to directory</button><span className="directory-remote-live"><i /> Remote training session active</span></div>
      <div className="directory-remote-summary"><div><span className="practice-eyebrow">SIMULATED ENDPOINT · {remoteComputer.address}</span><h2>{remoteComputer.name}</h2><p>{remoteComputer.user} · {remoteComputer.department} · {remoteComputer.os}</p></div><button type="button" className="button button-secondary" onClick={() => { setRemoteComputer(null); setRemoteLog([]) }}>End session</button></div>
      <div className="directory-remote-grid">
        <section className="directory-desktop">
          <div className="remote-toolbar"><div className="remote-window-dots"><i /><i /><i /></div><span>{remoteComputer.name} <b>·</b> Secure training connection</span><span className="remote-encrypted">● Encrypted</span></div>
          <div className="directory-desktop-view"><div className="desktop-brand"><span className="desktop-brand-mark">N</span><span><strong>Northline</strong><small>WORKSTATION</small></span></div><div className="directory-desktop-window"><div className="desktop-window-title"><span>●</span> Workstation overview</div><div className="directory-desktop-body"><span className="desktop-status-label"><i /> DEVICE STATUS</span><h3>{remoteComputer.issue}</h3><div className="directory-device-summary"><span>▣</span><div><strong>{remoteComputer.name}</strong><small>{remoteComputer.address} · NORTHLINE.CORP</small></div><StateBadge status="Online" /></div><div className="directory-health-lines"><span><i /> Endpoint reachable</span><span><i /> User session active</span><span><i /> Training mode · no live connection</span></div></div><div className="desktop-taskbar"><span>⊞</span><span>⌕ Search</span><span className="taskbar-time">NORTHLINE.CORP &nbsp; ◖</span></div></div><div className="desktop-footer"><span>◉ NORTHLINE.CORP</span><span>Simulation only · no live remote-control connection</span></div></div>
          <div className="remote-screen-footer"><span><i className="session-live-dot" /> Simulation stream connected</span><span>Read-only desktop preview</span></div>
        </section>
        <aside className="directory-remote-tools">
          <section className="content-card"><span className="practice-eyebrow">REMOTE SUPPORT TOOLS</span><h3>Choose a safe check</h3><p className="muted">These sample actions demonstrate a technician workflow; they run only in the simulation.</p><div className="directory-action-list">{REMOTE_ACTIONS.map((action) => <button type="button" key={action.id} className="action-option" onClick={() => runRemoteAction(action)}><span className="action-option-icon">›</span><span>{action.label}</span></button>)}</div></section>
          <section className="content-card directory-log-card"><div className="session-card-heading"><div><span className="practice-eyebrow">SESSION ACTIVITY</span><h3>Remote session log</h3></div><span className="activity-count">{remoteLog.length}</span></div>{remoteLog.length ? <ul className="directory-log">{remoteLog.map((entry) => <li key={entry.id} className={`activity-${entry.kind}`}><span className="activity-indicator" /><span>{entry.message}</span></li>)}</ul> : <p className="muted">Actions taken in this session will appear here.</p>}</section>
          <div className="directory-tech-info"><span className="user-avatar">{technician.charAt(0)}</span><span><small>TECHNICIAN</small><strong>{technician}</strong></span><StateBadge status="Online" /></div>
        </aside>
      </div>
      <p className="practice-disclaimer"><span aria-hidden="true">ⓘ</span> Simulated remote access. This page does not connect to, control, or change a real computer.</p>
    </section>}
  </div>
}
