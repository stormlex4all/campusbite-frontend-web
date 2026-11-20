const ZONE = 'America/Edmonton';

export function formatDateTime(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat('en-CA', { dateStyle: 'medium', timeStyle: 'short', timeZone: ZONE }).format(new Date(value));
}

/** "13:30" -> "1:30 p.m." */
export function formatTime(hhmm) {
  if (!hhmm) return '';
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date(2000, 0, 1, h, m);
  return new Intl.DateTimeFormat('en-CA', { hour: 'numeric', minute: '2-digit' }).format(d);
}

export const capitalize = (s) => (s ? s[0].toUpperCase() + s.slice(1) : '');

export const WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export const ACTION_LABELS = {
  'admin.vendor.provisioned': 'Vendor account created',
  'admin.user.approved': 'Account approved',
  'admin.user.suspended': 'Account suspended',
  'admin.user.reactivated': 'Account reactivated',
};

export const money = (n) => new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(n);
