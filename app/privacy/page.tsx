import Link from "next/link"

export const metadata = {
  title: "Privacy Policy - AutoDeal.ie",
  description: "Privacy Policy for AutoDeal.ie, operated by Bidauto Ltd.",
}

type PolicyGroup = {
  heading: string
  items: string[]
}

type PolicySection = {
  title: string
  body?: string[]
  items?: string[]
  groups?: PolicyGroup[]
}

const policySections: PolicySection[] = [
  {
    title: "1. Introduction",
    body: [
      "This privacy policy explains how AutoDeal.ie collects, uses, and protects your personal information when you use our website. By using our platform, you agree to the terms described in this policy. We are committed to safeguarding your privacy and ensuring your data is handled securely.",
    ],
  },
  {
    title: "2. Information We Collect",
    body: [
      "We collect the following types of information to provide you with the best possible service:",
    ],
    groups: [
      {
        heading: "(a) Information you provide directly:",
        items: [
          "Account Registration: Name, email address, password, and profile details.",
          "Listing a Vehicle: Car details, photographs, location, contact phone number.",
          "Communications: Messages sent via the platform, inquiries, and customer support requests.",
          "Transactions: Payment and billing information for premium or dealership plans, processed securely via our payment providers.",
        ],
      },
      {
        heading: "(b) Information collected automatically:",
        items: [
          "We automatically log details such as your IP address, browser type, device information, and usage data, including pages visited and time spent on the site, using cookies and similar tracking technologies to improve performance and user experience.",
        ],
      },
    ],
  },
  {
    title: "3. How We Use Your Information",
    body: [
      "Your information is strictly used for the following purposes:",
    ],
    items: [
      "To create, manage, and authenticate your user account.",
      "To display and publish your car advertisements to potential buyers.",
      "To facilitate secure communication between buyers and sellers.",
      "To process payments and manage VIP/Premium listings.",
      "To analyze site usage, troubleshoot issues, and improve our services.",
      "To comply with legal obligations and enforce our Terms of Use.",
    ],
  },
  {
    title: "4. Sharing Your Information",
    body: [
      "We do not sell, rent, or trade your personal data to third parties for marketing purposes. We may share limited information with trusted third parties exclusively for operational purposes:",
    ],
    items: [
      "Service Providers: Hosting partners, email delivery services, and analytics providers.",
      "Payment Processors: Companies like Stripe to handle transactions securely.",
      "Public Display: Information you voluntarily include in your vehicle listings, such as contact numbers, car details, and location, will be publicly visible to other users.",
      "Legal Requirements: If required by law, we may disclose information to law enforcement or regulatory agencies.",
    ],
  },
  {
    title: "5. Cookies and Tracking Technologies",
    body: [
      "AutoDeal.ie uses cookies to remember your preferences, keep you logged in, and analyze site traffic. You can choose to accept or decline cookies through your browser settings or our cookie consent banner. Please note that disabling essential cookies may impact the functionality of our website.",
    ],
  },
  {
    title: "6. Data Security",
    body: [
      "We implement industry-standard security measures, including encryption and secure servers, to protect your personal data from unauthorized access, alteration, disclosure, or destruction. However, please be aware that no method of transmission over the internet is 100% secure.",
    ],
  },
  {
    title: "7. Your Rights",
    body: [
      "Under applicable data protection laws, such as GDPR, you have the right to:",
    ],
    items: [
      "Access the personal data we hold about you.",
      "Request corrections to inaccurate or incomplete data.",
      "Request the deletion of your personal data, also known as the Right to be Forgotten.",
      "Withdraw consent for marketing communications at any time.",
      "To exercise any of these rights, please contact our support team using the information provided below.",
    ],
  },
  {
    title: "8. Changes to This Policy",
    body: [
      "We reserve the right to update or modify this Privacy Policy at any time. Any changes will be posted on this page with an updated Effective Date. We encourage you to review this policy periodically.",
    ],
  },
]

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="relative overflow-hidden bg-[#07111F] px-6 py-16 text-white sm:py-20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(0,91,255,0.35),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(0,163,255,0.24),transparent_32%)]" />
        <div className="relative mx-auto max-w-5xl">
          <div className="mb-7 flex flex-wrap items-center gap-3 text-sm font-semibold text-blue-100">
            <Link
              href="/"
              className="rounded-full border border-white/20 bg-white/10 px-4 py-2 transition hover:bg-white/15"
            >
              Back to Home
            </Link>
            <span>Privacy Policy</span>
          </div>

          <div className="max-w-3xl">
            <p className="mb-4 inline-flex rounded-full bg-blue-500 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.18em]">
              AutoDeal.ie Privacy
            </p>
            <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
              Privacy Policy
            </h1>
            <p className="mt-5 max-w-2xl text-lg font-medium leading-8 text-slate-200">
              Clear information about how AutoDeal.ie collects, uses, protects,
              and manages personal data across the marketplace.
            </p>
          </div>
        </div>
      </section>

      <section className="px-6 py-12 sm:py-16">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8 grid gap-4 rounded-[22px] border border-slate-200 bg-white p-6 shadow-sm sm:grid-cols-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                Effective Date
              </p>
              <p className="mt-2 text-lg font-extrabold text-slate-950">
                28 October 2025
              </p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                Website
              </p>
              <p className="mt-2 text-lg font-extrabold text-slate-950">
                www.autodeal.ie
              </p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                Controller
              </p>
              <p className="mt-2 text-lg font-extrabold text-slate-950">
                AutoDeal.ie (Bidauto Ltd)
              </p>
            </div>
          </div>

          <div className="space-y-5">
            {policySections.map((section) => (
              <article
                key={section.title}
                className="rounded-[22px] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-8"
              >
                <h2 className="text-2xl font-extrabold tracking-tight text-slate-950">
                  {section.title}
                </h2>

                <div className="mt-4 space-y-4 text-base leading-8 text-slate-700">
                  {section.body?.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}

                  {section.groups?.map((group) => (
                    <div key={group.heading} className="space-y-3">
                      <h3 className="font-extrabold text-slate-900">
                        {group.heading}
                      </h3>
                      <ul className="space-y-2">
                        {group.items.map((item) => (
                          <li key={item} className="flex gap-3">
                            <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}

                  {section.items ? (
                    <ul className="space-y-2">
                      {section.items.map((item) => (
                        <li key={item} className="flex gap-3">
                          <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </article>
            ))}

            <article className="rounded-[24px] border border-blue-100 bg-gradient-to-br from-blue-50 to-sky-50 p-6 shadow-sm sm:p-8">
              <h2 className="text-2xl font-extrabold tracking-tight text-slate-950">
                9. Contact Us
              </h2>
              <p className="mt-4 text-base leading-8 text-slate-700">
                If you have any questions, concerns, or requests regarding this
                Privacy Policy or how we handle your personal data, please
                contact us at:
              </p>

              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-white bg-white/80 p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                    Email
                  </p>
                  <p className="mt-2 font-extrabold text-blue-700">
                    privacy@autodeal.ie
                  </p>
                </div>
                <div className="rounded-2xl border border-white bg-white/80 p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                    Company
                  </p>
                  <p className="mt-2 font-extrabold text-slate-950">
                    Bidauto Ltd
                  </p>
                </div>
                <div className="rounded-2xl border border-white bg-white/80 p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                    Address
                  </p>
                  <p className="mt-2 font-extrabold text-slate-950">
                    Kilkenny, Ireland
                  </p>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>
    </main>
  )
}
