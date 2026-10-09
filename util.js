// util.js — small, dependency-free helpers shared by the UI modules.

/** Escape text before inserting it into HTML (prevents XSS from ticket text). */
export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** Icon from the inline SVG sprite declared in index.html. */
export const ico = (name, cls = '') =>
  `<svg class="ico ${cls}" aria-hidden="true" focusable="false"><use href="#i-${name}"></use></svg>`;

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Copy text to the clipboard (works on https/localhost, with a textarea fallback). */
export async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (_) { /* fall through to the legacy method */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch (_) {
    return false;
  }
}

/** CSV cell with quote escaping and protection against spreadsheet formula injection. */
export function csvCell(value) {
  let s = String(value ?? '');
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return `"${s.replace(/"/g, '""')}"`;
}

/** Trigger a file download from a string. */
export function downloadFile(filename, content, type = 'text/csv;charset=utf-8') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
