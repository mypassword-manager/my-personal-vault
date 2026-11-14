<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { firstError, validateRecord } from '../lib/validation.js'

const props = defineProps({
  open: { type: Boolean, default: false },
  initial: { type: Object, default: null },
  busy: { type: Boolean, default: false }
})

const emit = defineEmits(['save', 'close'])

function blank(type) {
  return {
    id: null,
    record_type: type,
    title: '',
    full_name: '',
    national_id: '',
    phone: '',
    email: '',
    address: '',
    website: '',
    url: '',
    username: '',
    password: '',
    notes: '',
    custom_fields: []
  }
}

const form = ref(blank('login'))
const errors = ref({})
const formError = ref('')
const titleInput = ref(null)

const isLogin = computed(() => form.value.record_type === 'login')

watch(
  () => props.open,
  async (open) => {
    if (!open) return
    const source = props.initial
    form.value = source
      ? {
          ...blank(source.record_type === 'personal' ? 'personal' : 'login'),
          ...source,
          custom_fields: Array.isArray(source.custom_fields)
            ? source.custom_fields.map((f) => ({ label: f.label ?? '', value: f.value ?? '' }))
            : []
        }
      : blank('login')
    errors.value = {}
    formError.value = ''
    await nextTick()
    if (titleInput.value) titleInput.value.focus()
  }
)

function setType(type) {
  form.value.record_type = type
  errors.value = {}
}

function addField() {
  form.value.custom_fields.push({ label: '', value: '' })
}

function removeField(index) {
  form.value.custom_fields.splice(index, 1)
}

function submit() {
  const found = validateRecord(form.value)
  errors.value = found
  formError.value = firstError(found)
  if (formError.value) return
  emit('save', { ...form.value })
}
</script>

<template>
  <div v-if="open" class="overlay">
    <div class="sheet card" role="dialog" aria-modal="true" aria-label="Record form">
      <div class="row-between sheet-head">
        <h3>{{ initial && initial.id ? 'Edit record' : 'New record' }}</h3>
        <button class="btn btn-sm btn-ghost" type="button" :disabled="busy" @click="emit('close')">
          Close
        </button>
      </div>

      <form class="stack" novalidate @submit.prevent="submit">
        <div class="seg" role="group" aria-label="Record type">
          <button
            class="seg-btn"
            :class="{ active: isLogin }"
            type="button"
            :disabled="Boolean(initial && initial.id)"
            @click="setType('login')"
          >
            Website &amp; App Login
          </button>
          <button
            class="seg-btn"
            :class="{ active: !isLogin }"
            type="button"
            :disabled="Boolean(initial && initial.id)"
            @click="setType('personal')"
          >
            Personal Information
          </button>
        </div>

        <div class="field">
          <label class="label" for="rf-title">Title</label>
          <input
            id="rf-title"
            ref="titleInput"
            v-model="form.title"
            class="input"
            maxlength="120"
            placeholder="e.g. RCash Github"
          />
          <p v-if="errors.title" class="error">{{ errors.title }}</p>
        </div>

        <template v-if="isLogin">
          <div class="field">
            <label class="label" for="rf-website">Website or app name</label>
            <input
              id="rf-website"
              v-model="form.website"
              class="input"
              maxlength="120"
              placeholder="e.g. GitHub"
            />
            <p v-if="errors.website" class="error">{{ errors.website }}</p>
          </div>
          <div class="field">
            <label class="label" for="rf-url">URL</label>
            <input
              id="rf-url"
              v-model="form.url"
              class="input"
              inputmode="url"
              autocapitalize="none"
              placeholder="https://github.com"
            />
            <p v-if="errors.url" class="error">{{ errors.url }}</p>
          </div>
          <div class="field">
            <label class="label" for="rf-username">Username</label>
            <input
              id="rf-username"
              v-model="form.username"
              class="input"
              autocapitalize="none"
              autocomplete="off"
            />
          </div>
          <div class="field">
            <label class="label" for="rf-email">Email</label>
            <input
              id="rf-email"
              v-model="form.email"
              class="input"
              inputmode="email"
              autocapitalize="none"
              autocomplete="off"
            />
          </div>
          <div class="field">
            <label class="label" for="rf-password">Password</label>
            <input
              id="rf-password"
              v-model="form.password"
              class="input input-mono"
              autocomplete="new-password"
              spellcheck="false"
            />
          </div>
        </template>

        <template v-else>
          <div class="field">
            <label class="label" for="rf-fullname">Full name</label>
            <input id="rf-fullname" v-model="form.full_name" class="input" maxlength="160" />
            <p v-if="errors.full_name" class="error">{{ errors.full_name }}</p>
          </div>
          <div class="field">
            <label class="label" for="rf-nid">IC or national ID</label>
            <input id="rf-nid" v-model="form.national_id" class="input input-mono" maxlength="60" />
            <p v-if="errors.national_id" class="error">{{ errors.national_id }}</p>
          </div>
          <div class="field">
            <label class="label" for="rf-phone">Phone number</label>
            <input id="rf-phone" v-model="form.phone" class="input" inputmode="tel" maxlength="40" />
            <p v-if="errors.phone" class="error">{{ errors.phone }}</p>
          </div>
          <div class="field">
            <label class="label" for="rf-pemail">Email</label>
            <input
              id="rf-pemail"
              v-model="form.email"
              class="input"
              inputmode="email"
              autocapitalize="none"
            />
            <p v-if="errors.email" class="error">{{ errors.email }}</p>
          </div>
          <div class="field">
            <label class="label" for="rf-address">Address</label>
            <textarea id="rf-address" v-model="form.address" class="textarea"></textarea>
          </div>
        </template>

        <div class="field">
          <label class="label" for="rf-notes">Notes</label>
          <textarea id="rf-notes" v-model="form.notes" class="textarea"></textarea>
        </div>

        <div class="field">
          <div class="row-between">
            <span class="label" style="margin: 0">Custom fields</span>
            <button class="btn btn-sm btn-ghost" type="button" @click="addField">Add field</button>
          </div>
          <div
            v-for="(field, index) in form.custom_fields"
            :key="index"
            class="custom-row"
          >
            <input v-model="field.label" class="input" placeholder="Label" maxlength="60" />
            <input v-model="field.value" class="input" placeholder="Value" />
            <button
              class="btn btn-sm btn-danger"
              type="button"
              :aria-label="`Remove field ${index + 1}`"
              @click="removeField(index)"
            >
              ×
            </button>
          </div>
        </div>

        <p v-if="formError" class="alert alert-error">{{ formError }}</p>

        <div class="row sheet-actions">
          <button class="btn" type="button" :disabled="busy" @click="emit('close')">Cancel</button>
          <button class="btn btn-primary grow" type="submit" :disabled="busy">
            {{ busy ? 'Saving…' : 'Save record' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(4, 7, 10, 0.75);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 150;
  overflow-y: auto;
  padding: 0;
}

.sheet {
  width: min(100%, 620px);
  border-radius: var(--radius) var(--radius) 0 0;
  max-height: 92vh;
  overflow-y: auto;
  padding-bottom: calc(1.25rem + env(safe-area-inset-bottom));
}

.sheet-head {
  position: sticky;
  top: 0;
  background: var(--bg-raised);
  padding-bottom: 0.5rem;
  z-index: 1;
}

.seg {
  display: flex;
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.seg-btn {
  flex: 1 1 0;
  min-height: 44px;
  padding: 0.4rem;
  background: transparent;
  border: 0;
  color: var(--text-dim);
  font: inherit;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
}

.seg-btn.active {
  background: var(--accent);
  color: var(--accent-ink);
}

.seg-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.custom-row {
  display: flex;
  gap: 0.35rem;
  margin-top: 0.4rem;
}

.sheet-actions {
  position: sticky;
  bottom: 0;
  background: var(--bg-raised);
  padding-top: 0.75rem;
}

@media (min-width: 720px) {
  .overlay {
    align-items: center;
    padding: 1rem;
  }
  .sheet {
    border-radius: var(--radius);
  }
}
</style>