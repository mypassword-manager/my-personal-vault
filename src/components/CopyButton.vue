<script setup>
import { ref } from 'vue'
import { copyText } from '../lib/clipboard.js'
import { toast } from '../stores/toast.js'

const props = defineProps({
  value: { type: String, default: '' },
  label: { type: String, default: 'Copy' }
})

const copied = ref(false)
let timer = null

async function onCopy() {
  try {
    await copyText(props.value)
    copied.value = true
    toast.ok('Copied to clipboard.')
    if (timer) window.clearTimeout(timer)
    timer = window.setTimeout(() => {
      copied.value = false
    }, 1600)
  } catch (error) {
    toast.error(error.message)
  }
}
</script>

<template>
  <button
    class="btn btn-sm btn-ghost copy-btn"
    type="button"
    :disabled="!value"
    :aria-label="`${label}`"
    @click="onCopy"
  >
    {{ copied ? 'Copied' : label }}
  </button>
</template>

<style scoped>
.copy-btn {
  min-height: 32px;
  font-size: 0.78rem;
}
</style>