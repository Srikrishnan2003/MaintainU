"use client";

import { useRouter } from "next/navigation";
import { BottomNav } from "@/components/navigation/bottom-nav";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Receipt, FileText, ChevronRight, Search } from "lucide-react";
import { ErrorBoundary } from "@/components/error-boundary";

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
        case "Draft":     return "bg-slate-500/10 text-slate-500 border-slate-500/20";
        case "Sent":      return "bg-blue-500/10 text-blue-600 border-blue-500/20";
        case "Paid":      return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
        case "Overdue":   return "bg-red-500/10 text-red-600 border-red-500/20";
        case "Cancelled": return "bg-slate-400/10 text-slate-400 border-slate-400/20";
        default:          return "bg-slate-500/10 text-slate-500 border-slate-500/20";
    }
}

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
}

function formatDate(date: Date | null): string {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function CompanyInvoicesClient({ initialInvoices }: { initialInvoices: Invoice[] }) {
    const router = useRouter();

    return (
        <div className="min-h-screen bg-background pb-32">
            <header className="sticky top-0 z-50 px-6 py-5 bg-background/80 backdrop-blur-2xl border-b border-border/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary border border-primary/20">
                        <Receipt className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight">Invoices</h1>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">Your Billing History</p>
                    </div>
                </div>
                <ThemeToggle />
            </header>

            <main className="px-6 py-6 space-y-4">
                <p className="text-xs font-bold text-foreground/50 uppercase tracking-widest pl-1">
                    {initialInvoices.length} {initialInvoices.length === 1 ? "Invoice" : "Invoices"}
                </p>

                <ErrorBoundary>
                    {initialInvoices.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 px-4 bg-muted/20 border border-dashed border-border/80 rounded-[2rem]">
                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-5 ring-4 ring-primary/5">
                            <Search className="w-8 h-8 text-primary/60" />
                        </div>
                        <p className="text-foreground font-semibold text-center text-base">No invoices yet.</p>
                        <p className="text-muted-foreground text-sm text-center mt-1">Invoices will appear here once they are generated.</p>
                    </div>
                ) : (
                    <div className="space-y-3.5">
                        {initialInvoices.map(inv => (
                            <div
                                key={inv.id}
                                onClick={() => router.push(`/company/invoices/${inv.id}`)}
                                className="group bg-card border border-border/60 hover:border-primary/40 rounded-[1.25rem] p-4 transition-all duration-300 hover:shadow-md cursor-pointer flex flex-col gap-3 ring-1 ring-black/5 dark:ring-white/5"
                            >
                                <div className="flex justify-between items-start gap-4">
                                    <div className="flex gap-3">
                                        <div className="w-12 h-12 flex-shrink-0 flex items-center justify-center rounded-[1rem] bg-muted border border-border/50 text-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                            <FileText className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-muted-foreground font-mono">#{inv.id.split("-")[0].toUpperCase()}</p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className={`px-2 py-0.5 rounded border text-[8px] font-black tracking-widest uppercase ${getStatusStyle(inv.status)}`}>
                                                    {inv.status}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-black">{formatCurrency(inv.totalAmount)}</span>
                                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                            <ChevronRight className="w-4 h-4" />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2 pt-3 border-t border-border/50">
                                    <div>
                                        <p className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest">Job Ref</p>
                                        <p className="text-xs font-semibold font-mono">#{inv.jobId.split("-")[0].toUpperCase()}</p>
                                    </div>
                                    <div className="items-end flex flex-col">
                                        <p className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest">Date</p>
                                        <p className="text-xs font-semibold">{formatDate(inv.generatedAt)}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                </ErrorBoundary>
            </main>

            <BottomNav active="invoices" role="company" />
        </div>
    );
}
