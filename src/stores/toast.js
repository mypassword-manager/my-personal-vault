import { reactive } from 'vue'

let counter = 0

export const toastState = reactive({ items: [] })

export function pushToast(message, type = 'info', ttl = 4000) {
  const id = ++counter
  toastState.items.push({ id, message: String(message), type })
  if (ttl > 0) {
    window.setTimeout(() => dismissToast(id), ttl)
  }
  return id
}

export function dismissToast(id) {
  const index = toastState.items.findIndex((item) => item.id === id)
  if (index !== -1) {
    toastState.items.splice(index, 1)
  }
}

export const toast = {
  info: (message) => pushToast(message, 'info'),
  ok: (message) => pushToast(message, 'ok'),
  error: (message) => pushToast(message, 'error', 6000)
}