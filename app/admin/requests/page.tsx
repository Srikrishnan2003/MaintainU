import { db } from "@/lib/db";
import { requests, companies } from "@/db/schema";
import { eq } from "drizzle-orm";
import AdminRequestsClient from "./client";
import { getRequestsAction } from "@/actions/admin.action";
import { requestsFilterSchema } from "@/lib/validations/filters";

export default async function AdminRequestsPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const params = await searchParams;
    
    const parsedFilters = requestsFilterSchema.parse({
        search: typeof params.search === "string" ? params.search : undefined,
        serviceType: typeof params.serviceType === "string" ? params.serviceType : undefined,
        priority: typeof params.priority === "string" ? params.priority : undefined,
        status: typeof params.status === "string" ? params.status : undefined,
    });

    const res = await getRequestsAction(parsedFilters);
    const data = res.requests || [];

    // Extract exactly unique companies for the filter dropdown
    // We fetch this without filters so the dropdown always shows all options
    let uniqueCompanies: string[] = [];
    try {
        const allReqs = await db.select({ companyName: companies.companyName })
            .from(requests)
            .leftJoin(companies, eq(requests.companyId, companies.id));
        uniqueCompanies = Array.from(new Set(allReqs.map(d => d.companyName).filter(Boolean))) as string[];
    } catch (e) {
        console.error("Failed to fetch unique companies:", e);
        // Fallback to currently fetched data if the global query fails
        uniqueCompanies = Array.from(new Set(data.map((d: any) => d.companyName).filter(Boolean))) as string[];
    }

    return <AdminRequestsClient 
        initialRequests={data} 
        uniqueCompanies={uniqueCompanies} 
    />;
}
