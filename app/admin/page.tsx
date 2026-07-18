"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

type AdminData = {
  stats: {
    profiles: number
    listings: number
    activeListings: number
    pendingListings: number
    premiumListings: number
    conversations: number
    messages: number
    payments: number
    errors: number
    unresolvedErrors: number
  }
  listings: AdminListing[]
  profiles: AdminProfile[]
  payments: AdminPayment[]
  errors: SiteError[]
  dashboardWarnings?: string[]
}

type AdminListing = {
  id: string
  title: string | null
  brand: string | null
  model: string | null
  location: string | null
  price: number | string | null
  status: string | null
  is_premium: boolean | null
  plan_type: string | null
  premium_until: string | null
  created_at: string | null
  user_id: string | null
  email: string | null
  contact_email: string | null
}

type AdminProfile = {
  id: string
  display_name: string | null
  email: string | null
  seller_type: string | null
  credits_balance: number | string | null
}

type AdminPayment = {
  id: string
  status: string | null
  amount_cents: number | string | null
  amount: number | string | null
  created_at: string | null
}

type SiteError = {
  id: string
  level: string
  message: string
  stack: string | null
  source: string | null
  pathname: string | null
  user_agent: string | null
  user_email: string | null
  metadata: Record<string, unknown> | null
  created_at: string | null
  resolved_at: string | null
}

const adminEmail = "ekas969@gmail.com"
const listingsPageSize = 10

function getPaginationPages(currentPage: number, totalPages: number) {
  const start = Math.max(1, currentPage - 2)
  const end = Math.min(totalPages, currentPage + 2)
  const pages: number[] = []

  for (let page = start; page <= end; page++) {
    pages.push(page)
  }

  return pages
}

export default function AdminPage() {
  const router = useRouter()
  const [data, setData] = useState<AdminData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [savingId, setSavingId] = useState("")
  const [deletingErrors, setDeletingErrors] = useState(false)
  const [query, setQuery] = useState("")
  const [listingsPage, setListingsPage] = useState(1)

  const listings = useMemo(() => {
    const value = query.trim().toLowerCase()
    const all = data?.listings || []

    if (!value) return all

    return all.filter((listing) => {
      return [
        listing.title,
        listing.brand,
        listing.model,
        listing.location,
        listing.status,
        listing.email,
        listing.contact_email,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(value)
    })
  }, [data, query])

  const listingsTotalPages = Math.max(1, Math.ceil(listings.length / listingsPageSize))
  const currentListingsPage = Math.min(listingsPage, listingsTotalPages)
  const paginatedListings = useMemo(() => {
    const start = (currentListingsPage - 1) * listingsPageSize
    return listings.slice(start, start + listingsPageSize)
  }, [currentListingsPage, listings])

  const profiles = useMemo(() => data?.profiles || [], [data])
  const payments = useMemo(() => data?.payments || [], [data])
  const errors = useMemo(() => data?.errors || [], [data])

  const getAdminSessionToken = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.user) {
      router.replace("/login")
      return null
    }

    if ((session.user.email || "").toLowerCase() !== adminEmail) {
      setError("This admin panel is only available to the AutoDeal.ie admin account.")
      setLoading(false)
      return null
    }

    return session.access_token
  }, [router])

  const loadAdmin = useCallback(async () => {
    setLoading(true)
    setError("")

    const token = await getAdminSessionToken()
    if (!token) return

    const response = await fetch("/api/admin-dashboard", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    const responseText = await response.text()
    const result = parseAdminResponse(responseText)

    if (!response.ok || !result?.ok || !result.data) {
      const fallback =
        response.status === 404
          ? "Admin API route was not found. Restart the dev server so Next.js can rebuild routes."
          : `Could not load admin panel. Server returned ${response.status}.`

      setError(result?.error || fallback)
      setLoading(false)
      return
    }

    setData(result.data)
    setLoading(false)
  }, [getAdminSessionToken])

  useEffect(() => {
    queueMicrotask(() => {
      loadAdmin()
    })
  }, [loadAdmin])

  async function updateListing(listingId: string, action: string) {
    const token = await getAdminSessionToken()
    if (!token) return

    if (action === "delete") {
      const confirmed = window.confirm("Delete this listing permanently?")
      if (!confirmed) return
    }

    if (action === "premium") {
      const confirmed = window.confirm("Turn this listing into a Premium listing for 60 days?")
      if (!confirmed) return
    }

    setSavingId(listingId)

    const response = await fetch("/api/admin-listing-action", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ listingId, action }),
    })

    const result = await response.json().catch(() => null)

    if (!response.ok || !result?.ok) {
      alert(result?.error || "Could not update listing.")
      setSavingId("")
      return
    }

    await loadAdmin()
    setSavingId("")
  }

  async function deleteErrors() {
    const confirmed = window.confirm("Delete all logged errors?")
    if (!confirmed) return

    const token = await getAdminSessionToken()
    if (!token) return

    setDeletingErrors(true)

    const response = await fetch("/api/admin-errors", {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    const result = await response.json().catch(() => null)

    if (!response.ok || !result?.ok) {
      alert(result?.error || "Could not delete errors.")
      setDeletingErrors(false)
      return
    }

    await loadAdmin()
    setDeletingErrors(false)
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-950">
        <div className="mx-auto max-w-7xl">Loading admin panel...</div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-950">
        <div className="mx-auto max-w-3xl rounded-2xl border border-red-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-bold uppercase tracking-wide text-red-600">
            Admin access
          </p>
          <h1 className="mt-2 text-3xl font-extrabold">Access unavailable</h1>
          <p className="mt-3 text-slate-600">{error}</p>
          <Link
            href="/account"
            className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-blue-600 px-5 text-sm font-bold text-white hover:bg-blue-700"
          >
            Back to account
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-blue-700">
              AutoDeal.ie admin
            </p>
            <h1 className="mt-2 text-3xl font-extrabold md:text-4xl">
              Website control panel
            </h1>
            <p className="mt-2 text-slate-600">
              Manage listings, users, payments, and marketplace activity.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin/fast-listing"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-blue-600 px-5 text-sm font-bold text-white hover:bg-blue-700"
            >
              Fast Listing
            </Link>

            <button
              type="button"
              onClick={loadAdmin}
              className="h-11 rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold hover:bg-slate-50"
            >
              Refresh
            </button>
          </div>
        </div>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Users" value={data?.stats.profiles || 0} />
          <Stat label="Listings" value={data?.stats.listings || 0} />
          <Stat label="Active listings" value={data?.stats.activeListings || 0} />
          <Stat label="Premium listings" value={data?.stats.premiumListings || 0} />
          <Stat label="Pending payment" value={data?.stats.pendingListings || 0} />
          <Stat label="Conversations" value={data?.stats.conversations || 0} />
          <Stat label="Messages" value={data?.stats.messages || 0} />
          <Stat label="Payments" value={data?.stats.payments || 0} />
          <Stat label="Errors" value={data?.stats.errors || 0} />
          <Stat label="Open errors" value={data?.stats.unresolvedErrors || 0} />
        </section>

        <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-xl font-bold">Recent errors</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Showing {errors.length} of {data?.stats.errors || 0} logged errors.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {data?.stats.unresolvedErrors ? (
                  <span className="rounded-full bg-red-50 px-3 py-1.5 text-sm font-bold text-red-700">
                    {data.stats.unresolvedErrors} open
                  </span>
                ) : null}
                {errors.length > 0 && (
                  <button
                    type="button"
                    onClick={deleteErrors}
                    disabled={deletingErrors}
                    className="h-10 rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-bold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {deletingErrors ? "Deleting..." : "Delete errors"}
                  </button>
                )}
              </div>
            </div>
          </div>

          {data?.dashboardWarnings?.length ? (
            <div className="border-b border-amber-100 bg-amber-50 p-5 text-sm font-semibold text-amber-900">
              {data.dashboardWarnings.map((warning) => (
                <p key={warning}>{warning}</p>
              ))}
            </div>
          ) : null}

          <div className="divide-y divide-slate-100">
            {errors.length === 0 && (
              <div className="p-6 text-sm text-slate-500">
                No logged errors found yet. If errors happened but this stays empty, run
                supabase/site-errors.sql in Supabase and check that SUPABASE_SERVICE_ROLE_KEY is set.
              </div>
            )}

            {errors.map((siteError) => (
              <article key={siteError.id} className="p-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <ErrorLevelBadge level={siteError.level} />
                      <p className="text-xs font-semibold text-slate-400">
                        {formatDateTime(siteError.created_at)}
                      </p>
                      {siteError.resolved_at ? <Badge>resolved</Badge> : <Badge blue>open</Badge>}
                    </div>

                    <p className="mt-3 break-words text-sm font-bold text-slate-950">
                      {siteError.message}
                    </p>

                    {siteError.stack ? (
                      <pre className="mt-3 max-h-32 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-950 p-4 text-xs text-slate-100">
                        {siteError.stack}
                      </pre>
                    ) : null}
                  </div>

                  <div className="grid gap-1 text-xs font-semibold text-slate-500 lg:w-80">
                    <span>Page: {siteError.pathname || "Not available"}</span>
                    <span>Source: {siteError.source || "Not available"}</span>
                    <span>User: {siteError.user_email || "Guest or unknown"}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-8 grid gap-8 xl:grid-cols-[1.7fr_1fr]">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <h2 className="text-xl font-bold">All listings</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Showing {listings.length === 0 ? 0 : (currentListingsPage - 1) * listingsPageSize + 1}
                    -{Math.min(currentListingsPage * listingsPageSize, listings.length)} of {listings.length} listings.
                  </p>
                </div>

                <input
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value)
                    setListingsPage(1)
                  }}
                  placeholder="Search listings"
                  className="h-11 w-full rounded-xl border border-slate-300 px-4 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-50 lg:w-72"
                />
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {listings.length === 0 && (
                <div className="p-8 text-center text-sm text-slate-500">
                  No listings found.
                </div>
              )}

              {paginatedListings.map((listing) => (
                <div key={listing.id} className="grid gap-4 p-5 lg:grid-cols-[1fr_auto]">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold">{listing.title || "Untitled listing"}</h3>
                      <Badge>{listing.status || "unknown"}</Badge>
                      {Boolean(listing.is_premium) && <Badge blue>Premium</Badge>}
                    </div>

                    <p className="mt-2 text-sm text-slate-500">
                      {[listing.brand, listing.model, listing.location].filter(Boolean).join(" / ") || "No vehicle details"}
                    </p>

                    <p className="mt-1 text-sm font-bold text-blue-700">
                      EUR {Number(listing.price || 0).toLocaleString("en-IE")}
                    </p>

                    <div className="mt-3 grid gap-2 text-xs font-semibold text-slate-500 sm:grid-cols-2">
                      <span>Uploaded: {formatDate(listing.created_at)}</span>
                      <span>Valid until: {formatValidUntil(listing)}</span>
                      <span>Seller email: {listing.contact_email || listing.email || "No email"}</span>
                      <span>Plan: {listing.plan_type || (listing.is_premium ? "premium" : "free")}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 lg:max-w-[360px] lg:justify-end">
                    <Link
                      href={`/cars/${listing.id}`}
                      className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold hover:bg-slate-50"
                    >
                      View
                    </Link>

                    <Link
                      href={`/edit-listing/${listing.id}`}
                      className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-bold text-blue-700 hover:bg-blue-100"
                    >
                      Edit
                    </Link>

                    <button
                      type="button"
                      disabled={savingId === listing.id || Boolean(listing.is_premium)}
                      onClick={() => updateListing(listing.id, "premium")}
                      className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-bold text-indigo-700 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      Premium
                    </button>

                    <button
                      type="button"
                      disabled={savingId === listing.id}
                      onClick={() => updateListing(listing.id, "active")}
                      className="rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm font-bold text-green-700 hover:bg-green-100 disabled:opacity-50"
                    >
                      Activate
                    </button>

                    <button
                      type="button"
                      disabled={savingId === listing.id}
                      onClick={() => updateListing(listing.id, "draft")}
                      className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-bold text-amber-800 hover:bg-amber-100 disabled:opacity-50"
                    >
                      Pause
                    </button>

                    <button
                      type="button"
                      disabled={savingId === listing.id}
                      onClick={() => updateListing(listing.id, "delete")}
                      className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-600 hover:bg-red-100 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {listings.length > listingsPageSize && (
              <div className="flex flex-col gap-3 border-t border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-semibold text-slate-500">
                  Page {currentListingsPage} of {listingsTotalPages}
                </p>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setListingsPage((page) => Math.max(1, page - 1))}
                    disabled={currentListingsPage === 1}
                    className="h-10 rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Previous
                  </button>
                  {getPaginationPages(currentListingsPage, listingsTotalPages).map((page) => (
                    <button
                      key={page}
                      type="button"
                      onClick={() => setListingsPage(page)}
                      className={`h-10 min-w-10 rounded-xl border px-3 text-sm font-bold ${
                        page === currentListingsPage
                          ? "border-blue-600 bg-blue-600 text-white"
                          : "border-slate-300 bg-white hover:bg-slate-50"
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setListingsPage((page) => Math.min(listingsTotalPages, page + 1))}
                    disabled={currentListingsPage === listingsTotalPages}
                    className="h-10 rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-8">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 p-5">
                <h2 className="text-xl font-bold">Recent users</h2>
              </div>
              <div className="divide-y divide-slate-100">
                {profiles.map((profile) => (
                  <div key={profile.id} className="p-5">
                    <p className="font-bold">{profile.display_name || "User"}</p>
                    <p className="mt-1 text-sm text-slate-500">{profile.email || "No email"}</p>
                    <p className="mt-1 text-xs font-bold text-blue-700">
                      {profile.seller_type || "Seller"} / {Number(profile.credits_balance || 0)} credits
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 p-5">
                <h2 className="text-xl font-bold">Recent payments</h2>
              </div>
              <div className="divide-y divide-slate-100">
                {payments.length === 0 && (
                  <div className="p-6 text-sm text-slate-500">No payments found.</div>
                )}
                {payments.map((payment) => (
                  <div key={payment.id} className="p-5">
                    <p className="font-bold">{payment.status || "Payment"}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {payment.amount_cents
                        ? `EUR ${(Number(payment.amount_cents) / 100).toFixed(2)}`
                        : payment.amount
                          ? `EUR ${payment.amount}`
                          : "Amount unavailable"}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {formatDateTime(payment.created_at)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}

function parseAdminResponse(responseText: string) {
  try {
    return JSON.parse(responseText) as { ok?: boolean; error?: string; data?: AdminData }
  } catch {
    return null
  }
}

function ErrorLevelBadge({ level }: { level: string }) {
  const normalized = (level || "error").toLowerCase()
  const classes =
    normalized === "warning"
      ? "bg-amber-100 text-amber-800"
      : normalized === "info"
        ? "bg-blue-100 text-blue-800"
        : "bg-red-100 text-red-700"

  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${classes}`}>
      {normalized}
    </span>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-bold text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-extrabold text-slate-950">{value}</p>
    </div>
  )
}

function Badge({
  children,
  blue = false,
}: {
  children: React.ReactNode
  blue?: boolean
}) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-bold ${
        blue ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"
      }`}
    >
      {children}
    </span>
  )
}

function formatDate(value: string | null) {
  if (!value) return "Not available"

  return new Date(value).toLocaleDateString("en-IE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function formatDateTime(value: string | null) {
  if (!value) return "Not available"

  return new Date(value).toLocaleString("en-IE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatValidUntil(
  listing: Pick<AdminListing, "created_at" | "is_premium" | "plan_type" | "premium_until">
) {
  if (listing.premium_until) return formatDate(listing.premium_until)

  if (!listing.created_at) return "Not available"

  const created = new Date(listing.created_at)
  const days = listing.is_premium || listing.plan_type === "premium" ? 60 : 30
  created.setDate(created.getDate() + days)

  return formatDate(created.toISOString())
}


