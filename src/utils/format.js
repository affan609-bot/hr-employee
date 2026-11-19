export function money(value) {
  return `Rs. ${Number(value || 0).toLocaleString()}`;
}

export function dateLabel(value) {
  if (!value) return '-';
  return String(value).slice(0, 10);
}

export function titleCase(value) {
  return String(value || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}