<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AppHeader from './components/AppHeader.vue'
import AppFooter from './components/AppFooter.vue'
import ToastHost from './components/ToastHost.vue'
import { AutoLock } from './lib/autolock.js'
import { getSettings } from './lib/settings.js'
import { authState, initAuth, signOut } from './stores/auth.js'
import { clearAll, isUnlocked, lock } from './stores/vault.js'
import { toast } from './stores/toast.js'

const router = useRouter()
const ready = ref(false)

const autoLock = new AutoLock(() => {
  if (!isUnlocked.value) return
  lock()
  clearAll()
  toast.info('Vault locked after inactivity.')
  router.push('/unlock')
})

function onLock() {
  lock()
  clearAll()
  router.push('/unlock')
}

async function onSignOut() {
  lock()
  clearAll()
  await signOut()
  router.push('/')
}

function syncAutoLock() {
  if (isUnlocked.value) {
    autoLock.setMinutes(getSettings().lockMinutes)
    autoLock.start()
  } else {
    autoLock.stop()
  }
}

watch(() => isUnlocked.value, syncAutoLock)

onMounted(async () => {
  await initAuth()
  ready.value = true
  syncAutoLock()
})

onBeforeUnmount(() => autoLock.stop())

watch(
  () => authState.session,
  (session) => {
    if (!session) {
      autoLock.stop()
    }
  }
)
</script>

<template>
  <AppHeader :on-lock="onLock" :on-sign-out="onSignOut" />
  <main v-if="ready" class="app-main">
    <RouterView />
  </main>
  <div v-else class="page wrap">
    <p class="dim">Starting My Personal Vault…</p>
  </div>
  <AppFooter />
  <ToastHost />
</template>

<style scoped>
.app-main {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
}
</style>