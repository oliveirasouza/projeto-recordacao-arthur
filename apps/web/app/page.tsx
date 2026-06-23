import { auth } from "@/auth"
import { getMoments } from "@/lib/data-service"
import { DashboardContainer } from "@/components/dashboard-container"

export const dynamic = "force-dynamic"

export default async function Page() {
  const session = await auth()
  const moments = await getMoments()

  return <DashboardContainer session={session} initialMoments={moments} />
}
