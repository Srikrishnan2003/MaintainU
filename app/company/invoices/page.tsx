import { getInvoicesAction } from "@/actions/invoice.action";
import CompanyInvoicesClient from "./client";

export default async function CompanyInvoicesPage() {
    const res = await getInvoicesAction();
    const data = res.success ? (res.data ?? []) : [];

    return <CompanyInvoicesClient initialInvoices={data} />;
}
