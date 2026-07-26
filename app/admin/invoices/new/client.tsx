"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BottomNav } from "@/components/navigation/bottom-nav";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { createInvoiceAction } from "@/actions/invoice.action";
import { ArrowLeft, Receipt, AlertCircle, Briefcase } from "lucide-react";

interface EligibleJob {
    id: string;
    companyName: string;
    completedAt: Date | null;
}

export default function AdminNewInvoiceClient({ eligibleJobs }: { eligibleJobs: EligibleJob[] }) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [formData, setFormData] = useState({
        jobId: "",
        laborCost: "",
        materialCost: "",
        platformFee: "",
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

    const laborCost = parseFloat(formData.laborCost) || 0;
    const materialCost = parseFloat(formData.materialCost) || 0;
    const platformFee = parseFloat(formData.platformFee) || 0;
    const totalAmount = laborCost + materialCost + platformFee;

    const formatCurrency = (n: number) =>
        new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

    const formatDate = (d: Date | null) =>
        d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});

        if (!formData.jobId) {
            setErrors(prev => ({ ...prev, jobId: "Please select a job" }));
            return;
        }
        if (laborCost <= 0) {
            setErrors(prev => ({ ...prev, laborCost: "Labour cost must be greater than 0" }));
            return;
        }
        if (totalAmount <= 0) {
            setErrors(prev => ({ ...prev, totalAmount: "Total amount must be greater than 0" }));
            return;
        }

        startTransition(async () => {
            const res = await createInvoiceAction({
                jobId: formData.jobId,
                laborCost,
                materialCost: materialCost || undefined,
                platformFee: platformFee || undefined,
                totalAmount,
            });

            if (res.success && res.data) {
                toast.success("Invoice created successfully");
                router.push(`/admin/invoices/${res.data.invoiceId}`);
            } else if (res.fieldErrors) {
                const fieldErrs: Record<string, string> = {};
                const errs = res.fieldErrors as Record<string, (string | undefined)[] | undefined>;
                for (const [key, msgs] of Object.entries(errs)) {
                    const first = msgs?.[0];
                    if (first) fieldErrs[key] = first;
                }
                setErrors(fieldErrs);
                toast.error("Please fix the validation errors");
            } else {
                toast.error(res.message || "Failed to create invoice");
            }
        });
    };

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
                        <h1 className="text-base font-bold tracking-tight">Create Invoice</h1>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest">New Billing Entry</p>
                    </div>
                </div>
                <ThemeToggle />
            </header>

            <main className="px-4 py-5 max-w-xl mx-auto">
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Job Selector */}
                    <div className="bg-card border border-border/60 rounded-2xl p-4 space-y-3">
                        <div className="flex items-center gap-2">
                            <Briefcase className="w-4 h-4 text-muted-foreground" />
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Select Completed Job</p>
                        </div>

                        {eligibleJobs.length === 0 ? (
                            <div className="text-center py-6 text-sm text-muted-foreground">
                                <p className="font-semibold">No eligible jobs found.</p>
                                <p className="text-xs mt-1">Only completed jobs without an existing invoice are shown here.</p>
                            </div>
                        ) : (
                            <div>
                                <select
                                    value={formData.jobId}
                                    onChange={e => setFormData(p => ({ ...p, jobId: e.target.value }))}
                                    className={`w-full px-4 py-3 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all appearance-none ${
                                        errors.jobId ? "border-red-500" : "border-border"
                                    }`}
                                >
                                    <option value="">Select a completed job…</option>
                                    {eligibleJobs.map(job => (
                                        <option key={job.id} value={job.id}>
                                            {job.companyName} — #{job.id.split("-")[0].toUpperCase()} — Completed {formatDate(job.completedAt)}
                                        </option>
                                    ))}
                                </select>
                                {errors.jobId && (
                                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                                        <AlertCircle className="w-3 h-3" /> {errors.jobId}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Cost Breakdown */}
                    <div className="bg-card border border-border/60 rounded-2xl p-4 space-y-3">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Cost Breakdown</p>

                        {[
                            { field: "laborCost",    label: "Labour Cost",   required: true },
                            { field: "materialCost", label: "Material Cost", required: false },
                            { field: "platformFee",  label: "Platform Fee",  required: false },
                        ].map(({ field, label, required }) => (
                            <div key={field}>
                                <label className="text-sm font-medium mb-1.5 block">
                                    {label} {required && <span className="text-red-500">*</span>}
                                    {!required && <span className="text-muted-foreground text-xs ml-1">(optional)</span>}
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-bold">₹</span>
                                    <input
                                        type="number"
                                        name={field}
                                        min="0"
                                        step="0.01"
                                        placeholder="0"
                                        value={formData[field as keyof typeof formData]}
                                        onChange={e => setFormData(p => ({ ...p, [field]: e.target.value }))}
                                        className={`w-full pl-8 pr-4 py-3 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all ${
                                            errors[field] ? "border-red-500" : "border-border"
                                        }`}
                                    />
                                </div>
                                {errors[field] && (
                                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                                        <AlertCircle className="w-3 h-3" /> {errors[field]}
                                    </p>
                                )}
                            </div>
                        ))}

                        {/* Auto-calculated Total */}
                        <div className="pt-3 border-t border-border/50 flex items-center justify-between">
                            <span className="text-sm font-bold text-foreground">Total Amount</span>
                            <span className="text-lg font-black text-primary">{formatCurrency(totalAmount)}</span>
                        </div>
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={isPending || eligibleJobs.length === 0}
                        className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50 shadow-lg shadow-primary/20"
                    >
                        {isPending ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Receipt className="w-4 h-4" />
                        )}
                        {isPending ? "Creating Invoice…" : "Create Invoice"}
                    </button>
                </form>
            </main>

            <BottomNav active="invoices" role="admin" />
        </div>
    );
}
