# My Personal Vault

A browser-encrypted personal vault hosted on GitHub Pages. The master passphrase stays in the browser; Neon stores ciphertext, a salt and key-check data.

## Current sign-in

Email + password, email verification code and password-reset code use Neon Managed Auth. Username is recorded in the private profile but username and PIN sign-in are disabled until a dedicated Worker can enforce them securely. Do not enable those options by only changing the form labels.

## Files to paste

Paste all changed files from this package into the same paths in the GitHub repository. Delete the old `src/lib/supabase.js`, `src/lib/api.js`, `src/pages/ResetPinPage.vue`, `src/pages/UpdatePasswordPage.vue`, `worker/src/neon-webhook.js` (if you pasted the earlier draft), and the `supabase/migrations/` folder. Keep `src/styles/main.css` as it is; this migration does not create a second CSS file.

The Neon database already has the schema from `neon/migrations/0001_vault.sql`. Do not run the same migration again unless you are setting up a fresh Neon database.

## GitHub Pages build

In GitHub → Settings → Secrets and variables → Actions → Variables, set:

`VITE_NEON_URL=https://ep-quiet-rice-b3wqlw1w.c-4.ap-southeast-1.aws.neon.tech/vault`

The workflow uses this public URL. Never put a Postgres connection string, Mailtrap token or password in `VITE_` variables or the repository.

## Cloudflare Worker

Replace the source of the separate `my-personal-vault-api` Worker with the complete `worker/src/index.js`. Configure:

- `NEON_AUTH_URL` as a Worker secret: `https://ep-quiet-rice-b3wqlw1w.neonauth.c-4.ap-southeast-1.aws.neon.tech/vault/auth`
- `MAILTRAP_API_TOKEN` as a Worker secret, using a new token after rotating the one previously shared in chat.
- `MAILTRAP_FROM_EMAIL` as a Worker variable: an address on a verified Mailtrap sending domain. The checked-in setting is `hello@no-reply.rcash.my`; check that the exact sending domain is verified in Mailtrap.

In Neon Auth → Configuration → Webhooks, set URL `https://my-personal-vault-api.mute-tooth-fdb8.workers.dev/webhooks/neon-auth`, enable `send.otp` and `send.magic_link`, then save. This overrides Neon shared email delivery. Test with a new account and check Mailtrap Email Logs.

Do not paste the old DuitJom Worker here. The vault Worker only accepts signed Neon Auth webhook events and a health check; it does not expose a public send-email endpoint.

## Security

Neon Row Level Security restricts profiles, vault keys and records to the signed-in owner. The record payload is encrypted with AES-GCM before upload. Account password resets do not recover the master passphrase. Keep a secure backup of that passphrase and encrypted records. Files and media upload are not implemented in this package.
