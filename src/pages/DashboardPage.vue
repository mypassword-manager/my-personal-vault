<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import RecordCard from '../components/RecordCard.vue'
import RecordForm from '../components/RecordForm.vue'
import SearchBox from '../components/SearchBox.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import FieldRow from '../components/FieldRow.vue'
import { authState, signOut } from '../stores/auth.js'
import {
  deleteRecord,
  exportBackup,
  hasQuery,
  importFromText,
  loadRecords,
  lock,
  saveRecord,
  setQuery,
  vaultState,
  visibleRecords
} from '../stores/vault.js'
import { backupFilename } from '../lib/backup.js'
import { formatDate, RECORD_TYPE_LABELS } from '../lib/format.js'
import { toast } from '../stores/toast.js'

const router = useRouter()

const filter = ref('all')
const formOpen = ref(false)
const editing = ref(null)
const viewing = ref(null)
const pendingDelete = ref(null)
const deleting = ref(false)
const importOpen = ref(false)
const importText = ref('')
const importPassphrase = ref('')
const importName = ref('')
const importing = ref(false)

const filtered = computed(() => {
  const items = visibleRecords.value
  if (filter.value === 'all') return items
  return items.filter((item) => item.record_type === filter.value)
})

const counts = computed(() => ({
  all: vaultState.records.length,
  login: vaultState.records.filter((r) => r.record_type === 'login').length,
  personal: vaultState.records.filter((r) => r.record_type === 'personal').length
}))

const isEmpty = computed(() => vaultState.records.length === 0)
const noMatch = computed(() => !isEmpty.value && filtered.value.length === 0)

onMounted(() => {
  if (!vaultState.records.length) {
    loadRecords().catch((error) => toast.error(error.message))
  }
})

function openNew(type) {
  editing.value = { record_type: type }
  formOpen.value = true
}

function openEdit(record) {
  viewing.value = null
  editing.value = record
  formOpen.value = true
}

function closeForm() {
  formOpen.value = false
  editing.value = null
}

async function onSave(form) {
  try {
    const isEdit = Boolean(form.id)
    await saveRecord(form)
    closeForm()
    toast.ok(isEdit ? 'Record updated.' : 'Record added.')
  } catch (error) {
    toast.error(error.message)
  }
}

async function confirmDelete() {
  if (!pendingDelete.value) return
  deleting.value = true
  try {
    await deleteRecord(pendingDelete.value.id)
    toast.ok('Record deleted.')
    pendingDelete.value = null
    viewing.value = null
  } catch (error) {
    toast.error(error.message)
  } finally {
    deleting.value = false
  }
}

function doLock() {
  lock()
  router.push('/unlock')
}

async function doSignOut() {
  lock()
  await signOut()
  router.push('/')
}

async function downloadBackup() {
  try {
    const envelope = await exportBackup()
    const blob = new Blob([JSON.stringify(envelope, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = backupFilename()
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    toast.ok('Encrypted backup downloaded.')
  } catch (error) {
    toast.error(error.message)
  }
}

function pickImportFile(event) {
  const file = event.target.files && event.target.files[0]
  if (!file) return
  importName.value = file.name
  const reader = new FileReader()
  reader.onload = () => {
    importText.value = String(reader.result || '')
  }
  reader.onerror = () => toast.error('Could not read that file.')
  reader.readAsText(file)
}

async function runImport() {
  if (!importText.value) {
    toast.error('Choose a backup file first.')
    return
  }
  importing.value = true
  try {
    const count = await importFromText(importText.value, importPassphrase.value)
    toast.ok(`Imported ${count} record${count === 1 ? '' : 's'}.`)
    importOpen.value = false
    importText.value = ''
    importPassphrase.value = ''
    importName.value = ''
  } catch (error) {
    toast.error(error.message)
  } finally {
    importing.value = false
  }
}
</script>

<template>
  <div class="page">
    <div class="wrap stack">
      <div class="row-between">
        <div>
          <h1 class="dash-title">Your vault</h1>
          <p class="dim dash-sub">
            {{ authState.profile?.full_name || 'Signed in' }} · {{ counts.all }} record{{
              counts.all === 1 ? '' : 's'
            }}
          </p>
        </div>
        <div class="row">
          <button class="btn btn-sm" type="button" @click="downloadBackup">Export</button>
          <button class="btn btn-sm" type="button" @click="importOpen = true">Import</button>
        </div>
      </div>

      <SearchBox :model-value="vaultState.query" @update:model-value="setQuery" />

      <div class="row filters">
        <button
          class="chip"
          :class="{ active: filter === 'all' }"
          type="button"
          @click="filter = 'all'"
        >
          All ({{ counts.all }})
        </button>
        <button
          class="chip"
          :class="{ active: filter === 'login' }"
          type="button"
          @click="filter = 'login'"
        >
          Logins ({{ counts.login }})
        </button>
        <button
          class="chip"
          :class="{ active: filter === 'personal' }"
          type="button"
          @click="filter = 'personal'"
        >
          Personal ({{ counts.personal }})
        </button>
      </div>

      <div class="row add-row">
        <button class="btn btn-primary grow" type="button" @click="openNew('login')">
          Add Login
        </button>
        <button class="btn grow" type="button" @click="openNew('personal')">
          Add Personal Info
        </button>
      </div>

      <p v-if="vaultState.loading" class="dim">Loading records…</p>

      <div v-else-if="isEmpty" class="card center empty">
        <h3>No records yet</h3>
        <p class="dim">Add a login or a personal detail to get started.</p>
      </div>

      <div v-else-if="noMatch" class="card center empty">
        <h3>Nothing matches</h3>
        <p class="dim">No record matches “{{ vaultState.query }}”.</p>
        <button class="btn btn-sm" type="button" @click="setQuery('')">Clear search</button>
      </div>

      <div v-else class="list">
        <RecordCard
          v-for="record in filtered"
          :key="record.id"
          :record="record"
          :query="vaultState.query"
          @view="viewing = $event"
          @edit="openEdit"
          @delete="pendingDelete = $event"
        />
      </div>

      <p v-if="hasQuery && filtered.length" class="faint small-count">
        {{ filtered.length }} match{{ filtered.length === 1 ? '' : 'es' }} for “{{ vaultState.query }}”
      </p>
    </div>

    <RecordForm
      :open="formOpen"
      :initial="editing"
      :busy="vaultState.busy"
      @save="onSave"
      @close="closeForm"
    />

    <div v-if="viewing" class="overlay" @click.self="viewing = null">
      <div class="card viewer" role="dialog" aria-modal="true">
        <div class="row-between">
          <span class="badge">{{ RECORD_TYPE_LABELS[viewing.record_type] }}</span>
          <button class="btn btn-sm btn-ghost" type="button" @click="viewing = null">Close</button>
        </div>
        <h2 class="viewer-title">{{ viewing.title }}</h2>

        <FieldRow v-if="viewing.website" label="Website or app" :value="viewing.website" />
        <FieldRow v-if="viewing.url" label="URL" :value="viewing.url" monospace />
        <FieldRow v-if="viewing.username" label="Username" :value="viewing.username" monospace />
        <FieldRow v-if="viewing.email" label="Email" :value="viewing.email" sensitive kind="email" />
        <FieldRow
          v-if="viewing.password"
          label="Password"
          :value="viewing.password"
          sensitive
          kind="password"
          monospace
        />
        <FieldRow v-if="viewing.full_name" label="Full name" :value="viewing.full_name" sensitive />
        <FieldRow
          v-if="viewing.national_id"
          label="IC or national ID"
          :value="viewing.national_id"
          sensitive
          monospace
        />
        <FieldRow v-if="viewing.phone" label="Phone" :value="viewing.phone" sensitive />
        <FieldRow v-if="viewing.address" label="Address" :value="viewing.address" sensitive multiline />
        <FieldRow v-if="viewing.notes" label="Notes" :value="viewing.notes" sensitive multiline />
        <FieldRow
          v-for="(field, index) in viewing.custom_fields"
          :key="index"
          :label="field.label || 'Custom field'"
          :value="field.value"
          sensitive
        />

        <p class="faint viewer-meta">
          Updated {{ formatDate(viewing.updated_at || viewing.created_at) }}
        </p>

        <div class="row viewer-actions">
          <button class="btn" type="button" @click="openEdit(viewing)">Edit</button>
          <button class="btn btn-danger" type="button" @click="pendingDelete = viewing">
            Delete
          </button>
        </div>
      </div>
    </div>

    <ConfirmDialog
      :open="Boolean(pendingDelete)"
      title="Delete record?"
      :message="`“${pendingDelete?.title || ''}” will be removed permanently.`"
      confirm-label="Delete"
      danger
      :busy="deleting"
      @confirm="confirmDelete"
      @cancel="pendingDelete = null"
    />

    <div v-if="importOpen" class="overlay" @click.self="importOpen = false">
      <div class="card viewer" role="dialog" aria-modal="true">
        <div class="row-between">
          <h3>Import encrypted backup</h3>
          <button class="btn btn-sm btn-ghost" type="button" @click="importOpen = false">
            Close
          </button>
        </div>
        <div class="stack">
          <div class="field">
            <label class="label" for="imp-file">Backup file</label>
            <input id="imp-file" class="input" type="file" accept=".json,application/json" @change="pickImportFile" />
            <p v-if="importName" class="hint">{{ importName }}</p>
          </div>
          <div class="field">
            <label class="label" for="imp-pass">Passphrase used when it was exported</label>
            <input id="imp-pass" v-model="importPassphrase" class="input" type="password" />
          </div>
          <button class="btn btn-primary btn-block" type="button" :disabled="importing" @click="runImport">
            {{ importing ? 'Importing…' : 'Import records' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dash-title {
  font-size: 1.6rem;
  margin-bottom: 0.15rem;
}

.dash-sub {
  font-size: 0.85rem;
  margin: 0;
}

.filters {
  gap: 0.4rem;
}

.chip {
  min-height: 34px;
  padding: 0.25rem 0.7rem;
  border-radius: 999px;
  border: 1px solid var(--line-strong);
  background: transparent;
  color: var(--text-dim);
  font: inherit;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
}

.chip.active {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--accent-ink);
}

.add-row {
  gap: 0.5rem;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.empty {
  padding: 2rem 1rem;
}

.small-count {
  font-size: 0.8rem;
  margin: 0;
}

.overlay {
  position: fixed;
  inset: 0;
  background: rgba(4, 7, 10, 0.75);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 140;
  padding: 0;
  overflow-y: auto;
}

.viewer {
  width: min(100%, 560px);
  max-height: 92vh;
  overflow-y: auto;
  border-radius: var(--radius) var(--radius) 0 0;
  padding-bottom: calc(1.25rem + env(safe-area-inset-bottom));
}

.viewer-title {
  font-size: 1.25rem;
  margin: 0.5rem 0 0.75rem;
  word-break: break-word;
}

.viewer-meta {
  font-size: 0.75rem;
  margin: 0.75rem 0 0;
}

.viewer-actions {
  margin-top: 0.75rem;
}

.viewer-actions .btn {
  flex: 1 1 0;
}

@media (min-width: 720px) {
  .overlay {
    align-items: center;
    padding: 1rem;
  }
  .viewer {
    border-radius: var(--radius);
  }
}
</style>