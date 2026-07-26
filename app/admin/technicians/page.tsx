import { getTechniciansAction } from "@/actions/admin.action";

import { techniciansFilterSchema } from "@/lib/validations/filters";
import AdminTechniciansClient from "./client";

export default async function AdminTechniciansPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const params = await searchParams;
    
    const parsedFilters = techniciansFilterSchema.parse({
        search: typeof params.search === "string" ? params.search : undefined,
        status: typeof params.status === "string" ? params.status : undefined,
        serviceType: typeof params.serviceType === "string" ? params.serviceType : undefined,
    });

    const res = await getTechniciansAction(parsedFilters);
    const data = res.technicians || [];

    return <AdminTechniciansClient initialData={data} />;
}
