<script setup>
import { ref } from 'vue'
import { neon } from '../lib/neon.js'
import { validateConfirm, validateEmail, validatePassword } from '../lib/validation.js'

const email = ref('')
const code = ref('')
const password = ref('')
const confirmPassword = ref('')
const error = ref('')
const step = ref('email')
const busy = ref(false)

async function requestCode() {
  error.value = ''
  const invalid = validateEmail(email.value)
  if (invalid) { error.value = invalid; return }
  busy.value = true
  try {
    const { error: sendError } = await neon.auth.forgetPassword.emailOtp({ email: email.value.trim().toLowerCase() })
    if (sendError) throw new Error(sendError.message)
    step.value = 'code'
  } catch (err) { error.value = err.message }
  finally { busy.value = false }
}

async function resetPassword() {
  error.value = validatePassword(password.value) || validateConfirm(confirmPassword.value, password.value, 'Password') || ''
  if (error.value) return
  if (!/^\d{6}$/.test(code.value)) { error.value = 'Enter the 6-digit email code.'; return }
  busy.value = true
  try {
    const { error: resetError } = await neon.auth.emailOtp.resetPassword({
      email: email.value.trim().toLowerCase(), otp: code.value, password: password.value
    })
    if (resetError) throw new Error(resetError.message)
    step.value = 'done'
    password.value = ''
    confirmPassword.value = ''
    code.value = ''
  } catch (err) { error.value = err.message }
  finally { busy.value = false }
}
</script>

<template>
  <div class="page"><div class="wrap narrow">
    <h1>Reset password</h1>
    <div v-if="step === 'email'" class="card stack">
      <p class="dim">Enter your email address. We will send a one-time code.</p>
      <form class="stack" @submit.prevent="requestCode">
        <label class="label" for="reset-email">Email address</label>
        <input id="reset-email" v-model="email" class="input" type="email" autocomplete="email" />
        <p v-if="error" class="alert alert-error">{{ error }}</p>
        <button class="btn btn-primary btn-block" :disabled="busy">{{ busy ? 'Sending…' : 'Send code' }}</button>
      </form>
      <RouterLink to="/signin">Back to sign in</RouterLink>
    </div>
    <div v-else-if="step === 'code'" class="card stack">
      <p class="dim">Enter the code sent to {{ email }} and choose a new password.</p>
      <form class="stack" @submit.prevent="resetPassword">
        <label class="label" for="reset-code">6-digit code</label>
        <input id="reset-code" v-model="code" class="input input-mono" inputmode="numeric" maxlength="6" autocomplete="one-time-code" />
        <label class="label" for="reset-password">New password</label>
        <input id="reset-password" v-model="password" class="input" type="password" autocomplete="new-password" />
        <label class="label" for="reset-confirm">Confirm password</label>
        <input id="reset-confirm" v-model="confirmPassword" class="input" type="password" autocomplete="new-password" />
        <p v-if="error" class="alert alert-error">{{ error }}</p>
        <button class="btn btn-primary btn-block" :disabled="busy">{{ busy ? 'Updating…' : 'Reset password' }}</button>
      </form>
      <button class="btn btn-ghost" type="button" :disabled="busy" @click="requestCode">Send a new code</button>
    </div>
    <div v-else class="card stack">
      <p class="alert alert-ok">Password updated. Sign in with your new password.</p>
      <p class="dim">The master passphrase that decrypts your vault has not changed.</p>
      <RouterLink class="btn btn-primary btn-block" to="/signin">Sign in</RouterLink>
    </div>
  </div></div>
</template>
