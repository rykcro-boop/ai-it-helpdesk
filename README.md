# AI IT Help Desk

A fully local IT help desk that takes support tickets, classifies them with a local AI model, applies rule-based safety checks, and tracks them through to resolution. No paid APIs, no cloud AI, no hosting costs.


## What it does

- **Submit a ticket** from a React website. Describe the problem in plain language.
- **AI triage** with Gemma 4 12B (running locally through Ollama) assigns a category, a priority, a short summary, safe troubleshooting steps, and an escalation recommendation.
- **Rule-based overrides** raise the priority for known critical incidents (for example ransomware, data breach, or network down). The AI can never lower a priority set by the rules.
- **Fallback handling**: if Ollama is unavailable, the ticket is still saved with the status `Needs Review` instead of being lost.
- **Resolution tracking**: update a ticket to In Progress, Resolved, or Closed and record the fix.
- **Dashboard** with stats, filters, search, and expandable ticket details.

## Architecture

```
React website (Vite, :5173)
        |
        v
n8n webhooks (:5678)  ---->  Ollama + Gemma 4 12B (:11434)
        |
        v
n8n Data Table (helpdesk_tickets)
```

The website only talks to n8n. n8n handles validation, AI calls, business rules, and storage.

## Tech stack

| Layer | Tool |
|---|---|
| Frontend | React + Vite |
| Automation / API | n8n (self-hosted, run with npx) |
| Local AI | Ollama + Gemma 4 12B |
| Storage | n8n Data Tables |

## n8n workflow

The full workflow lives in [`n8n/helpdesk-workflow.json`](n8n/helpdesk-workflow.json). It has three flows:

1. **Adding ticket**: Webhook, HTTP Request (Ollama), Success Ticket (parse and validate AI JSON), Apply Rules (priority overrides), Insert row. The HTTP Request error path goes through Fallback Ticket into the same Insert row.
2. **Update ticket**: Webhook, Validate Update, Update row.
3. **List tickets**: Webhook, Get row(s).

### Endpoints

| Action | Method | Path | Body |
|---|---|---|---|
| Create ticket | POST | `/webhook/helpdesk-ticket` | `{ "requester": "Jerry", "description": "..." }` |
| Update ticket | POST | `/webhook/helpdesk-update` | `{ "ticket_id": "HD-...", "status": "Resolved", "resolution": "..." }` |
| List tickets | GET | `/webhook/helpdesk-list` | none |

Use `/webhook-test/...` instead while testing in the n8n editor.

### Data table: `helpdesk_tickets`

`ticket_id`, `requester`, `description`, `category`, `priority`, `summary`, `troubleshooting_steps`, `escalation_required`, `status`, `created_at`, `resolution`, `resolved_at`

## Getting started

### Prerequisites

- Node.js
- [Ollama](https://ollama.com) with the model pulled (check the exact name with `ollama list`)
- n8n running locally

### 1. Start Ollama

```powershell
ollama list
```

Make sure `gemma4:12b` (or your model name) appears. The n8n HTTP Request node uses `http://127.0.0.1:11434/api/chat`.

### 2. Start n8n

```powershell
npx n8n
```

Open `http://localhost:5678`, then:

1. Import `n8n/helpdesk-workflow.json` (**Workflow menu, Import from file**).
2. Create a Data Table named `helpdesk_tickets` with the columns listed above.
3. Check that the Insert, Update, and Get row nodes point to that table.
4. Click **Publish** so the production webhooks stay active.

### 3. Start the website

```powershell
npm install
npm run dev
```

Open `http://localhost:5173`.

The Vite dev server proxies `/n8n` to `http://localhost:5678`, so the browser never hits CORS issues. The API base path is set at the top of `src/App.jsx`:

```js
const API = "/n8n/webhook"; // use "/n8n/webhook-test" while testing in n8n
```

## Testing from PowerShell

```powershell
$ticket = @{
    requester = "Jerry"
    description = "My PC connects to Wi-Fi but cannot access websites"
} | ConvertTo-Json

Invoke-RestMethod -Method Post -Uri "http://localhost:5678/webhook/helpdesk-ticket" -ContentType "application/json" -Body $ticket
```

Try `"I think my PC has ransomware"` to see the rule engine raise the priority to Critical.

## Design decisions

- **AI suggests, rules decide.** Deterministic rules run after the model, so a real incident cannot be downplayed by the AI.
- **Validated output.** The model's JSON is parsed and checked against allowed categories and priorities before anything is saved.
- **Untrusted input.** The ticket text is treated as data, not instructions, in the system prompt.
- **Graceful failure.** An Ollama outage produces a `Needs Review` ticket, not a lost one.
- **Local first.** Everything runs on one machine for privacy and zero cost.

## Roadmap

- [ ] Daily summary report
- [ ] Authentication for the dashboard
- [ ] Deploy the frontend to Vercel and move storage to Neon (Postgres)
- [ ] Email notifications for Critical tickets

## Author

**Jerry Musico**
BS Information Technology (Networking and Systems), IETI College of Science and Technology
GitHub: [your-username](https://github.com/rykcro-boop)
