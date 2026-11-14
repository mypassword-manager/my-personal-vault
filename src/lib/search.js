// Client-side search over decrypted records.
// Ranking: title prefix, then website prefix, then title contains, then website contains.

function scoreRecord(record, needle) {
  const title = String(record.title ?? '').toLowerCase()
  const website = String(record.website ?? '').toLowerCase()

  if (title.startsWith(needle)) return 0
  if (website.startsWith(needle)) return 1
  if (title.includes(needle)) return 2
  if (website.includes(needle)) return 3
  return -1
}

/**
 * @param {Array<object>} records decrypted records with a title and optional website
 * @param {string} query raw search text
 * @returns {Array<object>} matching records, best match first
 */
export function searchRecords(records, query) {
  const needle = String(query ?? '').trim().toLowerCase()
  if (!needle) {
    return records
  }

  const scored = []
  for (const record of records) {
    const score = scoreRecord(record, needle)
    if (score >= 0) {
      scored.push({ record, score })
    }
  }

  scored.sort((a, b) => {
    if (a.score !== b.score) return a.score - b.score
    const at = String(a.record.title ?? '').toLowerCase()
    const bt = String(b.record.title ?? '').toLowerCase()
    if (at !== bt) return at < bt ? -1 : 1
    return String(a.record.id ?? '').localeCompare(String(b.record.id ?? ''))
  })

  return scored.map((entry) => entry.record)
}

export function highlightParts(text, query) {
  const source = String(text ?? '')
  const needle = String(query ?? '').trim()
  if (!needle) return [{ text: source, match: false }]

  const lowerSource = source.toLowerCase()
  const lowerNeedle = needle.toLowerCase()
  const parts = []
  let cursor = 0

  while (cursor < source.length) {
    const found = lowerSource.indexOf(lowerNeedle, cursor)
    if (found === -1) {
      parts.push({ text: source.slice(cursor), match: false })
      break
    }
    if (found > cursor) {
      parts.push({ text: source.slice(cursor, found), match: false })
    }
    parts.push({ text: source.slice(found, found + needle.length), match: true })
    cursor = found + needle.length
  }

  return parts
}