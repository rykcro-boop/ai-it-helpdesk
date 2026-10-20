const API = "/n8n/webhook";
const LIVE = { login: true, list: true, myTickets: true, ticket: true, assign: false, update: false, reports: false, users: false, userCreate: false, userUpdate: false, changePassword: false };

export const UNREACHABLE_MESSAGE = 'Cannot reach n8n. Check that n8n is running and the workflow is published.'
export const TIMEOUT_MESSAGE = 'The request timed out. Please try again.'

const MOCK_ACCOUNTS = {
  employee1: { password: 'demo1234', token: 'mock-employee-token', name: 'Alex Rivera', username: 'employee1', role: 'Employee', must_change_password: false },
  tech1: { password: 'demo1234', token: 'mock-tech-token', name: 'Sam Cruz', username: 'tech1', role: 'Technician', must_change_password: false },
  employee2: { password: 'demo1234', token: 'mock-employee2-token', name: 'Morgan Chen', username: 'employee2', role: 'Employee', must_change_password: false },
  employee3: { password: 'demo1234', token: 'mock-employee3-token', name: 'Jamie Park', username: 'employee3', role: 'Employee', must_change_password: false },
  tech2: { password: 'demo1234', token: 'mock-tech2-token', name: 'Taylor Nguyen', username: 'tech2', role: 'Technician', must_change_password: false },
}
const failedLogins = new Map()
const RESERVED_USERNAMES = new Set(['admin', 'root', 'system', 'support', 'helpdesk', 'administrator'])
const RESOLUTION_CODES = ['Fixed', 'Workaround applied', 'User error / training given', 'Hardware replaced', 'Cannot reproduce', 'Duplicate ticket', 'Not an IT issue']

function cleanText(value, max = 2000) {
  return String(value ?? '').split('').filter((character) => {
    const code = character.charCodeAt(0)
    return code > 31 && code !== 127
  }).join('').trim().slice(0, max)
}

function daysAgo(days, hours = 9) {
  const date = new Date()
  date.setDate(date.getDate() - days)
  date.setHours(hours, 15, 0, 0)
  return date.toISOString()
}

function initialEvents(at, assignedTo, status) {
  const events = [{ at, by: 'Employee', action: 'Created ticket', detail: 'Ticket submitted.' }]
  if (assignedTo) events.push({ at, by: assignedTo, action: 'Assigned ticket', detail: `Assigned to ${assignedTo}.` })
  if (status === 'Resolved' || status === 'Closed') events.push({ at, by: assignedTo || 'Technician', action: 'Resolved ticket', detail: 'Ticket resolved.' })
  if (status === 'Closed') events.push({ at, by: assignedTo || 'Technician', action: 'Closed ticket', detail: 'Ticket closed.' })
  return events
}

function seedTicket(ticket) {
  const at = ticket.updated_at || ticket.resolved_at || ticket.created_at
  return { category: 'Other', priority: 'Medium', escalation_required: false, troubleshooting_steps: null, resolution: '', resolution_code: '', closing_message: '', closed_at: '', events: initialEvents(at, ticket.assigned_to, ticket.status), ...ticket, updated_at: at }
}

let mockUsers = [
  { name: 'Alex Rivera', username: 'employee1', email: 'alex.rivera@example.com', department: 'Operations', role: 'Employee', status: 'Active', created_at: daysAgo(180) },
  { name: 'Sam Cruz', username: 'tech1', email: 'sam.cruz@example.com', department: 'IT Support', role: 'Technician', status: 'Active', created_at: daysAgo(240) },
  { name: 'Morgan Chen', username: 'employee2', email: 'morgan.chen@example.com', department: 'Finance', role: 'Employee', status: 'Active', created_at: daysAgo(120) },
  { name: 'Jamie Park', username: 'employee3', email: 'jamie.park@example.com', department: 'Marketing', role: 'Employee', status: 'Active', created_at: daysAgo(90) },
  { name: 'Taylor Nguyen', username: 'tech2', email: 'taylor.nguyen@example.com', department: 'IT Support', role: 'Technician', status: 'Active', created_at: daysAgo(150) },
]

function makeTicket(data) {
  return seedTicket(data)
}

let mockTickets = [
  makeTicket({ ticket_id: 'HD-1048', requester: 'Alex Rivera', requester_username: 'employee1', description: 'My laptop keeps disconnecting from the office Wi-Fi every few minutes, especially during video calls.', category: 'Networking', subcategory: 'Wireless', priority: 'High', summary: 'Intermittent Wi-Fi disconnections are disrupting video calls.', troubleshooting_steps: 'Forget the office Wi-Fi network and reconnect.\nRestart the wireless adapter from Network Settings.\nMove closer to an access point and test again.', status: 'In Progress', created_at: daysAgo(0, 8), assigned_to: 'Sam Cruz', assigned_at: daysAgo(0, 8), resolution: '' }),
  makeTicket({ ticket_id: 'HD-1047', requester: 'Morgan Chen', requester_username: 'employee2', description: 'I clicked a suspicious attachment and now my computer is showing a security warning.', category: 'Security', subcategory: 'Malware', priority: 'Critical', summary: 'Potential malware exposure after opening an untrusted email attachment.', troubleshooting_steps: 'Disconnect the device from Wi-Fi and wired networks.\nDo not enter passwords or open additional files.\nContact the security team immediately.', escalation_required: true, status: 'Open', created_at: daysAgo(0, 7), assigned_to: '' }),
  makeTicket({ ticket_id: 'HD-1046', requester: 'Alex Rivera', requester_username: 'employee1', description: 'I cannot access the shared finance folder. Windows says I do not have permission.', category: 'Account', subcategory: 'Permissions', priority: 'Medium', summary: 'Access denied when opening the shared finance folder.', troubleshooting_steps: 'Confirm you are signed in with your company account.\nDisconnect and reconnect the shared drive.\nAsk your manager to confirm your access group.', status: 'Open', created_at: daysAgo(1, 10), assigned_to: '' }),
  makeTicket({ ticket_id: 'HD-1045', requester: 'Jamie Park', requester_username: 'employee3', description: 'The monitor connected to my docking station is flickering and sometimes goes black.', category: 'Hardware', priority: 'High', summary: 'External monitor intermittently loses its display signal.', troubleshooting_steps: 'Reseat both ends of the display cable.\nTry a different port on the dock.\nRestart the laptop with the dock connected.', escalation_required: true, status: 'Needs Review', created_at: daysAgo(2, 13), assigned_to: 'Sam Cruz', assigned_at: daysAgo(2, 13) }),
  makeTicket({ ticket_id: 'HD-1044', requester: 'Alex Rivera', requester_username: 'employee1', description: 'The spreadsheet application closes every time I open a large workbook.', category: 'Software', priority: 'Medium', summary: 'A large workbook causes the spreadsheet app to close unexpectedly.', troubleshooting_steps: 'Install pending updates for the spreadsheet application.\nOpen the workbook in safe mode.\nCopy the workbook to a local folder and try again.', status: 'Resolved', created_at: daysAgo(3, 11), assigned_to: 'Sam Cruz', assigned_at: daysAgo(3, 12), resolution: 'Repaired the application installation and disabled a conflicting add-in.', resolved_at: daysAgo(2, 16) }),
  makeTicket({ ticket_id: 'HD-1043', requester: 'Morgan Chen', requester_username: 'employee2', description: 'My keyboard has several keys that stopped responding after a coffee spill.', category: 'Hardware', subcategory: 'Keyboard', priority: 'Low', summary: 'Several keyboard keys are unresponsive after a liquid spill.', status: 'Closed', created_at: daysAgo(45, 9), assigned_to: 'Taylor Nguyen', assigned_at: daysAgo(45, 10), resolution: 'Replaced the damaged keyboard.', resolved_at: daysAgo(44, 14), closed_at: daysAgo(43, 14) }),
  makeTicket({ ticket_id: 'HD-1042', requester: 'Jamie Park', requester_username: 'employee3', description: 'The shared printer in the west wing is showing offline on my computer.', category: 'Other', priority: 'Low', summary: 'The west-wing shared printer appears offline.', troubleshooting_steps: 'Verify the printer is powered on.\nRestart the print queue from your device.\nConfirm your device is on the office network.', status: 'Open', created_at: daysAgo(7, 14), assigned_to: '' }),
  makeTicket({ ticket_id: 'HD-1041', requester: 'Alex Rivera', requester_username: 'employee1', description: 'I need help getting my work email set up on my replacement phone.', category: 'Account', priority: 'Medium', summary: 'Work email needs to be configured on a replacement phone.', troubleshooting_steps: 'Install the company-approved mail app.\nSign in with your work email address.\nComplete multi-factor authentication when prompted.', status: 'In Progress', created_at: daysAgo(8, 10), assigned_to: 'Taylor Nguyen', assigned_at: daysAgo(8, 11) }),
]

const mockReports = Array.from({ length: 10 }, (_, index) => {
  const date = new Date()
  date.setDate(date.getDate() - index)
  return {
    report_date: date.toISOString().slice(0, 10), total: 34 - index,
    new_today: [7, 5, 9, 4, 6, 8, 3, 5, 4, 2][index], open: 8 + (index % 4),
    in_progress: 6 + (index % 3), needs_review: 2 + (index % 2),
    resolved: [6, 8, 5, 7, 4, 6, 8, 5, 4, 3][index],
    critical_open: index === 0 ? 1 : 0, escalated_open: index === 0 ? 2 : 1,
    top_category: ['Networking', 'Hardware', 'Software', 'Account'][index % 4],
  }
})

export class ApiError extends Error {
  constructor(message, status = 0, code = 'VALIDATION') {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.error = message
  }
}

function fail(message, code = 'VALIDATION', status = 400) {
  throw new ApiError(message, status, code)
}

function nextTicketVersion(ticket) {
  const previous = new Date(ticket.updated_at).getTime()
  const timestamp = Math.max(Date.now(), Number.isFinite(previous) ? previous + 1 : 0)
  return new Date(timestamp).toISOString()
}

function mockAccountFor(token) {
  const mockAccount = Object.values(MOCK_ACCOUNTS).find((account) => account.token === token)
  if (mockAccount) return mockAccount
  try {
    const session = JSON.parse(sessionStorage.getItem('ai-helpdesk-session') || 'null')
    if (session?.token === token && ['Employee', 'Technician'].includes(session.role)) {
      return { ...session, liveSession: true }
    }
  } catch {
    return undefined
  }
  return undefined
}

function assertRole(token, role) {
  const account = mockAccountFor(token)
  if (!account) fail('Session expired', 'UNAUTHORIZED', 401)
  const user = mockUsers.find((item) => item.username === account.username)
  if (!account.liveSession && (!user || user.status === 'Disabled')) fail('Account disabled. Contact a technician.', 'FORBIDDEN', 403)
  if (role && account.role !== role) fail('You do not have permission to perform this action.', 'FORBIDDEN', 403)
  return account
}

function normalizeList(data) {
  if (Array.isArray(data)) return data
  return data && typeof data === 'object' ? [data] : []
}

async function request(path, token, { method = 'GET', body, timeoutMs } = {}) {
  const controller = new AbortController()
  const timeout = timeoutMs ? window.setTimeout(() => controller.abort(), timeoutMs) : null
  try {
    const response = await fetch(`${API}/${path}`, {
      method, signal: controller.signal,
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
    const responseText = await response.text()
    let data = null
    try { data = responseText ? JSON.parse(responseText) : null } catch {
      const message = responseText.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 300)
      data = message ? { message } : null
    }
    if (response.status === 401) {
      throw new ApiError(data?.error || data?.message || 'Unauthorized', 401, 'UNAUTHORIZED')
    }
    if (!response.ok || data?.error) {
      const code = data?.code || (response.status === 403 ? 'FORBIDDEN' : response.status === 404 ? 'NOT_FOUND' : response.status === 409 ? 'CONFLICT' : 'VALIDATION')
      throw new ApiError(data?.error || data?.message || `Request failed (${response.status})`, response.status, code)
    }
    return data
  } catch (error) {
    if (error instanceof ApiError) throw error
    if (error.name === 'AbortError') throw new ApiError(TIMEOUT_MESSAGE, 0, 'TIMEOUT')
    throw new ApiError(UNREACHABLE_MESSAGE, 0, 'NETWORK')
  } finally {
    if (timeout) window.clearTimeout(timeout)
  }
}

export async function login(username, password) {
  const normalized = cleanText(username, 20).toLowerCase()
  if (!LIVE.login) {
    const attempt = failedLogins.get(normalized)
    if (attempt?.lockedUntil > Date.now()) fail('Invalid username or password', 'UNAUTHORIZED', 401)
    await new Promise((resolve) => window.setTimeout(resolve, 180))
    const latestAttempt = failedLogins.get(normalized)
    if (latestAttempt?.lockedUntil > Date.now()) fail('Invalid username or password', 'UNAUTHORIZED', 401)
    const account = MOCK_ACCOUNTS[normalized]
    const user = mockUsers.find((item) => item.username === normalized)
    if (user?.status === 'Disabled') fail('Account disabled. Contact a technician.', 'FORBIDDEN', 403)
    if (!account || !user || account.password !== password) {
      const count = (latestAttempt?.count || 0) + 1
      failedLogins.set(normalized, { count, lockedUntil: count >= 5 ? Date.now() + 60_000 : 0 })
      fail('Invalid username or password', 'UNAUTHORIZED', 401)
    }
    failedLogins.delete(normalized)
    return { token: account.token, name: account.name, username: account.username, role: account.role, must_change_password: account.must_change_password }
  }
  const data = await request('helpdesk-login', '', { method: 'POST', body: { username: normalized, password } })
  if (!data?.token || !data?.name || !data?.username || !data?.role) fail('The login response was incomplete. Please contact your administrator.')
  return data
}

export async function changePassword(token, currentPassword, newPassword) {
  if (newPassword === currentPassword) fail('Your new password must be different from the current password.')
  if (newPassword.length < 8 || !/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) fail('Use at least 8 characters, including a letter and a digit.')
  if (!LIVE.changePassword) {
    const account = assertRole(token)
    if (account.password !== currentPassword) fail('Current password is incorrect.')
    account.password = newPassword
    account.must_change_password = false
    return { success: true }
  }
  return request('helpdesk-change-password', token, { method: 'POST', body: { current_password: currentPassword, new_password: newPassword } })
}

export async function getMyTickets(token) {
  if (!LIVE.myTickets) {
    const account = assertRole(token, 'Employee')
    return normalizeList(mockTickets.filter((ticket) => ticket.requester_username === account.username))
  }
  return normalizeList(await request('helpdesk-my-tickets', token))
}

export async function createTicket(token, description, requester = '') {
  const cleanDescription = cleanText(description, 2000)
  if (cleanDescription.length < 10 || !/[A-Za-z]/.test(cleanDescription)) fail('Describe the issue in at least 10 characters using more than punctuation or digits.')
  if (!LIVE.ticket) {
    const account = assertRole(token, 'Employee')
    if (mockTickets.some((ticket) => ticket.requester_username === account.username && ticket.description === cleanDescription && Date.now() - new Date(ticket.created_at).getTime() < 60_000)) fail('An identical ticket was submitted within the last 60 seconds.')
    const current = mockTickets.filter((ticket) => ticket.requester_username === account.username && !['Resolved', 'Closed'].includes(ticket.status)).length
    if (current >= 5) fail(`You already have ${current} open tickets. Resolve or close one before creating another.`)
    await new Promise((resolve) => window.setTimeout(resolve, 450))
    if (mockTickets.some((ticket) => ticket.requester_username === account.username && ticket.description === cleanDescription && Date.now() - new Date(ticket.created_at).getTime() < 60_000)) fail('An identical ticket was submitted within the last 60 seconds.')
    const finalOpenCount = mockTickets.filter((ticket) => ticket.requester_username === account.username && !['Resolved', 'Closed'].includes(ticket.status)).length
    if (finalOpenCount >= 5) fail(`You already have ${finalOpenCount} open tickets. Resolve or close one before creating another.`)
    const now = new Date().toISOString()
    const id = `HD-${Math.max(...mockTickets.map((ticket) => Number(ticket.ticket_id.slice(3)) || 0)) + 1}`
    const created = makeTicket({
      ticket_id: id, requester: account.name, requester_username: account.username, description: cleanDescription,
      category: /wifi|network|internet|connection/i.test(cleanDescription) ? 'Networking' : 'Software',
      priority: /urgent|cannot work|security|breach|critical/i.test(cleanDescription) ? 'High' : 'Medium',
      summary: cleanDescription.replace(/\s+/g, ' ').slice(0, 125),
      troubleshooting_steps: 'Restart the affected device or application.\nCheck for pending updates and confirm the issue persists.\nContact the help desk with any error message you see.',
      status: 'Open', created_at: now, updated_at: now, assigned_to: '', resolution: '', events: [{ at: now, by: account.name, action: 'Created ticket', detail: 'Ticket submitted.' }],
    })
    mockTickets = [created, ...mockTickets]
    return created
  }
  return request('helpdesk-ticket', token, { method: 'POST', body: { requester: cleanText(requester, 100), description: cleanDescription }, timeoutMs: 180_000 })
}

export async function getAllTickets(token) {
  if (!LIVE.list) { assertRole(token, 'Technician'); return normalizeList(mockTickets) }
  return normalizeList(await request('helpdesk-list', token))
}

function findTicket(ticketId) {
  const ticket = mockTickets.find((item) => item.ticket_id === ticketId)
  if (!ticket) fail('Ticket not found', 'NOT_FOUND', 404)
  return ticket
}

function checkVersion(ticket, expectedUpdatedAt) {
  if (!expectedUpdatedAt || expectedUpdatedAt !== ticket.updated_at) fail('Conflict', 'CONFLICT', 409)
}

function requireAssignment(ticket, account) {
  if (ticket.assigned_to !== account.name) fail('Ticket must be assigned to you before you can modify it.', 'FORBIDDEN', 403)
}

function addEvent(ticket, account, action, detail, now) {
  ticket.events = [...(ticket.events || []), { at: now, by: account.name, action, detail }]
}

export async function assignTicket(token, ticketId, action, expectedUpdatedAt, options = {}) {
  if (LIVE.assign) return request('helpdesk-assign', token, { method: 'POST', body: { ticket_id: ticketId, action, expected_updated_at: expectedUpdatedAt, ...options } })
  const account = assertRole(token, 'Technician')
  const ticket = findTicket(ticketId)
  checkVersion(ticket, expectedUpdatedAt)
  if (['Resolved', 'Closed'].includes(ticket.status)) fail('Resolved or closed tickets cannot be reassigned.')
  const now = nextTicketVersion(ticket)
  if (action === 'assign_me') {
    if (ticket.assigned_to) fail(`Ticket is already assigned to ${ticket.assigned_to}.`, 'CONFLICT', 409)
    ticket.assigned_to = account.name
    ticket.assigned_at = now
    addEvent(ticket, account, 'Assigned ticket', `Assigned to ${account.name}.`, now)
  } else if (action === 'unassign') {
    requireAssignment(ticket, account)
    if (ticket.status === 'In Progress' && !options.confirm_in_progress) fail('Confirm unassigning this In Progress ticket; its status will return to Open.')
    ticket.assigned_to = ''
    ticket.assigned_at = ''
    addEvent(ticket, account, 'Unassigned ticket', 'Ticket returned to the unassigned queue.', now)
    if (ticket.status === 'In Progress') {
      ticket.status = 'Open'
      addEvent(ticket, account, 'Changed status', 'In Progress → Open on unassign.', now)
    }
  } else fail('Unknown assignment action.')
  ticket.updated_at = now
  return ticket
}

function wordCount(value) {
  return value.trim().split(/\s+/).filter(Boolean).length
}

function validResolutionNotes(notes) {
  const trimmed = cleanText(notes, 2000)
  const repeated = trimmed.length > 0 && /^(.)\1+$/.test(trimmed)
  const canned = ['The issue has been resolved. Please contact the help desk if it happens again.', 'We investigated the reported issue and applied a fix. Please confirm that everything is working as expected. This ticket will now be closed.', 'Please complete the requested steps and reply to this ticket if you need further assistance.']
  return trimmed.length >= 30 && wordCount(trimmed) >= 5 && !repeated && !canned.some((text) => trimmed.toLowerCase() === text.toLowerCase())
}

export async function updateTicket(token, ticketId, payload) {
  const body = typeof payload === 'string' ? { status: payload } : payload
  if (LIVE.update) return request('helpdesk-update', token, { method: 'POST', body: { ticket_id: ticketId, ...body } })
  const account = assertRole(token, 'Technician')
  const ticket = findTicket(ticketId)
  checkVersion(ticket, body.expected_updated_at)
  requireAssignment(ticket, account)
  const next = body.status
  const current = ticket.status
  const now = nextTicketVersion(ticket)

  if (next === 'Resolved') {
    if (!['In Progress', 'Waiting on User'].includes(current)) fail('Only In Progress or Waiting on User tickets can be resolved.')
    if (!RESOLUTION_CODES.includes(body.resolution_code)) fail('Choose a valid resolution code.')
    const notes = cleanText(body.resolution, 2000)
    if (!validResolutionNotes(notes)) fail('Resolution notes need at least 30 characters and 5 words, and cannot be a repeated character or canned closing.')
    if (body.resolution_code === 'Duplicate ticket') {
      if (!body.duplicate_of || body.duplicate_of === ticketId || !mockTickets.some((item) => item.ticket_id === body.duplicate_of)) fail('Choose an existing different ticket for Duplicate of.')
    }
    if (body.verified !== true) fail('Confirm that you verified the fix with the requester or service.')
    ticket.resolution = notes
    ticket.resolution_code = body.resolution_code
    ticket.closing_message = cleanText(body.closing_message, 1000)
    ticket.duplicate_of = body.resolution_code === 'Duplicate ticket' ? body.duplicate_of : ''
    ticket.status = 'Resolved'
    ticket.resolved_at = now
    addEvent(ticket, account, 'Resolved ticket', `${body.resolution_code}: ${notes}`, now)
  } else if (next === 'Closed') {
    if (current !== 'Resolved') fail('Only resolved tickets can be closed.')
    ticket.status = 'Closed'
    ticket.closed_at = now
    addEvent(ticket, account, 'Closed ticket', 'Ticket closed after resolution.', now)
  } else if (next === 'In Progress') {
    if (['Open', 'Needs Review'].includes(current)) {
      if (!body.expected_updated_at) fail('Ticket version is required.')
      ticket.status = 'In Progress'
      addEvent(ticket, account, 'Changed status', `${current} → In Progress.`, now)
    } else if (current === 'Waiting on User') {
      ticket.status = 'In Progress'
      addEvent(ticket, account, 'Changed status', 'Waiting on User → In Progress.', now)
    } else if (current === 'Resolved' || current === 'Closed') {
      if (current === 'Closed' && now - new Date(ticket.closed_at || ticket.updated_at).getTime() > 30 * 86400000) fail('This ticket was closed more than 30 days ago. Create a new ticket instead.')
      if (cleanText(body.reason, 2000).length < 10) fail('Enter a reopen reason of at least 10 characters.')
      ticket.status = 'In Progress'
      ticket.resolved_at = ''
      ticket.closed_at = ''
      addEvent(ticket, account, 'Reopened ticket', cleanText(body.reason, 2000), now)
    } else fail('This status transition is not allowed.')
  } else if (next === 'Waiting on User') {
    if (current !== 'In Progress') fail('Only In Progress tickets can move to Waiting on User.')
    if (cleanText(body.reason, 2000).length < 10) fail('Enter what you are waiting for in at least 10 characters.')
    ticket.status = next
    addEvent(ticket, account, 'Changed status', `Waiting on User: ${cleanText(body.reason, 2000)}`, now)
  } else if (next === 'Open') {
    if (!['In Progress', 'Needs Review'].includes(current)) fail('This status transition is not allowed.')
    ticket.status = 'Open'
    addEvent(ticket, account, 'Changed status', `${current} → Open.`, now)
  } else fail('This status transition is not allowed.')

  ticket.updated_at = now
  return ticket
}

export async function saveTicketDraft(token, ticketId, notes, expectedUpdatedAt) {
  const account = assertRole(token, 'Technician')
  const ticket = findTicket(ticketId)
  checkVersion(ticket, expectedUpdatedAt)
  requireAssignment(ticket, account)
  ticket.resolution_draft = cleanText(notes, 2000)
  ticket.updated_at = nextTicketVersion(ticket)
  return ticket
}

export async function getReports(token) {
  if (!LIVE.reports) { assertRole(token, 'Technician'); return normalizeList(mockReports) }
  return normalizeList(await request('helpdesk-reports', token))
}

export async function getUsers(token) {
  if (!LIVE.users) { assertRole(token, 'Technician'); return mockUsers.map(({ name, username, email, department, role, status, created_at }) => ({ name, username, email, department, role, status, created_at })) }
  return normalizeList(await request('helpdesk-users', token))
}

function validateUser(user) {
  const clean = {
    name: cleanText(user.name, 60), username: cleanText(user.username, 20).toLowerCase(),
    email: cleanText(user.email, 100).toLowerCase(), department: cleanText(user.department, 60),
    role: cleanText(user.role, 20), password: cleanText(user.password, 200),
  }
  if (!clean.name || !clean.username || !clean.email || !clean.department || !clean.role || !clean.password) fail('All user fields are required.')
  if (!/^[a-z0-9._-]{3,20}$/.test(clean.username)) fail('Username must be 3–20 lowercase letters, digits, dots, underscores, or dashes.')
  if (RESERVED_USERNAMES.has(clean.username)) fail('This username is reserved.')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean.email)) fail('Enter a valid email address.')
  if (!['Employee', 'Technician'].includes(clean.role)) fail('Role must be Employee or Technician.')
  if (clean.password.length < 8 || !/[A-Za-z]/.test(clean.password) || !/\d/.test(clean.password) || clean.password.toLowerCase() === clean.username) fail('Password must be at least 8 characters, include a letter and a digit, and differ from the username.')
  if (mockUsers.some((item) => item.username.toLowerCase() === clean.username)) fail('Username already exists')
  if (mockUsers.some((item) => item.email.toLowerCase() === clean.email)) fail('Email already exists')
  return clean
}

export async function createUser(token, user) {
  if (LIVE.userCreate) return request('helpdesk-user-create', token, { method: 'POST', body: user })
  assertRole(token, 'Technician')
  const clean = validateUser(user)
  const created = { name: clean.name, username: clean.username, email: clean.email, department: clean.department, role: clean.role, status: 'Active', created_at: new Date().toISOString() }
  mockUsers = [...mockUsers, created]
  MOCK_ACCOUNTS[created.username] = { password: clean.password, token: `mock-${created.username}-${Math.random().toString(36).slice(2)}`, name: created.name, username: created.username, role: created.role, must_change_password: true }
  return created
}

export async function updateUser(token, username, action, newPassword, options = {}) {
  if (LIVE.userUpdate) return request('helpdesk-user-update', token, { method: 'POST', body: { username, action, ...(newPassword ? { new_password: newPassword } : {}), ...(options.confirmed ? { confirmed: true } : {}) } })
  const currentAccount = assertRole(token, 'Technician')
  const user = mockUsers.find((item) => item.username === username)
  if (!user) fail('User not found', 'NOT_FOUND', 404)
  if ((action === 'disable' || action === 'demote') && user.username === currentAccount.username) fail('You cannot disable or demote your own account.', 'FORBIDDEN', 403)
  if (action === 'demote' && user.role === 'Technician') {
    if (mockUsers.filter((item) => item.role === 'Technician' && item.status === 'Active').length <= 1) fail('Cannot demote the last active Technician.')
    user.role = 'Employee'
  } else if (action === 'disable') {
    if (user.role === 'Technician' && user.status === 'Active' && mockUsers.filter((item) => item.role === 'Technician' && item.status === 'Active').length <= 1) fail('Cannot disable the last active Technician.')
    const owned = mockTickets.filter((ticket) => ticket.assigned_to === user.name && !['Resolved', 'Closed'].includes(ticket.status))
    if (owned.length && !options.confirmed) fail(`This technician has ${owned.length} open assigned tickets. Confirm to unassign them and return them to Open.`)
    for (const ticket of owned) {
      const now = nextTicketVersion(ticket)
      ticket.updated_at = now
      ticket.assigned_to = ''
      ticket.assigned_at = ''
      ticket.status = 'Open'
      ticket.events = [...(ticket.events || []), { at: now, by: currentAccount.name, action: 'Unassigned ticket', detail: `Unassigned because ${user.name} was disabled; returned to Open.` }]
    }
    user.status = 'Disabled'
  } else if (action === 'enable') {
    user.status = 'Active'
  } else if (action === 'reset_password') {
    if (!newPassword || newPassword.length < 8 || !/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword) || newPassword.toLowerCase() === username.toLowerCase()) fail('Password must be at least 8 characters, include a letter and a digit, and differ from the username.')
    const account = MOCK_ACCOUNTS[username]
    if (!account) fail('Account credentials are unavailable.')
    account.password = cleanText(newPassword, 200)
    account.must_change_password = true
  } else fail('Unknown user action.')
  return { success: true }
}
