"use client"

import { useRef, useState } from "react"

const buyerTips = [
  "🔍 Always inspect the vehicle in person before making a decision.",
  "🚫 Never pay a deposit before viewing the vehicle.",
  "📄 Ask to see the vehicle's service history.",
  "📝 Verify the registration number and VIN.",
  "🔑 Make sure both keys are included.",
  "⚠️ Be cautious if the price seems too good to be true.",
  "💰 Pay using a secure and traceable payment method.",
  "👤 Confirm the seller's identity before purchasing.",
  "🚗 Take the car for a test drive.",
  "🔧 Consider an independent mechanical inspection.",
  "📱 Keep all communication within AutoDeal where possible.",
  "📍 Meet in a safe, public location.",
  "📖 Check the ownership documents carefully.",
  "⏱️ Never let anyone pressure you into buying quickly.",
  "💡 Compare similar vehicles before making an offer.",
  "📸 Inspect the vehicle for signs of accident repairs.",
  "🚨 Watch for warning lights on the dashboard.",
  "📅 Check the NCT expiry date and tax status.",
  "🌧️ Test all electrical features, including lights and air conditioning.",
  "🔍 Check tyre condition and tread depth.",
  "📞 Don't share unnecessary personal or banking information.",
  "📑 Request maintenance receipts if available.",
  "🛑 Walk away if anything feels suspicious.",
  "💬 Ask plenty of questions before agreeing to buy.",
  "⭐ Save the listing to compare it later with other vehicles.",
]

export default function BuyerTips() {
  const [visibleCount, setVisibleCount] = useState(2)
  const buttonRef = useRef<HTMLButtonElement | null>(null)
  const visibleTips = buyerTips.slice(0, visibleCount)
  const hasMore = visibleCount < buyerTips.length

  function loadMoreTips() {
    const currentScrollY = window.scrollY

    buttonRef.current?.blur()
    setVisibleCount((count) => Math.min(count + 2, buyerTips.length))

    window.requestAnimationFrame(() => {
      window.scrollTo({ top: currentScrollY, left: 0, behavior: "auto" })
    })
  }

  return (
    <section className="rounded-2xl bg-[#F7F7F8] p-4">
      <h2 className="text-sm font-bold text-slate-950">🛡️ Safe Buying Tips</h2>

      <ul className="mt-3 space-y-2">
        {visibleTips.map((tip) => (
          <li key={tip} className="flex gap-2 text-sm leading-6 text-slate-600">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#005BFF]" />
            <span>{tip}</span>
          </li>
        ))}
      </ul>

      {hasMore && (
        <button
          ref={buttonRef}
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={loadMoreTips}
          className="mt-4 h-10 w-full rounded-lg border border-blue-200 bg-white text-sm font-bold text-[#005BFF] transition hover:bg-blue-50"
        >
          Load more
        </button>
      )}
    </section>
  )
}
