export function getListingRandomKey(listing: Record<string, unknown>, seed: number) {
  const id = String(
    listing.id ||
      listing.slug ||
      listing.featured_image_url ||
      listing.title ||
      ""
  )

  return hashString(`${seed}:${id}`)
}

export function shuffleListingsBySeed<T extends Record<string, unknown>>(
  listings: T[],
  seed: number
) {
  if (!seed) return listings

  return [...listings].sort(
    (a, b) => getListingRandomKey(a, seed) - getListingRandomKey(b, seed)
  )
}

function hashString(value: string) {
  let hash = 2166136261

  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }

  return hash >>> 0
}
