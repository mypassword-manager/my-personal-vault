<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { authState, signOut } from '../stores/auth.js'
import { createVault, refreshStatus, unlock } from '../stores/vault.js'
import { validateConfirm, validateMasterPassphrase } from '../lib/validation.js'
import { toast } from '../stores/toast.js'

const router = useRouter()

const status = ref('loading')
const busy = ref(false)
const passphrase = ref('')
const confirmPassphrase = ref('')
const errors = reactive({})
const formError = ref('')

const isNew = computed(() => status.value === 'new')
const heading = computed(() => (isNew.value ? 'Create your master passphrase' : 'Unlock your vault'))

onMounted(async () => {
  const current = await refreshStatus()
  status.value = current === 'unlocked' ? 'unlocked' : current
  if (current === 'unlocked') {
    router.replace('/app')
  }
})

async function submit() {
  Object.keys(errors).forEach((key) => delete errors[key])
  formError.value = ''

  const passphraseError = validateMasterPassphrase(passphrase.value)
  if (passphraseError) errors.passphrase = passphraseError

  if (isNew.value) {
    const confirmError = validateConfirm(confirmPassphrase.value, passphrase.value, 'Passphrase')
    if (confirmError) errors.confirmPassphrase = confirmError
  }

  if (Object.keys(errors).length) return

  busy.value = true
  try {
    if (isNew.value) {
      await createVault(passphrase.value)
      toast.ok('Vault created.')
      router.replace('/app')
      return
    }

    const ok = await unlock(passphrase.value)
    if (ok) {
      router.replace('/app')
    }
  } catch (error) {
    formError.value = error.message
  } finally {
    busy.value = false
  }
}

async function doSignOut() {
  await signOut()
  router.push('/')
}
</script>

<template>
  <div class="page">
    <div class="wrap narrow">
      <h1>{{ heading }}</h1>

      <div v-if="status === 'loading'" class="card">
        <p class="dim">Checking your vault…</p>
      </div>

      <div v-else-if="status === 'unknown'" class="card stack">
        <p class="alert alert-error">Could not read the vault state. Try again.</p>
        <button class="btn btn-block" type="button" @click="refreshStatus">Retry</button>
      </div>

      <div v-else class="card stack">
        <p v-if="isNew" class="dim">
          This passphrase encrypts every record. It is never stored on the server and cannot be
          recovered if you forget it.
        </p>
        <p v-else class="dim">
          Signed in as <strong>{{ authState.profile?.username || authState.user?.email }}</strong>.
          Enter your master passphrase.
        </p>

        <form class="stack" novalidate @submit.prevent="submit">
          <div class="field">
            <label class="label" for="unlock-pass">Master passphrase</label>
            <input
              id="unlock-pass"
              v-model="passphrase"
              class="input"
              type="password"
              autocomplete="current-password"
            />
            <p v-if="isNew" class="hint">At least 12 characters. Longer is better.</p>
            <p v-if="errors.passphrase" class="error">{{ errors.passphrase }}</p>
          </div>

          <div v-if="isNew" class="field">
            <label class="label" for="unlock-pass2">Confirm master passphrase</label>
            <input
              id="unlock-pass2"
              v-model="confirmPassphrase"
              class="input"
              type="password"
              autocomplete="new-password"
            />
            <p v-if="errors.confirmPassphrase" class="error">{{ errors.confirmPassphrase }}</p>
          </div>

          <p v-if="formError" class="alert alert-error">{{ formError }}</p>
          <p v-if="!isNew && !formError" class="faint small-note">
            Forgot it? The records stay encrypted; only a backup or the passphrase can open them.
          </p>

          <button class="btn btn-primary btn-block" type="submit" :disabled="busy">
            {{ busy ? 'Working…' : isNew ? 'Create vault' : 'Unlock' }}
          </button>
        </form>

        <button class="btn btn-ghost btn-sm" type="button" @click="doSignOut">Sign Out</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.small-note {
  font-size: 0.82rem;
  margin: 0;
}
</style>