<script setup>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '../lib/supabase.js'
import { validateConfirm, validatePassword } from '../lib/validation.js'

const route = useRoute()
const router = useRouter()

const status = ref('checking')
const error = ref('')
const password = ref('')
const confirmPassword = ref('')
const busy = ref(false)

onMounted(async () => {
  const tokenHash = String(route.query.token_hash || '')
  const type = String(route.query.type || 'recovery')

  if (tokenHash) {
    const { error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type
    })
    if (verifyError) {
      status.value = 'invalid'
      error.value = verifyError.message
      return
    }
    status.value = 'ready'
    return
  }

  const { data } = await supabase.auth.getSession()
  status.value = data?.session ? 'ready' : 'invalid'
  if (!data?.session) {
    error.value = 'Open the recovery link from your email, or sign in first.'
  }
})

async function submit() {
  error.value = ''
  const passwordError = validatePassword(password.value)
  if (passwordError) {
    error.value = passwordError
    return
  }
  const confirmError = validateConfirm(confirmPassword.value, password.value, 'Password')
  if (confirmError) {
    error.value = confirmError
    return
  }

  busy.value = true
  try {
    const { error: updateError } = await supabase.auth.updateUser({ password: password.value })
    if (updateError) throw new Error(updateError.message)
    status.value = 'done'
  } catch (err) {
    error.value = err.message
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="page">
    <div class="wrap narrow">
      <h1>Update password</h1>

      <div v-if="status === 'checking'" class="card">
        <p class="dim">Checking your recovery link…</p>
      </div>

      <div v-else-if="status === 'invalid'" class="card stack">
        <p class="alert alert-error">{{ error }}</p>
        <RouterLink class="btn btn-block" to="/forgot-password">Request a new link</RouterLink>
      </div>

      <div v-else-if="status === 'done'" class="card stack">
        <p class="alert alert-ok">Password updated.</p>
        <p class="dim">
          Your vault records are untouched. Unlock them with your master passphrase as usual.
        </p>
        <RouterLink class="btn btn-primary btn-block" to="/app">Continue</RouterLink>
      </div>

      <div v-else class="card stack">
        <form class="stack" novalidate @submit.prevent="submit">
          <div class="field">
            <label class="label" for="up-password">New password</label>
            <input
              id="up-password"
              v-model="password"
              class="input"
              type="password"
              autocomplete="new-password"
            />
            <p class="hint">At least 10 characters, with a letter and a number.</p>
          </div>
          <div class="field">
            <label class="label" for="up-confirm">Confirm new password</label>
            <input
              id="up-confirm"
              v-model="confirmPassword"
              class="input"
              type="password"
              autocomplete="new-password"
            />
          </div>
          <p v-if="error" class="alert alert-error">{{ error }}</p>
          <button class="btn btn-primary btn-block" type="submit" :disabled="busy">
            {{ busy ? 'Saving…' : 'Update password' }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>