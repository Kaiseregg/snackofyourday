export function tenantBase(slug = '') {
  return `/${slug}`
}

export function tenantPath(slug = '', suffix = '') {
  return `${tenantBase(slug)}${suffix}`
}
