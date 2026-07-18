import Link from "next/link"

export default function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white px-4 py-14">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-10 md:grid-cols-[1.35fr_1fr_1fr_1fr]">
          <div>
            <Link href="/" className="inline-flex items-center" aria-label="AutoDeal.ie home">
              <img
                src="/brand/autodeal-logo.png"
                alt="AutoDeal.ie"
                className="h-8 w-auto max-w-[180px] object-contain"
              />
            </Link>

            <p className="mt-5 max-w-sm text-sm leading-7 text-[#475569]">
              Ireland&apos;s modern marketplace for buying and selling new and used cars,
              motorcycles, and commercial vehicles.
            </p>

            <div className="mt-6 space-y-2 text-sm font-semibold text-[#64748B]">
              <p>Bidauto Ltd</p>
              <p>Kilkenny, Ireland</p>
              <p>support@autodeal.ie</p>
            </div>
          </div>

          <div>
            <h3 className="text-base font-black text-[#0F172A]">Quick Links</h3>
            <div className="mt-5 grid gap-3 text-sm font-semibold text-[#64748B]">
              <FooterLink href="/about">About AutoDeal</FooterLink>
              <FooterLink href="/contact">Contact Support</FooterLink>
              <FooterLink href="/faq">FAQ</FooterLink>
              <FooterLink href="/terms">Terms of Use</FooterLink>
              <FooterLink href="/privacy">Privacy Policy</FooterLink>
            </div>
          </div>

          <div>
            <h3 className="text-base font-black text-[#0F172A]">Find Cars</h3>
            <div className="mt-5 grid gap-3 text-sm font-semibold text-[#64748B]">
              <FooterLink href="/listings">Used Cars Ireland</FooterLink>
              <FooterLink href="/listings?type=cars">New Cars for Sale</FooterLink>
              <FooterLink href="/listings?type=cars&fuel=Electric">Electric Cars</FooterLink>
              <FooterLink href="/sell">Sell Your Car</FooterLink>
            </div>
          </div>

          <div>
            <h3 className="text-base font-black text-[#0F172A]">Follow Us</h3>
            <div className="mt-5 flex gap-3">
              <FooterSocial label="Facebook">f</FooterSocial>
              <FooterSocial label="X">x</FooterSocial>
              <FooterSocial label="Instagram">ig</FooterSocial>
              <FooterSocial label="LinkedIn">in</FooterSocial>
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-slate-200 pt-8 text-center text-xs font-medium text-[#64748B]">
          © 2026 AutoDeal.ie (Bidauto Ltd). All rights reserved. Registered in Ireland.
        </div>
      </div>
    </footer>
  )
}

function FooterLink({
  href,
  children,
}: {
  href: string
  children: React.ReactNode
}) {
  return (
    <Link href={href} className="transition hover:text-[#005BFF]">
      {children}
    </Link>
  )
}

function FooterSocial({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <span
      title={label}
      className="flex h-11 w-11 items-center justify-center rounded-full bg-[#F8FAFC] text-sm font-black text-[#64748B] transition hover:-translate-y-0.5 hover:bg-[#EAF3FF] hover:text-[#005BFF]"
    >
      {children}
    </span>
  )
}




