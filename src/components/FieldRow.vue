<script setup>
import { computed, ref } from 'vue'
import CopyButton from './CopyButton.vue'
import { maskEmail, maskValue } from '../lib/format.js'

const props = defineProps({
  label: { type: String, required: true },
  value: { type: String, default: '' },
  sensitive: { type: Boolean, default: false },
  kind: { type: String, default: 'text' },
  monospace: { type: Boolean, default: false },
  multiline: { type: Boolean, default: false },
  copy: { type: Boolean, default: true }
})

const revealed = ref(false)

const display = computed(() => {
  if (!props.value) return ''
  if (!props.sensitive || revealed.value) return props.value
  if (props.kind === 'email') return maskEmail(props.value)
  if (props.kind === 'password') return '••••••••••••'
  return maskValue(props.value)
})

const canReveal = computed(() => props.sensitive && Boolean(props.value))
</script>

<template>
  <div v-if="value" class="field-row">
    <div class="row-between field-head">
      <span class="field-label">{{ label }}</span>
      <span class="row field-tools">
        <button
          v-if="canReveal"
          class="btn btn-sm btn-ghost"
          type="button"
          :aria-label="revealed ? `Hide ${label}` : `Reveal ${label}`"
          @click="revealed = !revealed"
        >
          {{ revealed ? 'Hide' : 'Reveal' }}
        </button>
        <CopyButton v-if="copy" :value="value" :label="`Copy ${label}`" />
      </span>
    </div>
    <div
      class="field-value"
      :class="{ mono: monospace || sensitive, wrap: multiline }"
    >
      {{ display }}
    </div>
  </div>
</template>

<style scoped>
.field-row {
  padding: 0.55rem 0;
  border-bottom: 1px solid var(--line);
}

.field-row:last-child {
  border-bottom: 0;
}

.field-head {
  gap: 0.5rem;
}

.field-label {
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-faint);
  font-weight: 700;
}

.field-tools {
  gap: 0.2rem;
}

.field-value {
  margin-top: 0.2rem;
  font-size: 0.95rem;
  word-break: break-word;
}

.field-value.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  letter-spacing: 0.03em;
}

.field-value.wrap {
  white-space: pre-wrap;
}
</style>