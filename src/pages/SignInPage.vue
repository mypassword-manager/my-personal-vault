<script setup>
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import OtpForm from '../components/OtpForm.vue'
import {
  authState,
  beginPinSignIn,
  completePinSignIn,
  resendPinCode,
  signInWithEmail,
  signInWithUsernamePassword
} from '../stores/auth.js'
import { required, validateUsername } from '../lib/validation.js'

const router = useRouter()

const METHOD_EMAIL = 'email_password'
const METHOD_USERNAME = 'username_password'
const METHOD_PIN = 'username_pin'

const form = reactive({
  method: METHOD_EMAIL,
  identifier: '',
  password: '',
  pin: ''
})

const errors = reactive({})
const formError = ref('')
const busy = ref(false)
const otpError = ref('')
const step = ref('credentials')
const otpRef = ref(null)

const method = computed(() => form.method)
const isEmail = computed(() => method.value === METHOD_EMAIL)
const isPin = computed(() => method.value === METHOD_PIN)
const emailMasked = computed(() => authState.pendingPin?.emailMasked || '')

function reset() {
  Object.keys(errors).forEach((key) => delete errors[key])
  formError.value = ''
  otpError.value = ''
}

function onMethodChange() {
  reset()
  step.value = 'credentials'
  authState.pendingPin = null
}

function validate() {
  reset()
  if (isEmail.value) {
    if (!form.identifier.trim()) errors.identifier = 'Email address is required.'
  } else {
    const usernameError = validateUsername(form.identifier)
    if (usernameError) errors.identifier = usernameError
  }

  if (isPin.value) {
    if (!/^\d{6}$/.test(form.pin.trim())) errors.pin = 'PIN must be exactly 6 digits.'
  } else {
    const missing = required(form.password, 'Password')
    if (missing) errors.password = missing
  }

  return Object.keys(errors).length === 0
}

async function submit() {
  if (!validate()) return
  busy.value = true
  formError.value = ''

  try {
    if (isEmail.value) {
      await signInWithEmail(form.identifier.trim(), form.password)
      await afterSignIn()
      return
    }

    if (method.value === METHOD_USERNAME) {
      await signInWithUsernamePassword(form.identifier.trim(), form.password)
      await afterSignIn()
      return
    }

    await beginPinSignIn(form.identifier.trim(), form.pin.trim())
    step.value = 'otp'
  } catch (error) {
    formError.value = error.message
  } finally {
    busy.value = false
  }
}

async function afterSignIn() {
  const next = router.currentRoute.value.query.next
  router.push(typeof next === 'string' && next.startsWith('/') ? next : '/app')
}

async function verifyOtp(code) {
  otpError.value = ''
  busy.value = true
  try {
    await completePinSignIn(code)
    await afterSignIn()
  } catch (error) {
    otpError.value = error.message
    if (otpRef.value) otpRef.value.clearCode()
  } finally {
    busy.value = false
  }
}

async function resendOtp() {
  otpError.value = ''
  try {
    await resendPinCode()
    if (otpRef.value) otpRef.value.restartCooldown(60)
  } catch (error) {
    otpError.value = error.message
  }
}

function changeMethod() {
  step.value = 'credentials'
  authState.pendingPin = null
  otpError.value = ''
}
</script>

<template>
  <div class="page">
    <div class="wrap narrow">
      <h1>Sign in</h1>

      <div v-if="step === 'credentials'" class="card stack">
        <div class="field">
          <label class="label" for="signin-method">Select Login Method</label>
          <select id="signin-method" v-model="form.method" class="select" @change="onMethodChange">
            <option :value="METHOD_EMAIL">Sign in with Email &amp; Password</option>
            <option :value="METHOD_USERNAME">Sign in with Username &amp; Password</option>
            <option :value="METHOD_PIN">Sign in with Username &amp; PIN</option>
          </select>
        </div>

        <form class="stack" novalidate @submit.prevent="submit">
          <div class="field">
            <label class="label" for="signin-id">
              {{ isEmail ? 'Email address' : 'Username' }}
            </label>
            <input
              id="signin-id"
              v-model="form.identifier"
              class="input"
              :type="isEmail ? 'email' : 'text'"
              :inputmode="isEmail ? 'email' : 'text'"
              :autocomplete="isEmail ? 'email' : 'username'"
              autocapitalize="none"
              spellcheck="false"
            />
            <p v-if="errors.identifier" class="error">{{ errors.identifier }}</p>
          </div>

          <div v-if="isPin" class="field">
            <label class="label" for="signin-pin">6-digit PIN</label>
            <input
              id="signin-pin"
              v-model="form.pin"
              class="input input-mono"
              type="password"
              inputmode="numeric"
              maxlength="6"
              autocomplete="off"
            />
            <p class="hint">A one-time code will be emailed after your PIN is checked.</p>
            <p v-if="errors.pin" class="error">{{ errors.pin }}</p>
          </div>

          <div v-else class="field">
            <label class="label" for="signin-password">Password</label>
            <input
              id="signin-password"
              v-model="form.password"
              class="input"
              type="password"
              :autocomplete="isEmail ? 'current-password' : 'off'"
            />
            <p v-if="errors.password" class="error">{{ errors.password }}</p>
          </div>

          <p v-if="formError" class="alert alert-error">{{ formError }}</p>

          <button class="btn btn-primary btn-block" type="submit" :disabled="busy">
            {{ busy ? 'Checking…' : isPin ? 'Continue' : 'Sign In' }}
          </button>
        </form>

        <div class="row-between">
          <RouterLink to="/create-account">Create Account</RouterLink>
          <RouterLink to="/forgot-password">Forgot Password?</RouterLink>
        </div>
        <p class="faint small-note">
          Forgot your PIN?
          <RouterLink to="/reset-pin">Reset PIN</RouterLink>
        </p>
      </div>

      <div v-else class="card stack">
        <h2 class="otp-head">Check your email</h2>
        <OtpForm
          ref="otpRef"
          :email-masked="emailMasked"
          :busy="busy"
          :error="otpError"
          verify-label="Verify Code"
          @verify="verifyOtp"
          @resend="resendOtp"
          @change-email="changeMethod"
        />
        <button class="btn btn-ghost btn-sm" type="button" @click="changeMethod">
          Back to sign in
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.otp-head {
  margin-bottom: 0.25rem;
}

.small-note {
  font-size: 0.82rem;
  margin: 0;
}
</style>