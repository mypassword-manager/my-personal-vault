<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

const props = defineProps({
  emailMasked: { type: String, default: '' },
  initialCooldown: { type: Number, default: 60 },
  busy: { type: Boolean, default: false },
  error: { type: String, default: '' },
  verifyLabel: { type: String, default: 'Verify Code' }
})

const emit = defineEmits(['verify', 'resend', 'change-email'])

const LENGTH = 6
const digits = ref(Array(LENGTH).fill(''))
const inputs = ref([])
const cooldown = ref(props.initialCooldown)
let timer = null

const code = computed(() => digits.value.join(''))
const complete = computed(() => code.value.length === LENGTH)
const canResend = computed(() => cooldown.value <= 0 && !props.busy)

function startTimer() {
  stopTimer()
  timer = window.setInterval(() => {
    if (cooldown.value > 0) {
      cooldown.value -= 1
    } else {
      stopTimer()
    }
  }, 1000)
}

function stopTimer() {
  if (timer) {
    window.clearInterval(timer)
    timer = null
  }
}

function restartCooldown(seconds = 60) {
  cooldown.value = seconds
  startTimer()
}

function focusAt(index) {
  const target = inputs.value[index]
  if (target) target.focus()
}

function onInput(index, event) {
  const raw = event.target.value.replace(/\D/g, '')
  if (!raw) {
    digits.value[index] = ''
    return
  }
  if (raw.length > 1) {
    fillFrom(index, raw)
    return
  }
  digits.value[index] = raw
  if (index < LENGTH - 1) focusAt(index + 1)
}

function fillFrom(index, raw) {
  const chars = raw.slice(0, LENGTH - index).split('')
  chars.forEach((char, offset) => {
    digits.value[index + offset] = char
  })
  const next = Math.min(index + chars.length, LENGTH - 1)
  focusAt(next)
}

function onPaste(event) {
  const text = (event.clipboardData || window.clipboardData).getData('text') || ''
  const cleaned = text.replace(/\D/g, '')
  if (!cleaned) return
  event.preventDefault()
  digits.value = Array(LENGTH).fill('')
  fillFrom(0, cleaned)
}

function onKeydown(index, event) {
  if (event.key === 'Backspace' && !digits.value[index] && index > 0) {
    digits.value[index - 1] = ''
    focusAt(index - 1)
  }
  if (event.key === 'ArrowLeft' && index > 0) focusAt(index - 1)
  if (event.key === 'ArrowRight' && index < LENGTH - 1) focusAt(index + 1)
}

function submit() {
  if (!complete.value || props.busy) return
  emit('verify', code.value)
}

function resend() {
  if (!canResend.value) return
  emit('resend')
}

function clearCode() {
  digits.value = Array(LENGTH).fill('')
  nextTick(() => focusAt(0))
}

defineExpose({ restartCooldown, clearCode })

onMounted(() => {
  startTimer()
  nextTick(() => focusAt(0))
})

onBeforeUnmount(stopTimer)
</script>

<template>
  <form class="stack" novalidate @submit.prevent="submit">
    <p class="dim">
      Enter the 6-digit code sent to
      <strong>{{ emailMasked || 'your email address' }}</strong>. It expires in 5 minutes.
    </p>

    <div class="otp" @paste="onPaste">
      <input
        v-for="(digit, index) in digits"
        :key="index"
        ref="inputs"
        class="input otp-cell"
        type="text"
        inputmode="numeric"
        :autocomplete="index === 0 ? 'one-time-code' : 'off'"
        maxlength="1"
        :aria-label="`Digit ${index + 1}`"
        :value="digit"
        @input="onInput(index, $event)"
        @keydown="onKeydown(index, $event)"
      />
    </div>

    <p v-if="error" class="error">{{ error }}</p>

    <button class="btn btn-primary btn-block" type="submit" :disabled="!complete || busy">
      {{ busy ? 'Checking…' : verifyLabel }}
    </button>

    <div class="row-between otp-links">
      <button class="btn btn-sm btn-ghost" type="button" :disabled="!canResend" @click="resend">
        {{ cooldown > 0 ? `Resend Code (${cooldown}s)` : 'Resend Code' }}
      </button>
      <button class="btn btn-sm btn-ghost" type="button" :disabled="busy" @click="emit('change-email')">
        Change Email
      </button>
    </div>
  </form>
</template>

<style scoped>
.otp {
  display: flex;
  gap: 0.4rem;
  justify-content: space-between;
}

.otp-cell {
  flex: 1 1 0;
  min-width: 0;
  text-align: center;
  font-size: 1.35rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  padding: 0.55rem 0;
  min-height: 54px;
}

.otp-links {
  gap: 0.4rem;
}
</style>