/**
 * Client-side validation (Feature 12).
 * These mirror the server rules to give instant, plain-language feedback, but they are only a
 * convenience: the server always validates again and its messages are shown too.
 * Every rule returns an error message, or '' when the value is fine.
 */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export const required = (label) => (v) => (String(v ?? '').trim() ? '' : `${label} is required`);
export const minLength = (label, n) => (v) => (String(v ?? '').trim().length >= n ? '' : `${label} must be at least ${n} characters`);
export const maxLength = (label, n) => (v) => (String(v ?? '').trim().length <= n ? '' : `${label} must be ${n} characters or fewer`);
export const email = (v) => (EMAIL.test(String(v ?? '').trim()) ? '' : 'Enter a valid email address, like name@school.ca');

export const password = (v) => {
  const s = String(v ?? '');
  if (s.length < 8) return 'Password must be at least 8 characters';
  if (s.length > 72) return 'Password must be 72 characters or fewer';
  if (!/[A-Za-z]/.test(s) || !/\d/.test(s)) return 'Password must include at least one letter and one number';
  return '';
};

export const price = (label = 'Price') => (v) => {
  const s = String(v ?? '').trim();
  if (!s) return `${label} is required`;
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return `${label} must be a number like 4.50`;
  const n = Number(s);
  if (n <= 0) return `${label} must be more than $0`;
  if (n > 1000) return `${label} must be $1,000 or less`;
  return '';
};
export const wholeNumber = (label, min, max) => (v) => {
  const s = String(v ?? '').trim();
  if (!s) return `${label} is required`;
  if (!/^\d+$/.test(s)) return `${label} must be a whole number`;
  const n = Number(s);
  return n < min || n > max ? `${label} must be between ${min} and ${max}` : '';
};

export const time = (v) => (!v || TIME.test(v) ? '' : 'Use a time like 08:30');

/** Run rules in order; the first message wins. */
export const check = (...rules) => (value, all) => {
  for (const rule of rules) {
    const message = rule(value, all);
    if (message) return message;
  }
  return '';
};

/** Apply a { field: rule } map to values. Returns { field: message } for failing fields only. */
export function validateAll(rulesByField, values) {
  const errors = {};
  for (const [field, rule] of Object.entries(rulesByField)) {
    const message = rule(values[field], values);
    if (message) errors[field] = message;
  }
  return errors;
}

export const rules = {
  name: check(required('Name'), minLength('Name', 2), maxLength('Name', 80)),
  email: check(required('Email'), email),
  newPassword: check(required('Password'), password),
  loginPassword: required('Password'),
  storeName: check(required('Store name'), minLength('Store name', 2), maxLength('Store name', 80)),
  building: check(required('Building'), maxLength('Building', 80)),
  description: maxLength('Description', 500),
  counterLocation: maxLength('Counter location', 120),
  pickupInstructions: maxLength('Pickup instructions', 300),
  itemName: check(required('Item name'), minLength('Item name', 2), maxLength('Item name', 80)),
  itemDescription: maxLength('Description', 500),
  itemPrice: price('Price'),
  quantity: wholeNumber('Number of portions', 1, 200),
  imageAlt: maxLength('Photo description', 140),
  reason: check(required('Reason'), minLength('Reason', 3), maxLength('Reason', 300)),
};
