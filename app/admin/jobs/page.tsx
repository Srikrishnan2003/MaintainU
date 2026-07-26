import { getJobsAction } from "@/actions/lifecycle.action";
import { jobsFilterSchema } from "@/lib/validations/filters";
import { requestStatusEnum } from "@/db/schema";
import AdminJobsClient from "./client";

export default async function AdminJobsPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const params = await searchParams;
    
    const parsedFilters = jobsFilterSchema.parse({
        search: typeof params.search === "string" ? params.search : undefined,
        jobStatus: typeof params.jobStatus === "string" ? params.jobStatus : undefined,
        serviceType: typeof params.serviceType === "string" ? params.serviceType : undefined,
        priority: typeof params.priority === "string" ? params.priority : undefined,
    });

    const res = await getJobsAction({
        search: parsedFilters.search,
        status: parsedFilters.jobStatus as typeof requestStatusEnum.enumValues[number] | undefined,
        serviceType: parsedFilters.serviceType as "ELECTRICAL" | "PLUMBING" | "HVAC" | "MECHANICAL" | "GENERAL" | undefined,
        priority: parsedFilters.priority as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | undefined,
    });

    const data = res.data || [];

    return <AdminJobsClient initialJobs={data} />;
}
