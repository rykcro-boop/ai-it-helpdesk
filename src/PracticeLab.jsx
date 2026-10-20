import { useEffect, useMemo, useState } from 'react'
import { Badge } from './Layout.jsx'

const SCENARIOS = [
  {
    id: 'wifi',
    title: 'Wi-Fi keeps disconnecting',
    category: 'Networking',
    difficulty: 'Beginner',
    device: 'WKS-NORTHLINE-07',
    user: 'Maya Patel',
    department: 'Operations',
    issue: 'Wi-Fi disconnects during calls and reconnects after a minute.',
  },
  {
    id: 'printer',
    title: 'Shared printer shows offline',
    category: 'Hardware',
    difficulty: 'Beginner',
    device: 'OPS-FLOOR2-PRN',
    user: 'Jordan Lee',
    department: 'People Operations',
    issue: 'The second-floor printer says offline; onboarding forms need to be printed.',
  },
  {
    id: 'account',
    title: 'User cannot sign in',
    category: 'Identity & access',
    difficulty: 'Intermediate',
    device: 'WKS-NORTHLINE-12',
    user: 'Chris Morgan',
    department: 'Finance',
    issue: 'The user is locked out after several sign-in attempts.',
  },
]

const DESKTOP_APPS = [
  { id: 'this-pc', label: 'This PC', icon: '▣' },
  { id: 'documents', label: 'Documents', icon: '▤' },
  { id: 'settings', label: 'Settings', icon: '⚙' },
  { id: 'browser', label: 'Intranet', icon: '◎' },
]

function formatTime(seconds) {
  return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`
}

export function PracticeLab({ technician }) {
  const [scenarioId, setScenarioId] = useState(SCENARIOS[0].id)
  const [active, setActive] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [app, setApp] = useState('home')
  const [startOpen, setStartOpen] = useState(false)
  const [minimized, setMinimized] = useState(false)
  const [wifiConnected, setWifiConnected] = useState(false)
  const [printerQueueCleared, setPrinterQueueCleared] = useState(false)
  const [testPagePrinted, setTestPagePrinted] = useState(false)
  const [accountUnlocked, setAccountUnlocked] = useState(false)
  const [activity, setActivity] = useState([])

  const scenario = useMemo(() => SCENARIOS.find((item) => item.id === scenarioId) || SCENARIOS[0], [scenarioId])

  useEffect(() => {
    if (!active) return undefined
    const timer = window.setInterval(() => setElapsed((value) => value + 1), 1000)
    return () => window.clearInterval(timer)
  }, [active])

  function reset(nextScenario = scenarioId) {
    setScenarioId(nextScenario)
    setActive(false)
    setElapsed(0)
    setApp('home')
    setStartOpen(false)
    setMinimized(false)
    setWifiConnected(false)
    setPrinterQueueCleared(false)
    setTestPagePrinted(false)
    setAccountUnlocked(false)
    setActivity([])
  }

  function startSession() {
    setActive(true)
    setActivity([{ id: 'start', text: `Connected to simulated workstation ${scenario.device}.`, type: 'system' }])
  }

  function openApp(nextApp) {
    setApp(nextApp)
    setMinimized(false)
    setStartOpen(false)
  }

  function logAction(text) {
    setActivity((items) => [{ id: `${Date.now()}-${text}`, text, type: 'success' }, ...items])
  }

  function toggleWifi() {
    const connected = !wifiConnected
    setWifiConnected(connected)
    logAction(connected ? 'Connected to NORTHLINE-CORP. Simulated internet access restored.' : 'Disconnected from NORTHLINE-CORP in the simulation.')
  }

  function clearPrinterQueue() {
    setPrinterQueueCleared(true)
    logAction('Cleared the stuck test job from the simulated local printer queue.')
  }

  function printTestPage() {
    setTestPagePrinted(true)
    logAction('Printed a simulated test page. No physical printer was contacted.')
  }

  function unlockAccount() {
    setAccountUnlocked(true)
    logAction(`Unlocked ${scenario.user} in the simulated directory.`)
  }

  function renderApp() {
    if (app === 'settings') {
      return <div className="sim-app-content">
        <div className="sim-app-sidebar"><strong>Settings</strong>{['System', 'Network & internet', 'Bluetooth & devices', 'Accounts', 'Windows Update'].map((item) => <button key={item} type="button" className={item === 'Network & internet' ? 'sim-setting-selected' : ''} onClick={() => item === 'System' ? openApp('system') : item === 'Accounts' ? openApp('accounts') : item === 'Bluetooth & devices' ? openApp('printers') : item === 'Windows Update' ? openApp('updates') : setApp('settings')}>{item}</button>)}</div>
        <div className="sim-app-main"><span className="sim-app-kicker">NETWORK & INTERNET</span><h3>Wi-Fi</h3><p>Manage wireless networks and connection status.</p><div className="sim-setting-card"><span><strong>NORTHLINE-CORP</strong><small>{wifiConnected ? 'Connected, secured' : 'Connected · No internet access'}</small></span><Badge tone={wifiConnected ? 'user-active' : 'priority-high'}>{wifiConnected ? 'Online' : 'Limited'}</Badge></div><div className="sim-action-row"><button type="button" className="button button-primary" onClick={toggleWifi}>{wifiConnected ? 'Disconnect' : 'Reconnect to network'}</button><button type="button" className="button button-secondary" onClick={() => logAction('Ran the simulated network troubleshooter.')}>Run troubleshooter</button></div></div>
      </div>
    }
    if (app === 'this-pc') {
      return <div className="sim-app-main sim-file-view"><span className="sim-app-kicker">FILE EXPLORER</span><h3>This PC</h3><p>Devices and drives for {scenario.device}</p><div className="sim-drive-card"><span>▣</span><span><strong>Windows (C:)</strong><small>256 GB total · 118 GB free</small><i><b /></i></span></div><div className="sim-folder-grid">{['Desktop', 'Documents', 'Downloads', 'Pictures'].map((folder) => <button key={folder} type="button" onClick={() => openApp('documents')}><span>▰</span>{folder}</button>)}</div></div>
    }
    if (app === 'documents') {
      return <div className="sim-app-main sim-file-view"><span className="sim-app-kicker">FILE EXPLORER · DOCUMENTS</span><h3>Documents</h3><div className="sim-file-row"><span>▤</span><span><strong>Work notes.docx</strong><small>Modified today · 24 KB</small></span></div><div className="sim-file-row"><span>▤</span><span><strong>Onboarding checklist.pdf</strong><small>Modified yesterday · 182 KB</small></span></div><p className="sim-note">Sample files only. File actions are not connected to a real device.</p></div>
    }
    if (app === 'browser') {
      return <div className="sim-app-main sim-browser-view"><div className="sim-browser-address">🔒 &nbsp; intranet.northline.corp</div><span className="sim-app-kicker">NORTHLINE EMPLOYEE PORTAL</span><h3>Good morning, {scenario.user.split(' ')[0]}</h3><p>Your workstation is connected to the training environment.</p><div className="sim-portal-cards"><span><strong>Help Center</strong><small>Open a support request</small></span><span><strong>Company updates</strong><small>All systems operational</small></span></div></div>
    }
    if (app === 'accounts') {
      return <div className="sim-app-main"><span className="sim-app-kicker">SETTINGS · ACCOUNTS</span><h3>Work account</h3><div className="sim-setting-card"><span><strong>{scenario.user}</strong><small>{scenario.user.toLowerCase().replace(' ', '.')}@northline.corp</small></span><Badge tone={accountUnlocked ? 'user-active' : 'priority-high'}>{accountUnlocked ? 'Sign-in ready' : 'Locked'}</Badge></div><p>{accountUnlocked ? 'The simulated account is unlocked. Ask the user to try signing in again.' : 'This account is temporarily locked after repeated sign-in attempts.'}</p><button type="button" className="button button-primary" disabled={accountUnlocked} onClick={unlockAccount}>{accountUnlocked ? 'Account unlocked' : 'Unlock account'}</button></div>
    }
    if (app === 'printers') {
      return <div className="sim-app-main"><span className="sim-app-kicker">BLUETOOTH & DEVICES · PRINTERS</span><h3>Printers & scanners</h3><div className="sim-setting-card"><span><strong>Northline-Floor2</strong><small>{printerQueueCleared ? 'Ready · Queue empty' : 'Attention required · 1 job stuck'}</small></span><Badge tone={printerQueueCleared ? 'user-active' : 'priority-high'}>{printerQueueCleared ? 'Ready' : 'Paused'}</Badge></div><div className="sim-action-row">{!printerQueueCleared ? <button type="button" className="button button-primary" onClick={clearPrinterQueue}>Clear stuck job</button> : <button type="button" className="button button-primary" onClick={printTestPage}>{testPagePrinted ? 'Test page printed' : 'Print test page'}</button>}</div>{testPagePrinted && <p className="sim-success-note">Test page printed successfully in the simulation.</p>}</div>
    }
    if (app === 'updates') {
      return <div className="sim-app-main"><span className="sim-app-kicker">WINDOWS UPDATE</span><h3>You’re up to date</h3><p>Last checked: today, 8:42 AM</p><div className="sim-setting-card"><span><strong>Security intelligence</strong><small>Current · no restart required</small></span><Badge tone="user-active">Updated</Badge></div></div>
    }
    if (app === 'system') {
      return <div className="sim-app-main"><span className="sim-app-kicker">SETTINGS · SYSTEM</span><h3>About this PC</h3><div className="sim-setting-card"><span><strong>{scenario.device}</strong><small>Northline · Windows 11 Pro</small></span><Badge tone="user-active">Online</Badge></div><div className="sim-file-row"><span>▣</span><span><strong>Device specifications</strong><small>Training workstation · 16 GB RAM · 64-bit OS</small></span></div></div>
    }
    return <div className="sim-app-main sim-home-view"><span className="sim-app-kicker">NORTHLINE WORKSTATION</span><h3>Remote desktop ready</h3><p>Choose an app on the desktop or taskbar. You can inspect settings and run the simulated repair directly here.</p><div className="sim-home-shortcuts">{DESKTOP_APPS.map((item) => <button key={item.id} type="button" onClick={() => openApp(item.id)}><span>{item.icon}</span>{item.label}</button>)}</div><div className="sim-setting-card"><span><strong>Reported issue</strong><small>{scenario.issue}</small></span><Badge tone="status-in-progress">Open</Badge></div></div>
  }

  return <div className="practice-lab">
    {!active ? <>
      <section className="practice-welcome">
        <div>
          <span className="practice-eyebrow">INTERACTIVE REMOTE DESKTOP</span>
          <h2>Connect to a practice workstation</h2>
          <p>Open a simulated user computer and click through its desktop, Settings, files, and support tools. No quiz prompts—just hands-on practice in a safe training environment.</p>
        </div>
        <div className="practice-welcome-mark" aria-hidden="true"><span>↗</span><small>TRAINING<br />ENVIRONMENT</small></div>
      </section>
      <div className="practice-section-heading"><div><h2>Available workstations</h2><p className="muted">Choose a user’s workstation to begin a simulated remote session.</p></div><Badge tone="badge-neutral">3 online</Badge></div>
      <div className="scenario-grid">{SCENARIOS.map((item, index) => <button key={item.id} type="button" className={`scenario-card${scenarioId === item.id ? ' scenario-selected' : ''}`} onClick={() => setScenarioId(item.id)}>
        <span className={`scenario-icon scenario-icon-${item.id}`}>{['⌁', '▤', '◉'][index]}</span>
        <span className="scenario-meta"><Badge tone="badge-neutral">{item.category}</Badge><span className="scenario-difficulty">{item.difficulty}</span></span>
        <strong>{item.device}</strong>
        <span className="scenario-description">{item.user} · {item.department}<br />{item.issue}</span>
        <span className="scenario-footer">Online · Ready to connect <span aria-hidden="true">→</span></span>
      </button>)}</div>
      <section className="practice-brief content-card">
        <div><span className="practice-eyebrow">SELECTED WORKSTATION</span><h3>{scenario.device}</h3><p>{scenario.issue}</p></div>
        <div className="practice-brief-facts"><span><small>USER</small><strong>{scenario.user}</strong></span><span><small>DEPARTMENT</small><strong>{scenario.department}</strong></span><span><small>STATUS</small><strong>Online · Windows 11</strong></span></div>
        <button type="button" className="button button-primary practice-start" onClick={startSession}>Connect to workstation <span aria-hidden="true">→</span></button>
      </section>
      <p className="practice-disclaimer"><span aria-hidden="true">ⓘ</span> Simulated remote access only—no real computer or network connection is made.</p>
    </> : <>
      <div className="practice-session-header">
        <button type="button" className="back-link" onClick={() => reset()}>← Workstations</button>
        <div className="practice-session-status"><span className="session-live-dot" />Remote session active<span className="session-divider">·</span><span className="session-timer">{formatTime(elapsed)}</span></div>
      </div>
      <section className="session-casebar"><div><span className="practice-eyebrow">SIMULATED ENDPOINT</span><h2>{scenario.device}</h2></div><div className="session-case-facts"><span><small>USER</small><strong>{scenario.user}</strong></span><span><small>DEPARTMENT</small><strong>{scenario.department}</strong></span><span><small>TECHNICIAN</small><strong>{technician}</strong></span></div></section>
      <div className="remote-workspace">
        <section className="remote-screen-panel">
          <div className="remote-toolbar"><div className="remote-window-dots"><i /><i /><i /></div><span>{scenario.device} <b>·</b> Secure training connection</span><span className="remote-encrypted">● Encrypted</span></div>
          <div className="remote-desktop">
            <div className="desktop-brand"><span className="desktop-brand-mark">N</span><span><strong>Northline</strong><small>WORKSTATION</small></span></div>
            <div className="desktop-icons">{DESKTOP_APPS.map((item) => <button key={item.id} type="button" onClick={() => openApp(item.id)} aria-label={`Open ${item.label}`}><i>{item.icon}</i><small>{item.label}</small></button>)}</div>
            {!minimized && <div className="desktop-window">
              <div className="desktop-window-title"><span>●</span>{app === 'home' ? 'Remote workstation' : app === 'this-pc' || app === 'documents' ? 'File Explorer' : app === 'settings' || app === 'accounts' || app === 'printers' || app === 'updates' ? 'Settings' : 'Northline Intranet'}<button type="button" aria-label="Minimize window" onClick={() => setMinimized(true)}>−</button><button type="button" aria-label="Close window" onClick={() => openApp('home')}>×</button></div>
              {renderApp()}
            </div>}
            {startOpen && <div className="desktop-start-menu"><span className="practice-eyebrow">PINNED APPS</span><div>{DESKTOP_APPS.map((item) => <button key={item.id} type="button" onClick={() => openApp(item.id)}><span>{item.icon}</span>{item.label}</button>)}<button type="button" onClick={() => openApp('printers')}><span>▧</span>Printers</button></div><small>{scenario.user} · NORTHLINE.CORP</small></div>}
            <div className="desktop-taskbar"><button type="button" aria-label="Open Start menu" onClick={() => setStartOpen((open) => !open)}>⊞</button><button type="button" onClick={() => openApp('browser')}>⌕ Search</button><div className="taskbar-pinned">{['this-pc', 'settings', 'browser'].map((id) => { const item = DESKTOP_APPS.find((entry) => entry.id === id); return <button key={id} type="button" aria-label={`Open ${item.label}`} onClick={() => openApp(id)}>{item.icon}</button> })}</div><span className="taskbar-time">{formatTime(elapsed)} &nbsp; ◖</span></div>
            <div className="desktop-footer"><span>◉ NORTHLINE.CORP</span><span>Interactive training workstation · No live connection</span></div>
          </div>
          <div className="remote-screen-footer"><span><i className="session-live-dot" />Simulation session connected</span><span>Click desktop icons, Start, or taskbar apps</span></div>
        </section>
        <aside className="session-side">
          <section className="session-objective content-card">
            <div className="session-card-heading"><div><span className="practice-eyebrow">REMOTE SESSION</span><h3>Work directly on the desktop</h3></div><Badge tone="user-active">Connected</Badge></div>
            <p className="objective-prompt">Open Settings, File Explorer, or the intranet from the simulated screen. Try a repair action for the reported issue; your actions are recorded below.</p>
            <div className="session-shortcut-list">{DESKTOP_APPS.map((item) => <button key={item.id} type="button" className="action-option" onClick={() => openApp(item.id)}><span className="action-option-icon">{item.icon}</span><span>Open {item.label}</span></button>)}</div>
            {scenario.id === 'wifi' && <p className={`session-tip${wifiConnected ? ' session-tip-done' : ''}`}>{wifiConnected ? 'Wi-Fi repair applied in the simulation.' : 'Try Settings → Network & internet → Reconnect to network.'}</p>}
            {scenario.id === 'printer' && <p className={`session-tip${testPagePrinted ? ' session-tip-done' : ''}`}>{testPagePrinted ? 'Printer queue cleared and test page printed.' : 'Try Settings → Bluetooth & devices → Printers.'}</p>}
            {scenario.id === 'account' && <p className={`session-tip${accountUnlocked ? ' session-tip-done' : ''}`}>{accountUnlocked ? 'Account unlocked in the simulation.' : 'Try Settings → Accounts to unlock the user.'}</p>}
          </section>
          <section className="session-user-card content-card"><div className="session-card-heading"><div><span className="practice-eyebrow">CONNECTED USER</span><h3>{scenario.user}</h3></div><span className="user-avatar">{scenario.user.charAt(0)}</span></div><p className="user-quote">“{scenario.issue}”</p><div className="user-contact-meta"><span>{scenario.department}</span><span>Available · Chat</span></div></section>
          <section className="session-activity content-card"><div className="session-card-heading"><div><span className="practice-eyebrow">SESSION LOG</span><h3>Activity</h3></div><span className="activity-count">{activity.length}</span></div>{activity.length ? <ul>{activity.map((item) => <li key={item.id} className={`activity-${item.type}`}><span className="activity-indicator" /><span>{item.text}</span></li>)}</ul> : <p className="muted">Your actions on the simulated workstation will appear here.</p>}</section>
        </aside>
      </div>
      <p className="practice-disclaimer"><span aria-hidden="true">ⓘ</span> Fictional remote session—this page cannot access, control, or change a real computer.</p>
    </>}
  </div>
}
