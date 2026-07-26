import { getApprovalsAction } from "@/actions/admin.action";
import { approvalsFilterSchema } from "@/lib/validations/filters";
import ApprovalsClient from "./client";

export default async function AdminApprovalsPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const params = await searchParams;
    
    const parsedFilters = approvalsFilterSchema.parse({
        search: typeof params.search === "string" ? params.search : undefined,
        status: typeof params.status === "string" ? params.status : undefined,
    });

    const res = await getApprovalsAction(parsedFilters);
    const data = res.approvals || [];

    return <ApprovalsClient initialData={data} />;
}
