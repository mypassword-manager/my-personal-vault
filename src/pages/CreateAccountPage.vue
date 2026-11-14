<script setup>
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../lib/api.js'
import { authState } from '../stores/auth.js'
import {
  validateConfirm,
  validateEmail,
  validateFullName,
  validatePassword,
  validatePin,
  validateUsername
} from '../lib/validation.js'

const router = useRouter()

const METHOD_EMAIL = 'email_password'
const METHOD_USERNAME = 'username_password'
const METHOD_PIN = 'username_pin'

const form = reactive({
  method: METHOD_EMAIL,
  fullName: '',
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
  pin: '',
  confirmPin: ''
})

const errors = reactive({})
const formError = ref('')
const busy = ref(false)

const isEmail = computed(() => form.method === METHOD_EMAIL)
const isPin = computed(() => form.method === METHOD_PIN)

function clearErrors() {
  Object.keys(errors).forEach((key) => delete errors[key])
  formError.value = ''
}

function validate() {
  clearErrors()
  const fullNameError = validateFullName(form.fullName)
  if (fullNameError) errors.fullName = fullNameError

  const usernameError = validateUsername(form.username)
  if (usernameError) errors.username = usernameError

  const emailError = validateEmail(form.email)
  if (emailError) errors.email = emailError

  if (isPin.value) {
    const pinError = validatePin(form.pin)
    if (pinError) errors.pin = pinError
    const confirmPinError = validateConfirm(form.confirmPin, form.pin, 'PIN')
    if (confirmPinError) errors.confirmPin = confirmPinError
  } else {
    const passwordError = validatePassword(form.password)
    if (passwordError) errors.password = passwordError
    const confirmError = validateConfirm(form.confirmPassword, form.password, 'Password')
    if (confirmError) errors.confirmPassword = confirmError
  }

  return Object.keys(errors).length === 0
}

async function submit() {
  if (!validate()) return
  busy.value = true
  formError.value = ''

  const base = {
    fullName: form.fullName.trim(),
    username: form.username.trim().toLowerCase(),
    email: form.email.trim().toLowerCase()
  }

  try {
    let result

    if (isEmail.value) {
      result = await api.signupEmailPassword({ ...base, password: form.password })
    } else if (form.method === METHOD_USERNAME) {
      result = await api.signupUsernamePassword({ ...base, password: form.password })
    } else {
      result = await api.signupUsernamePin({ ...base, pin: form.pin })
    }

    authState.pendingSignup = {
      challengeId: result.challengeId,
      emailMasked: result.emailMasked,
      username: base.username,
      method: form.method
    }

    router.push('/verify-email')
  } catch (error) {
    formError.value = error.message
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="page">
    <div class="wrap narrow">
      <h1>Create account</h1>
      <p class="dim">
        Every account needs an email address. You will verify it before the vault opens.
      </p>

      <div class="card stack">
        <div class="field">
          <label class="label" for="signup-method">Select Sign-up Method</label>
          <select id="signup-method" v-model="form.method" class="select" @change="clearErrors">
            <option :value="METHOD_EMAIL">Sign up with Email &amp; Password</option>
            <option :value="METHOD_USERNAME">Sign up with Username &amp; Password</option>
            <option :value="METHOD_PIN">Sign up with Username &amp; PIN</option>
          </select>
        </div>

        <form class="stack" novalidate @submit.prevent="submit">
          <div class="field">
            <label class="label" for="su-name">Full name</label>
            <input id="su-name" v-model="form.fullName" class="input" autocomplete="name" maxlength="120" />
            <p v-if="errors.fullName" class="error">{{ errors.fullName }}</p>
          </div>

          <div class="field">
            <label class="label" for="su-username">Username</label>
            <input
              id="su-username"
              v-model="form.username"
              class="input"
              autocomplete="username"
              autocapitalize="none"
              spellcheck="false"
              maxlength="32"
            />
            <p class="hint">3–32 characters. Letters are compared case-insensitively.</p>
            <p v-if="errors.username" class="error">{{ errors.username }}</p>
          </div>

          <div class="field">
            <label class="label" for="su-email">Email address</label>
            <input
              id="su-email"
              v-model="form.email"
              class="input"
              type="email"
              inputmode="email"
              autocomplete="email"
              autocapitalize="none"
            />
            <p v-if="errors.email" class="error">{{ errors.email }}</p>
          </div>

          <template v-if="isPin">
            <div class="field">
              <label class="label" for="su-pin">6-digit PIN</label>
              <input
                id="su-pin"
                v-model="form.pin"
                class="input input-mono"
                type="password"
                inputmode="numeric"
                maxlength="6"
                autocomplete="off"
              />
              <p v-if="errors.pin" class="error">{{ errors.pin }}</p>
            </div>
            <div class="field">
              <label class="label" for="su-pin2">Confirm PIN</label>
              <input
                id="su-pin2"
                v-model="form.confirmPin"
                class="input input-mono"
                type="password"
                inputmode="numeric"
                maxlength="6"
                autocomplete="off"
              />
              <p v-if="errors.confirmPin" class="error">{{ errors.confirmPin }}</p>
            </div>
          </template>

          <template v-else>
            <div class="field">
              <label class="label" for="su-password">Password</label>
              <input
                id="su-password"
                v-model="form.password"
                class="input"
                type="password"
                autocomplete="new-password"
              />
              <p class="hint">At least 10 characters, with a letter and a number.</p>
              <p v-if="errors.password" class="error">{{ errors.password }}</p>
            </div>
            <div class="field">
              <label class="label" for="su-password2">Confirm password</label>
              <input
                id="su-password2"
                v-model="form.confirmPassword"
                class="input"
                type="password"
                autocomplete="new-password"
              />
              <p v-if="errors.confirmPassword" class="error">{{ errors.confirmPassword }}</p>
            </div>
          </template>

          <p v-if="formError" class="alert alert-error">{{ formError }}</p>

          <button class="btn btn-primary btn-block" type="submit" :disabled="busy">
            {{ busy ? 'Creating account…' : 'Create Account' }}
          </button>
        </form>

        <div class="row-between">
          <RouterLink to="/signin">Already have an account? Sign in</RouterLink>
        </div>
      </div>

      <div class="card card-tight notice">
        <p class="dim small">
          A master passphrase is set after verification. It is separate from your password or PIN and
          is the only thing that decrypts your vault.
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.notice {
  margin-top: 1rem;
}

.small {
  margin: 0;
  font-size: 0.85rem;
}
</style>