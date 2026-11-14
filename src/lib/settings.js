const STORAGE_KEY = 'mpv.settings'
export const LOCK_OPTIONS = [1, 2, 5, 10, 15, 30]

const DEFAULTS = { lockMinutes: 5 }

export function getSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULTS }
    const parsed = JSON.parse(raw)
    const minutes = Number(parsed.lockMinutes)
    return {
      lockMinutes: LOCK_OPTIONS.includes(minutes) ? minutes : DEFAULTS.lockMinutes
    }
  } catch {
    return { ...DEFAULTS }
  }
}

export function saveSettings(patch) {
  const next = { ...getSettings(), ...patch }
  const minutes = Number(next.lockMinutes)
  const clean = { lockMinutes: LOCK_OPTIONS.includes(minutes) ? minutes : DEFAULTS.lockMinutes }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(clean))
  return clean
}