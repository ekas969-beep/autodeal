import Link from "next/link"

export default function PaymentCancelledPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-16 text-slate-950">
      <section className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-3xl font-black text-slate-500">
          !
        </div>

        <h1 className="mt-6 text-3xl font-extrabold">Payment Cancelled</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          No payment was taken. You can return to your account or choose a plan
          again.
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <Link
            href="/sell"
            className="flex h-12 items-center justify-center rounded-xl bg-blue-600 text-sm font-bold text-white hover:bg-blue-700"
          >
            Choose Plan
          </Link>

          <Link
            href="/account"
            className="flex h-12 items-center justify-center rounded-xl border border-slate-300 bg-white text-sm font-bold text-slate-800 hover:bg-slate-50"
          >
            Go to Account
          </Link>
        </div>
      </section>
    </main>
  )
}
