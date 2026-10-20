const checklistItems = [
  'Hide API keys',
  'Purge Git secrets',
  'Use public DB key',
  'Enable row-level security',
  'Encrypt sensitive data',
  'Enforce server-side auth',
  'Lock record access',
  'Block field tampering',
  'Secure session cookies',
  'Hash passwords',
  'Rate limit login',
  'Add bot protection',
  'Parameterize queries',
  'Validate all input',
  'Escape user content',
  'Restrict file uploads',
  'Trim API responses',
  'Add security headers',
  'Force HTTPS',
  'Scan dependencies',
]

export function LaunchChecklist() {
  const leftItems = checklistItems.slice(0, 10)
  const rightItems = checklistItems.slice(10)

  return (
    <section className="launch-checklist-page">
      <div className="launch-checklist-panel">
        <h2 className="launch-checklist-title">20 things to have Claude do<br />before launching your app<br />(in under 25 seconds)</h2>

        <div className="launch-checklist-grid" aria-label="Launch checklist">
          <ol className="launch-checklist-col">
            {leftItems.map((item, index) => (
              <li key={item} className="launch-checklist-item">
                <span className="launch-number">{index + 1}.</span>
                <span>{item}</span>
              </li>
            ))}
          </ol>

          <ol className="launch-checklist-col" start={11}>
            {rightItems.map((item, index) => (
              <li key={item} className="launch-checklist-item">
                <span className="launch-number">{index + 11}.</span>
                <span>{item}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}
