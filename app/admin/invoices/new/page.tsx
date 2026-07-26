import { getEligibleJobsAction } from "@/actions/invoice.action";
import AdminNewInvoiceClient from "./client";

export default async function AdminNewInvoicePage() {
    const res = await getEligibleJobsAction();
    const eligibleJobs = res.success ? (res.data ?? []) : [];
    return <AdminNewInvoiceClient eligibleJobs={eligibleJobs} />;
}
