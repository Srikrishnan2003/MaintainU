import { getInvoicesAction } from "@/actions/invoice.action";
import AdminInvoicesClient from "./client";
import { getInvoicesFiltersSchema } from "@/lib/validations/invoice.validations";

export default async function AdminInvoicesPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const params = await searchParams;

    const parsedFilters = getInvoicesFiltersSchema.parse({
        status: typeof params.status === "string" ? params.status : undefined,
        dateFrom: typeof params.dateFrom === "string" ? params.dateFrom : undefined,
        dateTo: typeof params.dateTo === "string" ? params.dateTo : undefined,
        search: typeof params.search === "string" ? params.search : undefined,
    });

    const res = await getInvoicesAction(parsedFilters);
    const data = res.success ? (res.data ?? []) : [];

    return <AdminInvoicesClient initialInvoices={data} />;
}
