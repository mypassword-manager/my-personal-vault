<script setup>
import { toastState, dismissToast } from '../stores/toast.js'
</script>

<template>
  <div class="toast-host" aria-live="polite" aria-atomic="false">
    <div
      v-for="item in toastState.items"
      :key="item.id"
      class="toast"
      :class="`toast-${item.type}`"
      role="status"
    >
      <span class="grow">{{ item.message }}</span>
      <button class="toast-close" type="button" aria-label="Dismiss" @click="dismissToast(item.id)">
        ×
      </button>
    </div>
  </div>
</template>

<style scoped>
.toast-host {
  position: fixed;
  left: 50%;
  bottom: calc(1rem + env(safe-area-inset-bottom));
  transform: translateX(-50%);
  width: min(92vw, 460px);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  z-index: 200;
  pointer-events: none;
}

.toast {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.65rem 0.8rem;
  border-radius: 10px;
  border: 1px solid var(--line-strong);
  background: #141c25;
  box-shadow: var(--shadow);
  font-size: 0.9rem;
  pointer-events: auto;
}

.toast-ok {
  border-color: #2f6b45;
  background: #0d1c13;
  color: #bbf7d0;
}

.toast-error {
  border-color: #7f3030;
  background: #1c0f0f;
  color: #fecaca;
}

.toast-close {
  background: none;
  border: 0;
  color: inherit;
  font-size: 1.15rem;
  line-height: 1;
  padding: 0 0.15rem;
  cursor: pointer;
  opacity: 0.7;
}

.toast-close:hover {
  opacity: 1;
}
</style>