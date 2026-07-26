"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Building2, Loader2, MapPin, User, FileText, Mail } from "lucide-react"
import { completeCompanyProfileAction } from "@/actions/company.action"

export default function CompanySetupPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        companyName: "",
        email: "",
        gstin: "",
        address: "",
        contactPerson: "",
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            const res = await completeCompanyProfileAction(formData)
            if (res.success) {
                toast.success("Profile completed successfully!")
                router.push("/company/dashboard")
            } else {
                if (res.fieldErrors) {
                    toast.error(`Validation Error: ${Object.values(res.fieldErrors).flat().join(", ")}`)
                } else {
                    toast.error(res.message || "Failed to update profile")
                }
            }
        } catch (error) {
            toast.error("An error occurred")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-950 dark:to-slate-900">
            <div className="w-full max-w-lg glass p-8 rounded-3xl shadow-xl">
                <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 ring-8 ring-primary/5">
                        <Building2 className="w-10 h-10 text-primary" />
                    </div>
                    <h1 className="text-2xl font-bold">Complete Your Profile</h1>
                    <p className="text-muted-foreground text-sm">Please provide your company details to continue</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium ml-1">Company Name</label>
                        <div className="relative">
                            <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input
                                type="text"
                                required
                                placeholder="Enter company name"
                                className="w-full pl-11 pr-4 py-3 rounded-xl border border-border bg-white/50 dark:bg-card/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                value={formData.companyName}
                                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium ml-1">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <input
                                    type="email"
                                    required
                                    placeholder="company@example.com"
                                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-border bg-white/50 dark:bg-card/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium ml-1">GSTIN</label>
                        <div className="relative">
                            <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input
                                type="text"
                                required
                                placeholder="GST Identification Number"
                                className="w-full pl-11 pr-4 py-3 rounded-xl border border-border bg-white/50 dark:bg-card/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                value={formData.gstin}
                                onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium ml-1">Contact Person</label>
                        <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input
                                type="text"
                                required
                                placeholder="Full Name"
                                className="w-full pl-11 pr-4 py-3 rounded-xl border border-border bg-white/50 dark:bg-card/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                value={formData.contactPerson}
                                onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium ml-1">Address</label>
                        <div className="relative">
                            <MapPin className="absolute left-4 top-3 w-4 h-4 text-muted-foreground" />
                            <textarea
                                required
                                placeholder="Full office address..."
                                className="w-full pl-11 pr-4 py-3 rounded-xl border border-border bg-white/50 dark:bg-card/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all min-h-[100px] resize-none"
                                value={formData.address}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3.5 px-6 rounded-xl bg-primary text-white font-bold hover:bg-primary/90 disabled:opacity-50 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 mt-4"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                        {loading ? "Saving Profile..." : "Save & Continue"}
                    </button>
                </form>
            </div>
        </div>
    )
}
