import { getInvoiceByIdAction } from "@/actions/invoice.action";
import AdminInvoiceDetailClient from "./client";
import { notFound } from "next/navigation";

export default async function AdminInvoiceDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const res = await getInvoiceByIdAction(id);

    if (!res.success || !res.data) {
        notFound();
    }

    return <AdminInvoiceDetailClient invoice={res.data} />;
}
