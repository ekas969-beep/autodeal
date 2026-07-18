import { FREE_PLAN, PREMIUM_BOOST } from "@/config/plans"

const dayMs = 24 * 60 * 60 * 1000

type ListingExpiryInput = {
  created_at?: string | null
  expires_at?: string | null
  premium_until?: string | null
  is_premium?: boolean | null
  plan_type?: string | null
  status?: string | null
}

export function isPremiumPlanListing(listing: ListingExpiryInput) {
  return Boolean(listing.is_premium || listing.plan_type === "premium")
}

export function getListingExpiryDate(listing: ListingExpiryInput) {
  const explicitExpiry = parseDate(listing.expires_at)
  if (explicitExpiry) return explicitExpiry

  const premiumExpiry = parseDate(listing.premium_until)
  if (premiumExpiry) return premiumExpiry

  const createdAt = parseDate(listing.created_at)
  if (!createdAt) return null

  const durationDays = isPremiumPlanListing(listing)
    ? PREMIUM_BOOST.durationDays
    : FREE_PLAN.durationDays

  return new Date(createdAt.getTime() + durationDays * dayMs)
}

export function getListingDaysRemaining(listing: ListingExpiryInput, now = new Date()) {
  const expiresAt = getListingExpiryDate(listing)
  if (!expiresAt) return null

  return Math.ceil((expiresAt.getTime() - now.getTime()) / dayMs)
}

export function getListingActiveFromDate(listing: ListingExpiryInput) {
  const expiresAt = getListingExpiryDate(listing)
  if (!expiresAt) return parseDate(listing.created_at)

  const durationDays = isPremiumPlanListing(listing)
    ? PREMIUM_BOOST.durationDays
    : FREE_PLAN.durationDays

  return new Date(expiresAt.getTime() - durationDays * dayMs)
}

export function isListingExpired(listing: ListingExpiryInput, now = new Date()) {
  const status = String(listing.status || "").trim().toLowerCase()
  if (status === "expired") return true

  const daysRemaining = getListingDaysRemaining(listing, now)
  return daysRemaining !== null && daysRemaining <= 0
}

export function isListingCurrentlyPublic(listing: ListingExpiryInput, now = new Date()) {
  const status = String(listing.status || "").trim().toLowerCase()
  if (["draft", "pending_payment", "expired", "sold"].includes(status)) return false

  return !isListingExpired(listing, now)
}

export function getListingValidityLabel(listing: ListingExpiryInput, now = new Date()) {
  const daysRemaining = getListingDaysRemaining(listing, now)

  if (daysRemaining === null) return "Validity unknown"
  if (daysRemaining <= 0) return "Expired"
  if (daysRemaining === 1) return "1 day left"

  return `${daysRemaining} days left`
}

function parseDate(value: string | null | undefined) {
  if (!value) return null

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}
