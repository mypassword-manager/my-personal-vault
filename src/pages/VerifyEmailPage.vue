<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import OtpForm from '../components/OtpForm.vue'
import { authState, completeSignup, resendSignupCode } from '../stores/auth.js'

const router = useRouter()

const busy = ref(false)
const error = ref('')
const otpRef = ref(null)

const pending = computed(() => authState.pendingSignup)
const emailMasked = computed(() => pending.value?.emailMasked || '')

onMounted(() => {
  if (!pending.value) {
    router.replace('/create-account')
  }
})

async function verify(code) {
  error.value = ''
  busy.value = true
  try {
    await completeSignup(code)

    router.push('/unlock')
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
    await resendSignupCode()
    if (otpRef.value) otpRef.value.restartCooldown(60)
  } catch (err) {
    error.value = err.message
  }
}

function changeEmail() {
  authState.pendingSignup = null
  router.push('/create-account')
}
</script>

<template>
  <div class="page">
    <div class="wrap narrow">
      <h1>Verify your email</h1>
      <p class="dim">
        Your account exists but stays closed until the address is confirmed.
      </p>
      <div class="card">
        <OtpForm
          v-if="pending"
          ref="otpRef"
          :email-masked="emailMasked"
          :busy="busy"
          :error="error"
          verify-label="Verify Code"
          @verify="verify"
          @resend="resend"
          @change-email="changeEmail"
        />
      </div>
    </div>
  </div>
</template>
