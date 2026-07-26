"use client"

import { AsyncBoundary } from "@/components/async-boundary"
import { ErrorBoundary } from "@/components/error-boundary"
import { BottomNav } from "@/components/navigation/bottom-nav"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { Search, Clock, Zap, Droplets, Wrench, PenTool, Briefcase, ChevronRight } from "lucide-react"
import { ServiceIcon } from "@/components/ui/service-icon"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { FilterBar, FilterConfig } from "@/components/admin/FilterBar"
import { useSSE } from "@/hooks/use-sse"
import { useSliceRefetch } from "@/hooks/use-slice-refetch"
import { getJobsAction } from "@/actions/lifecycle.action"

export default function AdminJobsClient({ 
    initialJobs 
}: { 
    initialJobs: any[] 
}) {
    const router = useRouter()
    const searchParams = useSearchParams()
    
    const [jobsList, setJobsList] = useState(initialJobs)
    
    const { jobUpdates, isConnected, fallbackMode } = useSSE(true)
    const { refetch } = useSliceRefetch()

    useEffect(() => {
        if (!jobUpdates) return
        // We could pass searchParams here if getJobsAction accepts them, but it doesn't currently
        refetch(getJobsAction, (data: any) => setJobsList(data.data || []))
    }, [jobUpdates, refetch])



    const getStatusColor = (status: string) => {
        switch(status?.toUpperCase()) {
          case 'PENDING': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
          case 'ASSIGNED': return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
          case 'IN_PROGRESS': return 'bg-orange-500/10 text-orange-600 border-orange-500/20';
          case 'COMPLETED': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
          case 'FAILED': return 'bg-red-500/10 text-red-600 border-red-500/20';
          default: return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
        }
    }

    const filterConfig: FilterConfig[] = [
        { key: "search", label: "Search", type: "search", placeholder: "Search by Company or Technician..." },
        { 
            key: "jobStatus", 
            label: "STATUSES", 
            type: "select", 
            options: [
                { value: "Pending", label: "PENDING" },
                { value: "Assigned", label: "ASSIGNED" },
                { value: "In_Progress", label: "IN PROGRESS" },
                { value: "Completed", label: "COMPLETED" },
                { value: "Failed", label: "FAILED" },
            ] 
        },
        {
            key: "serviceType",
            label: "SERVICES",
            type: "select",
            options: [
                { value: "ELECTRICAL", label: "ELECTRICAL" },
                { value: "PLUMBING", label: "PLUMBING" },
                { value: "HVAC", label: "HVAC" },
                { value: "MECHANICAL", label: "MECHANICAL" },
                { value: "GENERAL", label: "GENERAL" },
            ]
        },
        {
            key: "priority",
            label: "PRIORITY",
            type: "select",
            options: [
                { value: "LOW", label: "LOW" },
                { value: "MEDIUM", label: "MEDIUM" },
                { value: "HIGH", label: "HIGH" },
                { value: "CRITICAL", label: "CRITICAL" },
            ]
        }
    ];

    return (
        <div className="min-h-screen bg-background pb-32 font-sans selection:bg-primary/20">
            {/* Premium Header */}
            <header className="sticky top-0 z-50 px-6 py-5 bg-background/80 backdrop-blur-2xl border-b border-border/50 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary border border-primary/20 shadow-inner">
                            <Briefcase className="w-5 h-5" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold tracking-tight text-foreground">Manage Jobs</h1>
                            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">Admin Job Console</p>
                        </div>
                    </div>
                    <ThemeToggle />
                </div>

                <AsyncBoundary>
                    <FilterBar config={filterConfig} />
                </AsyncBoundary>
            </header>

            <main className="px-6 py-6 space-y-4 animate-fade-in-up">
                {/* Connection Indicator */}
                {!isConnected && (
                  <div className="text-xs text-amber-500 flex items-center gap-1 px-1 py-1 -mt-2 mb-2">
                    <Zap className="w-4 h-4" />
                    Reconnecting...
                  </div>
                )}
                {fallbackMode && (
                  <div className="text-xs text-slate-400 flex items-center gap-1 px-1 py-1 -mt-2 mb-2">
                    <Clock className="w-4 h-4" />
                    Live updates paused — refreshing every 30s
                  </div>
                )}
                <div className="flex items-center justify-between pl-1 mb-2">
                    <h2 className="text-xs font-bold text-foreground/50 uppercase tracking-widest">
                        {jobsList.length} {jobsList.length === 1 ? 'Job' : 'Jobs'} Found
                    </h2>
                </div>

                <ErrorBoundary>
                    {jobsList.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 px-4 bg-muted/20 border border-dashed border-border/80 rounded-[2rem]">
                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-5 ring-4 ring-primary/5">
                            <Search className="w-8 h-8 text-primary/60" />
                        </div>
                        <p className="text-foreground font-semibold text-center text-base">No matching jobs.</p>
                        <p className="text-muted-foreground text-sm text-center mt-1">Try adjusting your search or filters.</p>
                    </div>
                ) : (
                    <div className="flex flex-col space-y-3.5">
                        {jobsList.map(job => (
                            <div 
                                key={job.id} 
                                onClick={() => router.push(`/admin/jobs/${job.id}`)}
                                className="group relative overflow-hidden bg-card border border-border/60 hover:border-primary/40 rounded-[1.25rem] p-4.5 transition-all duration-300 hover:shadow-md cursor-pointer flex flex-col gap-3 ring-1 ring-black/5 dark:ring-white/5"
                            >
                                <div className="flex justify-between items-start gap-4">
                                    <div className="flex gap-3">
                                        <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center shadow-sm text-slate-400 group-hover:scale-110 group-hover:text-primary transition-all">
                                            <ServiceIcon type={job.serviceType} />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-foreground max-w-[200px] truncate">{job.companyName}</h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                <p className="text-[10px] text-muted-foreground font-mono font-medium">#{job.id.split('-')[0]}</p>
                                                <span className={`px-2 py-0.5 rounded border text-[8px] font-black tracking-widest uppercase ${getStatusColor(job.status)}`}>
                                                    {job.status}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <button 
                                        className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors flex-shrink-0"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>

                                <div className="text-xs text-muted-foreground line-clamp-2 pr-2">
                                    {job.description}
                                </div>

                                <div className="grid grid-cols-2 gap-2 mt-2 pt-3 border-t border-border/50">
                                    <div className="flex flex-col gap-1">
                                        <p className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest">Technician</p>
                                        {job.technicianName ? (
                                            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                                                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                                <span className="truncate">{job.technicianName}</span>
                                            </div>
                                        ) : (
                                            <span className="text-xs font-semibold text-orange-500">Unassigned</span>
                                        )}
                                    </div>
                                    
                                    <div className="flex flex-col gap-1 items-end">
                                        <p className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest">Priority</p>
                                        <span className={`text-xs font-black uppercase ${
                                            job.priority === 'CRITICAL' ? 'text-red-500' :
                                            job.priority === 'HIGH' ? 'text-orange-500' :
                                            'text-blue-500'
                                        }`}>
                                            {job.priority}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                </ErrorBoundary>
            </main>

            <BottomNav active="jobs" role="admin" />

            <style dangerouslySetInnerHTML={{__html: `
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(12px) scale(0.98); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                .animate-fade-in-up {
                    animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
            `}}/>
        </div>
    )
}
