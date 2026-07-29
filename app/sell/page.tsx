import { connection } from "next/server"
import SellPageClient from "./SellPageClient"

export default async function SellPage() {
  await connection()

  return <SellPageClient />
}
