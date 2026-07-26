import { getSubstitutionsAction } from "@/actions/substitution.action"
import SubstitutionClient from "./client"

export const dynamic = "force-dynamic"

export default async function AdminSubstitutionsPage({
    searchParams
}: {
    searchParams: Promise<{ status?: string, q?: string }>
}) {
    const params = await searchParams
    // Pass down the filter parameters to let the client component manage state
    const filters: any = {}
    if (params.status && params.status !== "All") filters.status = params.status
  
  // We fetch initial data without complex date filters, client can refine
  const res = await getSubstitutionsAction(filters)
  const data = res.success ? res.data : []
  
  return <SubstitutionClient initialData={data || []} />
}
