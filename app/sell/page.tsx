import { connection } from "next/server"
import PremiumCheckoutGuard from "./PremiumCheckoutGuard"
import SellPageClient from "./SellPageClient"

export default async function SellPage() {
  await connection()

  return (
    <>
      <SellPageClient />
      <PremiumCheckoutGuard />
    </>
  )
}
