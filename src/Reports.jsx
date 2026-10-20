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
  const plotWidth = 652
  const plotBottom = 150
  const plotHeight = 118
  const pointsFor = (field) => recent.map((report, index) => {
    const x = 24 + (recent.length === 1 ? plotWidth / 2 : (index / (recent.length - 1)) * plotWidth)
    const y = plotBottom - (numberValue(report[field]) / maxValue) * plotHeight
    return { x, y }
  })
  const newPoints = pointsFor('new_today')
  const resolvedPoints = pointsFor('resolved')
  const linePath = (points) => points.map(({ x, y }, index) => `${index === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ')
  const areaPath = (points) => points.length
    ? `${linePath(points)} L ${points[points.length - 1].x} ${plotBottom} L ${points[0].x} ${plotBottom} Z`
    : ''
  const resolvedLine = linePath(resolvedPoints)
  const resolvedArea = areaPath(resolvedPoints)

  return <>
    {recent.length ? <>
      <div className="chart-frame">
        <svg className="chart" viewBox="0 0 700 180" role="img" aria-label="Animated water-style area chart comparing new tickets and resolved tickets for up to the last 7 report dates">
          <defs>
            <linearGradient id="resolved-water" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#61c89a" stopOpacity=".48" />
              <stop offset="100%" stopColor="#61c89a" stopOpacity=".06" />
            </linearGradient>
            <clipPath id="resolved-water-clip"><path d={resolvedArea} /></clipPath>
          </defs>
          {[32, 70, 108, 150].map((y) => <line key={y} x1="24" x2="676" y1={y} y2={y} className="chart-grid-line" />)}
          <path d={resolvedArea} fill="url(#resolved-water)" />
          <g clipPath="url(#resolved-water-clip)" className="chart-water-motion">
            <path d="M0 117 C65 99 130 135 195 117 S325 99 390 117 S520 135 585 117 S715 99 780 117 V180 H0 Z" />
            <path className="chart-water-ripple" d="M0 126 C65 108 130 144 195 126 S325 108 390 126 S520 144 585 126 S715 108 780 126 V180 H0 Z" />
          </g>
          <path d={linePath(newPoints)} className="chart-line chart-line-new" />
          <path d={resolvedLine} className="chart-line chart-line-resolved" />
          {newPoints.map(({ x, y }, index) => <circle key={`new-${recent[index].report_date}`} cx={x} cy={y} r="3.5" className="chart-point chart-point-new" />)}
          {resolvedPoints.map(({ x, y }, index) => <circle key={`resolved-${recent[index].report_date}`} cx={x} cy={y} r="3.5" className="chart-point chart-point-resolved" />)}
        </svg>
        <div className="chart-dates" style={{ gridTemplateColumns: `repeat(${recent.length}, minmax(0, 1fr))` }}>
          {recent.map((report) => <span className="chart-label" key={report.report_date}>{new Intl.DateTimeFormat('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric' }).format(parseReportDate(report.report_date))}</span>)}
        </div>
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
