const MAX_URL_LENGTH = 2048
const ALIAS_PATTERN = /^[a-zA-Z0-9_-]{3,32}$/

/** True only for absolute `http:`/`https:` URLs up to `MAX_URL_LENGTH`. */
export function isHttpUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false
  if (value.length === 0 || value.length > MAX_URL_LENGTH) return false

  try {
    const parsed = new URL(value)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

/** True for 3-32 characters of `A-Z a-z 0-9 - _`. */
export function isValidAlias(value: unknown): value is string {
  return typeof value === 'string' && ALIAS_PATTERN.test(value)
}
