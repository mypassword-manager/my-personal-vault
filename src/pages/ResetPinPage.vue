<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import OtpForm from '../components/OtpForm.vue'
import { api } from '../lib/api.js'
import { validateConfirm, validatePin, validateUsername } from '../lib/validation.js'

const router = useRouter()

const step = ref('username')
const username = ref('')
const challengeId = ref('')
const emailMasked = ref('')
const resetToken = ref('')
const pin = ref('')
const confirmPin = ref('')
const error = ref('')
const busy = ref(false)
const otpRef = ref(null)

const stepTitle = computed(() => {
  if (step.value === 'username') return 'Reset your PIN'
  if (step.value === 'otp') return 'Check your email'
  return 'Choose a new PIN'
})

async function start() {
  error.value = ''
  const usernameError = validateUsername(username.value)
  if (usernameError) {
    error.value = usernameError
    return
  }

  busy.value = true
  try {
    const result = await api.startPinReset({ username: username.value.trim().toLowerCase() })
    challengeId.value = result.challengeId
    emailMasked.value = result.emailMasked
    step.value = 'otp'
  } catch (err) {
    error.value = err.message
  } finally {
    busy.value = false
  }
}

async function verify(code) {
  error.value = ''
  busy.value = true
  try {
    const result = await api.verifyPinReset({ challengeId: challengeId.value, code })
    resetToken.value = result.resetToken
    step.value = 'pin'
  } catch (err) {
    error.value = err.message
    if (otpRef.value) otpRef.value.clearCode()
  } finally {
    busy.value = false
  }
}

async function resend() {
  error.value = ''
  try {
    const result = await api.startPinReset({ username: username.value.trim().toLowerCase() })
    challengeId.value = result.challengeId
    if (otpRef.value) otpRef.value.restartCooldown(60)
  } catch (err) {
    error.value = err.message
  }
}

async function complete() {
  error.value = ''
  const pinError = validatePin(pin.value)
  if (pinError) {
    error.value = pinError
    return
  }
  const confirmError = validateConfirm(confirmPin.value, pin.value, 'PIN')
  if (confirmError) {
    error.value = confirmError
    return
  }

  busy.value = true
  try {
    await api.completePinReset({ resetToken: resetToken.value, pin: pin.value })
    step.value = 'done'
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
      <h1>{{ step === 'done' ? 'PIN updated' : stepTitle }}</h1>

      <div v-if="step === 'username'" class="card stack">
        <p class="dim">
          Enter your username. We will email a code to the address on the account.
        </p>
        <form class="stack" novalidate @submit.prevent="start">
          <div class="field">
            <label class="label" for="rp-username">Username</label>
            <input
              id="rp-username"
              v-model="username"
              class="input"
              autocomplete="username"
              autocapitalize="none"
              spellcheck="false"
            />
          </div>
          <p v-if="error" class="alert alert-error">{{ error }}</p>
          <button class="btn btn-primary btn-block" type="submit" :disabled="busy">
            {{ busy ? 'Sending…' : 'Send code' }}
          </button>
        </form>
        <RouterLink to="/signin">Back to sign in</RouterLink>
      </div>

      <div v-else-if="step === 'otp'" class="card">
        <OtpForm
          ref="otpRef"
          :email-masked="emailMasked"
          :busy="busy"
          :error="error"
          verify-label="Verify Code"
          @verify="verify"
          @resend="resend"
          @change-email="step = 'username'"
        />
      </div>

      <div v-else-if="step === 'pin'" class="card stack">
        <form class="stack" novalidate @submit.prevent="complete">
          <div class="field">
            <label class="label" for="rp-pin">New 6-digit PIN</label>
            <input
              id="rp-pin"
              v-model="pin"
              class="input input-mono"
              type="password"
              inputmode="numeric"
              maxlength="6"
              autocomplete="off"
            />
          </div>
          <div class="field">
            <label class="label" for="rp-pin2">Confirm new PIN</label>
            <input
              id="rp-pin2"
              v-model="confirmPin"
              class="input input-mono"
              type="password"
              inputmode="numeric"
              maxlength="6"
              autocomplete="off"
            />
          </div>
          <p v-if="error" class="alert alert-error">{{ error }}</p>
          <button class="btn btn-primary btn-block" type="submit" :disabled="busy">
            {{ busy ? 'Saving…' : 'Save new PIN' }}
          </button>
        </form>
      </div>

      <div v-else class="card stack">
        <p class="alert alert-ok">Your PIN has been replaced. Sign in with the new one.</p>
        <button class="btn btn-primary btn-block" type="button" @click="router.push('/signin')">
          Go to sign in
        </button>
      </div>
    </div>
  </div>
</template>