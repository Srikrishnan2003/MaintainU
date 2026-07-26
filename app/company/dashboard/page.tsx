import { CompanyDashboardClient } from "./client"
import { getCompanyRequestsAction, getCompanyProfileAction } from "@/actions/company.action"

export default async function CompanyDashboard() {
  let requests: any[] = [];
  let companyId: string = "";
  try {
    const [res, profileRes] = await Promise.all([
      getCompanyRequestsAction().catch(() => ({ requests: [] })),
      getCompanyProfileAction().catch(() => ({ success: false, data: null }))
    ]);
    if (res?.requests) {
      requests = res.requests
    }
    if (profileRes?.success && profileRes?.data) {
      companyId = profileRes.data.id;
    }
  } catch (error) {
    console.error("Failed to fetch dashboard data", error)
  }

  return <CompanyDashboardClient initialRequests={requests} companyId={companyId} />
}
