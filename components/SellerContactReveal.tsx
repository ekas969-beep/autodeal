"use client"

import { useState } from "react"
import MessageSellerButton from "@/components/MessageSellerButton"

type SellerContact = {
  sellerId: string
  sellerName: string
  sellerType: string
  avatarUrl: string | null
  aboutMe: string
  phone: string
  email: string
}

export default function SellerContactReveal({
  listingId,
}: {
  listingId: string
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [contact, setContact] = useState<SellerContact | null>(null)

  async function revealContact() {
    setLoading(true)
    setError("")

    const response = await fetch("/api/listing-contact", {
      method: "POST",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ listingId }),
    })

    const result = await response.json().catch(() => null)

    if (!response.ok || !result?.ok) {
      setError(result?.error || "Could not show seller contact right now.")
      setLoading(false)
      return
    }

    setContact(result.contact)
    setLoading(false)
  }

  if (!contact) {
    return (
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-[#F8FAFC] px-4 py-3">
          <h2 className="text-lg font-black text-[#0B1B3A]">Seller Information</h2>
        </div>

        <div className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-sm font-black text-blue-700">
              AD
            </div>
            <div>
              <h3 className="font-black text-slate-950">Contact details hidden</h3>
              <p className="mt-1 text-sm text-slate-500">Private Seller</p>
            </div>
          </div>

          <div className="mt-3 rounded-lg border border-slate-200 bg-[#F8FAFC] p-3">
            <p className="text-sm font-bold text-slate-950">Contact details hidden</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Show seller phone and email only when you are genuinely interested.
              To protect sellers, repeated contact reveals may be limited.
            </p>
          </div>

          <button
            type="button"
            onClick={revealContact}
            disabled={loading}
            className="mt-3 flex h-10 w-full items-center justify-center rounded-lg bg-[#005BFF] text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Checking..." : "Show seller contact"}
          </button>

          {error && (
            <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
              {error}
            </p>
          )}
        </div>
      </section>
    )
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-[#F8FAFC] px-4 py-3">
        <h2 className="text-lg font-black text-[#0B1B3A]">Seller Information</h2>
      </div>

      <div className="p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 text-base font-bold text-slate-500">
          {contact.avatarUrl ? (
            <img
              src={contact.avatarUrl}
              alt={contact.sellerName}
              className="h-full w-full object-cover"
            />
          ) : (
            <span>{contact.sellerName.charAt(0).toUpperCase()}</span>
          )}
        </div>

        <div>
          <h2 className="font-bold text-slate-950">{contact.sellerName}</h2>
          <p className="mt-1 text-sm capitalize text-slate-500">
            {contact.sellerType}
          </p>
        </div>
      </div>

      {contact.aboutMe && (
        <p className="mt-3 whitespace-pre-line rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-700">
          {contact.aboutMe}
        </p>
      )}

      <div className="mt-3 rounded-lg border border-slate-200 bg-[#F8FAFC] p-3">
        <p className="text-sm font-semibold text-slate-500">Phone</p>
        <p className="mt-1 font-bold text-slate-950">
          {contact.phone || "Not provided"}
        </p>
      </div>

      {contact.email && (
        <div className="mt-2 rounded-lg border border-slate-200 bg-[#F8FAFC] p-3">
          <p className="text-sm font-semibold text-slate-500">Email</p>
          <p className="mt-1 break-all font-bold text-slate-950">
            {contact.email}
          </p>
        </div>
      )}

      {contact.phone ? (
        <a
          href={`tel:${contact.phone}`}
          className="mt-3 flex h-10 w-full items-center justify-center rounded-lg bg-[#005BFF] text-sm font-bold text-white hover:bg-blue-700"
        >
          Call seller
        </a>
      ) : (
        <button
          disabled
          className="mt-5 h-12 w-full cursor-not-allowed rounded-lg bg-slate-200 text-sm font-bold text-slate-500"
        >
          No phone number provided
        </button>
      )}

      <MessageSellerButton
        listingId={listingId}
        sellerId={contact.sellerId}
        sellerName={contact.sellerName}
      />
      </div>
    </section>
  )
}
