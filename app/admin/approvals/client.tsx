"use client"

import { useState } from "react"
import { AsyncBoundary } from "@/components/async-boundary"
import { ErrorBoundary } from "@/components/error-boundary"
import { BottomNav } from "@/components/navigation/bottom-nav"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { Search, ShieldCheck, XCircle, FileText, User, MapPin, Briefcase, Eye, Phone, Zap } from "lucide-react"
import { approveTechnician, rejectTechnician } from "@/actions/admin.action"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { FilterBar, FilterConfig } from "@/components/admin/FilterBar"

export default function ApprovalsClient({ initialData }: { initialData: any[] }) {
    const router = useRouter()
    const [processingId, setProcessingId] = useState<string | null>(null)

    const handleAction = async (id: string, action: "APPROVE" | "REJECT") => {
        setProcessingId(id)
        try {
            const res = action === "APPROVE" 
                ? await approveTechnician(id) 
                : await rejectTechnician(id);

            if (res.success) {
                toast.success(res.message);
                router.refresh()
            } else {
                toast.error(res.message);
            }
        } catch (e) {
            toast.error(`Failed to ${action.toLowerCase()} technician`);
        } finally {
            setProcessingId(null)
        }
    }

    const filterConfig: FilterConfig[] = [
        { key: "search", label: "Search", type: "search", placeholder: "Search by Name, Phone, or Skill..." },
        { 
            key: "status", 
            label: "STATUSES", 
            type: "select", 
            options: [
                { value: "PENDING_APPROVAL", label: "PENDING APPROVAL" },
                { value: "ACTIVE", label: "ACTIVE" },
                { value: "REJECTED", label: "REJECTED" },
            ] 
        }
    ];

    return (
        <div className="min-h-screen bg-background pb-32 font-sans selection:bg-primary/20">
            <header className="sticky top-0 z-50 px-6 py-5 bg-background/80 backdrop-blur-2xl border-b border-border/50 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-indigo-500/5 flex items-center justify-center text-indigo-500 border border-indigo-500/20 shadow-inner">
                            <ShieldCheck className="w-5 h-5" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold tracking-tight text-foreground">Approvals</h1>
                            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">Technician Kyc Gateway</p>
                        </div>
                    </div>
                    <ThemeToggle />
                </div>

                <AsyncBoundary>
                    <FilterBar config={filterConfig} />
                </AsyncBoundary>
            </header>

            <main className="px-6 py-6 space-y-4 animate-fade-in-up">
                <div className="flex items-center justify-between pl-1 mb-2">
                    <h2 className="text-xs font-bold text-foreground/50 uppercase tracking-widest">
                        {initialData.length} {initialData.length === 1 ? 'Record' : 'Records'} Found
                    </h2>
                </div>

                <ErrorBoundary>
                    {initialData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 px-4 bg-muted/20 border border-dashed border-border/80 rounded-[2rem]">
                        <div className="w-16 h-16 rounded-full bg-indigo-500/10 flex items-center justify-center mb-5 ring-4 ring-indigo-500/5">
                            <Search className="w-8 h-8 text-indigo-500/60" />
                        </div>
                        <p className="text-foreground font-semibold text-center text-base">No operations pending.</p>
                        <p className="text-muted-foreground text-sm text-center mt-1">Inbox zero achieved.</p>
                    </div>
                ) : (
                    <div className="flex flex-col space-y-4">
                        {initialData.map(tech => {
                            const docs = tech.documents || {};
                            return (
                                <div 
                                    key={tech.id} 
                                    className="relative bg-card border border-border/60 rounded-[1.5rem] p-5 shadow-sm hover:shadow-md transition-all flex flex-col gap-5 overflow-hidden"
                                >
                                    {/* Abstract Status Indicator Line */}
                                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                                        tech.status === 'ACTIVE' ? 'bg-emerald-500' : 
                                        tech.status === 'REJECTED' ? 'bg-red-500' : 
                                        'bg-blue-500'
                                    }`} />

                                    <div className="flex justify-between items-start">
                                        <div className="flex gap-4">
                                            <div className="w-14 h-14 rounded-2xl bg-muted border border-border/50 flex items-center justify-center shadow-inner overflow-hidden">
                                                {docs.profilePhoto ? (
                                                    <img src={docs.profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                                                ) : (
                                                    <User className="w-6 h-6 text-muted-foreground" />
                                                )}
                                            </div>
                                            <div className="flex flex-col">
                                                <h3 className="text-lg font-black text-foreground leading-tight">{tech.name || "Unknown Name"}</h3>
                                                <div className="flex items-center gap-1.5 mt-1">
                                                    <Phone className="w-3 h-3 text-muted-foreground" />
                                                    <span className="text-xs font-bold text-muted-foreground">{tech.phone}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <span className={`px-2.5 py-1 rounded-lg border text-[9px] font-black tracking-widest uppercase ${
                                            tech.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 
                                            tech.status === 'REJECTED' ? 'bg-red-500/10 text-red-600 border-red-500/20' : 
                                            'bg-blue-500/10 text-blue-600 border-blue-500/20'
                                        }`}>
                                            {tech.status}
                                        </span>
                                    </div>

                                    {/* Specs Grid */}
                                    <div className="grid grid-cols-2 gap-3 bg-muted/30 p-3 rounded-xl border border-border/40">
                                        <div className="flex flex-col gap-1">
                                            <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-muted-foreground"><Zap className="w-3 h-3" /> Primary Skill</span>
                                            <span className="text-sm font-bold text-foreground pl-4">{tech.primarySkill || "N/A"}</span>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-muted-foreground"><Briefcase className="w-3 h-3" /> Experience</span>
                                            <span className="text-sm font-bold text-foreground pl-4">{tech.experience ? `${tech.experience} Yrs` : "N/A"}</span>
                                        </div>
                                        <div className="flex flex-col gap-1 col-span-2">
                                            <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-muted-foreground"><MapPin className="w-3 h-3" /> Address</span>
                                            <span className="text-xs font-semibold text-foreground pl-4 leading-snug">{tech.address || "N/A"}</span>
                                        </div>
                                    </div>

                                    {/* Attached Documents Layer */}
                                    <div className="flex flex-col gap-2">
                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-foreground/60 pl-1">Document Vault</h4>
                                        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                                            {['aadhaar', 'pan'].map((docName) => docs[docName] ? (
                                                <a 
                                                    key={docName}
                                                    href={docs[docName]} 
                                                    target="_blank" 
                                                    rel="noreferrer"
                                                    className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border/80 bg-card hover:border-primary/50 hover:bg-primary/5 transition-all text-sm font-bold text-foreground flex-shrink-0"
                                                >
                                                    <FileText className="w-4 h-4 text-primary" />
                                                    <span className="uppercase text-xs">{docName}</span>
                                                    <Eye className="w-3.5 h-3.5 text-muted-foreground ml-1" />
                                                </a>
                                            ) : null)}
                                        </div>
                                    </div>

                                    {/* Action Footers */}
                                    {(tech.status === 'PENDING_APPROVAL' || tech.status === 'PENDING_PROFILE' || tech.status === 'Pending') && (
                                        <div className="grid grid-cols-2 gap-2 mt-2 pt-4 border-t border-border/50">
                                            <button 
                                                onClick={() => handleAction(tech.id, "REJECT")}
                                                disabled={processingId === tech.id}
                                                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-sm rounded-xl transition-colors disabled:opacity-50"
                                            >
                                                <XCircle className="w-4 h-4" /> Reject
                                            </button>
                                            <button 
                                                onClick={() => handleAction(tech.id, "APPROVE")}
                                                disabled={processingId === tech.id}
                                                className="w-full relative overflow-hidden flex items-center justify-center gap-2 px-4 py-3 bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-indigo-500/20 active:scale-95 disabled:opacity-50"
                                            >
                                                <div className="absolute inset-0 bg-white/20 translate-y-full hover:translate-y-0 transition-transform duration-300" />
                                                <span className="relative z-10 flex items-center gap-2">
                                                    <ShieldCheck className="w-4 h-4" /> Approve
                                                </span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}
                </ErrorBoundary>
            </main>

            <BottomNav active="approvals" role="admin" />

            <style dangerouslySetInnerHTML={{__html: `
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(12px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in-up {
                    animation: fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
            `}}/>
        </div>
    )
}
