<script setup>
import { computed, ref } from 'vue'
import { highlightParts } from '../lib/search.js'
import { formatRelativeDays, safeHostname } from '../lib/format.js'
import CopyButton from './CopyButton.vue'

const props = defineProps({
  record: { type: Object, required: true },
  query: { type: String, default: '' }
})

const emit = defineEmits(['view', 'edit', 'delete'])

const passwordShown = ref(false)

const isLogin = computed(() => props.record.record_type === 'login')

const subtitle = computed(() => {
  if (props.record.broken) return 'Could not be decrypted'
  if (isLogin.value) {
    return props.record.website || safeHostname(props.record.url) || props.record.username || ''
  }
  return props.record.email || props.record.phone || props.record.full_name || ''
})

const titleParts = computed(() => highlightParts(props.record.title, props.query))
const subtitleParts = computed(() => highlightParts(subtitle.value, props.query))

const updated = computed(() => formatRelativeDays(props.record.updated_at || props.record.created_at))
</script>

<template>
  <article class="record card card-tight">
    <div class="record-main">
      <div class="row-between">
        <span class="badge">{{ isLogin ? 'Login' : 'Personal' }}</span>
        <span v-if="updated" class="faint record-age">Updated {{ updated }}</span>
      </div>

      <h3 class="record-title">
        <template v-for="(part, index) in titleParts" :key="index">
          <mark v-if="part.match">{{ part.text }}</mark>
          <span v-else>{{ part.text }}</span>
        </template>
      </h3>

      <p v-if="subtitle" class="dim record-sub">
        <template v-for="(part, index) in subtitleParts" :key="index">
          <mark v-if="part.match">{{ part.text }}</mark>
          <span v-else>{{ part.text }}</span>
        </template>
      </p>

      <div v-if="isLogin && record.password" class="record-pass">
        <code class="mask">{{ passwordShown ? record.password : '••••••••••' }}</code>
        <button
          class="btn btn-sm btn-ghost"
          type="button"
          :aria-label="passwordShown ? 'Hide password' : 'Reveal password'"
          @click="passwordShown = !passwordShown"
        >
          {{ passwordShown ? 'Hide' : 'Reveal' }}
        </button>
        <CopyButton :value="record.password" label="Copy" />
      </div>
    </div>

    <div class="record-actions">
      <button class="btn btn-sm" type="button" @click="emit('view', record)">View</button>
      <button class="btn btn-sm" type="button" @click="emit('edit', record)">Edit</button>
      <button class="btn btn-sm btn-danger" type="button" @click="emit('delete', record)">Delete</button>
    </div>
  </article>
</template>

<style scoped>
.record {
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
}

.record-title {
  margin: 0.35rem 0 0.15rem;
  font-size: 1.05rem;
  word-break: break-word;
}

.record-sub {
  margin: 0;
  font-size: 0.85rem;
  word-break: break-word;
}

mark {
  background: rgba(74, 222, 128, 0.28);
  color: inherit;
  border-radius: 3px;
  padding: 0 1px;
}

.record-age {
  font-size: 0.72rem;
}

.record-pass {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-wrap: wrap;
  margin-top: 0.4rem;
}

.record-actions {
  display: flex;
  gap: 0.4rem;
  border-top: 1px solid var(--line);
  padding-top: 0.65rem;
}

.record-actions .btn {
  flex: 1 1 0;
}

@media (min-width: 720px) {
  .record {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
  .record-main {
    min-width: 0;
    flex: 1 1 auto;
  }
  .record-actions {
    border-top: 0;
    padding-top: 0;
    flex: 0 0 auto;
  }
  .record-actions .btn {
    flex: 0 0 auto;
  }
}
</style>