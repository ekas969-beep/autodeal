import Link from "next/link"

type PaymentSuccessPageProps = {
  searchParams: Promise<{ next?: string | string[] }>
}

export default async function PaymentSuccessPage({ searchParams }: PaymentSuccessPageProps) {
  const params = await searchParams
  const next = Array.isArray(params.next) ? params.next[0] : params.next
  const safeNext = next?.startsWith("/") && !next.startsWith("//") ? next : ""

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-16 text-slate-950">
      <section className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl font-black text-green-700">
          ✓
        </div>

        <h1 className="mt-6 text-3xl font-extrabold">Payment Successful</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Stripe confirmed your payment. Your Premium listing or credits will be
          applied automatically by the webhook.
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {safeNext ? (
            <Link
              href={safeNext}
              className="flex h-12 items-center justify-center rounded-xl bg-emerald-600 text-sm font-bold text-white hover:bg-emerald-700"
            >
              Create Premium Listing
            </Link>
          ) : null}

          <Link
            href="/account"
            className="flex h-12 items-center justify-center rounded-xl bg-blue-600 text-sm font-bold text-white hover:bg-blue-700"
          >
            Go to Account
          </Link>

          <Link
            href="/listings"
            className="flex h-12 items-center justify-center rounded-xl border border-slate-300 bg-white text-sm font-bold text-slate-800 hover:bg-slate-50"
          >
            Browse Listings
          </Link>
        </div>
      </section>
    </main>
  )
}
