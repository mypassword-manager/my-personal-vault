<script setup>
const props = defineProps({
  modelValue: { type: String, default: '' },
  busy: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue'])

function onInput(event) {
  emit('update:modelValue', event.target.value)
}

function clear() {
  emit('update:modelValue', '')
}
</script>

<template>
  <div class="search">
    <label class="sr-only" for="vault-search">Search your vault</label>
    <input
      id="vault-search"
      class="input search-input"
      type="search"
      autocomplete="off"
      autocapitalize="none"
      spellcheck="false"
      enterkeyhint="search"
      placeholder="Search by title, website, or app"
      :value="modelValue"
      @input="onInput"
    />
    <button
      v-if="modelValue"
      class="btn btn-sm btn-ghost search-clear"
      type="button"
      aria-label="Clear search"
      @click="clear"
    >
      Clear
    </button>
  </div>
</template>

<style scoped>
.search {
  position: relative;
  display: flex;
  align-items: center;
}

.search-input {
  padding-right: 4.5rem;
}

.search-clear {
  position: absolute;
  right: 0.35rem;
}
</style>