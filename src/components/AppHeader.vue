<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { authState, isAuthenticated } from '../stores/auth.js'
import { isUnlocked } from '../stores/vault.js'

const props = defineProps({
  onLock: { type: Function, default: null },
  onSignOut: { type: Function, default: null }
})

const router = useRouter()

const signedIn = computed(() => isAuthenticated.value)
const unlocked = computed(() => isUnlocked.value)
const name = computed(() => authState.profile?.full_name || authState.user?.email || '')

function go(path) {
  router.push(path)
}
</script>

<template>
  <header class="app-header">
    <div class="wrap header-inner">
      <RouterLink class="brand" to="/">
        <span class="brand-mark" aria-hidden="true"></span>
        <span class="brand-text">My Personal Vault</span>
      </RouterLink>

      <nav class="header-nav" aria-label="Primary">
        <template v-if="signedIn">
          <span class="who hide-sm" :title="name">{{ name }}</span>
          <button
            v-if="unlocked"
            class="btn btn-sm"
            type="button"
            @click="props.onLock && props.onLock()"
          >
            Lock Vault
          </button>
          <button
            v-if="unlocked"
            class="btn btn-sm btn-ghost"
            type="button"
            @click="go('/settings')"
          >
            Settings
          </button>
          <button class="btn btn-sm btn-ghost" type="button" @click="props.onSignOut && props.onSignOut()">
            Sign Out
          </button>
        </template>
        <template v-else>
          <RouterLink class="btn btn-sm btn-ghost" to="/signin">Sign In</RouterLink>
          <RouterLink class="btn btn-sm btn-primary" to="/create-account">Create Account</RouterLink>
        </template>
      </nav>
    </div>
  </header>
</template>

<style scoped>
.app-header {
  border-bottom: 1px solid var(--line);
  background: rgba(11, 15, 20, 0.92);
  backdrop-filter: blur(8px);
  position: sticky;
  top: 0;
  z-index: 50;
  padding-top: env(safe-area-inset-top);
}

.header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  min-height: 60px;
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text);
  font-weight: 700;
  letter-spacing: -0.01em;
}

.brand:hover {
  text-decoration: none;
}

.brand-mark {
  width: 14px;
  height: 14px;
  border-radius: 4px;
  background: var(--accent);
  box-shadow: 0 0 0 3px rgba(74, 222, 128, 0.18);
}

.brand-text {
  font-size: 0.98rem;
  white-space: nowrap;
}

.header-nav {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.who {
  font-size: 0.82rem;
  color: var(--text-dim);
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 420px) {
  .brand-text {
    display: none;
  }
}
</style>