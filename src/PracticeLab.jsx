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
    issue: 'I keep losing Wi-Fi during calls. It reconnects after a minute, then drops again.',
    steps: [
      {
        prompt: 'Start with safe triage. What do you ask the user first?',
        options: [
          { label: 'Check whether nearby coworkers are also disconnected', correct: true, feedback: 'Good scope check. This helps distinguish a device issue from a wider outage.' },
          { label: 'Restart the office router immediately', feedback: 'That could interrupt everyone. Check the impact and scope before changing shared infrastructure.' },
          { label: 'Ask the user to share their account password', feedback: 'Never ask for a password. Use approved identity and support workflows.' },
        ],
      },
      {
        prompt: 'The user confirms nearby coworkers are online. What do you inspect next?',
        options: [
          { label: 'Check this device’s Wi-Fi adapter and connection details', correct: true, feedback: 'The issue appears isolated to this workstation. Inspecting adapter state is a low-risk next step.' },
          { label: 'Disable the endpoint firewall', feedback: 'Disabling security controls is not an appropriate connectivity test.' },
          { label: 'Delete the user profile', feedback: 'That is a disruptive step without evidence. Gather device-level diagnostics first.' },
        ],
      },
      {
        prompt: 'The adapter is enabled, but its saved network profile is stale. Choose a fix.',
        options: [
          { label: 'Forget the approved office network, reconnect, and test signal', correct: true, feedback: 'A targeted refresh of the saved network profile is appropriate for this finding.' },
          { label: 'Install an unknown driver from a file-sharing site', feedback: 'Only use approved vendor or organization sources for drivers.' },
          { label: 'Change the access point configuration', feedback: 'The access point is serving other users correctly. Keep the fix scoped to this workstation.' },
        ],
      },
      {
        prompt: 'The device reconnected. How do you close the remote session?',
        options: [
          { label: 'Ask the user to load a work site and confirm the call is stable', correct: true, feedback: 'You verified the outcome with the user before documenting the session.' },
          { label: 'Disconnect without testing and mark it resolved', feedback: 'Always verify the reported symptom is gone before resolving the incident.' },
        ],
      },
    ],
  },
  {
    id: 'printer',
    title: 'Shared printer shows offline',
    category: 'Hardware',
    difficulty: 'Beginner',
    device: 'OPS-FLOOR2-PRN',
    user: 'Jordan Lee',
    department: 'People Operations',
    issue: 'The second-floor printer says offline, and I have onboarding forms to print.',
    steps: [
      {
        prompt: 'Before changing anything, what do you establish?',
        options: [
          { label: 'Ask whether other users can print to this shared device', correct: true, feedback: 'Good. Confirming scope helps identify a workstation, queue, or device-wide fault.' },
          { label: 'Remove the printer from every workstation', feedback: 'That is disruptive and does not establish where the failure is.' },
          { label: 'Ask the user to send the documents to your personal email', feedback: 'Keep work documents in approved systems and do not move data to personal accounts.' },
        ],
      },
      {
        prompt: 'Other users can print. Which check is most useful on this workstation?',
        options: [
          { label: 'Inspect the local print queue for a stuck job', correct: true, feedback: 'The shared printer is reachable for others, so a local queue check is a good next step.' },
          { label: 'Power off the building network switch', feedback: 'This would affect many users and is not proportionate to an isolated printer issue.' },
          { label: 'Clear every user’s queued documents', feedback: 'Only investigate the affected workstation’s queue.' },
        ],
      },
      {
        prompt: 'A single stale job is blocking the queue. What is the measured fix?',
        options: [
          { label: 'Clear the affected job, restart the local print service if needed, then retry', correct: true, feedback: 'You chose a scoped remediation and kept the user informed.' },
          { label: 'Delete the shared printer server configuration', feedback: 'That would affect other users and is not justified by a single stuck job.' },
          { label: 'Install a printer utility from an untrusted download', feedback: 'Use organization-approved drivers and tools only.' },
        ],
      },
      {
        prompt: 'The queue is clear. What confirms the ticket is ready to resolve?',
        options: [
          { label: 'Send a test page and ask the user to confirm it printed', correct: true, feedback: 'A user-confirmed test print verifies the service is restored.' },
          { label: 'Close the session without checking the printer', feedback: 'Verify the fix with an actual test before resolving.' },
        ],
      },
    ],
  },
  {
    id: 'account',
    title: 'User cannot sign in',
    category: 'Identity & access',
    difficulty: 'Intermediate',
    device: 'WKS-NORTHLINE-12',
    user: 'Chris Morgan',
    department: 'Finance',
    issue: 'I’m locked out after several sign-in attempts and have a report due soon.',
    steps: [
      {
        prompt: 'This is an account issue. What comes before any account change?',
        options: [
          { label: 'Verify the user’s identity using the approved support procedure', correct: true, feedback: 'Correct. Verify identity before discussing or changing account access.' },
          { label: 'Ask the user to tell you their current password', feedback: 'Never request or handle a user’s password.' },
          { label: 'Reset the account based only on the caller’s name', feedback: 'Names alone are not identity verification. Follow the approved verification process.' },
        ],
      },
      {
        prompt: 'Identity is verified. Which check should you perform next?',
        options: [
          { label: 'Check the sign-in status and approved lockout or MFA guidance', correct: true, feedback: 'You are checking the actual failure state before selecting a remediation.' },
          { label: 'Disable MFA for the entire organization', feedback: 'Do not weaken a shared security control to fix one user’s access.' },
          { label: 'Share a temporary password in a public channel', feedback: 'Use approved secure reset and delivery procedures; never expose credentials.' },
        ],
      },
      {
        prompt: 'The account is locked by repeated attempts. Choose the approved next step.',
        options: [
          { label: 'Unlock through the authorized workflow and guide the user through a secure sign-in', correct: true, feedback: 'The action is tied to the verified finding and uses an authorized process.' },
          { label: 'Copy the user’s credentials into your notes', feedback: 'Do not store passwords in ticket notes or support records.' },
          { label: 'Disable sign-in security prompts', feedback: 'Do not bypass security controls as a shortcut.' },
        ],
      },
      {
        prompt: 'The user can sign in again. What do you verify?',
        options: [
          { label: 'Have the user confirm sign-in and access to the needed work app', correct: true, feedback: 'You verified both account access and the user’s immediate need.' },
          { label: 'Resolve the ticket without checking with the user', feedback: 'Confirm the outcome before closing the support session.' },
        ],
      },
    ],
  },
]

function formatTime(seconds) {
  return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`
}

export function PracticeLab({ technician }) {
  const [scenarioId, setScenarioId] = useState(SCENARIOS[0].id)
  const [active, setActive] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [score, setScore] = useState(100)
  const [elapsed, setElapsed] = useState(0)
  const [feedback, setFeedback] = useState(null)
  const [activity, setActivity] = useState([])
  const scenario = useMemo(() => SCENARIOS.find((item) => item.id === scenarioId) || SCENARIOS[0], [scenarioId])
  const complete = active && stepIndex >= scenario.steps.length
  const step = scenario.steps[stepIndex]

  useEffect(() => {
    if (!active || complete) return undefined
    const timer = window.setInterval(() => setElapsed((value) => value + 1), 1000)
    return () => window.clearInterval(timer)
  }, [active, complete])

  function reset(nextScenario = scenarioId) {
    setScenarioId(nextScenario)
    setActive(false)
    setStepIndex(0)
    setScore(100)
    setElapsed(0)
    setFeedback(null)
    setActivity([])
  }

  function startSession() {
    setActive(true)
    setFeedback(null)
    setActivity([{ text: `Secure training connection established to ${scenario.device}.`, type: 'system' }])
  }

  function chooseAction(option) {
    if (!option.correct) {
      setScore((value) => Math.max(0, value - 10))
      setFeedback({ type: 'caution', text: option.feedback })
      setActivity((items) => [{ text: `Action needs review: ${option.label}`, type: 'caution' }, ...items])
      return
    }
    setFeedback({ type: 'success', text: option.feedback })
    setActivity((items) => [{ text: `Completed: ${option.label}`, type: 'success' }, ...items])
    setStepIndex((value) => value + 1)
  }

  return <div className="practice-lab">
    {!active ? <>
      <section className="practice-welcome">
        <div>
          <span className="practice-eyebrow">HANDS-ON SIMULATION</span>
          <h2>Practice a remote support session</h2>
          <p>Work through realistic helpdesk cases in a safe, simulated workstation. Choose your troubleshooting actions, verify the fix, and learn from each decision.</p>
        </div>
        <div className="practice-welcome-mark" aria-hidden="true"><span>↗</span><small>TRAINING<br />ENVIRONMENT</small></div>
      </section>
      <div className="practice-section-heading"><div><h2>Choose a scenario</h2><p className="muted">Each session takes about 3–5 minutes. Your actions only affect this simulation.</p></div><Badge tone="badge-neutral">3 scenarios</Badge></div>
      <div className="scenario-grid">{SCENARIOS.map((item, index) => <button key={item.id} type="button" className={`scenario-card${scenarioId === item.id ? ' scenario-selected' : ''}`} onClick={() => reset(item.id)}>
        <span className={`scenario-icon scenario-icon-${item.id}`}>{['⌁', '▤', '◉'][index]}</span>
        <span className="scenario-meta"><Badge tone="badge-neutral">{item.category}</Badge><span className="scenario-difficulty">{item.difficulty}</span></span>
        <strong>{item.title}</strong>
        <span className="scenario-description">{item.issue}</span>
        <span className="scenario-footer">4 objectives <span aria-hidden="true">→</span></span>
      </button>)}</div>
      <section className="practice-brief content-card">
        <div><span className="practice-eyebrow">SELECTED CASE</span><h3>{scenario.title}</h3><p>{scenario.issue}</p></div>
        <div className="practice-brief-facts"><span><small>REQUESTER</small><strong>{scenario.user}</strong></span><span><small>DEVICE</small><strong>{scenario.device}</strong></span><span><small>FOCUS</small><strong>Safe diagnosis · user communication · verification</strong></span></div>
        <button type="button" className="button button-primary practice-start" onClick={startSession}>Start remote session <span aria-hidden="true">→</span></button>
      </section>
      <p className="practice-disclaimer"><span aria-hidden="true">ⓘ</span> Training only — no real computer or network is accessed or changed.</p>
    </> : <>
      <div className="practice-session-header">
        <button type="button" className="back-link" onClick={() => reset()}>← Training scenarios</button>
        <div className="practice-session-status"><span className={`session-live-dot${complete ? ' session-done-dot' : ''}`} />{complete ? 'Session complete' : 'Remote session active'}<span className="session-divider">·</span><span className="session-timer">{formatTime(elapsed)}</span></div>
      </div>
      <section className="session-casebar"><div><span className="practice-eyebrow">PRACTICE CASE</span><h2>{scenario.title}</h2></div><div className="session-case-facts"><span><small>REQUESTER</small><strong>{scenario.user}</strong></span><span><small>DEVICE</small><strong>{scenario.device}</strong></span><span><small>TECHNICIAN</small><strong>{technician}</strong></span></div></section>
      <div className="remote-workspace">
        <section className="remote-screen-panel">
          <div className="remote-toolbar"><div className="remote-window-dots"><i /><i /><i /></div><span>{scenario.device} <b>·</b> Secure training connection</span><span className="remote-encrypted">● Encrypted</span></div>
          <div className="remote-desktop">
            <div className="desktop-brand"><span className="desktop-brand-mark">N</span><span><strong>Northline</strong><small>WORKSTATION</small></span></div>
            <div className="desktop-icons"><span><i>▧</i><small>This PC</small></span><span><i>▤</i><small>Documents</small></span><span><i>⚙</i><small>Settings</small></span></div>
            <div className="desktop-window"><div className="desktop-window-title"><span>●</span> Service Desk Assistant <button type="button" aria-label="Minimize simulated app">−</button></div>
              <div className="desktop-window-content"><span className="desktop-status-label"><i /> USER REQUEST</span><h3>{scenario.issue}</h3><div className="desktop-device-row"><span className="desktop-device-icon">▣</span><span><strong>{scenario.device}</strong><small>{scenario.department} · Windows 11</small></span><Badge tone={complete ? 'status-resolved' : 'status-in-progress'}>{complete ? 'Verified' : 'Connected'}</Badge></div><div className="desktop-sim-note"><span aria-hidden="true">i</span><span>This is a visual simulation. Use the guided troubleshooting panel to interact with the case.</span></div></div>
              <div className="desktop-taskbar"><span>⊞</span><span>⌕ Search</span><span className="taskbar-time">{formatTime(elapsed)} &nbsp; ◖</span></div>
            </div>
            <div className="desktop-footer"><span>◉ NORTHLINE.CORP</span><span>Training workstation · No live connection</span></div>
          </div>
          <div className="remote-screen-footer"><span><i className="session-live-dot" /> Simulation stream connected</span><span>Read-only desktop preview</span></div>
        </section>
        <aside className="session-side">
          <section className="session-objective content-card">
            <div className="session-card-heading"><div><span className="practice-eyebrow">YOUR NEXT STEP</span><h3>{complete ? 'Nice work, session complete' : `Objective ${stepIndex + 1} of ${scenario.steps.length}`}</h3></div><span className="score-pill">{score}<small>PTS</small></span></div>
            <div className="objective-progress" aria-label={`${stepIndex} of ${scenario.steps.length} objectives complete`}>{scenario.steps.map((_, index) => <span key={index} className={index < stepIndex ? 'objective-done' : index === stepIndex && !complete ? 'objective-current' : ''} />)}</div>
            {complete ? <div className="session-complete"><span className="complete-icon">✓</span><h3>{score >= 90 ? 'Excellent troubleshooting' : 'Session wrapped up'}</h3><p>You completed the case in {formatTime(elapsed)}. You scored {score} out of 100.</p><div className="completion-summary"><span>Objectives completed<strong>{scenario.steps.length}/{scenario.steps.length}</strong></span><span>Safe actions<strong>{activity.filter((item) => item.type === 'success').length}</strong></span><span>Time<strong>{formatTime(elapsed)}</strong></span></div><button type="button" className="button button-primary full-button" onClick={() => reset()}>Choose another scenario</button></div>
              : <><p className="objective-prompt">{step.prompt}</p><div className="action-options">{step.options.map((option) => <button key={option.label} type="button" className="action-option" onClick={() => chooseAction(option)}><span className="action-option-icon">›</span><span>{option.label}</span></button>)}</div>
                {feedback && <div className={`action-feedback feedback-${feedback.type}`} role="status"><strong>{feedback.type === 'success' ? 'Good call' : 'Think it through'}</strong><span>{feedback.text}</span></div>}</>}
          </section>
          <section className="session-user-card content-card"><div className="session-card-heading"><div><span className="practice-eyebrow">USER CONTACT</span><h3>{scenario.user}</h3></div><span className="user-avatar">{scenario.user.charAt(0)}</span></div><p className="user-quote">“{scenario.issue}”</p><div className="user-contact-meta"><span>{scenario.department}</span><span>Available · Chat</span></div></section>
          <section className="session-activity content-card"><div className="session-card-heading"><div><span className="practice-eyebrow">SESSION LOG</span><h3>Activity</h3></div><span className="activity-count">{activity.length}</span></div>{activity.length ? <ul>{activity.map((item, index) => <li key={`${item.text}-${index}`} className={`activity-${item.type}`}><span className="activity-indicator" /><span>{item.text}</span></li>)}</ul> : <p className="muted">Your troubleshooting actions will appear here.</p>}</section>
        </aside>
      </div>
      <p className="practice-disclaimer"><span aria-hidden="true">ⓘ</span> Simulated remote session — no live endpoint connection or system changes.</p>
    </>}
  </div>
}
