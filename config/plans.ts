export const FREE_PLAN = {
  key: "free",
  name: "Free Listing",
  priceCents: 0,
  durationDays: 30,
  photoLimit: 5,
  videoEnabled: false,
  homepageFeatured: false,
  premiumBadge: false,
  prioritySearch: false,
  searchVisibility: "standard",
  creditsRequired: 0,
} as const

export const PREMIUM_BOOST = {
  key: "premium_boost",
  name: "Premium",
  priceCents: 299,
  stripeProductId: "prod_UVfYRSlM9lODr8",
  stripePriceId: "price_1TWeDWJQ2KUfC4bb40kbfHNi",
  durationDays: 60,
  photoLimit: 20,
  videoEnabled: true,
  homepageFeatured: true,
  premiumBadge: true,
  prioritySearch: true,
  searchVisibility: "premium",
  creditsRequired: 1,
} as const

export const DEALER_PACKS = {
  dealer_starter: {
    key: "dealer_starter",
    name: "Starter",
    credits: 10,
    priceCents: 999,
    stripeProductId: "prod_UVfZRqSnrg6Kyz",
    stripePriceId: "price_1TWeEXJQ2KUfC4bb28LHCVGq",
  },
  dealer_pro: {
    key: "dealer_pro",
    name: "Pro",
    credits: 35,
    priceCents: 1999,
    stripeProductId: "prod_UVfbSsgaKfYX4F",
    stripePriceId: "price_1TWeFoJQ2KUfC4bbGkcQGLDc",
    badge: "Best Value",
  },
  dealer_elite: {
    key: "dealer_elite",
    name: "Elite",
    credits: 100,
    priceCents: 4900,
    stripeProductId: "prod_UVfcvvK06etFVH",
    stripePriceId: "price_1TWeHOJQ2KUfC4bbZLkYY9d6",
  },
} as const

export type DealerPackKey = keyof typeof DEALER_PACKS
export type PaymentType = "premium_boost" | "dealer_credit_pack"

export function formatPlanPrice(priceCents: number) {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
  }).format(priceCents / 100)
}

export function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

export function freeListingFields(now = new Date()) {
  return {
    status: "active",
    plan_type: FREE_PLAN.key,
    is_premium: false,
    premium_badge: false,
    priority_search: false,
    homepage_featured: false,
    video_enabled: false,
    photo_limit: FREE_PLAN.photoLimit,
    expires_at: addDays(now, FREE_PLAN.durationDays).toISOString(),
    premium_until: null,
  }
}

export function pendingPremiumListingFields() {
  return {
    status: "pending_payment",
    plan_type: "premium",
    is_premium: false,
    premium_badge: false,
    priority_search: false,
    homepage_featured: false,
    video_enabled: PREMIUM_BOOST.videoEnabled,
    photo_limit: PREMIUM_BOOST.photoLimit,
    premium_until: null,
  }
}

export function activePremiumListingFields(now = new Date()) {
  const until = addDays(now, PREMIUM_BOOST.durationDays).toISOString()

  return {
    status: "active",
    plan_type: "premium",
    is_premium: true,
    premium_badge: PREMIUM_BOOST.premiumBadge,
    priority_search: PREMIUM_BOOST.prioritySearch,
    homepage_featured: PREMIUM_BOOST.homepageFeatured,
    video_enabled: PREMIUM_BOOST.videoEnabled,
    photo_limit: PREMIUM_BOOST.photoLimit,
    expires_at: until,
    premium_until: until,
  }
}

