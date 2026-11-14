import { createRouter, createWebHashHistory } from 'vue-router'
import { authState } from '../stores/auth.js'
import { isUnlocked, refreshStatus } from '../stores/vault.js'

const routes = [
  {
    path: '/',
    name: 'landing',
    component: () => import('../pages/LandingPage.vue')
  },
  {
    path: '/signin',
    name: 'signin',
    component: () => import('../pages/SignInPage.vue'),
    meta: { guestOnly: true }
  },
  {
    path: '/create-account',
    name: 'create-account',
    component: () => import('../pages/CreateAccountPage.vue'),
    meta: { guestOnly: true }
  },
  {
    path: '/verify-email',
    name: 'verify-email',
    component: () => import('../pages/VerifyEmailPage.vue')
  },
  {
    path: '/forgot-password',
    name: 'forgot-password',
    component: () => import('../pages/ForgotPasswordPage.vue'),
    meta: { guestOnly: true }
  },
  {
    path: '/update-password',
    name: 'update-password',
    component: () => import('../pages/UpdatePasswordPage.vue')
  },
  {
    path: '/reset-pin',
    name: 'reset-pin',
    component: () => import('../pages/ResetPinPage.vue'),
    meta: { guestOnly: true }
  },
  {
    path: '/unlock',
    name: 'unlock',
    component: () => import('../pages/UnlockPage.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/app',
    name: 'dashboard',
    component: () => import('../pages/DashboardPage.vue'),
    meta: { requiresAuth: true, requiresUnlock: true }
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('../pages/SettingsPage.vue'),
    meta: { requiresAuth: true, requiresUnlock: true }
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  }
})

async function waitForAuth() {
  if (authState.ready) return
  await new Promise((resolve) => {
    const timer = window.setInterval(() => {
      if (authState.ready) {
        window.clearInterval(timer)
        resolve()
      }
    }, 25)
    window.setTimeout(() => {
      window.clearInterval(timer)
      resolve()
    }, 8000)
  })
}

router.beforeEach(async (to) => {
  await waitForAuth()

  const signedIn = Boolean(authState.session)

  if (to.meta.requiresAuth && !signedIn) {
    return { name: 'signin', query: { next: to.fullPath } }
  }

  if (to.meta.guestOnly && signedIn) {
    return { name: 'dashboard' }
  }

  if (to.meta.requiresUnlock) {
    const status = await refreshStatus()
    if (status !== 'unlocked' && !isUnlocked.value) {
      return { name: 'unlock' }
    }
  }

  return true
})

export default router