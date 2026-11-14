<script setup>
import { ref } from 'vue'
import { api } from '../lib/api.js'
import { validateEmail } from '../lib/validation.js'

const email = ref('')
const error = ref('')
const sent = ref(false)
const busy = ref(false)

async function submit() {
  error.value = ''
  const emailError = validateEmail(email.value)
  if (emailError) {
    error.value = emailError
    return
  }

  busy.value = true
  try {
    await api.startPasswordReset({ email: email.value.trim().toLowerCase() })
    sent.value = true
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
      <h1>Forgot password?</h1>

      <div v-if="!sent" class="card stack">
        <p class="dim">
          Enter your email address and we will send a recovery link that lets you set a new password.
        </p>
        <form class="stack" novalidate @submit.prevent="submit">
          <div class="field">
            <label class="label" for="fp-email">Email address</label>
            <input
              id="fp-email"
              v-model="email"
              class="input"
              type="email"
              inputmode="email"
              autocomplete="email"
              autocapitalize="none"
            />
            <p v-if="error" class="error">{{ error }}</p>
          </div>
          <button class="btn btn-primary btn-block" type="submit" :disabled="busy">
            {{ busy ? 'Sending…' : 'Send recovery link' }}
          </button>
        </form>
        <RouterLink to="/signin">Back to sign in</RouterLink>
      </div>

      <div v-else class="card stack">
        <p class="alert alert-ok">
          If that address belongs to an account, a recovery link is on its way. It expires shortly.
        </p>
        <p class="dim">
          Recovery restores your account. It does <strong>not</strong> recover your vault master
          passphrase — the encrypted records still need the passphrase you set.
        </p>
        <RouterLink class="btn btn-block" to="/signin">Back to sign in</RouterLink>
      </div>

      <p class="faint small">
        Use a PIN account? <RouterLink to="/reset-pin">Reset your PIN instead</RouterLink>.
      </p>
    </div>
  </div>
</template>

<style scoped>
.small {
  font-size: 0.82rem;
  margin-top: 1rem;
}
</style>