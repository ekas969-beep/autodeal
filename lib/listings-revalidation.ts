import { revalidatePath, revalidateTag } from "next/cache"

export function revalidatePublicListings() {
  revalidateTag("public-listings", { expire: 0 })
  revalidatePath("/", "page")
  revalidatePath("/listings", "page")
}
