export type SearchHistoryEntry = {
  query: string
  href: string
  createdAt: string
}

const maxHistoryItems = 8

export function readSearchHistory(userId: string) {
  if (typeof window === "undefined" || !userId) return []

  try {
    const items = JSON.parse(localStorage.getItem(historyKey(userId)) || "[]")
    return Array.isArray(items) ? (items as SearchHistoryEntry[]) : []
  } catch {
    return []
  }
}

export function saveSearchHistory(userId: string, entry: Omit<SearchHistoryEntry, "createdAt">) {
  if (typeof window === "undefined" || !userId) return []

  const query = entry.query.trim()
  if (!query) return readSearchHistory(userId)

  const nextEntry = {
    query,
    href: entry.href,
    createdAt: new Date().toISOString(),
  }

  const next = [
    nextEntry,
    ...readSearchHistory(userId).filter(
      (item) => item.query.toLowerCase() !== query.toLowerCase()
    ),
  ].slice(0, maxHistoryItems)

  localStorage.setItem(historyKey(userId), JSON.stringify(next))
  return next
}

function historyKey(userId: string) {
  return `autodeal-search-history-${userId}`
}
