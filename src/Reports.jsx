import { useCallback, useEffect, useState } from 'react'
import { ApiError, getReports, UNREACHABLE_MESSAGE } from './api.js'
import { StatCard } from './Layout.jsx'

function Spinner() {
  return <span className="spinner spinner-large" role="status" aria-label="Loading" />
}

function numberValue(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function parseReportDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const date = new Date(`${value}T12:00:00Z`)
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) return null
  return date
}

function formatReportDate(value) {
  const date = parseReportDate(value)
  if (!date) return '—'
  return new Intl.DateTimeFormat('en-PH', { timeZone: 'Asia/Manila', year: 'numeric', month: 'short', day: 'numeric' }).format(date)
}

function validReports(reports) {
  return reports
    .filter((report) => parseReportDate(report.report_date))
    .sort((a, b) => a.report_date.localeCompare(b.report_date))
    .slice(-7)
}

function DailyChart({ reports }) {
  const recent = validReports(reports)
  const maxValue = Math.max(1, ...recent.flatMap((report) => [numberValue(report.new_today), numberValue(report.resolved)]))
  return <>
    {recent.length ? <>
      <div className="chart" role="img" aria-label="Bar chart comparing new tickets and resolved tickets for up to the last 7 valid report dates">
        {recent.map((report) => {
          const newCount = numberValue(report.new_today)
          const resolvedCount = numberValue(report.resolved)
          return <div className="chart-column" key={report.report_date} title={`${formatReportDate(report.report_date)}: ${newCount} new, ${resolvedCount} resolved`}>
            <div className="chart-bars">
              <span className="chart-bar" style={{ height: `${Math.max(3, (newCount / maxValue) * 100)}%` }} />
              <span className="chart-bar resolved" style={{ height: `${Math.max(3, (resolvedCount / maxValue) * 100)}%` }} />
            </div>
            <span className="chart-label">{new Intl.DateTimeFormat('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric' }).format(parseReportDate(report.report_date))}</span>
          </div>
        })}
      </div>
      <div className="chart-legend"><span className="legend-item"><i className="legend-dot" />New today</span><span className="legend-item"><i className="legend-dot resolved" />Resolved</span></div>
    </> : <div className="empty-state report-chart-empty">No reports with valid dates to chart.</div>}
  </>
}

export function Reports({ token, onSessionExpired }) {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try { setReports(await getReports(token)); setError('') }
    catch (err) {
      if (err instanceof ApiError && err.code === 'UNAUTHORIZED') { onSessionExpired(); return }
      setError(err.message || UNREACHABLE_MESSAGE)
    } finally { setLoading(false) }
  }, [token, onSessionExpired])

  useEffect(() => {
    const timer = window.setTimeout(() => load(), 0)
    return () => window.clearTimeout(timer)
  }, [load])

  if (loading) return <div className="loading-state"><Spinner /><span>Loading daily reports…</span></div>
  if (error) return <div className="error-state" role="alert">{error}{(error === UNREACHABLE_MESSAGE || error.includes('timed out')) && <button className="button button-secondary retry-button" type="button" onClick={load}>Retry</button>}</div>
  const sortedReports = reports.filter((report) => parseReportDate(report.report_date)).sort((a, b) => b.report_date.localeCompare(a.report_date))
  if (reports.length === 0) return <div className="empty-state">No reports yet.</div>
  if (sortedReports.length === 0) return <div className="empty-state">No reports with valid dates.</div>

  const latest = sortedReports[0]
  const latestStats = [
    { label: 'Total tickets', value: numberValue(latest.total) },
    { label: 'New today', value: numberValue(latest.new_today) },
    { label: 'Open', value: numberValue(latest.open) },
    { label: 'In progress', value: numberValue(latest.in_progress) },
    { label: 'Resolved', value: numberValue(latest.resolved) },
    { label: 'Critical open', value: numberValue(latest.critical_open) },
    { label: 'Escalated open', value: numberValue(latest.escalated_open) },
  ]
  const tableReports = [...sortedReports]

  return <div className="report-layout">
    <section className="report-section"><div className="report-section-heading"><div><h2>Latest report</h2><p className="muted">{formatReportDate(latest.report_date)} · Top category: {latest.top_category || '—'}</p></div></div>
      <div className="report-stats">{latestStats.map((stat) => <StatCard key={stat.label} label={stat.label} value={stat.value} detail={stat.label === 'Total tickets' ? `Top category: ${latest.top_category || '—'}` : undefined} />)}</div>
    </section>
    <section className="report-section"><div className="report-section-heading"><div><h2>Ticket activity</h2><p className="muted">New requests compared with resolved tickets.</p></div></div><DailyChart reports={sortedReports} /></section>
    <section className="report-section"><div className="report-section-heading"><div><h2>Report history</h2><p className="muted">Daily operational totals, newest first.</p></div></div>
      <div className="table-wrap"><table className="report-table"><thead><tr><th>Report date</th><th>Total</th><th>New today</th><th>Open</th><th>In progress</th><th>Needs review</th><th>Resolved</th><th>Critical open</th><th>Escalated open</th><th>Top category</th></tr></thead>
        <tbody>{tableReports.map((report) => <tr key={report.report_date}><td>{formatReportDate(report.report_date)}</td><td>{numberValue(report.total)}</td><td>{numberValue(report.new_today)}</td><td>{numberValue(report.open)}</td><td>{numberValue(report.in_progress)}</td><td>{numberValue(report.needs_review)}</td><td>{numberValue(report.resolved)}</td><td>{numberValue(report.critical_open)}</td><td>{numberValue(report.escalated_open)}</td><td>{report.top_category || '—'}</td></tr>)}</tbody>
      </table></div>
    </section>
  </div>
}
