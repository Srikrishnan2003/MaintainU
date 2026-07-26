"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BottomNav } from "@/components/navigation/bottom-nav";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { updateInvoiceStatusAction, deleteInvoiceAction, generateInvoicePDFAction } from "@/actions/invoice.action";
import {
    ArrowLeft, Receipt, Building2, Briefcase, FileText,
    Trash2, DownloadCloud, AlertCircle, FilePlus
} from "lucide-react";

type InvoiceStatus = "Draft" | "Sent" | "Paid" | "Overdue" | "Cancelled";

interface InvoiceDetail {
    id: string;
    jobId: string;
    laborCost: number;
    materialCost: number | null;
    platformFee: number | null;
    totalAmount: number;
    status: InvoiceStatus | null;
    pdfUrl: string | null;
    generatedAt: Date | null;
    sentAt: Date | null;
    companyName: string;
    companyAddress: string | null;
    companyEmail: string | null;
    companyGstin: string | null;
    jobTitle: string;
    jobDescription: string | null;
    companyUserId: string;
}

const STATUS_OPTIONS: InvoiceStatus[] = ["Draft", "Sent", "Paid", "Overdue", "Cancelled"];

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

function formatCurrency(amount: number | null): string {
    if (amount === null) return "₹0";
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
}

function formatDate(date: Date | null): string {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
}

export default function AdminInvoiceDetailClient({ invoice }: { invoice: InvoiceDetail }) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [status, setStatus] = useState<InvoiceStatus>(invoice.status ?? "Draft");
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [currentPdfUrl, setCurrentPdfUrl] = useState<string | null>(invoice.pdfUrl);

    const handleGeneratePDF = () => {
        setIsGeneratingPdf(true);
        startTransition(async () => {
            const res = await generateInvoicePDFAction(invoice.id);
            if (res.success && res.data?.pdfUrl) {
                setCurrentPdfUrl(res.data.pdfUrl);
                toast.success("PDF Generated Successfully");
            } else {
                toast.error(res.message || "Failed to generate PDF");
            }
            setIsGeneratingPdf(false);
        });
    };

    const handleStatusUpdate = (newStatus: InvoiceStatus) => {
        startTransition(async () => {
            const res = await updateInvoiceStatusAction(invoice.id, newStatus);
            if (res.success) {
                setStatus(newStatus);
                toast.success(`Invoice marked as ${newStatus}`);
            } else {
                toast.error(res.message || "Failed to update status");
            }
        });
    };

    const handleDelete = () => {
        startTransition(async () => {
            const res = await deleteInvoiceAction(invoice.id);
            if (res.success) {
                toast.success("Invoice deleted");
                router.push("/admin/invoices");
            } else {
                toast.error(res.message || "Failed to delete invoice");
            }
        });
    };

    const lineItems = [
        { label: "Labour Cost", amount: invoice.laborCost },
        { label: "Material Cost", amount: invoice.materialCost ?? 0 },
        { label: "Platform Fee", amount: invoice.platformFee ?? 0 },
    ].filter(item => item.amount > 0);

    return (
        <div className="min-h-screen bg-background pb-32">
            {/* Header */}
            <header className="sticky top-0 z-50 px-4 py-4 bg-background/80 backdrop-blur-2xl border-b border-border/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.back()}
                        className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div>
                        <h1 className="text-base font-bold tracking-tight">Invoice Detail</h1>
                        <p className="text-[10px] text-muted-foreground font-mono">#{invoice.id.split("-")[0].toUpperCase()}</p>
                    </div>
                </div>
                <ThemeToggle />
            </header>

            <main className="px-4 py-5 max-w-xl mx-auto space-y-4">
                {/* Status & Header Card */}
                <div className="bg-card border border-border/60 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                <Receipt className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Invoice</p>
                                <p className="text-lg font-black text-foreground">{formatCurrency(invoice.totalAmount)}</p>
                            </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full border text-xs font-bold tracking-wide ${getStatusStyle(status)}`}>
                            {status}
                        </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border/40">
                        <div>
                            <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest mb-0.5">Generated</p>
                            <p className="text-xs font-semibold">{formatDate(invoice.generatedAt)}</p>
                        </div>
                        <div>
                            <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest mb-0.5">Sent At</p>
                            <p className="text-xs font-semibold">{formatDate(invoice.sentAt)}</p>
                        </div>
                    </div>
                </div>

                {/* Company Info */}
                <div className="bg-card border border-border/60 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center gap-2 mb-1">
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Company</p>
                    </div>
                    <p className="text-sm font-bold text-foreground">{invoice.companyName}</p>
                    {invoice.companyAddress && (
                        <p className="text-xs text-muted-foreground">{invoice.companyAddress}</p>
                    )}
                    {invoice.companyEmail && (
                        <p className="text-xs text-muted-foreground">{invoice.companyEmail}</p>
                    )}
                    {invoice.companyGstin && (
                        <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-muted rounded-lg">
                            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wide">GSTIN:</p>
                            <p className="text-[10px] font-mono font-bold text-foreground">{invoice.companyGstin}</p>
                        </div>
                    )}
                </div>

                {/* Job Reference */}
                <div className="bg-card border border-border/60 rounded-2xl p-4 space-y-2">
                    <div className="flex items-center gap-2 mb-1">
                        <Briefcase className="w-4 h-4 text-muted-foreground" />
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Job Reference</p>
                    </div>
                    <p className="text-xs font-mono text-muted-foreground">#{invoice.jobId.split("-")[0].toUpperCase()}</p>
                    <p className="text-sm font-bold text-foreground">{invoice.jobTitle}</p>
                    {invoice.jobDescription && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{invoice.jobDescription}</p>
                    )}
                </div>

                {/* Line Items */}
                <div className="bg-card border border-border/60 rounded-2xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-border/40 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Cost Breakdown</p>
                    </div>
                    <div className="divide-y divide-border/40">
                        {lineItems.map((item) => (
                            <div key={item.label} className="flex items-center justify-between px-4 py-3">
                                <span className="text-sm text-foreground">{item.label}</span>
                                <span className="text-sm font-bold text-foreground">{formatCurrency(item.amount)}</span>
                            </div>
                        ))}
                        <div className="flex items-center justify-between px-4 py-3 bg-primary/5">
                            <span className="text-sm font-black text-foreground">Total</span>
                            <span className="text-sm font-black text-primary">{formatCurrency(invoice.totalAmount)}</span>
                        </div>
                    </div>
                </div>

                {/* PDF Generation & Download */}
                <div className="bg-card border border-border/60 rounded-2xl p-4 space-y-3">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Document Export</p>
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={handleGeneratePDF}
                            disabled={isGeneratingPdf || isPending}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-all disabled:opacity-50"
                        >
                            {isGeneratingPdf ? "Generating..." : <><FilePlus className="w-4 h-4" /> Generate PDF</>}
                        </button>
                        {currentPdfUrl && (
                            <a 
                                href={currentPdfUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border/60 text-foreground text-sm font-bold hover:bg-muted/50 transition-all"
                            >
                                <DownloadCloud className="w-4 h-4" /> Download PDF
                            </a>
                        )}
                    </div>
                </div>

                {/* Admin Controls */}
                <div className="bg-card border border-border/60 rounded-2xl p-4 space-y-3">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Update Status</p>
                    <div className="grid grid-cols-3 gap-2">
                        {STATUS_OPTIONS.map((s) => (
                            <button
                                key={s}
                                disabled={isPending || status === s}
                                onClick={() => handleStatusUpdate(s)}
                                className={`px-2 py-2 rounded-xl text-xs font-bold border transition-all disabled:opacity-50 ${
                                    status === s
                                        ? getStatusStyle(s) + " opacity-100"
                                        : "bg-muted text-muted-foreground border-border hover:border-primary/40"
                                }`}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Delete (Draft only) */}
                {status === "Draft" && (
                    <div className="space-y-2">
                        {!showDeleteConfirm ? (
                            <button
                                onClick={() => setShowDeleteConfirm(true)}
                                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-red-500/30 text-red-500 text-sm font-bold hover:bg-red-500/5 transition-all"
                            >
                                <Trash2 className="w-4 h-4" />
                                Delete Invoice
                            </button>
                        ) : (
                            <div className="bg-red-500/5 border border-red-500/30 rounded-2xl p-4 space-y-3">
                                <div className="flex items-center gap-2 text-red-500">
                                    <AlertCircle className="w-4 h-4" />
                                    <p className="text-sm font-bold">Confirm Deletion</p>
                                </div>
                                <p className="text-xs text-muted-foreground">This action cannot be undone. The invoice will be permanently deleted.</p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setShowDeleteConfirm(false)}
                                        className="flex-1 py-2 rounded-xl bg-muted text-foreground text-sm font-semibold hover:bg-muted/80 transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        disabled={isPending}
                                        onClick={handleDelete}
                                        className="flex-1 py-2 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition-all disabled:opacity-50"
                                    >
                                        {isPending ? "Deleting…" : "Yes, Delete"}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </main>

            <BottomNav active="invoices" role="admin" />
        </div>
    );
}
