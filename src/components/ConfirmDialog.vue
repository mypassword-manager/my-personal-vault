<script setup>
import { nextTick, ref, watch } from 'vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, default: 'Confirm' },
  message: { type: String, default: '' },
  confirmLabel: { type: String, default: 'Confirm' },
  cancelLabel: { type: String, default: 'Cancel' },
  danger: { type: Boolean, default: false },
  busy: { type: Boolean, default: false }
})

const emit = defineEmits(['confirm', 'cancel'])
const confirmButton = ref(null)

watch(
  () => props.open,
  async (open) => {
    if (open) {
      await nextTick()
      if (confirmButton.value) confirmButton.value.focus()
    }
  }
)

function onKeydown(event) {
  if (event.key === 'Escape' && props.open && !props.busy) {
    emit('cancel')
  }
}
</script>

<template>
  <div v-if="open" class="overlay" @keydown="onKeydown">
    <div class="dialog card" role="dialog" aria-modal="true" :aria-label="title">
      <h3>{{ title }}</h3>
      <p class="dim">{{ message }}</p>
      <div class="row dialog-actions">
        <button class="btn" type="button" :disabled="busy" @click="emit('cancel')">
          {{ cancelLabel }}
        </button>
        <button
          ref="confirmButton"
          class="btn"
          :class="danger ? 'btn-danger' : 'btn-primary'"
          type="button"
          :disabled="busy"
          @click="emit('confirm')"
        >
          {{ busy ? 'Working…' : confirmLabel }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(4, 7, 10, 0.72);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  z-index: 150;
}

.dialog {
  width: min(100%, 420px);
  box-shadow: var(--shadow);
}

.dialog-actions {
  justify-content: flex-end;
  margin-top: 1rem;
}
</style>