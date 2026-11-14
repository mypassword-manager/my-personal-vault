export const USERNAME_PATTERN = /^[a-z0-9._-]{3,32}$/
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
export const PIN_PATTERN = /^\d{6}$/

export function required(value, label) {
  if (value === null || value === undefined || String(value).trim() === '') {
    return `${label} is required.`
  }
  return ''
}

export function validateFullName(value) {
  const missing = required(value, 'Full name')
  if (missing) return missing
  if (String(value).trim().length < 2) return 'Full name must be at least 2 characters.'
  if (String(value).trim().length > 120) return 'Full name must be 120 characters or fewer.'
  return ''
}

export function validateUsername(value) {
  const missing = required(value, 'Username')
  if (missing) return missing
  const normalised = String(value).trim().toLowerCase()
  if (!USERNAME_PATTERN.test(normalised)) {
    return 'Use 3 to 32 characters: a-z, 0-9, dot, dash or underscore.'
  }
  return ''
}

export function validateEmail(value) {
  const missing = required(value, 'Email address')
  if (missing) return missing
  if (!EMAIL_PATTERN.test(String(value).trim())) return 'Enter a valid email address.'
  if (String(value).trim().length > 254) return 'Email address is too long.'
  return ''
}

export function validatePassword(value) {
  const missing = required(value, 'Password')
  if (missing) return missing
  const text = String(value)
  if (text.length < 10) return 'Password must be at least 10 characters.'
  if (text.length > 200) return 'Password must be 200 characters or fewer.'
  if (!/[a-zA-Z]/.test(text) || !/\d/.test(text)) {
    return 'Password must contain at least one letter and one number.'
  }
  return ''
}

export function validateConfirm(value, original, label = 'Password') {
  const missing = required(value, `Confirm ${label.toLowerCase()}`)
  if (missing) return missing
  if (value !== original) return `${label}s do not match.`
  return ''
}

export function validatePin(value) {
  const missing = required(value, 'PIN')
  if (missing) return missing
  if (!PIN_PATTERN.test(String(value).trim())) return 'PIN must be exactly 6 digits.'
  return ''
}

export function validateOtp(value) {
  const digits = String(value ?? '').replace(/\D/g, '')
  if (digits.length !== 6) return 'Enter the 6-digit code.'
  return ''
}

export function validateMasterPassphrase(value) {
  const missing = required(value, 'Master passphrase')
  if (missing) return missing
  if (String(value).length < 12) return 'Master passphrase must be at least 12 characters.'
  return ''
}

export function validateRecord(form) {
  const errors = {}
  const title = required(form.title, 'Title')
  if (title) errors.title = title
  if (String(form.title ?? '').trim().length > 120) {
    errors.title = 'Title must be 120 characters or fewer.'
  }

  if (form.record_type === 'login') {
    if (String(form.website ?? '').trim().length > 120) {
      errors.website = 'Website or app name must be 120 characters or fewer.'
    }
    const url = String(form.url ?? '').trim()
    if (url && !/^https?:\/\/\S+$/i.test(url)) {
      errors.url = 'URL must start with http:// or https://'
    }
  }

  if (form.record_type === 'personal') {
    if (String(form.full_name ?? '').trim().length > 160) {
      errors.full_name = 'Full name must be 160 characters or fewer.'
    }
    if (String(form.national_id ?? '').trim().length > 60) {
      errors.national_id = 'National ID must be 60 characters or fewer.'
    }
    if (String(form.phone ?? '').trim().length > 40) {
      errors.phone = 'Phone number must be 40 characters or fewer.'
    }
    const email = String(form.email ?? '').trim()
    if (email && !EMAIL_PATTERN.test(email)) {
      errors.email = 'Enter a valid email address.'
    }
  }

  return errors
}

export function firstError(errors) {
  const keys = Object.keys(errors)
  return keys.length ? errors[keys[0]] : ''
}