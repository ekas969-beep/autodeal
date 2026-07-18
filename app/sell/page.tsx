"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { DEALER_PACKS, FREE_PLAN, PREMIUM_BOOST, formatPlanPrice } from "@/config/plans"
import { supabase } from "@/lib/supabase"

export default function SellPage() {
  const router = useRouter()
  const [loadingPack, setLoadingPack] = useState("")
  const [isSignedIn, setIsSignedIn] = useState(false)
  const [creditsBalance, setCreditsBalance] = useState(0)
  const dealerPacks = Object.values(DEALER_PACKS)

  const loadCredits = useCallback(async (token: string) => {
    await fetch("/api/account-sync", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }).catch(() => null)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { data } = await supabase
      .from("profiles")
      .select("credits_balance")
      .eq("id", user?.id || "")
      .maybeSingle()

    setCreditsBalance(Number(data?.credits_balance || 0))
  }, [])

  useEffect(() => {
    async function loadAuthState() {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      setIsSignedIn(Boolean(session?.user))
      if (session?.user) {
        await loadCredits(session.access_token)
      } else {
        setCreditsBalance(0)
      }
    }

    loadAuthState()

    const authListener = supabase.auth.onAuthStateChange((_event, session) => {
      setIsSignedIn(Boolean(session?.user))
      if (session?.user) {
        loadCredits(session.access_token)
      } else {
        setCreditsBalance(0)
      }
    })

    return () => {
      authListener.data.subscription.unsubscribe()
    }
  }, [loadCredits])

  async function buyDealerPack(planKey: keyof typeof DEALER_PACKS) {
    setLoadingPack(planKey)

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      router.push("/login")
      return
    }

    const response = await fetch("/api/create-checkout-session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        type: "dealer_credit_pack",
        plan_key: planKey,
      }),
    })

    const data = await response.json()

    if (!response.ok || !data.url) {
      alert(data.error || "Could not start checkout.")
      setLoadingPack("")
      return
    }

    window.location.assign(data.url)
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-950">
      <section className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-bold uppercase tracking-wide text-blue-700">
            Choose your listing plan
          </p>
          <h1 className="mt-3 text-3xl font-bold md:text-5xl">
            Sell your car on AutoDeal.ie
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-600">
            Start free, choose Premium for stronger visibility, or buy credits if
            you sell multiple vehicles.
          </p>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          <article className="flex min-h-[520px] flex-col rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
            <h2 className="text-2xl font-bold">{FREE_PLAN.name}</h2>
            <p className="mt-4 min-h-[56px] text-sm font-medium leading-7 text-slate-600">
              Perfect for selling your personal car. List your vehicle for free
              with standard visibility.
            </p>

            <FeatureList
              features={[
                `${FREE_PLAN.durationDays} days`,
                `${FREE_PLAN.photoLimit} photos`,
                "Standard visibility",
                "Direct buyer messaging",
              ]}
            />

            <div className="mt-auto border-t border-slate-100 pt-7">
              <Price value={formatPlanPrice(FREE_PLAN.priceCents)} note="/ listing" />
              <Link
                href={isSignedIn ? "/sell/new?plan=free" : "/login"}
                className="mt-6 flex h-12 w-full items-center justify-center rounded-xl bg-blue-600 text-sm font-bold text-white shadow-lg shadow-blue-100 hover:bg-blue-700"
              >
                List for Free
              </Link>
            </div>
          </article>

          <article className="relative flex min-h-[520px] flex-col rounded-2xl border-2 border-emerald-500 bg-white p-7 shadow-lg shadow-emerald-100">
            <div className="absolute right-0 top-0 rounded-bl-2xl rounded-tr-xl bg-emerald-500 px-5 py-2 text-xs font-bold uppercase tracking-wide text-white">
              Premium
            </div>

            <h2 className="text-2xl font-bold">{PREMIUM_BOOST.name}</h2>
            <p className="mt-4 min-h-[56px] text-sm font-medium leading-7 text-slate-600">
              Premium paid listing with stronger visibility. Appear higher in search
              results and get featured on the homepage.
            </p>

            <FeatureList
              features={[
                `${PREMIUM_BOOST.durationDays} days`,
                "Priority search results",
                "Featured on homepage",
                `Up to ${PREMIUM_BOOST.photoLimit} photos + video`,
                "Premium badge",
              ]}
            />

            <div className="mt-auto border-t border-slate-100 pt-7">
              {creditsBalance >= PREMIUM_BOOST.creditsRequired ? (
                <CreditPrice />
              ) : (
                <Price value={formatPlanPrice(PREMIUM_BOOST.priceCents)} note="/ premium" />
              )}
              <Link
                href={isSignedIn ? "/sell/new?plan=premium" : "/login"}
                className="mt-6 flex h-12 w-full items-center justify-center rounded-xl bg-emerald-500 text-sm font-bold text-white shadow-lg shadow-emerald-100 hover:bg-emerald-600"
              >
                Create Premium
              </Link>
            </div>
          </article>

          <article className="flex min-h-[520px] flex-col rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
            <h2 className="text-2xl font-bold">Buy Credit Packs</h2>
            <p className="mt-4 text-sm font-medium leading-7 text-slate-600">
              Best for sellers with multiple vehicles. Buy credits once and use
              them anytime.
            </p>

            <p className="mt-5 rounded-xl bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700">
              1 credit = 1 Premium paid listing.
            </p>

            <div className="mt-5 space-y-3">
              {dealerPacks.map((pack) => (
                <div
                  key={pack.key}
                  className="rounded-xl border border-slate-200 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold">{pack.name}</h3>
                        {"badge" in pack && pack.badge && (
                          <span className="rounded-full bg-green-100 px-2 py-1 text-[11px] font-bold text-green-700">
                            {pack.badge}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-slate-500">
                        {pack.credits} credits
                      </p>
                    </div>

                    <p className="font-extrabold text-blue-700">
                      {formatPlanPrice(pack.priceCents)}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => buyDealerPack(pack.key)}
                    disabled={loadingPack === pack.key}
                    className="mt-4 h-11 w-full rounded-xl border border-blue-200 bg-blue-50 text-sm font-bold text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loadingPack === pack.key
                      ? "Opening checkout..."
                      : `Buy ${pack.name} Pack`}
                  </button>
                </div>
              ))}
            </div>
          </article>
        </div>
      </section>
    </main>
  )
}

function FeatureList({ features }: { features: string[] }) {
  return (
    <div className="mt-8">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
        What is included
      </p>

      <ul className="mt-5 space-y-4">
        {features.map((feature) => (
          <li
            key={feature}
            className="flex items-start gap-3 text-sm font-semibold text-slate-700"
          >
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-blue-600 text-xs text-blue-600">
              ✓
            </span>
            {feature}
          </li>
        ))}
      </ul>
    </div>
  )
}

function Price({ value, note }: { value: string; note: string }) {
  return (
    <div className="flex items-end gap-2">
      <p className="text-4xl font-bold">{value}</p>
      <p className="pb-1 text-sm font-bold uppercase text-slate-500">{note}</p>
    </div>
  )
}

function CreditPrice() {
  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800">
      <p className="text-sm font-bold uppercase">Credit payment</p>
      <p className="mt-1 text-2xl font-black">1 credit will be used</p>
    </div>
  )
}


