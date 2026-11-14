# My Personal Vault

A client-side encrypted vault for personal details and website logins.

- Vue 3 + Vite single page app on GitHub Pages
- Supabase Auth and Postgres for accounts and ciphertext
- Cloudflare Worker for username resolution, PIN verification and Mailjet email
- AES-256-GCM encryption with PBKDF2-SHA256 key derivation in the browser

## Build inputs

The workflow reads these repository variables (Settings → Secrets and variables → Actions →
Variables):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_WORKER_URL`

The Pages base path is derived from the repository name automatically.

## Worker secrets

Set with `wrangler secret put`:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `MAILJET_API_KEY`
- `MAILJET_SECRET_KEY`
- `OTP_PEPPER`

## Security model

Account credentials are handled by Supabase. The vault master passphrase never leaves the
browser; only the salt, iteration count and a key-check ciphertext are stored. Losing the
passphrase means losing the records.