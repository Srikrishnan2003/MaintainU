"use client";

import { useState } from "react";
import { AsyncBoundary } from "@/components/async-boundary";
import { ErrorBoundary } from "@/components/error-boundary";
import { useRouter, useSearchParams } from "next/navigation";
import { BottomNav } from "@/components/navigation/bottom-nav";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { FilterBar, FilterConfig } from "@/components/admin/FilterBar";
import { Receipt, Plus, Search, ChevronRight, FileText, Download, Loader2 } from "lucide-react";
import { exportInvoicesAction } from "@/actions/invoice.action";
import { exportToCSV } from "@/services/export.service";
import { toast } from "sonner";

type InvoiceStatus = "Draft" | "Sent" | "Paid" | "Overdue" | "Cancelled";

interface Invoice {
    id: string;
    jobId: string;
    totalAmount: number;
    status: InvoiceStatus | null;
    generatedAt: Date | null;
    pdfUrl: string | null;
    companyName: string;
    companyId: string;
}

function getStatusStyle(status: string | null): string {
    switch (status) {
        case "Draft":      return "bg-slate-500/10 text-slate-500 border-slate-500/20";
        case "Sent":       return "bg-blue-500/10 text-blue-600 border-blue-500/20";
        case "Paid":       return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
        case "Overdue":    return "bg-red-500/10 text-red-600 border-red-500/20";
        case "Cancelled":  return "bg-slate-400/10 text-slate-400 border-slate-400/20";
        default:           return "bg-slate-500/10 text-slate-500 border-slate-500/20";
    }
}

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(amount);
}

function formatDate(date: Date | null): string {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}

const filterConfig: FilterConfig[] = [
    { key: "search", label: "Search", type: "search", placeholder: "Search by company name..." },
    {
        key: "status",
        label: "STATUS",
        type: "select",
        options: [
            { value: "Draft",     label: "Draft" },
            { value: "Sent",      label: "Sent" },
            { value: "Paid",      label: "Paid" },
            { value: "Overdue",   label: "Overdue" },
            { value: "Cancelled", label: "Cancelled" },
        ],
    },
    { key: "dateFrom", label: "FROM DATE", type: "date" },
    { key: "dateTo",   label: "TO DATE",   type: "date" },
];

export default function AdminInvoicesClient({ initialInvoices }: { initialInvoices: Invoice[] }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [exporting, setExporting] = useState(false);

    const handleExport = async () => {
        setExporting(true);
        try {
            const dateFrom = searchParams.get("dateFrom") || undefined;
            const dateTo = searchParams.get("dateTo") || undefined;
            const period = dateFrom || dateTo ? { from: dateFrom || "", to: dateTo || "" } : undefined;

            const res = await exportInvoicesAction(period);
            if (res.success && res.data) {
                exportToCSV(res.data, "invoices_report.csv");
                toast.success("Invoices report exported successfully");
            } else {
                toast.error(res.message || "Failed to export report");
            }
        } catch (e) {
            toast.error("An error occurred during export");
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className="min-h-screen bg-background pb-32 font-sans selection:bg-primary/20">
            {/* Header */}
            <header className="sticky top-0 z-50 px-6 py-5 bg-background/80 backdrop-blur-2xl border-b border-border/50 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary border border-primary/20 shadow-inner">
                            <Receipt className="w-5 h-5" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold tracking-tight text-foreground">Invoices</h1>
                            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">Billing Management</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleExport}
                            disabled={exporting}
                            className="flex items-center gap-1.5 px-3 py-2 bg-muted hover:bg-muted/80 text-foreground text-xs font-bold rounded-xl transition-all shadow-sm border border-border/50 disabled:opacity-50"
                        >
                            {exporting ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                                <Download className="w-3.5 h-3.5" />
                            )}
                            Export
                        </button>
                        <button
                            onClick={() => router.push("/admin/invoices/new")}
                            className="flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-xl hover:opacity-90 transition-all shadow-sm shadow-primary/20"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            Create
                        </button>
                        <ThemeToggle />
                    </div>
                </div>

                <AsyncBoundary>
                    <FilterBar config={filterConfig} />
                </AsyncBoundary>
            </header>

            <main className="px-6 py-6 space-y-4 animate-fade-in-up">
                <div className="flex items-center justify-between pl-1 mb-2">
                    <h2 className="text-xs font-bold text-foreground/50 uppercase tracking-widest">
                        {initialInvoices.length} {initialInvoices.length === 1 ? "Invoice" : "Invoices"} Found
                    </h2>
                </div>

                <ErrorBoundary>
                    {initialInvoices.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 px-4 bg-muted/20 border border-dashed border-border/80 rounded-[2rem]">
                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-5 ring-4 ring-primary/5">
                            <Search className="w-8 h-8 text-primary/60" />
                        </div>
                        <p className="text-foreground font-semibold text-center text-base">No invoices found.</p>
                        <p className="text-muted-foreground text-sm text-center mt-1">Create your first invoice or adjust the filters.</p>
                        <button
                            onClick={() => router.push("/admin/invoices/new")}
                            className="mt-5 flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground text-sm font-bold rounded-xl hover:opacity-90 transition-all"
                        >
                            <Plus className="w-4 h-4" />
                            Create Invoice
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col space-y-3.5">
                        {initialInvoices.map((inv) => (
                            <div
                                key={inv.id}
                                onClick={() => router.push(`/admin/invoices/${inv.id}`)}
                                className="group relative overflow-hidden bg-card border border-border/60 hover:border-primary/40 rounded-[1.25rem] p-4 transition-all duration-300 hover:shadow-md cursor-pointer flex flex-col gap-3 ring-1 ring-black/5 dark:ring-white/5"
                            >
                                <div className="flex justify-between items-start gap-4">
                                    <div className="flex gap-3">
                                        <div className="w-12 h-12 flex-shrink-0 flex items-center justify-center rounded-[1rem] bg-muted border border-border/50 text-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors shadow-sm">
                                            <FileText className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-foreground max-w-[200px] truncate">{inv.companyName}</h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                <p className="text-[10px] text-muted-foreground font-mono font-medium">#{inv.id.split("-")[0].toUpperCase()}</p>
                                                <span className={`px-2 py-0.5 rounded border text-[8px] font-black tracking-widest uppercase ${getStatusStyle(inv.status)}`}>
                                                    {inv.status}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <span className="text-sm font-black text-foreground">{formatCurrency(inv.totalAmount)}</span>
                                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                            <ChevronRight className="w-4 h-4" />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2 pt-3 border-t border-border/50">
                                    <div className="flex flex-col gap-1">
                                        <p className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest">Job ID</p>
                                        <p className="text-xs font-semibold text-foreground font-mono">#{inv.jobId.split("-")[0].toUpperCase()}</p>
                                    </div>
                                    <div className="flex flex-col gap-1 items-end">
                                        <p className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest">Generated</p>
                                        <p className="text-xs font-semibold text-foreground">{formatDate(inv.generatedAt)}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                </ErrorBoundary>
            </main>

            <BottomNav active="invoices" role="admin" />

            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(12px) scale(0.98); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                .animate-fade-in-up { animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            `}} />
        </div>
    );
}
