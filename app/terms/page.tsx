import Link from "next/link"

const termsSections = [
  {
    title: "1. User Agreement",
    body: [
      "By accessing or using autodeal.ie, you agree to be bound by these Terms of Use and our Privacy Policy. If you do not agree with any part of these terms, you must not use our website or services. You must be at least 18 years old to use this platform.",
    ],
  },
  {
    title: "2. User Responsibilities",
    intro: "When using AutoDeal.ie, you agree that:",
    bullets: [
      "All information provided in your listings is accurate, complete, and not misleading.",
      "You have the legal right to sell any vehicle you list on the platform.",
      "You will not use the platform for any illegal, fraudulent, or malicious activities.",
      "You are responsible for maintaining the confidentiality of your account credentials.",
      "You will communicate respectfully with other users and avoid abusive language.",
    ],
  },
  {
    title: "3. Intellectual Property",
    body: [
      "The content, design, logos, and software on AutoDeal.ie are the property of Bidauto Ltd and are protected by intellectual property laws. You may not copy, modify, distribute, or reproduce any part of our platform without our express written consent.",
      "By uploading content, such as photos and vehicle descriptions, to AutoDeal.ie, you grant us a non-exclusive, worldwide, royalty-free license to use, display, and distribute that content in connection with our services.",
    ],
  },
  {
    title: "4. Disclaimer of Warranties",
    body: [
      'AutoDeal.ie is provided on an "as is" and "as available" basis. We make no warranties, expressed or implied, regarding the accuracy, reliability, or availability of the platform or the vehicles listed on it.',
      "We do not verify the condition, ownership, or history of any vehicles listed by users. All transactions are solely between the buyer and the seller.",
    ],
  },
  {
    title: "5. Limitation of Liability",
    body: [
      "To the fullest extent permitted by law, AutoDeal.ie and Bidauto Ltd shall not be liable for any direct, indirect, incidental, consequential, or punitive damages arising from your use of the platform, your inability to use the platform, or any transactions conducted through the platform.",
      "This includes, but is not limited to, losses from fraud, inaccurate listings, or technical issues.",
    ],
  },
  {
    title: "6. Modification of Terms",
    body: [
      'We reserve the right to modify these Terms of Use at any time. Any changes will be effective immediately upon posting on this page, with the "Effective Date" updated accordingly.',
      "Your continued use of AutoDeal.ie after any changes constitutes your acceptance of the new terms.",
    ],
  },
  {
    title: "7. Governing Law",
    body: [
      "These Terms of Use shall be governed by and construed in accordance with the laws of Ireland. Any disputes arising from or related to these terms or your use of AutoDeal.ie shall be subject to the exclusive jurisdiction of the courts of Ireland.",
    ],
  },
]

export const metadata = {
  title: "Terms of Use | AutoDeal.ie",
  description: "AutoDeal.ie Terms of Use for buyers, sellers, and visitors.",
}

export default function TermsPage() {
  return (
    <main className="bg-slate-50 text-slate-950">
      <section className="relative overflow-hidden bg-[#07111F] px-5 py-14 text-white sm:py-16">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(0,91,255,0.32),transparent_32%),radial-gradient(circle_at_86%_0%,rgba(0,163,255,0.16),transparent_28%)]" />
        <div className="relative mx-auto max-w-5xl">
          <Link
            href="/"
            className="mb-8 inline-flex rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/15"
          >
            Back to homepage
          </Link>

          <div className="max-w-3xl">
            <p className="mb-4 inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-blue-100">
              Legal
            </p>
            <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
              Terms of Use
            </h1>
            <p className="mt-4 text-sm font-semibold text-blue-100">
              Effective Date: 28 October 2025
            </p>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300">
              Please read these terms carefully before using AutoDeal.ie. These
              terms explain your responsibilities when buying, selling, browsing,
              or communicating through our platform.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-10 sm:py-12">
        <div className="space-y-5">
          {termsSections.map((section) => (
            <article
              key={section.title}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-blue-100 hover:shadow-md"
            >
              <h2 className="text-xl font-black tracking-tight text-slate-950">
                {section.title}
              </h2>

              {section.intro ? (
                <p className="mt-3 text-[15px] leading-7 text-slate-700">
                  {section.intro}
                </p>
              ) : null}

              {section.body?.map((paragraph) => (
                <p
                  key={paragraph}
                  className="mt-3 text-[15px] leading-7 text-slate-700"
                >
                  {paragraph}
                </p>
              ))}

              {section.bullets ? (
                <ul className="mt-4 space-y-2 text-[15px] leading-7 text-slate-700">
                  {section.bullets.map((item) => (
                    <li key={item} className="flex gap-3">
                      <span className="mt-3 h-1.5 w-1.5 flex-none rounded-full bg-[#005BFF]" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </article>
          ))}

          <article className="rounded-2xl border border-blue-100 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black tracking-tight text-slate-950">
              8. Contact Information
            </h2>
            <p className="mt-3 text-[15px] leading-7 text-slate-700">
              If you have any questions or concerns about these Terms of Use,
              please contact us at:
            </p>
            <div className="mt-5 grid gap-3 text-sm text-slate-700 sm:grid-cols-3">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="font-black text-slate-950">Email</p>
                <p className="mt-1">support@autodeal.ie</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="font-black text-slate-950">Company</p>
                <p className="mt-1">Bidauto Ltd</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="font-black text-slate-950">Address</p>
                <p className="mt-1">Kilkenny, Ireland</p>
              </div>
            </div>
          </article>
        </div>
      </section>
    </main>
  )
}
