import Link from "next/link"

const paidPlans = [
  {
    name: "Free Listing",
    price: "EUR0",
    details: [
      "Active for 30 days",
      "Up to 5 photos",
      "Standard visibility in search",
      "Direct buyer messaging",
      "No Stripe checkout required",
    ],
  },
  {
    name: "Premium",
    price: "EUR2.99",
    details: [
      "Active for 60 days",
      "Up to 20 photos plus video",
      "Priority placement in search results",
      "Featured homepage visibility",
      "Premium badge on your listing",
    ],
  },
  {
    name: "Dealer Credit Packs",
    price: "From EUR9.99",
    details: [
      "Starter: 10 credits for EUR9.99",
      "Pro: 35 credits for EUR19.99",
      "Elite: 100 credits for EUR49.00",
      "1 credit equals 1 Premium paid listing",
      "One-time purchases, not subscriptions",
    ],
  },
]

const faqs = [
  {
    question: "1. What is autodeal.ie?",
    answer:
      "autodeal.ie is a simple and easy-to-use platform where anyone can sell or buy a car online. We connect private sellers and buyers across Ireland in one convenient place.",
  },
  {
    question: "2. How do I post my car for sale?",
    answer:
      "Click Sell Your Car on the homepage. Choose a plan, enter your car details, upload photos, write a short description, review your listing and publish it.",
  },
  {
    question: "3. What paid plans and upgrades are available?",
    answer:
      "AutoDeal.ie offers a free listing option, a paid Premium option for extra visibility, and dealer credit packs for sellers who list multiple vehicles.",
    plans: paidPlans,
  },
  {
    question: "4. How long will my listing stay active?",
    answer:
      "Listings remain active for 30 days. You can edit, renew, or delete your listing anytime from your account dashboard.",
  },
  {
    question: "5. How can buyers contact me?",
    answer:
      "Interested buyers can reach you through the contact options on your listing page, including the message button, phone number, or email if you choose to display them.",
  },
  {
    question: "6. Does autodeal.ie handle payments or transactions?",
    answer:
      "No. autodeal.ie only provides the platform for connecting buyers and sellers. We do not process vehicle payments, deposits, deliveries, or ownership transfers. All transactions and arrangements are made directly between users.",
  },
  {
    question: "7. How can I avoid scams or suspicious buyers?",
    answer:
      "Be cautious of anyone offering to pay more than your asking price. Avoid sending money or car documents before meeting in person. Meet in a public place whenever possible and report suspicious messages or users to our support team immediately.",
  },
  {
    question: "8. Can I edit my listing after posting?",
    answer:
      "Yes. You can log in to your account at any time and edit your listing, update photos, change the price, or adjust details easily.",
  },
  {
    question: "9. What should I do when my car is sold?",
    answer:
      "Once you have sold your car, please mark your listing as Sold or remove it from your account to keep AutoDeal.ie listings accurate and up to date.",
  },
  {
    question: "10. How can I contact the autodeal.ie team?",
    answer:
      "If you need help or have questions, reach out to us via support@autodeal.ie or use the Contact Support page on our website.",
  },
]

export const metadata = {
  title: "Frequently Asked Questions | AutoDeal.ie",
  description: "Answers to common questions about selling and buying vehicles on AutoDeal.ie.",
}

export default function FAQPage() {
  return (
    <main className="bg-slate-50 text-slate-950">
      <section className="relative overflow-hidden bg-[#07111F] px-5 py-16 text-white sm:py-20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(0,91,255,0.34),transparent_34%),radial-gradient(circle_at_85%_10%,rgba(0,163,255,0.18),transparent_28%)]" />
        <div className="relative mx-auto max-w-5xl text-center">
          <p className="mx-auto mb-5 inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-blue-100">
            Help Centre
          </p>
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
            Frequently Asked Questions
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
            Clear answers about listing your vehicle, paid upgrades, buyer contact,
            safety, and managing your AutoDeal.ie account.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/sell"
              className="rounded-xl bg-gradient-to-r from-[#005BFF] via-[#1677FF] to-[#00A3FF] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-950/25 transition hover:-translate-y-0.5 hover:shadow-xl"
            >
              Sell Your Car
            </Link>
            <Link
              href="/listings"
              className="rounded-xl border border-white/25 bg-white/10 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/15"
            >
              Browse Listings
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-12 sm:py-14">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
              Common Questions
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Everything important in one simple place.
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex w-fit items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm transition hover:border-blue-200 hover:text-[#005BFF]"
          >
            Back to homepage
          </Link>
        </div>

        <div className="space-y-4">
          {faqs.map((item) => (
            <article
              key={item.question}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-100 hover:shadow-md"
            >
              <h3 className="text-lg font-extrabold text-slate-950">
                {item.question}
              </h3>
              <p className="mt-3 text-[15px] leading-7 text-slate-700">
                {item.answer}
              </p>

              {item.plans ? (
                <div className="mt-5 grid gap-4 md:grid-cols-3">
                  {item.plans.map((plan) => (
                    <div
                      key={plan.name}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <h4 className="font-extrabold text-slate-950">
                          {plan.name}
                        </h4>
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-[#005BFF]">
                          {plan.price}
                        </span>
                      </div>
                      <ul className="mt-4 space-y-2 text-sm leading-6 text-slate-700">
                        {plan.details.map((detail) => (
                          <li key={detail} className="flex gap-2">
                            <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[#005BFF]" />
                            <span>{detail}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}
