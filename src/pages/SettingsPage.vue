<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { authState, signOut } from '../stores/auth.js'
import { lock } from '../stores/vault.js'
import { getSettings, saveSettings, LOCK_OPTIONS } from '../lib/settings.js'
import { toast } from '../stores/toast.js'

const router = useRouter()
const minutes = ref(5)
const saving = ref(false)

onMounted(() => {
  minutes.value = getSettings().lockMinutes
})

async function onSave() {
  saving.value = true
  try {
    saveSettings({ lockMinutes: Number(minutes.value) })
    toast.ok('Settings saved.')
  } finally {
    saving.value = false
  }
}

async function doSignOut() {
  lock()
  await signOut()
  router.push('/')
}
</script>

<template>
  <div class="page">
    <div class="wrap narrow stack">
      <h1>Settings</h1>

      <div class="card stack">
        <h3>Automatic locking</h3>
        <p class="dim small">The vault locks itself after this much inactivity.</p>
        <div class="field">
          <label class="label" for="set-lock">Lock after</label>
          <select id="set-lock" v-model="minutes" class="select">
            <option v-for="option in LOCK_OPTIONS" :key="option" :value="option">
              {{ option }} minute{{ option === 1 ? '' : 's' }}
            </option>
          </select>
        </div>
        <button class="btn btn-primary" type="button" :disabled="saving" @click="onSave">
          Save
        </button>
      </div>

      <div class="card stack">
        <h3>Account</h3>
        <dl class="kv">
          <dt>Full name</dt>
          <dd>{{ authState.profile?.full_name || '—' }}</dd>
          <dt>Username</dt>
          <dd>{{ authState.profile?.username || '—' }}</dd>
          <dt>Email</dt>
          <dd>{{ authState.profile?.email || authState.user?.email || '—' }}</dd>
        </dl>
        <RouterLink class="btn" to="/forgot-password">Change account password</RouterLink>
        <RouterLink class="btn" to="/reset-pin">Reset PIN</RouterLink>
      </div>

      <div class="card stack">
        <h3>About your master passphrase</h3>
        <p class="dim small">
          Account recovery restores the account, never the vault contents. If the passphrase is lost,
          only an encrypted backup plus the passphrase that made it can restore the records.
        </p>
        <button class="btn btn-danger" type="button" @click="doSignOut">Sign Out</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.small {
  font-size: 0.85rem;
}

.kv {
  margin: 0;
  display: grid;
  grid-template-columns: 110px 1fr;
  gap: 0.35rem 0.75rem;
  font-size: 0.9rem;
}

.kv dt {
  color: var(--text-faint);
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding-top: 0.15rem;
}

.kv dd {
  margin: 0;
  word-break: break-word;
}
</style>