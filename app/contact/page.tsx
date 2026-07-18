"use client"

import { type FormEvent, useState } from "react"
import Link from "next/link"

type ContactStatus = "idle" | "sending" | "success" | "error"

export default function ContactPage() {
  const [status, setStatus] = useState<ContactStatus>("idle")
  const [error, setError] = useState("")

  async function submitContactForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    setStatus("sending")
    setError("")

    const formData = new FormData(form)
    const payload = {
      name: String(formData.get("name") || ""),
      email: String(formData.get("email") || ""),
      phone: String(formData.get("phone") || ""),
      subject: String(formData.get("subject") || ""),
      message: String(formData.get("message") || ""),
      website: String(formData.get("website") || ""),
    }

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const result = await response.json().catch(() => null)

      if (!response.ok || !result?.ok) {
        setStatus("error")
        setError("Message could not be sent right now. Please try again later.")
        return
      }

      form.reset()
      setStatus("success")
    } catch {
      setStatus("error")
      setError("Message could not be sent right now. Please try again later.")
    }
  }

  return (
    <main className="bg-slate-50 text-slate-950">
      <section className="border-b border-slate-200 bg-white px-5 py-12 sm:py-16">
        <div className="mx-auto max-w-6xl">
          <Link
            href="/"
            className="inline-flex rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-blue-400 hover:text-[#005BFF]"
          >
            Back to home
          </Link>

          <div className="mt-8 max-w-3xl">
            <p className="text-sm font-semibold text-[#005BFF]">Contact AutoDeal.ie</p>
            <h1 className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl">
              Contact Support
            </h1>
            <p className="mt-4 text-base leading-7 text-slate-600 sm:text-lg">
              Send a question, issue, or suggestion to the AutoDeal.ie team. We will
              review your message and reply as soon as possible.
            </p>
          </div>
        </div>
      </section>

      <section className="px-5 py-10 sm:py-14">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.85fr_1.15fr]">
          <aside className="rounded-2xl border border-slate-300 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold">How we can help</h2>
            <div className="mt-6 space-y-5 text-sm leading-6 text-slate-600">
              <InfoBlock
                title="Listing support"
                text="Questions about creating, editing, upgrading to Premium, or removing a vehicle listing."
              />
              <InfoBlock
                title="Account help"
                text="Help with login, profile details, saved listings, messages, or account settings."
              />
              <InfoBlock
                title="Feedback"
                text="Suggestions, bugs, or ideas that could make AutoDeal.ie better for buyers and sellers."
              />
            </div>
          </aside>

          <form
            onSubmit={submitContactForm}
            className="rounded-2xl border border-slate-300 bg-white p-6 shadow-md shadow-slate-900/[0.05] sm:p-8"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-semibold text-slate-900">
                Name
                <input
                  name="name"
                  required
                  className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-medium outline-none transition focus:border-[#005BFF] focus:ring-2 focus:ring-blue-100"
                  placeholder="Your name"
                />
              </label>

              <label className="grid gap-2 text-sm font-semibold text-slate-900">
                Email
                <input
                  name="email"
                  type="email"
                  required
                  className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-medium outline-none transition focus:border-[#005BFF] focus:ring-2 focus:ring-blue-100"
                  placeholder="your@email.com"
                />
              </label>

              <label className="grid gap-2 text-sm font-semibold text-slate-900">
                Phone optional
                <input
                  name="phone"
                  className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-medium outline-none transition focus:border-[#005BFF] focus:ring-2 focus:ring-blue-100"
                  placeholder="Phone number"
                />
              </label>

              <label className="grid gap-2 text-sm font-semibold text-slate-900">
                Subject
                <input
                  name="subject"
                  required
                  className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-medium outline-none transition focus:border-[#005BFF] focus:ring-2 focus:ring-blue-100"
                  placeholder="What is this about?"
                />
              </label>
            </div>

            <label className="mt-4 grid gap-2 text-sm font-semibold text-slate-900">
              Message
              <textarea
                name="message"
                required
                rows={7}
                className="resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm font-medium leading-6 outline-none transition focus:border-[#005BFF] focus:ring-2 focus:ring-blue-100"
                placeholder="Write your question or feedback here..."
              />
            </label>

            <input
              name="website"
              tabIndex={-1}
              autoComplete="off"
              className="hidden"
              aria-hidden="true"
            />

            {status === "success" && (
              <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                Your message has been sent. Thank you for contacting AutoDeal.ie.
              </p>
            )}

            {status === "error" && (
              <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={status === "sending"}
              className="mt-6 w-full rounded-xl bg-[linear-gradient(135deg,#005BFF_0%,#1677FF_55%,#00A3FF_100%)] px-6 py-4 text-base font-bold text-white shadow-lg shadow-blue-500/20 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-500/25 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {status === "sending" ? "Sending..." : "Send Message"}
            </button>
          </form>
        </div>
      </section>
    </main>
  )
}

function InfoBlock({
  title,
  text,
}: {
  title: string
  text: string
}) {
  return (
    <div className="border-l-4 border-[#005BFF] pl-4">
      <h3 className="font-bold text-slate-950">{title}</h3>
      <p className="mt-1">{text}</p>
    </div>
  )
}



