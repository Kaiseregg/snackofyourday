export function money(value) {
  return `CHF ${Number(value || 0).toFixed(2)}`
}

export function slugify(value = '') {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function orderCode() {
  const now = new Date()
  const stamp = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`
  const rnd = Math.random().toString(36).slice(2, 7).toUpperCase()
  return `VD-${stamp}-${rnd}`
}
