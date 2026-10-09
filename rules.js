// rules.js — TicketPilot reward engine and business rules.
// Plain JavaScript. No AI, no DOM, no network: every decision here is deterministic
// and explainable, and every result carries a human-readable reason.

/* ------------------------------------------------------------------ constants */

export const STATUSES = [
  { key: 'new', label: 'New' },
  { key: 'assigned', label: 'Assigned' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'resolved', label: 'Resolved' },
  { key: 'confirmed', label: 'Customer Confirmed' },
  { key: 'closed', label: 'Closed' },
];
export const STATUS_LABEL = Object.fromEntries(STATUSES.map((s) => [s.key, s.label]));

export const PRIORITIES = ['High', 'Medium', 'Low'];
export const FAULT_LABEL = { seller: 'Seller fault', customer: 'Customer doubt', unclear: 'Unclear' };

export const CONFIDENCE_MIN = 60;   // below this: fault = Unclear, owner review, no automatic reward
export const FLAG_AT = 4;           // complaints that flag a customer for manual review
export const COUPON_DAYS = 30;      // coupon validity
export const PRIORITY_PCT = { High: 15, Medium: 10, Low: 0 }; // coupon size by priority (before owner cap)
export const HOUR = 3600 * 1000;
export const DAY = 24 * HOUR;

export const DEFAULT_TEAMS = [
  'Billing & Payments',
  'Logistics & Delivery',
  'Tech Support',
  'Quality & Returns',
  'Sales Desk',
  'Product Team',
  'Owner Review',
];
export const SAFETY_NET_TEAM = 'Owner Review'; // always present, cannot be removed

export const DEFAULT_RULES_TEXT = [
  'Any mention of hack or legal action is High',
  'Any mention of fraud or scam is High',
].join('\n');

export function defaultSettings() {
  return {
    teams: [...DEFAULT_TEAMS],
    rulesText: DEFAULT_RULES_TEXT,
    maxCouponPct: 15,       // owner's cap, never exceeded
    monthlyLimit: 1,        // coupons per customer per calendar month
    monthlyBudget: 1500,    // total estimated reward spend per month (INR)
    avgOrderValue: 800,     // used to estimate what a coupon costs (INR)
    rewardsEnabled: true,
    highSlaHours: 2,        // a High ticket still "New" after this many hours gets a warning
    aiMode: 'offline',      // 'offline' | 'ai'
    aiEndpoint: '',
  };
}

/* -------------------------------------------------------------------- privacy */

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE_RE = /\+?\d[\d\s().-]{8,}\d/g;

export function maskEmail(email) {
  const [user = '', domain = ''] = String(email).trim().split('@');
  const [host = '', ...rest] = domain.split('.');
  return `${user.slice(0, 1)}***@${host.slice(0, 1)}***${rest.length ? '.' + rest.join('.') : ''}`;
}

export function maskPhone(phone) {
  const raw = String(phone).trim();
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 7) return raw;
  return `${raw.startsWith('+') ? '+' : ''}${'•'.repeat(Math.max(digits.length - 2, 4))}${digits.slice(-2)}`;
}

/** Mask a contact field (email or phone) for display and storage. */
export function maskContact(contact) {
  const c = String(contact || '').trim();
  if (!c) return '';
  return c.includes('@') ? maskEmail(c) : maskPhone(c);
}

/** Remove emails and phone numbers from free text (UI display and before any AI call). */
export function maskText(text) {
  return String(text || '').replace(EMAIL_RE, '[email hidden]').replace(PHONE_RE, '[phone hidden]');
}

/** Stable, non-reversible-looking key so complaints can be counted without storing raw contact data. */
export function customerKey(name, contact) {
  const c = String(contact || '').trim().toLowerCase();
  let basis;
  if (c.includes('@')) basis = 'e:' + c;
  else if (c.replace(/\D/g, '').length >= 7) basis = 'p:' + c.replace(/\D/g, '').slice(-10);
  else basis = 'n:' + String(name || 'customer').trim().toLowerCase();
  let h = 5381;
  for (let i = 0; i < basis.length; i++) h = ((h << 5) + h + basis.charCodeAt(i)) >>> 0;
  return 'c' + h.toString(16);
}

/* ------------------------------------------------------------- text utilities */

/** Lower-case, strip punctuation, pad with spaces so word-boundary checks are simple. */
export function normalize(text) {
  return (
    ' ' +
    String(text || '')
      .toLowerCase()
      .replace(/['’`]/g, '')
      .replace(/[^\p{L}\p{M}\p{N}\s]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim() +
    ' '
  );
}

/**
 * Does the normalized text contain the keyword?
 * ASCII keywords match at a word start (so "refund" matches "refunds"); keywords of 4
 * characters or fewer must be a whole word ("cod" must not match "code").
 * Tamil-script keywords use plain substring matching.
 */
export function textHas(norm, keyword, { loose = false } = {}) {
  const k = String(keyword).toLowerCase().trim();
  if (!k) return false;
  if (/^[a-z0-9 ]+$/.test(k)) {
    const wholeWord = !loose && k.length <= 4;
    return norm.includes(' ' + k + (wholeWord ? ' ' : ''));
  }
  return norm.includes(k);
}

/* ---------------------------------------------------- owner plain-English rules */

const GENERIC_TAIL = /\s+(action|actions|issue|issues|problem|problems|complaint|complaints|threat|threats)$/i;

/**
 * Parse lines such as "Any mention of hack or legal action is High".
 * Returns [{ words: ['hack','legal'], priority: 'High', source: '<original line>' }].
 */
export function parseOwnerRules(text = '') {
  const rules = [];
  for (const raw of String(text).split(/\n|;/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const m = line.match(/(?:mentions?\s+of|mentioned|contains?|includes?|says?)\s+(.+?)\s+(?:is|are|=|=>|->|means|as)\s+(high|medium|low)\b/i);
    if (!m) continue;
    const words = m[1]
      .split(/\s*(?:,|\/|\bor\b|\band\b)\s*/i)
      .map((w) => w.replace(GENERIC_TAIL, '').trim().toLowerCase())
      .filter((w) => w.length > 1);
    if (words.length) {
      const p = m[2].toLowerCase();
      rules.push({ words, priority: p.charAt(0).toUpperCase() + p.slice(1), source: line });
    }
  }
  return rules;
}

const PRIORITY_RANK = { High: 3, Medium: 2, Low: 1 };

/**
 * Final safety layer applied to every analysis (offline or AI):
 *  1. owner plain-English rules can set the priority
 *  2. confidence below 60% forces fault = Unclear and sends the ticket to owner review
 */
export function finalizeAnalysis(analysis, { text = '', rulesText = '' } = {}) {
  const a = { ...analysis };
  const norm = normalize(text);

  // 1) owner rules — the highest matching priority wins
  let matched = null;
  for (const rule of parseOwnerRules(rulesText)) {
    if (rule.words.some((w) => textHas(norm, w, { loose: true }))) {
      if (!matched || PRIORITY_RANK[rule.priority] > PRIORITY_RANK[matched.priority]) matched = rule;
    }
  }
  if (matched) {
    a.priority = matched.priority;
    a.reason = `Owner rule applied: "${matched.source}".`;
    a.ownerRule = matched.source;
  }

  // 2) low-confidence handling
  a.confidence = Math.round(Number(a.confidence) || 0);
  a.lowConfidence = a.confidence < CONFIDENCE_MIN;
  a.needsOwnerReview = false;
  a.reviewReason = '';
  if (a.lowConfidence) {
    a.fault = 'unclear';
    a.fault_reason = `Confidence is ${a.confidence}% (below ${CONFIDENCE_MIN}%), so the fault check is set to Unclear and no automatic reward is allowed.`;
    a.needsOwnerReview = true;
    a.reviewReason = `Confidence ${a.confidence}% is below ${CONFIDENCE_MIN}%. The owner should read this ticket before anything else happens.`;
  } else if (a.fault === 'unclear' && a.priority === 'High') {
    a.needsOwnerReview = true;
    a.reviewReason = 'A High priority ticket with an unclear cause needs the owner to look at it.';
  }
  return a;
}

/* ------------------------------------------------------------------ time utils */

export function ageText(ts, now = Date.now()) {
  const m = Math.max(0, Math.floor((now - ts) / 60000));
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${m % 60}m`;
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h`;
}

export function fmtDate(ts) {
  return new Date(ts).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
export function fmtDateTime(ts) {
  return new Date(ts).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

/** A High ticket that has sat in "New" for too long. */
export function isSlaBreached(ticket, settings, now = Date.now()) {
  return (
    ticket.analysis.priority === 'High' &&
    ticket.status === 'new' &&
    now - ticket.createdAt > (Number(settings.highSlaHours) || 2) * HOUR
  );
}

/* ---------------------------------------------------------------- reward engine */

const sameMonth = (a, b) => {
  const x = new Date(a), y = new Date(b);
  return x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth();
};

/** How many complaints this customer has filed (a ticket not yet saved counts as one more). */
export function complaintCount(state, key, ticket = null) {
  const saved = state.tickets.filter((t) => t.customerKey === key).length;
  const unsaved = ticket && !state.tickets.some((t) => t.id === ticket.id) ? 1 : 0;
  return saved + unsaved;
}

export function couponsThisMonth(state, key, now = Date.now(), excludeTicketId = null) {
  return state.coupons.filter(
    (c) => c.customerKey === key && c.ticketId !== excludeTicketId && sameMonth(c.issuedAt, now)
  ).length;
}

export function spendThisMonth(state, now = Date.now(), excludeTicketId = null) {
  return state.coupons
    .filter((c) => c.ticketId !== excludeTicketId && sameMonth(c.issuedAt, now))
    .reduce((sum, c) => sum + (c.estCost || 0), 0);
}

export function couponStatus(coupon, now = Date.now()) {
  return now > coupon.expiresAt ? 'Expired' : 'Active';
}

export function isFlagged(state, key, ticket = null) {
  return complaintCount(state, key, ticket) >= FLAG_AT && !(state.reviewed && state.reviewed[key]);
}

/**
 * Decide where a ticket stands on the reward path. Always returns the reasons.
 * stage: 'ineligible' | 'waiting' (eligible, customer has not confirmed yet)
 *        | 'ready' (waiting for the owner) | 'issued' | 'denied'
 */
export function evaluateReward(ticket, state, now = Date.now()) {
  const s = state.settings;
  const a = ticket.analysis;
  const checks = [];
  const add = (id, label, ok, detail, gate = false) => checks.push({ id, label, ok: !!ok, detail, gate });

  const pct = Math.min(PRIORITY_PCT[a.priority] || 0, Number(s.maxCouponPct) || 0);
  const estCost = Math.round(((Number(s.avgOrderValue) || 0) * pct) / 100);
  const lowConf = a.confidence < CONFIDENCE_MIN;

  add('switch', 'Rewards are switched on', s.rewardsEnabled,
    s.rewardsEnabled ? 'The owner has rewards enabled.' : 'The owner has switched rewards off in Settings.');

  add('confidence', `Confidence is at least ${CONFIDENCE_MIN}%`, !lowConf,
    lowConf
      ? `Confidence is only ${a.confidence}%. Low-confidence tickets never earn an automatic reward.`
      : `Confidence is ${a.confidence}%.`);

  add('fault', 'Fault check found the seller at fault', a.fault === 'seller' && !lowConf,
    a.fault === 'seller' && !lowConf
      ? 'The fault check points to the seller.'
      : `Fault check says "${FAULT_LABEL[a.fault]}", so there is no confirmed seller fault to make up for.`);

  add('priority', 'Priority is Medium or High', a.priority === 'High' || a.priority === 'Medium',
    a.priority === 'Low'
      ? 'Priority is Low. Only Medium (10%) and High (15%) tickets can earn a coupon.'
      : `Priority is ${a.priority}, which earns a ${PRIORITY_PCT[a.priority]}% coupon before the owner cap.`);

  const count = complaintCount(state, ticket.customerKey, ticket);
  const flagged = isFlagged(state, ticket.customerKey, ticket);
  add('flag', `Customer has fewer than ${FLAG_AT} complaints`, !flagged,
    flagged
      ? `This customer has ${count} complaints. Rewards are blocked until the owner reviews the account.`
      : `Customer has ${count} complaint${count === 1 ? '' : 's'} on file.`);

  const used = couponsThisMonth(state, ticket.customerKey, now, ticket.id);
  const limit = Math.max(0, Number(s.monthlyLimit) || 0);
  add('limit', 'Monthly limit per customer not reached', used < limit,
    used < limit
      ? `${used} of ${limit} coupon${limit === 1 ? '' : 's'} used this month.`
      : `Monthly limit reached: ${used} of ${limit} coupon${limit === 1 ? '' : 's'} already issued this month.`);

  const spend = spendThisMonth(state, now, ticket.id);
  const budget = Math.max(0, Number(s.monthlyBudget) || 0);
  add('budget', 'Monthly reward budget has room', spend + estCost <= budget,
    spend + estCost <= budget
      ? `₹${spend} spent of ₹${budget}; this coupon adds about ₹${estCost}.`
      : `This coupon (about ₹${estCost}) would push spend past the ₹${budget} monthly budget (₹${spend} already used).`);

  add('confirmed', 'Customer confirmed the issue is resolved', ticket.status === 'confirmed',
    ticket.status === 'confirmed'
      ? 'Status is "Customer Confirmed".'
      : 'Waiting for the customer to confirm. Move the ticket to "Customer Confirmed" when they do.', true);

  const decision = ticket.rewardDecision;
  add('owner', 'Owner clicks “Approve reward”', decision && decision.state === 'approved',
    decision && decision.state === 'approved' ? 'The owner approved this reward.' : 'Nothing is released until the owner approves it.', true);

  const hard = checks.filter((c) => !c.gate && !c.ok);
  let stage;
  let reason;
  if (decision && decision.state === 'approved') {
    stage = 'issued';
    reason = `Approved on ${fmtDate(decision.ts)}: coupon ${decision.code} for ${decision.pct}% off, valid for ${COUPON_DAYS} days.`;
  } else if (decision && decision.state === 'denied') {
    stage = 'denied';
    reason = `Denied by the owner${decision.reason ? ': ' + decision.reason : '.'}`;
  } else if (hard.length) {
    stage = 'ineligible';
    reason = 'Not eligible. ' + hard.map((c) => c.detail).join(' ');
  } else if (ticket.status !== 'confirmed') {
    stage = 'waiting';
    reason = `Eligible so far for a ${pct}% coupon (about ₹${estCost}). The customer must confirm the fix, then the owner must approve.`;
  } else {
    stage = 'ready';
    reason = `All checks passed for a ${pct}% coupon (about ₹${estCost}). It is released only when the owner clicks “Approve reward”.`;
  }
  return { stage, pct, estCost, checks, reason, count, flagged };
}

/* ------------------------------------------------------------------ audit log */

export function logAudit(state, entry) {
  state.audit.unshift({
    id: `${entry.ts || Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    ts: Date.now(),
    by: 'System',
    ...entry,
  });
  if (state.audit.length > 300) state.audit.length = 300;
}

/* --------------------------------------------------------------------- actions */

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no look-alike characters

export function generateCouponCode(existing = []) {
  for (let attempt = 0; attempt < 50; attempt++) {
    let body = '';
    const bytes = new Uint8Array(6);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(bytes);
    else for (let i = 0; i < 6; i++) bytes[i] = Math.floor(Math.random() * 256);
    for (const b of bytes) body += CODE_CHARS[b % CODE_CHARS.length];
    const code = `TP-${body}`;
    if (!existing.includes(code)) return code;
  }
  return `TP-${Date.now().toString(36).toUpperCase()}`;
}

/** Owner approves a reward. Re-checks every rule at the moment of approval. */
export function approveReward(state, ticketId, now = Date.now(), by = 'Owner') {
  const t = state.tickets.find((x) => x.id === ticketId);
  if (!t) return { ok: false, reason: 'Ticket not found.' };
  const ev = evaluateReward(t, state, now);
  if (ev.stage !== 'ready') {
    logAudit(state, { ts: now, ticketId, customer: t.name, decision: 'Blocked', by,
      reason: `Approval blocked. ${ev.reason}` });
    return { ok: false, reason: ev.reason, ev };
  }
  const code = generateCouponCode(state.coupons.map((c) => c.code));
  const coupon = {
    code, ticketId, customerKey: t.customerKey, customerName: t.name,
    pct: ev.pct, estCost: ev.estCost, issuedAt: now, expiresAt: now + COUPON_DAYS * DAY,
  };
  state.coupons.push(coupon);
  t.rewardDecision = { state: 'approved', ts: now, code, pct: ev.pct, by };
  logAudit(state, { ts: now, ticketId, customer: t.name, decision: 'Approved', by,
    reason: `Seller fault confirmed, ${t.analysis.priority} priority, customer confirmed, limits OK. ${ev.pct}% coupon ${code} valid until ${fmtDate(coupon.expiresAt)}.` });
  return { ok: true, coupon, ev };
}

/** Owner declines to give a reward. */
export function denyReward(state, ticketId, reason = '', now = Date.now(), by = 'Owner') {
  const t = state.tickets.find((x) => x.id === ticketId);
  if (!t) return { ok: false, reason: 'Ticket not found.' };
  if (t.rewardDecision && t.rewardDecision.state === 'approved') return { ok: false, reason: 'A coupon was already issued.' };
  const why = String(reason || '').trim().slice(0, 200) || 'No reason given.';
  t.rewardDecision = { state: 'denied', ts: now, reason: why, by };
  logAudit(state, { ts: now, ticketId, customer: t.name, decision: 'Denied', by, reason: why });
  return { ok: true };
}

/** Owner has reviewed a flagged customer; the block is lifted. */
export function markReviewed(state, key, name = '', now = Date.now(), by = 'Owner') {
  state.reviewed = state.reviewed || {};
  state.reviewed[key] = now;
  logAudit(state, { ts: now, ticketId: '—', customer: name, decision: 'Reviewed', by,
    reason: 'Owner reviewed this customer’s history and lifted the manual-review block. Every other rule still applies.' });
}
