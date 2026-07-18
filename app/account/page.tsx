"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { PREMIUM_BOOST, formatPlanPrice } from "@/config/plans"
import {
  getListingActiveFromDate,
  getListingValidityLabel,
  isListingExpired,
  isPremiumPlanListing,
} from "@/lib/listing-expiry"

const PAGE_SIZE = 10

const accountScrollKey = "autodeal-account-scroll-position"
const accountReturnKey = "autodeal-account-return-to-scroll"
const accountForceTopKey = "autodeal-account-force-top"
const accountPageKey = "autodeal-account-page"

const draftIndexKey = "autodeal-listing-drafts"

type Profile = {
  display_name: string | null
  avatar_url: string | null
  phone: string | null
  about_me: string | null
  seller_type: string | null
  vip_listing_count: number | null
  plan_type: string | null
  credits_balance: number | null
}

type CreditTransaction = {
  id: string
  transaction_type: string
  credits: number
  description: string | null
  created_at: string
}

type SavedListingDraft = {
  id: string
  plan: string
  category: string
  make: string
  model: string
  title: string
  updatedAt: string
  imagesCount: number
  fields: Record<string, string>
}

export default function AccountPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [userId, setUserId] = useState("")
  const [profile, setProfile] = useState<Profile | null>(null)
  const [listings, setListings] = useState<any[]>([])
  const [creditTransactions, setCreditTransactions] = useState<CreditTransaction[]>([])
  const [drafts, setDrafts] = useState<SavedListingDraft[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [boostingId, setBoostingId] = useState<string | null>(null)
  const [syncingPaymentId, setSyncingPaymentId] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)

  const totalPages = Math.max(1, Math.ceil(listings.length / PAGE_SIZE))

  const visibleListings = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return listings.slice(start, start + PAGE_SIZE)
  }, [listings, currentPage])

  useEffect(() => {
    loadAccount()
  }, [])

  useEffect(() => {
    const saveScroll = () => {
      sessionStorage.setItem(accountScrollKey, String(window.scrollY))
    }

    window.addEventListener("scroll", saveScroll, { passive: true })

    return () => {
      saveScroll()
      window.removeEventListener("scroll", saveScroll)
    }
  }, [])

  useEffect(() => {
    if (loading) return

    const forceTop = sessionStorage.getItem(accountForceTopKey)

    if (forceTop === "1") {
      sessionStorage.removeItem(accountForceTopKey)
      sessionStorage.removeItem(accountReturnKey)
      sessionStorage.setItem(accountScrollKey, "0")
      sessionStorage.setItem(accountPageKey, "1")
      setCurrentPage(1)

      setTimeout(() => {
        window.scrollTo({ top: 0, left: 0, behavior: "auto" })
      }, 100)

      return
    }

    const shouldRestore = sessionStorage.getItem(accountReturnKey)

    if (shouldRestore === "1") {
      const savedY = Number(sessionStorage.getItem(accountScrollKey) || "0")
      const savedPage = Number(sessionStorage.getItem(accountPageKey) || "1")

      setCurrentPage(Math.min(Math.max(savedPage, 1), totalPages))

      setTimeout(() => {
        window.scrollTo({ top: savedY, left: 0, behavior: "auto" })
        sessionStorage.removeItem(accountReturnKey)
      }, 250)
    }
  }, [loading, totalPages])

  async function loadAccount() {
    const { data: userData } = await supabase.auth.getUser()

    if (!userData.user) {
      window.location.href = "/login"
      return
    }

    const user = userData.user

    setUserId(user.id)
    setEmail(user.email || "")

    const {
      data: { session },
    } = await supabase.auth.getSession()

    await fetch("/api/account-sync", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session?.access_token || ""}`,
      },
    }).catch(() => null)

    await fetch("/api/listing-expiry", {
      method: "POST",
    }).catch(() => null)

    const { data: profileData } = await supabase
      .from("profiles")
      .select(
        "display_name, avatar_url, phone, about_me, seller_type, vip_listing_count, plan_type, credits_balance"
      )
      .eq("id", user.id)
      .maybeSingle()

    setProfile(profileData || null)

    const { data: myListings } = await supabase
      .from("listings")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    setListings(myListings || [])

    const { data: transactions } = await supabase
      .from("credit_transactions")
      .select("id, transaction_type, credits, description, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(8)

    setCreditTransactions(transactions || [])
    loadDrafts(myListings || [])
    setLoading(false)
  }

  function loadDrafts(existingListings: any[] = listings) {
    const loadedDrafts = readDraftIndex()
      .map((id) => {
        const saved = localStorage.getItem(draftKey(id))
        if (!saved) return null

        try {
          return JSON.parse(saved) as SavedListingDraft
        } catch {
          return null
        }
      })
      .filter(Boolean) as SavedListingDraft[]

    const cleanedDrafts = loadedDrafts.filter((draft) => {
      const hasMatchingListing = existingListings.some((listing) =>
        isDraftAlreadyPublished(draft, listing)
      )

      if (hasMatchingListing) {
        localStorage.removeItem(draftKey(draft.id))
      }

      return !hasMatchingListing
    })

    localStorage.setItem(draftIndexKey, JSON.stringify(cleanedDrafts.map((draft) => draft.id)))
    setDrafts(cleanedDrafts)
  }

  function deleteDraft(id: string) {
    localStorage.removeItem(draftKey(id))

    localStorage.setItem(
      draftIndexKey,
      JSON.stringify(readDraftIndex().filter((item) => item !== id))
    )

    loadDrafts()
  }

  function saveAccountPositionForEdit() {
    sessionStorage.setItem(accountScrollKey, String(window.scrollY))
    sessionStorage.setItem(accountPageKey, String(currentPage))
    sessionStorage.setItem(accountReturnKey, "1")
  }

  function goToPage(page: number) {
    const nextPage = Math.min(Math.max(page, 1), totalPages)

    setCurrentPage(nextPage)
    sessionStorage.setItem(accountPageKey, String(nextPage))

    setTimeout(() => {
      document.getElementById("active-listings")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      })
    }, 50)
  }

  async function deleteListing(listingId: string) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this listing? This action cannot be undone."
    )

    if (!confirmed) return

    setDeletingId(listingId)

    const { error } = await supabase
      .from("listings")
      .delete()
      .eq("id", listingId)
      .eq("user_id", userId)

    if (error) {
      alert(error.message)
      setDeletingId(null)
      return
    }

    setListings((current) => {
      const next = current.filter((listing) => listing.id !== listingId)
      const nextTotalPages = Math.max(1, Math.ceil(next.length / PAGE_SIZE))

      setCurrentPage((page) => Math.min(page, nextTotalPages))
      return next
    })

    setDeletingId(null)
  }

  async function boostWithCredit(listingId: string) {
    const confirmed = window.confirm(
      "Edit and save this listing to use 1 credit for Premium?"
    )
    if (!confirmed) return

    router.push(`/edit-listing/${listingId}?upgrade=premium-credit`)
  }

  async function boostWithCard(listingId: string) {
    setBoostingId(listingId)

    const {
      data: { session },
    } = await supabase.auth.getSession()

    const response = await fetch("/api/create-checkout-session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token || ""}`,
      },
      body: JSON.stringify({
        type: "premium_boost",
        plan_key: PREMIUM_BOOST.key,
        listing_id: listingId,
      }),
    })

    const data = await response.json()

    if (!response.ok || !data.url) {
      alert(data.error || "Could not start checkout.")
      setBoostingId(null)
      return
    }

    window.location.href = data.url
  }
  async function syncPayment(listingId: string) {
    setSyncingPaymentId(listingId)

    const {
      data: { session },
    } = await supabase.auth.getSession()

    const response = await fetch("/api/sync-payment", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token || ""}`,
      },
      body: JSON.stringify({ listing_id: listingId }),
    })

    const data = await response.json()

    if (!response.ok) {
      alert(data.error || "Could not check payment.")
      setSyncingPaymentId(null)
      return
    }

    if (!data.paid) {
      alert("Payment is not marked as paid in Stripe yet.")
      setSyncingPaymentId(null)
      return
    }

    await loadAccount()
    setSyncingPaymentId(null)
  }

  async function signOut() {
    await supabase.auth.signOut()
    window.location.href = "/login"
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-12 text-gray-900">
        <div className="mx-auto max-w-7xl">Loading...</div>
      </main>
    )
  }

  const displayName = profile?.display_name || "Seller"
  const avatarUrl = profile?.avatar_url || ""
  const phone = profile?.phone || ""
  const sellerType = profile?.seller_type || "Private Seller"
  const planType = profile?.plan_type || "free"
  const creditsBalance = Number(profile?.credits_balance || 0)
  const activeListingsCount = listings.filter((listing) => !isListingExpired(listing)).length
  const expiredListingsCount = listings.filter((listing) => isListingExpired(listing)).length
  const premiumListingsCount = listings.filter((listing) => isPremiumPlanListing(listing)).length

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8 text-gray-900">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-center gap-3">
          <Link
            href="/"
            className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-gray-100"
          >
            ← Back
          </Link>

          <h1 className="text-xl font-semibold">Profile</h1>
        </div>

        <div className="grid gap-8 lg:grid-cols-[360px_1fr]">
          <aside className="h-fit overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="h-32 bg-gradient-to-r from-blue-600 to-indigo-600" />

            <div className="px-6 pb-6">
              <div className="-mt-12 flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-gray-100 shadow-md">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-4xl">🚗</span>
                )}
              </div>

              <h2 className="mt-5 text-2xl font-bold">{displayName}</h2>
              <p className="mt-1 text-sm text-gray-500">{sellerType}</p>

              <div className="mt-6 space-y-4 text-sm text-gray-600">
                <p>✉️ {email}</p>
                <p>📞 {phone || "No phone added"}</p>
              </div>

              <Link
                href="/edit-profile"
                className="mt-6 block w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-center font-semibold hover:bg-gray-50"
              >
                ✎ Edit Profile
              </Link>

              <button
                onClick={signOut}
                className="mt-4 w-full rounded-xl px-4 py-3 font-semibold text-red-600 hover:bg-red-50"
              >
                ↪ Sign Out
              </button>
            </div>
          </aside>

          <section className="space-y-8">
            <div>
              <h2 className="mb-4 text-xl font-bold">Account Status</h2>

              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-2xl font-bold">
                        {planType === "dealer"
                          ? "Dealer Plan"
                          : planType === "premium"
                            ? "Premium Seller"
                            : "Free Plan"}
                      </h3>

                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                        {creditsBalance} CREDITS
                      </span>
                    </div>

                    <p className="mt-3 text-gray-600">
                      Use credits to create Premium listings without paying by
                      card each time.
                    </p>
                  </div>

                  <Link
                    href="/sell"
                    className="inline-flex h-12 items-center justify-center rounded-xl bg-blue-600 px-5 text-sm font-bold text-white hover:bg-blue-700"
                  >
                    Buy Credits
                  </Link>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <Stat label="Credits balance" value={creditsBalance} />
                  <Stat label="Active listings" value={activeListingsCount} />
                  <Stat label="Premium listings" value={premiumListingsCount} />
                  <Stat label="Expired listings" value={expiredListingsCount} />
                </div>
              </div>
            </div>

            <div>
              <h2 className="mb-4 text-xl font-bold">Credit History</h2>

              <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                <div className="grid grid-cols-[1fr_120px_120px] bg-blue-50 px-4 py-3 text-sm font-bold text-gray-700">
                  <span>Description</span>
                  <span>Credits</span>
                  <span>Date</span>
                </div>

                {creditTransactions.length === 0 ? (
                  <div className="px-4 py-10 text-center text-sm text-gray-500">
                    No credit transactions yet.
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {creditTransactions.map((transaction) => (
                      <div
                        key={transaction.id}
                        className="grid grid-cols-[1fr_120px_120px] px-4 py-3 text-sm"
                      >
                        <span className="font-medium text-gray-800">
                          {transaction.description || transaction.transaction_type}
                        </span>
                        <span
                          className={
                            transaction.credits > 0
                              ? "font-bold text-green-700"
                              : "font-bold text-red-600"
                          }
                        >
                          {transaction.credits > 0 ? "+" : ""}
                          {transaction.credits}
                        </span>
                        <span className="text-gray-500">
                          {new Date(transaction.created_at).toLocaleDateString("en-IE")}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <h2 className="mb-4 text-xl font-bold">Saved Drafts</h2>

              {drafts.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-blue-600">
                  You don't have any saved drafts.
                </div>
              ) : (
                <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                  {drafts.map((draft) => (
                    <div
                      key={draft.id}
                      className="flex flex-col gap-4 rounded-xl border border-gray-200 p-4 md:flex-row md:items-center md:justify-between"
                    >
                      <div>
                        <p className="font-bold text-gray-900">
                          {draft.title || "Untitled draft"}
                        </p>

                        <p className="mt-1 text-sm text-gray-500">
                          {draft.make || "No make"} {draft.model || ""} •{" "}
                          {draft.category || "cars"}
                        </p>

                        <p className="mt-1 text-xs text-gray-400">
                          Saved:{" "}
                          {draft.updatedAt
                            ? new Date(draft.updatedAt).toLocaleString("en-IE")
                            : "recently"}
                        </p>

                        {draft.imagesCount > 0 && (
                          <p className="mt-1 text-xs text-amber-600">
                            {draft.imagesCount} photos were selected. Please
                            choose them again before publishing.
                          </p>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Link
                          href={`/sell/new?plan=${draft.plan || "free"}&draft=${draft.id}`}
                          className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
                        >
                          Continue
                        </Link>

                        <button
                          type="button"
                          onClick={() => deleteDraft(draft.id)}
                          className="rounded-xl border border-red-200 px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div id="active-listings">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold">My Listings</h2>

                  <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-bold text-white">
                    {listings.length}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-blue-50 px-4 py-2 text-sm font-bold text-blue-600">
                    Page {currentPage} / {totalPages}
                  </span>

                  <Link
                    href="/sell"
                    className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
                  >
                    + Add New
                  </Link>
                </div>
              </div>

              <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                {listings.length === 0 && (
                  <p className="py-8 text-center text-sm text-gray-500">
                    You don't have any listings yet.
                  </p>
                )}

                {visibleListings.map((car) => {
                  const isExpired = isListingExpired(car)
                  const validityLabel = getListingValidityLabel(car)
                  const listedDate = getListingActiveFromDate(car) || (car.created_at ? new Date(car.created_at) : null)
                  const isPremiumPlan = isPremiumPlanListing(car)
                  const isPaymentPending = !car.is_premium && (car.plan_type === "premium" || car.status === "pending_payment")
                  const canRenewOrUpgrade = !isPaymentPending && (!isPremiumPlan || isExpired)
                  const image =
                    car.featured_image_url ||
                    (Array.isArray(car.images) && car.images.length > 0
                      ? car.images[0]
                      : null)
                  const imageContent = image ? (
                    <img
                      src={image}
                      alt={car.title}
                      className={`h-full w-full object-cover ${isExpired ? "opacity-60 grayscale" : ""}`}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-gray-400">
                      No image
                    </div>
                  )

                  return (
                    <div
                      key={car.id}
                      className={`overflow-hidden rounded-xl border bg-white ${
                        isExpired ? "border-red-200" : "border-gray-200"
                      }`}
                    >
                      <div className="grid gap-4 md:grid-cols-[180px_1fr]">
                        {isExpired ? (
                          <div className="block h-40 bg-gray-100">{imageContent}</div>
                        ) : (
                          <Link
                            href={`/cars/${car.id}`}
                            className="block h-40 bg-gray-100"
                          >
                            {imageContent}
                          </Link>
                        )}

                        <div className="p-4">
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <div>
                              {isExpired ? (
                                <p className="text-lg font-bold text-gray-900">{car.title}</p>
                              ) : (
                                <Link
                                  href={`/cars/${car.id}`}
                                  className="text-lg font-bold hover:text-blue-600"
                                >
                                  {car.title}
                                </Link>
                              )}

                              <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-500">
                                <span>
                                  {car.mileage
                                    ? `${Number(car.mileage).toLocaleString(
                                        "en-IE"
                                      )} km`
                                    : "—"}
                                </span>

                                <span>📍 {car.location || "Ireland"}</span>

                                <span>
                                  Listed:{" "}
                                  {listedDate
                                    ? listedDate.toLocaleDateString("en-IE")
                                    : "—"}
                                </span>

                                <span
                                  className={
                                    isExpired
                                      ? "font-bold text-red-600"
                                      : "font-bold text-emerald-700"
                                  }
                                >
                                  {validityLabel}
                                </span>
                              </div>
                            </div>

                            <div className="text-right">
                              <div className="flex flex-col items-end gap-2">
                                <span
                                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                                    isExpired
                                      ? "bg-red-50 text-red-700"
                                      : car.is_premium
                                      ? "bg-blue-600 text-white"
                                      : "border border-gray-200 text-gray-600"
                                  }`}
                                >
                                  {isExpired
                                    ? "Expired"
                                    : car.is_premium
                                      ? "Premium"
                                      : isPaymentPending
                                        ? "Payment pending"
                                        : "Free"}
                                </span>

                                {car.is_premium && car.premium_until && !isExpired && (
                                  <span className="text-xs text-gray-500">
                                    Until{" "}
                                    {new Date(car.premium_until).toLocaleDateString("en-IE")}
                                  </span>
                                )}
                              </div>

                              <p className="mt-2 text-xl font-bold text-blue-600">
                                €{Number(car.price || 0).toLocaleString(
                                  "en-IE"
                                )}
                              </p>
                            </div>
                          </div>

                          <div className="mt-5 flex flex-wrap justify-end gap-3 border-t border-gray-100 pt-4">
                            {isPaymentPending && (
                              <button
                                type="button"
                                onClick={() => syncPayment(car.id)}
                                disabled={syncingPaymentId === car.id}
                                className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-bold text-amber-800 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {syncingPaymentId === car.id ? "Checking..." : "Check payment"}
                              </button>
                            )}

                            {canRenewOrUpgrade && (
                              <>
                                {creditsBalance > 0 ? (
                                  <button
                                    type="button"
                                    onClick={() => boostWithCredit(car.id)}
                                    disabled={boostingId === car.id}
                                    className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-800 shadow-sm shadow-emerald-100 hover:border-emerald-300 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    <UpgradeIcon />
                                    {isExpired
                                      ? "Renew Premium with 1 Credit"
                                      : "Upgrade Premium with 1 Credit"}
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => boostWithCard(car.id)}
                                    disabled={boostingId === car.id}
                                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-sm shadow-blue-100 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    <UpgradeIcon />
                                    {boostingId === car.id
                                      ? "Opening..."
                                      : isExpired
                                        ? `Renew Premium for ${formatPlanPrice(PREMIUM_BOOST.priceCents)}`
                                        : `Upgrade Premium for ${formatPlanPrice(PREMIUM_BOOST.priceCents)}`}
                                  </button>
                                )}
                              </>
                            )}

                            <Link
                              href={`/edit-listing/${car.id}`}
                              onMouseDown={saveAccountPositionForEdit}
                              onTouchStart={saveAccountPositionForEdit}
                              onClick={saveAccountPositionForEdit}
                              className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold hover:bg-gray-50"
                            >
                              ✎ Edit
                            </Link>

                            <button
                              type="button"
                              onClick={() => deleteListing(car.id)}
                              disabled={deletingId === car.id}
                              className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {deletingId === car.id
                                ? "Deleting..."
                                : "🗑 Delete"}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {totalPages > 1 && (
                <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    ← Previous
                  </button>

                  {Array.from({ length: totalPages }, (_, index) => index + 1).map(
                    (page) => (
                      <button
                        type="button"
                        key={page}
                        onClick={() => goToPage(page)}
                        className={`rounded-xl px-4 py-2 text-sm font-bold ${
                          currentPage === page
                            ? "bg-blue-600 text-white"
                            : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        {page}
                      </button>
                    )
                  )}

                  <button
                    type="button"
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next →
                  </button>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}

function isDraftAlreadyPublished(draft: SavedListingDraft, listing: any) {
  const draftTitle = normalizeDraftText(draft.title)
  const listingTitle = normalizeDraftText(listing.title)
  const draftMake = normalizeDraftText(draft.make || draft.fields?.brand || draft.fields?.make)
  const draftModel = normalizeDraftText(draft.model || draft.fields?.model)
  const listingMake = normalizeDraftText(listing.brand || listing.make)
  const listingModel = normalizeDraftText(listing.model)

  const titleMatches = Boolean(draftTitle && listingTitle && draftTitle === listingTitle)
  const vehicleMatches = Boolean(
    draftMake &&
      draftModel &&
      listingMake &&
      listingModel &&
      draftMake === listingMake &&
      draftModel === listingModel
  )

  return titleMatches || vehicleMatches
}

function normalizeDraftText(value: unknown) {
  return String(value || "")
    .trim()
    .toLowerCase()
}
function draftKey(id: string) {
  return `autodeal-listing-draft-${id}`
}

function readDraftIndex() {
  try {
    return JSON.parse(localStorage.getItem(draftIndexKey) || "[]") as string[]
  } catch {
    return []
  }
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
      <p className="text-sm font-semibold text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-extrabold text-gray-900">{value}</p>
    </div>
  )
}

function UpgradeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4 shrink-0"
      aria-hidden="true"
    >
      <path
        d="M5 16.5 10 11l3 3 6-7m0 0h-5m5 0v5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}




