import Link from "next/link"

const values = [
  "Simple, intuitive design",
  "Advanced search for every buyer",
  "Secure buyer and seller messaging",
  "Fair listing options for everyone",
]

const vehicleTypes = [
  { title: "Cars (New & Used)", icon: "car" },
  { title: "Motorcycles", icon: "bike" },
  { title: "Vans & Light Commercial", icon: "van" },
  { title: "Heavy Commercial", icon: "truck" },
  { title: "Fleet Vehicles", icon: "car" },
  { title: "Trade/Dealership Stock", icon: "target" },
]

const reasons = [
  {
    title: "Modern Search & Filtering",
    text: "Find the right vehicle quickly with filters for make, model, fuel type, body style, budget, year, mileage, location and more.",
    tone: "blue",
    icon: "search",
  },
  {
    title: "Secure Built-In Messaging",
    text: "Buyers and sellers can start conversations safely without immediately sharing personal contact details.",
    tone: "purple",
    icon: "message",
  },
  {
    title: "Flexible Listing Plans",
    text: "Private sellers can list simply, while premium visibility and dealer credits give active sellers room to grow.",
    tone: "teal",
    icon: "card",
  },
  {
    title: "Mobile-Optimised Experience",
    text: "AutoDeal.ie is designed to feel fast and polished whether you browse on mobile, tablet, or desktop.",
    tone: "cyan",
    icon: "phone",
  },
  {
    title: "Built for the Irish Market",
    text: "The platform is shaped around Irish buyers and sellers, including counties, vehicle categories, NCT, tax and local search needs.",
    tone: "green",
    icon: "location",
  },
]

export default function AboutPage() {
  return (
    <main className="bg-white text-[#0F172A]">
      <section
        className="relative min-h-[430px] overflow-hidden bg-[#07111F]"
        style={{
          backgroundImage:
            'linear-gradient(90deg, rgba(7,17,31,0.96) 0%, rgba(7,17,31,0.84) 45%, rgba(7,17,31,0.58) 100%), url("/hero-background.png")',
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(0,91,255,0.24),transparent_34%),radial-gradient(circle_at_78%_34%,rgba(0,163,255,0.16),transparent_30%)]" />

        <div className="relative mx-auto flex min-h-[430px] max-w-7xl items-center px-4 py-10">
          <div className="max-w-3xl rounded-[22px] border border-white/12 bg-white/[0.09] p-6 shadow-2xl shadow-black/25 backdrop-blur-xl md:p-8">
            <p className="inline-flex rounded-full bg-[#005BFF] px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-white">
              Ireland Car Marketplace
            </p>
            <h1 className="mt-5 max-w-3xl text-3xl font-black leading-[1.06] tracking-tight text-white md:text-5xl">
              Driving the Future of Vehicle Trading in Ireland
            </h1>
            <p className="mt-5 max-w-2xl text-base font-medium leading-7 text-slate-200 md:text-lg">
              AutoDeal.ie is a modern online marketplace for buying and selling cars,
              motorcycles, and commercial vehicles across Ireland.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/listings"
                className="inline-flex items-center justify-center rounded-xl bg-[linear-gradient(135deg,#005BFF_0%,#1677FF_55%,#00A3FF_100%)] px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-500/25 transition hover:-translate-y-0.5 hover:shadow-xl"
              >
                Browse Listings
              </Link>
              <Link
                href="/sell"
                className="inline-flex items-center justify-center rounded-xl border border-white/25 bg-white/10 px-5 py-2.5 text-sm font-bold text-white backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/15"
              >
                Place Ad
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white px-4 py-4">
        <div className="mx-auto flex max-w-7xl items-center gap-4">
          <Link
            href="/"
            className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-[#005BFF]/40 hover:text-[#005BFF]"
          >
            Back
          </Link>
          <span className="text-sm font-semibold text-[#64748B]">About Us</span>
        </div>
      </section>

      <section className="px-4 py-14">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <h2 className="text-3xl font-black tracking-tight text-[#0F172A] md:text-4xl">About AutoDeal.ie</h2>
          </div>

          <div className="mx-auto mt-7 max-w-4xl space-y-5 text-base leading-7 text-[#475569]">
            <p>
              AutoDeal.ie was built with a clear vision: to modernise and simplify vehicle trading in Ireland.
              Many traditional platforms have become outdated, cluttered, and frustrating to use, so we set out
              to build a streamlined, high-performance solution that puts the user first.
            </p>
            <p>
              We focus on a cleaner experience for buyers, practical tools for sellers, and flexible options for
              private users and dealers. Whether you are selling one family car or managing multiple vehicles,
              AutoDeal.ie is built to make the process clearer, faster, and more professional.
            </p>
          </div>

          <div className="mt-8 grid gap-3 md:grid-cols-2">
            {values.map((item) => (
              <div
                key={item}
                className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-[#F8FAFC] p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-[#005BFF]/35 hover:bg-white hover:shadow-md"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[#005BFF] transition group-hover:bg-[#005BFF] group-hover:text-white">
                  <Icon name="check" />
                </span>
                <span className="text-sm font-bold text-[#1E293B] md:text-base">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#F8FAFC] px-4 py-14">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-black tracking-tight text-[#0F172A] md:text-4xl">What You Can List</h2>
            <p className="mt-4 text-base leading-7 text-[#475569]">
              Our platform supports a wide range of vehicles, helping buyers discover diverse inventory
              and sellers reach the right audience quickly.
            </p>
          </div>

          <div className="mt-9 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {vehicleTypes.map((item) => (
              <div
                key={item.title}
                className="group rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-[#005BFF]/30 hover:shadow-lg"
              >
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-[#005BFF] transition group-hover:bg-[#005BFF] group-hover:text-white">
                  <Icon name={item.icon} />
                </span>
                <h3 className="mt-4 text-base font-bold text-[#1E293B]">{item.title}</h3>
              </div>
            ))}
          </div>

          <p className="mx-auto mt-9 max-w-4xl text-center text-base font-semibold leading-7 text-[#475569]">
            Whether you are selling a single family car or managing a diverse dealership inventory,
            AutoDeal.ie provides flexible solutions tailored to your needs.
          </p>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#07111F] px-4 py-16 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(0,91,255,0.18),transparent_30%),radial-gradient(circle_at_70%_70%,rgba(109,40,217,0.14),transparent_32%)]" />
        <div className="relative mx-auto max-w-6xl">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-black tracking-tight md:text-4xl">Why Choose AutoDeal.ie?</h2>
            <div className="mx-auto mt-4 h-1 w-20 rounded-full bg-[linear-gradient(135deg,#005BFF_0%,#1677FF_55%,#00A3FF_100%)]" />
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {reasons.map((item) => (
              <div
                key={item.title}
                className="group rounded-2xl border border-white/10 bg-white/[0.06] p-6 shadow-xl shadow-black/10 backdrop-blur transition duration-300 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.1]"
              >
                <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${toneClass(item.tone)} shadow-lg`}>
                  <Icon name={item.icon} />
                </span>
                <h3 className="mt-5 text-lg font-black">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-300">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#07111F] px-4 pb-16">
        <div className="mx-auto grid max-w-5xl gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-white/15 bg-white/10 p-6 text-white backdrop-blur md:p-7">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#005BFF]">
              <Icon name="target" />
            </span>
            <h2 className="mt-5 text-2xl font-black">Our Mission</h2>
            <p className="mt-4 text-base leading-7 text-slate-200">
              To provide a transparent, accessible, and user-friendly platform that empowers buyers
              and sellers in the Irish automotive market to trade with confidence and ease.
            </p>
          </div>

          <div className="rounded-2xl bg-[linear-gradient(135deg,#005BFF_0%,#1677FF_55%,#3B35E6_100%)] p-6 text-white shadow-xl shadow-blue-500/20 md:p-7">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15">
              <Icon name="eye" />
            </span>
            <h2 className="mt-5 text-2xl font-black">Our Vision</h2>
            <p className="mt-4 text-base leading-7 text-blue-50">
              To become Ireland's leading and most trusted digital automotive marketplace, setting
              new standards for the vehicle buying and selling experience.
            </p>
          </div>
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/listings"
            className="inline-flex rounded-full bg-white px-6 py-3 text-sm font-black text-[#005BFF] shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
          >
            Start Browsing Cars Now
          </Link>
        </div>
      </section>
    </main>
  )
}

function toneClass(tone: string) {
  if (tone === "purple") return "bg-[#4F46E5] text-white shadow-indigo-500/20"
  if (tone === "teal") return "bg-[#0F9F8B] text-white shadow-teal-500/20"
  if (tone === "cyan") return "bg-[#0284C7] text-white shadow-cyan-500/20"
  if (tone === "green") return "bg-[#059669] text-white shadow-emerald-500/20"
  return "bg-[#005BFF] text-white shadow-blue-500/20"
}

function Icon({ name }: { name: string }) {
  const common = "h-5 w-5"

  if (name === "check") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
        <path d="m7 12 3 3 7-7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }

  if (name === "search") {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" aria-hidden="true">
        <path d="m21 21-4.4-4.4M10.8 18a7.2 7.2 0 1 1 0-14.4 7.2 7.2 0 0 1 0 14.4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
  }

  if (name === "message") {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" aria-hidden="true">
        <path d="M5 6.5A2.5 2.5 0 0 1 7.5 4h9A2.5 2.5 0 0 1 19 6.5v6A2.5 2.5 0 0 1 16.5 15H10l-5 4v-4.5A2.5 2.5 0 0 1 3 12V6.5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      </svg>
    )
  }

  if (name === "card") {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" aria-hidden="true">
        <path d="M4 7h16v10H4V7Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <path d="M4 10h16" stroke="currentColor" strokeWidth="2" />
      </svg>
    )
  }

  if (name === "phone") {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" aria-hidden="true">
        <path d="M8 3.5h8v17H8v-17Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <path d="M11 17.5h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
  }

  if (name === "location") {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" aria-hidden="true">
        <path d="M12 21s6-5.1 6-11a6 6 0 1 0-12 0c0 5.9 6 11 6 11Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <path d="M12 12.2a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4Z" stroke="currentColor" strokeWidth="2" />
      </svg>
    )
  }

  if (name === "bike") {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" aria-hidden="true">
        <path d="M6 18a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM18 18a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM9 15h3l2-5h2M10 8h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }

  if (name === "van" || name === "truck") {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" aria-hidden="true">
        <path d="M3 7h11v9H3V7ZM14 10h3.5l3.5 3.5V16h-7v-6Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <path d="M7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM18 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" stroke="currentColor" strokeWidth="2" />
      </svg>
    )
  }

  if (name === "target") {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" aria-hidden="true">
        <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" stroke="currentColor" strokeWidth="2" />
        <path d="M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z" stroke="currentColor" strokeWidth="2" />
        <path d="M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" stroke="currentColor" strokeWidth="2" />
      </svg>
    )
  }

  if (name === "eye") {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" aria-hidden="true">
        <path d="M3 12s3.2-6 9-6 9 6 9 6-3.2 6-9 6-9-6-9-6Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <path d="M12 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" stroke="currentColor" strokeWidth="2" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" className={common} fill="none" aria-hidden="true">
      <path d="M5 16h14l-1.2-4.1A3 3 0 0 0 15 10H9a3 3 0 0 0-2.8 1.9L5 16Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M7 16v1.2M17 16v1.2M8 18.5h.01M16 18.5h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
