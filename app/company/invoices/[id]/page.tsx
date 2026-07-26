import { getInvoiceByIdAction } from "@/actions/invoice.action";
import CompanyInvoiceDetailClient from "./client";
import { notFound } from "next/navigation";

export default async function CompanyInvoiceDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const res = await getInvoiceByIdAction(id);

    if (!res.success || !res.data) {
        notFound();
    }

    return <CompanyInvoiceDetailClient invoice={res.data} />;
}
