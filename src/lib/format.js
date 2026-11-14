export const RECORD_TYPE_LABELS = {
  personal: 'Personal Information',
  login: 'Website & App Login'
}

export function maskValue(value, options = {}) {
  const text = String(value ?? '')
  if (!text) return ''
  const keep = options.keep ?? 2
  if (text.length <= keep) return '•'.repeat(Math.max(text.length, 4))
  return '•'.repeat(Math.min(text.length - keep, 14)) + text.slice(-keep)
}

export function maskEmail(value) {
  const text = String(value ?? '')
  const at = text.indexOf('@')
  if (at < 1) return maskValue(text, { keep: 3 })
  const local = text.slice(0, at)
  const domain = text.slice(at)
  const head = local.slice(0, 1)
  return `${head}${'•'.repeat(Math.max(local.length - 1, 2))}${domain}`
}

export function formatDate(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function formatRelativeDays(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const diff = Date.now() - date.getTime()
  const days = Math.floor(diff / 86400000)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days} days ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`
  const years = Math.floor(months / 12)
  return `${years} year${years === 1 ? '' : 's'} ago`
}

export function safeHostname(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return String(url ?? '')
  }
}

export function truncate(value, max = 60) {
  const text = String(value ?? '')
  if (text.length <= max) return text
  return `${text.slice(0, max - 1)}…`
}