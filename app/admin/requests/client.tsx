"use client"

import { useState, useEffect } from "react"
import { AsyncBoundary } from "@/components/async-boundary"
import { ErrorBoundary } from "@/components/error-boundary"
import { BottomNav } from "@/components/navigation/bottom-nav"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { Search, UserPlus, Clock, Zap, Droplets, Wrench, PenTool, LayoutDashboard, ChevronRight, Trash2, AlertOctagon, Loader2 } from "lucide-react"
import { ServiceIcon } from "@/components/ui/service-icon"
import { useSearchParams, useRouter } from "next/navigation"
import { FilterBar, FilterConfig } from "@/components/admin/FilterBar"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { useSSE } from "@/hooks/use-sse"
import { useSliceRefetch } from "@/hooks/use-slice-refetch"
import { getRequestsAction } from "@/actions/admin.action"

export default function AdminRequestsClient({ 
    initialRequests, 
    uniqueCompanies 
}: { 
    initialRequests: any[], 
    uniqueCompanies: string[] 
}) {
    const router = useRouter()
    const searchParams = useSearchParams()
    
    const [requests, setRequests] = useState(initialRequests)
    const [deletingRequestId, setDeletingRequestId] = useState<string | null>(null)
    const [deleteWarning, setDeleteWarning] = useState<any>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    const { jobUpdates, isConnected, fallbackMode } = useSSE(true)
    const { refetch } = useSliceRefetch()

    useEffect(() => {
        if (!jobUpdates) return
        const filters = {
            search: searchParams.get("search") || undefined,
            serviceType: searchParams.get("serviceType") || undefined,
            priority: searchParams.get("priority") || undefined,
            status: searchParams.get("status") || undefined,
        }
        refetch(() => getRequestsAction(filters), (data: any) => setRequests(data.requests || []))
    }, [jobUpdates, searchParams, refetch])

    const handleDeleteClick = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation()
        setDeletingRequestId(id)
        setDeleteWarning(null)
        try {
            const res = await api.getDeleteRequestWarning(id)
            if (res.success) {
                setDeleteWarning(res)
            } else {
                toast.error("Failed to load warnings")
                setDeletingRequestId(null)
            }
        } catch(e) {
            toast.error("An error occurred")
            setDeletingRequestId(null)
        }
    }

    const handleConfirmDelete = async () => {
        if (!deletingRequestId || !deleteWarning) return
        setIsDeleting(true)
        
        try {
            if (deleteWarning.exportData) {
                const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(deleteWarning.exportData, null, 2))
                const downloadAnchorNode = document.createElement('a')
                downloadAnchorNode.setAttribute("href", dataStr)
                downloadAnchorNode.setAttribute("download", `request_${deletingRequestId.substring(0, 8)}_financials.json`)
                document.body.appendChild(downloadAnchorNode)
                downloadAnchorNode.click()
                downloadAnchorNode.remove()
            }

            const res = await api.deleteRequestCascading(deletingRequestId)
            if (res.success) {
                toast.success("Request deleted successfully")
                window.location.reload() // Refresh the page to get the updated list
            } else {
                toast.error(res.message || "Failed to delete request")
                setIsDeleting(false)
            }
        } catch(e) {
            toast.error("An error occurred during deletion")
            setIsDeleting(false)
        }
    }



    const getStatusColor = (status: string) => {
        switch(status?.toUpperCase()) {
          case 'REQUESTED': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
          case 'ASSIGNED': return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
          case 'IN_PROGRESS': return 'bg-orange-500/10 text-orange-600 border-orange-500/20';
          case 'COMPLETED': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
          case 'REJECTED': return 'bg-red-500/10 text-red-600 border-red-500/20';
          default: return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
        }
    }

    const filterConfig: FilterConfig[] = [
        { key: "search", label: "Search", type: "search", placeholder: "Search by Company or Location..." },
        { 
            key: "status", 
            label: "STATUSES", 
            type: "select", 
            options: [
                { value: "Requested", label: "REQUESTED" },
                { value: "Reviewing", label: "REVIEWING" },
                { value: "Assigned", label: "ASSIGNED" },
                { value: "In_Progress", label: "IN PROGRESS" },
                { value: "Completed", label: "COMPLETED" },
                { value: "Rejected", label: "REJECTED" },
            ] 
        },
        {
            key: "serviceType",
            label: "SERVICES",
            type: "select",
            options: [
                { value: "Electrical", label: "ELECTRICAL" },
                { value: "Plumbing", label: "PLUMBING" },
                { value: "HVAC", label: "HVAC" },
                { value: "Mechanical", label: "MECHANICAL" },
                { value: "Assembly", label: "ASSEMBLY" },
                { value: "General", label: "GENERAL" },
            ]
        },
        {
            key: "priority",
            label: "PRIORITY",
            type: "select",
            options: [
                { value: "Normal", label: "NORMAL" },
                { value: "Urgent", label: "URGENT" },
                { value: "Emergency", label: "EMERGENCY" },
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
                            <LayoutDashboard className="w-5 h-5" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold tracking-tight text-foreground">Manage Requests</h1>
                            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">Admin Dispatch Console</p>
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
                        {requests.length} {requests.length === 1 ? "Request" : "Requests"} Found
                    </h2>
                </div>

                <ErrorBoundary>
                    {requests.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 px-4 bg-muted/20 border border-dashed border-border/80 rounded-[2rem]">
                            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-5 ring-4 ring-primary/5">
                                <Search className="w-8 h-8 text-primary/60" />
                            </div>
                            <p className="text-foreground font-semibold text-center text-base">No matching requests.</p>
                            <p className="text-muted-foreground text-sm text-center mt-1">Try adjusting your search or filters.</p>
                        </div>
                    ) : (
                        <div className="flex flex-col space-y-3.5">
                            {requests.map(req => (
                                <div 
                                    key={req.id} 
                                    className="group relative overflow-hidden bg-card border border-border/60 hover:border-primary/40 rounded-[1.25rem] p-4.5 transition-all duration-300 hover:shadow-md cursor-pointer flex flex-col gap-3 ring-1 ring-black/5 dark:ring-white/5"
                                >
                                    <div className="flex justify-between items-start gap-4">
                                        <div className="flex gap-3">
                                            <div className="w-[3rem] h-[3rem] mt-0.5 flex-shrink-0 flex items-center justify-center rounded-[1rem] bg-muted border border-border/50 text-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors shadow-sm">
                                                <ServiceIcon type={req.serviceType} />
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-bold text-foreground max-w-[200px] truncate">{req.companyName}</h3>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <p className="text-[10px] text-muted-foreground font-mono font-medium">#{req.id.split('-')[0]}</p>
                                                    <span className={`px-2 py-0.5 rounded border text-[8px] font-black tracking-widest uppercase ${getStatusColor(req.status)}`}>
                                                        {req.status}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 items-center flex-shrink-0">
                                            <button
                                                onClick={(e) => handleDeleteClick(e, req.id)}
                                                className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    router.push(`/admin/requests/${req.id}`)
                                                }}
                                                className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors"
                                            >
                                                <ChevronRight className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="text-xs text-muted-foreground line-clamp-2 pr-2">
                                        {req.description}
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 mt-2 pt-3 border-t border-border/50">
                                        <div className="flex flex-col gap-1">
                                            <p className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest">Technician</p>
                                            {req.technicianName ? (
                                                <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                                                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                                    <span className="truncate">{req.technicianName}</span>
                                                </div>
                                            ) : (
                                                <span className="text-xs font-semibold text-orange-500">Unassigned</span>
                                            )}
                                        </div>
                                        
                                        <div className="flex flex-col gap-1 items-end">
                                            <p className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest">Priority</p>
                                            <span className={`text-xs font-black uppercase ${
                                                req.priority === 'CRITICAL' ? 'text-red-500' :
                                                req.priority === 'HIGH' ? 'text-orange-500' :
                                                'text-blue-500'
                                            }`}>
                                                {req.priority}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Action Buttons Layer */}
                                    {(req.status === 'Pending_Assign' || req.status === 'Assigned') && (
                                        <div className="mt-2 text-right">
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    router.push(`/admin/jobs/${req.id}/assign`)
                                                }}
                                                className="w-full relative overflow-hidden rounded-xl bg-gradient-to-r from-primary to-primary/90 p-[1px] transition-all hover:scale-[1.01] active:scale-[0.98] shadow-md shadow-primary/20"
                                            >
                                                <div className="absolute inset-0 bg-white/20 transition-transform duration-500 hover:translate-x-full" style={{ transform: 'translateX(-100%) skewX(-15deg)'}} />
                                                <div className="flex items-center justify-center gap-2 bg-primary px-3 py-2.5 text-primary-foreground font-bold tracking-wide rounded-xl relative z-10 w-full text-xs">
                                                    <UserPlus className="w-4 h-4 flex-shrink-0" />
                                                    <span>{req.status === 'Assigned' ? 'Edit Team' : 'Assign Technician'}</span>
                                                </div>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </ErrorBoundary>
            </main>

            <BottomNav active="jobs" role="admin" />

            {/* Delete Confirmation Modal */}
            {deletingRequestId && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in" onClick={(e) => e.stopPropagation()}>
                    <div className="bg-card w-full max-w-sm rounded-[2rem] border shadow-2xl p-6 relative overflow-hidden" onClick={(e) => e.stopPropagation()}>
                        <div className="absolute top-0 left-0 right-0 h-1.5 bg-red-500" />
                        
                        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
                            <AlertOctagon className="w-6 h-6 text-red-600" />
                        </div>
                        
                        <h3 className="text-xl font-black mb-2">Delete Request?</h3>
                        <p className="text-sm text-muted-foreground mb-4">This action cannot be undone. All associated data will be permanently destroyed.</p>

                        {!deleteWarning ? (
                            <div className="py-8 flex flex-col items-center justify-center gap-3 bg-muted/30 rounded-xl">
                                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                                <p className="text-xs font-bold text-muted-foreground">Scanning database...</p>
                            </div>
                        ) : (
                            <div className="bg-red-50/50 border border-red-100 rounded-xl p-4 mb-4">
                                <p className="text-xs font-black text-red-800 uppercase tracking-widest mb-3">Data to be destroyed:</p>
                                <ul className="space-y-1.5 text-sm font-medium text-red-900/80 mb-4">
                                    <li>• Base Request Record</li>
                                    {deleteWarning.counts.jobs > 0 && <li>• {deleteWarning.counts.jobs} Job Record(s)</li>}
                                    {deleteWarning.counts.masterTeams > 0 && <li>• {deleteWarning.counts.masterTeams} Master Team(s)</li>}
                                    {deleteWarning.counts.masterTeamMembers > 0 && <li>• {deleteWarning.counts.masterTeamMembers} Team Member(s)</li>}
                                    {deleteWarning.counts.attendance > 0 && <li>• {deleteWarning.counts.attendance} Attendance Log(s)</li>}
                                    {deleteWarning.counts.jobUpdates > 0 && <li>• {deleteWarning.counts.jobUpdates} Job Update(s)</li>}
                                    {deleteWarning.counts.jobStatusHistory > 0 && <li>• {deleteWarning.counts.jobStatusHistory} History Log(s)</li>}
                                </ul>

                                {deleteWarning.exportData && (
                                    <div className="bg-yellow-100 border border-yellow-200 rounded-lg p-3 text-yellow-900">
                                        <p className="text-xs font-bold">⚠️ Financial records found ({deleteWarning.counts.invoices} Invoice(s), {deleteWarning.counts.payments} Payment(s)). They will be automatically downloaded before deletion.</p>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex gap-3 mt-6">
                            <button 
                                onClick={() => setDeletingRequestId(null)}
                                disabled={isDeleting}
                                className="flex-1 py-3.5 rounded-xl font-bold text-sm bg-muted text-foreground hover:bg-muted/80 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleConfirmDelete}
                                disabled={!deleteWarning || isDeleting}
                                className="flex-[1.5] py-3.5 rounded-xl font-black text-sm bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                {isDeleting ? "Deleting..." : "Delete Everything"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
