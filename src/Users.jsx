import { useCallback, useEffect, useMemo, useState } from 'react'
import { ApiError, createUser, getAllTickets, getUsers, UNREACHABLE_MESSAGE, updateUser } from './api.js'
import { Badge, ConfirmDialog, Modal, Spinner } from './Layout.jsx'

const USERNAME_PATTERN = /^[a-z0-9._-]{3,20}$/
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const RESERVED_USERNAMES = new Set(['admin', 'root', 'system', 'support', 'helpdesk', 'administrator'])

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en-PH', { timeZone: 'Asia/Manila', year: 'numeric', month: 'short', day: 'numeric' }).format(date)
}

function generatePassword() {
  const groups = ['ABCDEFGHJKLMNPQRSTUVWXYZ', 'abcdefghijkmnopqrstuvwxyz', '23456789', '!@#$%&*?']
  const chars = groups.map((group) => group[Math.floor(Math.random() * group.length)])
  const all = groups.join('')
  while (chars.length < 12) chars.push(all[Math.floor(Math.random() * all.length)])
  for (let index = chars.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1))
    ;[chars[index], chars[swap]] = [chars[swap], chars[index]]
  }
  return chars.join('')
}

function validatePassword(value) {
  return value.length >= 8 && /[A-Za-z]/.test(value) && /\d/.test(value)
}

function stripControls(value) {
  return value.split('').filter((character) => {
    const code = character.charCodeAt(0)
    return code > 31 && code !== 127
  }).join('')
}

export function Users({ token, session, onSessionExpired, openCreateSignal }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState('All')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [modal, setModal] = useState('')
  const [target, setTarget] = useState(null)
  const [form, setForm] = useState({ name: '', username: '', email: '', department: '', role: 'Employee', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [success, setSuccess] = useState(null)
  const [copyError, setCopyError] = useState('')
  const [confirmation, setConfirmation] = useState(null)

  const refresh = useCallback(async (withSpinner = false) => {
    if (withSpinner) setLoading(true)
    try { setUsers(await getUsers(token)); setError('') }
    catch (err) {
      if (err instanceof ApiError && err.status === 401) { onSessionExpired(); return }
      setError(err.message || UNREACHABLE_MESSAGE)
    } finally { setLoading(false) }
  }, [token, onSessionExpired])
  useEffect(() => {
    const timer = window.setTimeout(() => refresh(true), 0)
    return () => window.clearTimeout(timer)
  }, [refresh])
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim().toLowerCase()), 250)
    return () => window.clearTimeout(timer)
  }, [search])
  useEffect(() => {
    if (!openCreateSignal) return undefined
    const timer = window.setTimeout(() => {
      setTarget(null)
      setForm({ name: '', username: '', email: '', department: '', role: 'Employee', password: '' })
      setFieldErrors({})
      setShowPassword(false)
      setModal('create')
    }, 0)
    return () => window.clearTimeout(timer)
  }, [openCreateSignal])

  const counts = useMemo(() => ({
    All: users.length,
    Employees: users.filter((user) => user.role === 'Employee').length,
    Technicians: users.filter((user) => user.role === 'Technician').length,
    Disabled: users.filter((user) => user.status === 'Disabled').length,
  }), [users])
  const shown = useMemo(() => {
    const term = debouncedSearch
    return users.filter((user) => {
      const tabMatch = tab === 'All' || tab === 'Disabled' ? tab === 'All' || user.status === 'Disabled' : user.role === tab.slice(0, -1)
      return tabMatch && (!term || [user.name, user.username, user.email].some((value) => String(value || '').toLowerCase().includes(term)))
    })
  }, [users, tab, debouncedSearch])

  function updateField(field, value) { setForm((current) => ({ ...current, [field]: value })) }

  function validate() {
    const errors = {}
    if (modal === 'create') {
      for (const field of ['name', 'username', 'email', 'department', 'role']) if (!form[field].trim()) errors[field] = 'This field is required.'
      if (form.name.length > 60) errors.name = 'Use 60 characters or fewer.'
      if (form.username && !USERNAME_PATTERN.test(form.username.trim().toLowerCase())) errors.username = 'Use 3–20 lowercase letters, digits, dots, underscores, or dashes.'
      if (form.username && RESERVED_USERNAMES.has(form.username.trim().toLowerCase())) errors.username = 'This username is reserved.'
      if (form.username && users.some((user) => user.username.toLowerCase() === form.username.trim().toLowerCase())) errors.username = 'This username is already in use.'
      if (form.email && !EMAIL_PATTERN.test(form.email.trim())) errors.email = 'Enter a valid email address.'
      if (form.email && users.some((user) => user.email.toLowerCase() === form.email.trim().toLowerCase())) errors.email = 'This email is already in use.'
      if (form.department.length > 60) errors.department = 'Use 60 characters or fewer.'
      if (!['Employee', 'Technician'].includes(form.role)) errors.role = 'Choose Employee or Technician.'
    }
    if (!form.password) errors.password = 'Temporary password is required.'
    else if (!validatePassword(form.password) || (modal === 'create' && form.password.toLowerCase() === form.username.trim().toLowerCase()) || (modal === 'reset' && form.password.toLowerCase() === target.username.toLowerCase())) errors.password = 'Use at least 8 characters, including a letter and a digit, and do not use the username.'
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function submit(event) {
    event.preventDefault()
    if (!validate()) return
    setBusy(true); setError('')
    try {
      if (modal === 'create') await createUser(token, { ...form, name: form.name.trim(), username: form.username.trim().toLowerCase(), email: form.email.trim(), department: form.department.trim(), password: form.password.trim() })
      else await updateUser(token, target.username, 'reset_password', form.password.trim())
      setSuccess({ username: modal === 'create' ? form.username : target.username, password: form.password, kind: modal })
      setForm({ name: '', username: '', email: '', department: '', role: 'Employee', password: '' })
      setModal('')
      await refresh()
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) { onSessionExpired(); return }
      if (String(err.message).toLowerCase().includes('username already exists')) setFieldErrors((current) => ({ ...current, username: 'This username is already in use.' }))
      else if (String(err.message).toLowerCase().includes('email already exists')) setFieldErrors((current) => ({ ...current, email: 'This email is already in use.' }))
      else setError(err.message || 'Unable to save this account.')
    } finally { setBusy(false) }
  }

  async function toggleStatus(user) {
    const action = user.status === 'Disabled' ? 'enable' : 'disable'
    if (action === 'disable') {
      setBusy(true)
      try {
        const tickets = user.role === 'Technician' ? await getAllTickets(token) : []
        const count = tickets.filter((ticket) => ticket.assigned_to === user.name && !['Resolved', 'Closed'].includes(ticket.status)).length
        setConfirmation({ kind: 'disable', user, count })
      } catch (err) {
        if (err instanceof ApiError && err.code === 'UNAUTHORIZED') onSessionExpired()
        else setError(err.message || 'Unable to check assigned tickets.')
      } finally {
        setBusy(false)
      }
      return
    }
    setBusy(true); setError('')
    try { await updateUser(token, user.username, action); await refresh() }
    catch (err) {
      if (err instanceof ApiError && err.status === 401) { onSessionExpired(); return }
      setError(err.message || 'Unable to update user status.')
    } finally { setBusy(false) }
  }

  function beginReset(user) {
    setConfirmation({ kind: 'reset', user })
  }

  function openReset(user) {
    setTarget(user); setForm({ name: '', username: '', email: '', department: '', role: 'Employee', password: '' })
    setFieldErrors({}); setShowPassword(false); setModal('reset')
  }

  async function confirmDisable() {
    const user = confirmation.user
    setBusy(true); setError('')
    try {
      await updateUser(token, user.username, 'disable', undefined, { confirmed: true })
      setConfirmation(null)
      await refresh()
    } catch (err) {
      if (err instanceof ApiError && err.code === 'UNAUTHORIZED') onSessionExpired()
      else setError(err.message || 'Unable to disable this user.')
    } finally { setBusy(false) }
  }

  async function copyPassword() {
    try { await navigator.clipboard.writeText(success.password); setCopyError('Copied to clipboard.') }
    catch { setCopyError('Unable to copy automatically. Select and copy the password above.') }
  }

  return <>
    <div className="section-tabs" role="tablist" aria-label="User category">
      {Object.entries(counts).map(([name, count]) => <button key={name} type="button" role="tab" aria-selected={tab === name} className={tab === name ? 'selected' : ''} onClick={() => setTab(name)}>{name}<span className="tab-count">{count}</span></button>)}
    </div>
    <div className="list-toolbar users-toolbar">
      <label className="search-field"><span aria-hidden="true">⌕</span><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, username, or email…" aria-label="Search users" /></label>
    </div>
    {success && <section className="success-panel" role="status"><div><strong>{success.kind === 'create' ? 'Account created' : 'Password reset'}</strong><p>Username: <strong>{success.username}</strong></p><label className="field-label" htmlFor="one-time-password">Temporary password</label><div className="copy-row"><input id="one-time-password" className="text-input" readOnly value={success.password} /><button type="button" className="button button-secondary" onClick={copyPassword}>Copy</button></div><p className="warning-text">This password is shown only once. The user must change it at first login.</p>{copyError && <small>{copyError}</small>}</div><button className="icon-button" type="button" aria-label="Dismiss password panel" onClick={() => { setSuccess(null); setCopyError('') }}>×</button></section>}
    {error && <p className="error-state" role="alert">{error}<button type="button" className="button button-secondary retry-button" onClick={() => refresh(true)}>Try again</button></p>}
    {loading ? <div className="state-panel"><Spinner /><span>Loading users…</span></div> : !error && shown.length === 0 ? <div className="empty-state">{users.length ? 'No users match your search.' : 'No users found.'}</div> : !error && <div className="table-card"><div className="table-scroll"><table className="data-table users-table"><thead><tr><th>Name</th><th>Username</th><th>Email</th><th>Department</th><th>Role</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead><tbody>{shown.map((user) => {
      const isSelf = user.username === session.username
      const lastTech = user.role === 'Technician' && user.status !== 'Disabled' && users.filter((item) => item.role === 'Technician' && item.status !== 'Disabled').length <= 1
      const disableBlocked = user.status !== 'Disabled' && (isSelf || lastTech)
      const disableReason = isSelf ? 'You cannot disable your own account.' : lastTech ? 'Cannot disable the last active Technician.' : ''
      return <tr key={user.username}><td><strong>{user.name}</strong></td><td>{user.username}</td><td>{user.email}</td><td>{user.department || '—'}</td><td><Badge tone={user.role === 'Technician' ? 'role-tech-badge' : 'badge-neutral'}>{user.role}</Badge></td><td><Badge tone={user.status === 'Disabled' ? 'user-disabled' : 'user-active'}>{user.status || 'Active'}</Badge></td><td>{formatDate(user.created_at)}</td><td><div className="row-actions"><button type="button" className="text-action" disabled={busy} onClick={() => beginReset(user)}>{busy ? 'Working…' : 'Reset password'}</button><button type="button" className="text-action danger-action" disabled={busy || disableBlocked} title={disableReason} onClick={() => toggleStatus(user)}>{user.status === 'Disabled' ? 'Enable' : 'Disable'}</button></div></td></tr>
    })}</tbody></table></div></div>}
    {modal && <Modal title={modal === 'create' ? 'Create user' : `Reset password — ${target.name}`} onClose={() => !busy && setModal('')}><form className="modal-form" onSubmit={submit} noValidate>
      {modal === 'create' && <><FormField label="Full name" field="name" maxLength={60} form={form} errors={fieldErrors} onChange={updateField} /><FormField label="Username" field="username" maxLength={20} form={form} errors={fieldErrors} onChange={(key, value) => updateField(key, value.toLowerCase())} /><FormField label="Email" field="email" maxLength={100} type="email" form={form} errors={fieldErrors} onChange={updateField} /><FormField label="Department" field="department" maxLength={60} form={form} errors={fieldErrors} onChange={updateField} /><div><label className="field-label" htmlFor="user-role">Role</label><select id="user-role" className="select-input" value={form.role} onChange={(event) => updateField('role', event.target.value)}><option>Employee</option><option>Technician</option></select>{fieldErrors.role && <small className="field-error">{fieldErrors.role}</small>}</div></>}
      <div><label className="field-label" htmlFor="temporary-password">Temporary password</label><div className="password-control"><input id="temporary-password" className="text-input" type={showPassword ? 'text' : 'password'} value={form.password} onChange={(event) => updateField('password', event.target.value)} autoComplete="new-password" /><button type="button" className="button button-secondary" onClick={() => updateField('password', generatePassword())}>Generate</button><button type="button" className="text-action" onClick={() => setShowPassword(!showPassword)}>{showPassword ? 'Hide' : 'Show'}</button></div>{fieldErrors.password && <small className="field-error">{fieldErrors.password}</small>}<small className="form-note">At least 8 characters with a letter and a digit. The user must change this password at first login.</small></div>
      <div className="modal-actions"><button type="button" className="button button-secondary" disabled={busy} onClick={() => setModal('')}>Cancel</button><button type="submit" className="button button-primary" disabled={busy}>{busy && <Spinner label="Saving" />}{busy ? 'Saving…' : modal === 'create' ? 'Create user' : 'Reset password'}</button></div>
    </form></Modal>}
    {confirmation?.kind === 'reset' && <ConfirmDialog title="Reset user password?" confirmLabel="Continue" onCancel={() => setConfirmation(null)} onConfirm={() => { const user = confirmation.user; setConfirmation(null); openReset(user) }}><p>Reset the password for <strong>{confirmation.user.name}</strong>? A new temporary password will be shown once, and the user must change it at next login.</p></ConfirmDialog>}
    {confirmation?.kind === 'disable' && <ConfirmDialog title="Disable user?" confirmLabel="Disable user" danger busy={busy} onCancel={() => !busy && setConfirmation(null)} onConfirm={confirmDisable}><p>Disable <strong>{confirmation.user.name}</strong> ({confirmation.user.username})?</p>{confirmation.count > 0 && <p className="warning-text">This technician has {confirmation.count} open assigned ticket{confirmation.count === 1 ? '' : 's'}. They will be unassigned and returned to Open.</p>}{confirmation.user.role === 'Technician' && users.filter((item) => item.role === 'Technician' && item.status !== 'Disabled').length <= 1 && <p className="field-error">Cannot disable the last active Technician.</p>}</ConfirmDialog>}
  </>
}

function FormField({ label, field, form, errors, onChange, type = 'text', maxLength }) {
  return <div><label className="field-label" htmlFor={`user-${field}`}>{label}</label><input id={`user-${field}`} className="text-input" maxLength={maxLength} type={type} value={form[field]} onChange={(event) => onChange(field, stripControls(event.target.value))} autoComplete="off" />{errors[field] && <small className="field-error">{errors[field]}</small>}</div>
}
