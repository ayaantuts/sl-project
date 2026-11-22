const timeFmt = new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit' });
const dateTimeFmt = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});
const dateFmt = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

const toDate = (v) => (v instanceof Date ? v : v ? new Date(v) : null);

export const formatTime = (v) => (toDate(v) ? timeFmt.format(toDate(v)) : '-');
export const formatDateTime = (v) => (toDate(v) ? dateTimeFmt.format(toDate(v)) : '-');
export const formatDate = (v) => (toDate(v) ? dateFmt.format(toDate(v)) : '-');

export const minutesSince = (v, now = Date.now()) =>
  toDate(v) ? Math.max(0, Math.floor((now - toDate(v).getTime()) / 60000)) : 0;

/** `units` lets citizen screens pass translated labels: { min: t('common.min'), h: t('common.h') } */
export function formatDuration(mins, units = { min: 'min', h: 'h' }) {
  if (mins == null || Number.isNaN(mins)) return '-';
  const m = Math.round(mins);
  if (m < 60) return `${m} ${units.min}`;
  const h = Math.floor(m / 60);
  return m % 60 ? `${h} ${units.h} ${m % 60} ${units.min}` : `${h} ${units.h}`;
}

export function formatCountdown(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export const initials = (name = '') =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');

/** Same email regex as backend/src/controllers/authController.js */
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
