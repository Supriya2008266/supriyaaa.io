// store.js — localStorage persistence. Every access is wrapped in try/catch because
// storage can be blocked (private mode, strict browser settings, quota exceeded).
// Data never leaves the browser.

const KEY = 'ticketpilot.v1';
const PREF_PREFIX = 'ticketpilot.pref.';

function safeGet(key) {
  try { return window.localStorage.getItem(key); } catch (_) { return null; }
}
function safeSet(key, value) {
  try { window.localStorage.setItem(key, value); return true; } catch (_) { return false; }
}
function safeRemove(key) {
  try { window.localStorage.removeItem(key); return true; } catch (_) { return false; }
}

/** Load the saved app state, or null when nothing valid is stored. */
export function load() {
  const raw = safeGet(KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch (_) {
    return null; // corrupted JSON -> caller re-seeds demo data
  }
}

/** Persist the state. Returns false when the browser refused (storage blocked/full). */
export function save(state) {
  try {
    return safeSet(KEY, JSON.stringify(state));
  } catch (_) {
    return false;
  }
}

/** Remove all TicketPilot data. */
export function clear() {
  return safeRemove(KEY);
}

/** Small UI preferences (theme). */
export function getPref(name) {
  return safeGet(PREF_PREFIX + name);
}
export function setPref(name, value) {
  return value == null ? safeRemove(PREF_PREFIX + name) : safeSet(PREF_PREFIX + name, String(value));
}
