import { createClient } from '@neon/neon-js'

// Public endpoint only. Never put a Postgres password or Mailtrap token in VITE_*.
const url = import.meta.env.VITE_NEON_URL ||
  'https://ep-quiet-rice-b3wqlw1w.c-4.ap-southeast-1.aws.neon.tech/vault'

export const neon = createClient(url, { auth: { allowAnonymous: true } })
export const isConfigured = Boolean(url)
