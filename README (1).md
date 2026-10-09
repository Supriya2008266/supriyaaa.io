# TicketPilot: Support Ticket Triage with Fault-Check Rewards

A lightweight, explainable triage tool with abuse-safe rewards for small sellers.

Paste a customer support ticket in **English, Tamil or Tanglish** (Tamil written in English letters). TicketPilot classifies it, routes it to the right team, suggests solution steps, drafts a reply in the customer's own style, and checks whether the seller was at fault. Only seller-fault issues can earn a small, capped coupon, and only after the customer confirms and the owner approves.

> **Human in the loop:** AI suggestions must be confirmed by a human, especially for refunds and other money decisions.
> **Privacy:** all data is stored only in your own browser (localStorage). There is no server and no account.

It is a pure static site (HTML, CSS and vanilla JavaScript ES modules). No build step, no Node server, no backend.

---

## Features

- **Landing page:** hero, problem, animated "How it works", feature grid, honest comparison table, "Who it is for", FAQ.
- **New Ticket:** customer name, phone/email, ticket text, and 8 sample tickets (including Tanglish ones such as *"Rendu thadava charge aaiduchu, refund venum!"* and *"COD irukka?"*).
- **Analysis card:** problem summary, priority (High/Medium/Low), reason, confidence bar, recommended team, and **fault check** (Seller fault / Customer doubt / Unclear) with a reason.
- **Suggested steps** (3 to 4, labelled "suggestions only, the team must confirm") and a **draft reply** in the same language style as the ticket. Replies never promise refunds or coupons, and AI-written replies that do are replaced by a safe template.
- **Ticket Board:** New, Assigned, In Progress, Resolved, Customer Confirmed, Closed. Drag and drop, or use the "Move to" menu (keyboard and phone friendly). Ticket age, and a warning badge when a High priority ticket waits too long in New.
- **Reward engine** (`js/rules.js`, plain JavaScript, no AI):
  - reward only if fault is *seller* **and** priority is Medium or High
  - coupon size by priority (10% Medium, 15% High), never above the owner's maximum
  - monthly limit per customer (default 1), plus a monthly reward budget
  - customers with 4 or more complaints are blocked and flagged for manual review
  - released only when status is **Customer Confirmed** **and** the owner clicks **Approve reward**
  - coupon code with 30-day expiry
  - every approval or denial shows *why*, and is written to an audit log
- **Rewards page:** awaiting approval, issued coupons, per-customer counts, flagged customers, audit log.
- **Dashboard:** tickets by priority and team, status distribution, fault-check split, reward spend vs limit (inline SVG charts, animated count-up numbers).
- **Settings:** editable team list, plain-English rules box (for example `Any mention of hack or legal action is High`), max coupon %, monthly limit, reward on/off switch, AI settings.
- **Privacy:** phone numbers and emails are masked in the UI, before storage, and before any text is sent to an AI service.
- **Low-confidence handling:** confidence below 60% forces fault to *Unclear*, sends the ticket to owner review, and blocks automatic rewards.
- **Export CSV** and **Reset demo data**. Demo data is pre-loaded so the board and dashboard look alive on first open.
- Light and dark mode (follows the system, with a manual toggle), responsive from phone to desktop, keyboard accessible, toast notifications, reduced-motion support.

## Folder structure

```
.
├── index.html                  # entry point (must stay at the repository root)
├── 404.html                    # friendly redirect back to index.html
├── .nojekyll                   # tells GitHub Pages to skip Jekyll processing
├── README.md
├── .github/
│   └── workflows/
│       └── pages.yml           # deploys to GitHub Pages on every push to main
├── css/
│   └── style.css               # design tokens, light/dark themes, all components
├── js/
│   ├── app.js                  # hash router, views, event handling
│   ├── ai.js                   # AI adapter: offline classifier + optional AI endpoint
│   ├── rules.js                # reward engine, privacy masking, owner rules (plain JS)
│   ├── store.js                # localStorage wrapper with try/catch
│   ├── sampleData.js           # sample tickets and demo data
│   ├── charts.js               # tiny inline-SVG chart helpers
│   └── util.js                 # escaping, clipboard, CSV helpers
└── assets/
    └── logo.svg                # logo (icons are inline SVG inside index.html)
```

## Run locally

JavaScript modules do not load from `file://` pages, so serve the folder with any static server:

```bash
cd ticketpilot
python -m http.server 8000
```

Then open <http://localhost:8000>. (Use `python3` if `python` is not found.)

## Publish on GitHub Pages

All local files use **relative paths** (`./css/style.css`, `./js/app.js`) and the app uses **hash routing** (`#/board`, `#/rewards`, …), so it works under `https://USERNAME.github.io/REPO-NAME/` and refreshing any page never causes a 404.

1. **Create the repository locally and commit**

   ```bash
   cd ticketpilot
   git init
   git add .
   git commit -m "Add TicketPilot"
   git branch -M main
   ```

2. **Create an empty repository on GitHub** (for example `ticketpilot`) at <https://github.com/new>. Do not add a README or license there.

3. **Push**

   ```bash
   git remote add origin https://github.com/USERNAME/ticketpilot.git
   git push -u origin main
   ```

4. **Turn on Pages** in the repository: **Settings → Pages → Build and deployment**, then choose one:
   - **Source: GitHub Actions** (recommended). The workflow in `.github/workflows/pages.yml` deploys on every push to `main`.
   - **Or** *Deploy from a branch* → branch `main`, folder `/ (root)`. If you pick this, you can delete the workflow file.

5. **Wait about a minute.** With GitHub Actions, watch the **Actions** tab for a green run.

**Final URL format**

```
https://USERNAME.github.io/REPO-NAME/
```

For example `https://priya.github.io/ticketpilot/`.

## Troubleshooting 404 errors

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| GitHub's own "There isn't a GitHub Pages site here" page | Pages is not enabled yet, or the first deployment has not finished | Settings → Pages: choose a source (see step 4). Check the Actions tab for a green run. |
| 404 for the whole site | `index.html` is not at the repository root, or you pushed the parent folder (so it sits in `ticketpilot/index.html`) | Move the files so `index.html` is at the top level of the repo, then push again. |
| Page loads but is unstyled or blank, and the browser console shows 404s | A path starting with `/` (for example `/css/style.css`) | Use relative paths such as `./css/style.css`. This project already does. |
| 404 when you refresh a page like `/board` | Path-style routing on a static host | Not an issue here. Routes are hash based (`#/board`), so the server only ever sees `index.html`. |
| Workflow fails on "Configure Pages" or "Deploy" | Pages source is not set to **GitHub Actions**, or the branch is not `main` | Settings → Pages → Source: GitHub Actions. Make sure your branch is named `main`. |
| Changes not showing | Browser cache or the deployment is still running | Hard refresh (Ctrl/Cmd + Shift + R) and check the Actions tab. |
| "The app could not start" message | You opened `index.html` by double-clicking (`file://`) | Use `python -m http.server` locally, or the GitHub Pages URL. |
| 404.html redirects to the wrong place | Using a user/custom-domain site at the root | Open `404.html` and set `PROJECT_SITE = false`. |

## AI mode and why there is no API key

TicketPilot works fully **offline** by default, using built-in keyword rules for English, Tamil and Tanglish. The classifier is deliberately simple and will sometimes be wrong. That is why low-confidence tickets go to a person.

**AI mode** is optional. In **Settings → AI settings**, choose AI mode and enter the URL of **your own** small serverless proxy. The browser sends only the **masked** ticket text (phone numbers and emails already replaced) to that URL. If the call fails, times out or returns invalid JSON, TicketPilot automatically falls back to offline mode and shows an **Offline mode** label.

### Why you must never put an API key in the browser

Everything served by GitHub Pages is public. Anyone can open DevTools or "view source" and copy a key that is pasted into JavaScript, HTML or a settings box, and then spend your money. So:

- this repository contains **no API keys**,
- the app **never asks you to paste a secret key**,
- the key lives in a serverless function (a *proxy*) that you control.

### JSON the endpoint must return

```json
{
  "problem": "Customer says they were charged twice.",
  "priority": "High",
  "reason": "Money is involved.",
  "confidence": 85,
  "team": "Billing & Payments",
  "fault": "seller",
  "fault_reason": "A duplicate charge points to a billing problem.",
  "steps": ["Check the gateway", "Raise a correction", "Reply to the customer"],
  "reply": "Hi, thanks for flagging this. Our billing team will check and update you."
}
```

`priority` is High, Medium or Low. `fault` is `seller`, `customer` or `unclear`. `confidence` is 0 to 100 (0 to 1 also works). TicketPilot validates every field and applies the same safety rules (owner rules, 60% confidence rule, no promises in replies) to AI results.

The request body sent to your endpoint looks like this:

```json
{
  "task": "ticket_triage",
  "text": "Rendu thadava charge aaiduchu, refund venum!",
  "language_hint": "tanglish",
  "teams": ["Billing & Payments", "..."],
  "owner_rules": "Any mention of hack or legal action is High",
  "return_json_with_keys": ["problem", "priority", "..."],
  "notes": "..."
}
```

### Example proxy: Cloudflare Worker (keeps the key secret)

1. Create a Worker in the Cloudflare dashboard (or with `npm create cloudflare`).
2. Store your key as a **secret**, never in the code: `npx wrangler secret put GEMINI_API_KEY`
3. Set a variable `ALLOWED_ORIGIN` to your site origin, for example `https://USERNAME.github.io`.
4. Paste the code below, deploy, and copy the Worker URL into TicketPilot's Settings.

```js
// worker.js — forwards masked ticket text to Gemini; the key never reaches the browser.
// Model names change over time, so check the provider's docs and set GEMINI_MODEL if needed.
export default {
  async fetch(request, env) {
    const cors = {
      'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (request.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: cors });

    const body = await request.json().catch(() => null);
    if (!body || typeof body.text !== 'string' || body.text.length > 2000) {
      return new Response('Bad request', { status: 400, headers: cors });
    }

    const prompt = `You triage customer support tickets for a small online seller.
Ticket (may be English, Tamil or Tanglish): """${body.text}"""
Teams you may choose from: ${(body.teams || []).join(', ')}.
Owner rules: ${body.owner_rules || 'none'}.
Return ONLY JSON with keys: problem, priority (High|Medium|Low), reason, confidence (0-100),
team, fault (seller|customer|unclear), fault_reason, steps (3-4 short strings), reply.
Write "reply" in the same language style as the ticket (Tanglish ticket => Tanglish reply).
Never promise refunds, coupons or discounts in the reply. If unsure, use fault "unclear" and a low confidence.`;

    const model = env.GEMINI_MODEL || 'gemini-2.0-flash';
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
      }),
    });
    if (!res.ok) return new Response('Upstream error', { status: 502, headers: cors });

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    return new Response(text, { headers: { ...cors, 'Content-Type': 'application/json' } });
  },
};
```

You can swap Gemini for Mistral or another provider. Only the upstream `fetch` and the way you read the answer change. Keep the same JSON shape and keep the key in a secret.

## Privacy and honesty notes

- Data (tickets, coupons, settings, audit log) is stored **only in your browser's localStorage**. Clearing site data deletes it. Raw phone numbers and emails are never stored, only masked versions.
- TicketPilot is a demo-grade tool for small teams. It does not replace a full helpdesk (no email or chat integration, no multi-agent features), and its offline classifier is rule-based.
- Reward amounts are estimates (coupon % × the average order value you set).

## Customising

- **Keywords and replies:** edit the `INTENTS` and `REPLIES` objects in `js/ai.js`.
- **Reward rules:** `js/rules.js` (`evaluateReward`, `approveReward`). All limits are settings, so you can change them without touching code.
- **Colours and fonts:** the design tokens at the top of `css/style.css`.

## License

Use and adapt freely for your own shop or project.
