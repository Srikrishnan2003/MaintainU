"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BottomNav } from "@/components/navigation/bottom-nav";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ArrowLeft, Briefcase, DownloadCloud, FilePlus, Users } from "lucide-react";
import { generateJobReportPDFAction } from "@/actions/lifecycle.action";
import { api } from "@/lib/api";

interface JobDetail {
    id: string;
    pdfUrl?: string | null;
    service: string;
    status: string;
}

interface TeamMember {
    id: string;
    name: string;
    phone: string;
    skill: string;
    rating: number;
    status: string;
}

export default function AdminJobDetailClient({ job, teamMembers }: { job: JobDetail, teamMembers?: TeamMember[] }) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [isFinalizing, setIsFinalizing] = useState(false);
    const [currentPdfUrl, setCurrentPdfUrl] = useState<string | null>(job.pdfUrl || null); // Note: pdfUrl doesn't exist on job yet, but this is future proof

    const handleGeneratePDF = () => {
        setIsGeneratingPdf(true);
        startTransition(async () => {
            const res = await generateJobReportPDFAction(job.id);
            if (res.success && res.data?.pdfUrl) {
                setCurrentPdfUrl(res.data.pdfUrl);
                toast.success("Job Report Generated Successfully");
            } else {
                toast.error(res.message || "Failed to generate Job Report");
            }
            setIsGeneratingPdf(false);
        });
    };

    const handleFinalize = async () => {
        setIsFinalizing(true);
        startTransition(async () => {
            const res = await api.finalizeJobAcceptance(job.id);
            if (res && res.success) {
                toast.success("Job accepted successfully");
            } else {
                toast.error(res?.message || "Failed to finalize job");
            }
            setIsFinalizing(false);
        });
    };

    return (
        <div className="min-h-screen bg-background pb-32">
            <header className="sticky top-0 z-50 px-4 py-4 bg-background/80 backdrop-blur-2xl border-b border-border/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.back()}
                        className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div>
                        <h1 className="text-base font-bold tracking-tight">Job Detail</h1>
                        <p className="text-[10px] text-muted-foreground font-mono">#{job.id.split("-")[0].toUpperCase()}</p>
                    </div>
                </div>
                <ThemeToggle />
            </header>

            <main className="px-4 py-5 max-w-xl mx-auto space-y-4">
                <div className="bg-card border border-border/60 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                <Briefcase className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Service</p>
                                <p className="text-lg font-black">{job.service}</p>
                            </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full border text-xs font-bold tracking-wide bg-blue-500/10 text-blue-500 border-blue-500/20`}>
                            {job.status}
                        </span>
                    </div>
                </div>

                <div className="bg-card border border-border/60 rounded-2xl p-4 space-y-3">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Document Export</p>
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={handleGeneratePDF}
                            disabled={isGeneratingPdf || isPending}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-all disabled:opacity-50"
                        >
                            {isGeneratingPdf ? "Generating..." : <><FilePlus className="w-4 h-4" /> Generate Job Report</>}
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

                <div className="bg-card border border-border/60 rounded-2xl p-4 space-y-4">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Master Team Status</p>
                        <button onClick={() => router.push(`/admin/jobs/${job.id}/assign`)} className="text-xs font-bold text-primary hover:underline">
                            Edit Team
                        </button>
                    </div>
                    {teamMembers && teamMembers.length > 0 ? (
                        <div className="space-y-3">
                            {teamMembers.map((member) => (
                                <div key={member.id} className="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-background/50">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                                            <Users className="w-4 h-4 text-muted-foreground" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold">{member.name}</p>
                                            <p className="text-[10px] text-muted-foreground">{member.skill}</p>
                                        </div>
                                    </div>
                                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase
                                        ${member.status === 'Accepted' ? 'bg-green-500/10 text-green-500' :
                                          member.status === 'Declined' ? 'bg-red-500/10 text-red-500' :
                                          member.status === 'Removed' ? 'bg-zinc-500/10 text-zinc-500' :
                                          'bg-yellow-500/10 text-yellow-500'
                                        }`}>
                                        {member.status === 'Invited' ? 'Waiting' : member.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">No team assigned yet</p>
                    )}

                    {job.status === 'Assigned' && teamMembers && teamMembers.length > 0 && (
                        <button
                            onClick={handleFinalize}
                            disabled={isFinalizing || isPending}
                            className="w-full mt-2 py-3 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center justify-center"
                        >
                            {isFinalizing ? "Finalizing..." : "Finalize & Accept Job"}
                        </button>
                    )}
                </div>
            </main>

            <BottomNav active="jobs" role="admin" />
        </div>
    );
}
