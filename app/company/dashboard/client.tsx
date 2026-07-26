"use client"

import { BottomNav } from "@/components/navigation/bottom-nav"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { Logo } from "@/components/ui/logo"
import { Plus, Bell, Clock, CheckCircle, ArrowRight, Activity, Zap, Wrench, Droplets, PenTool, LayoutDashboard } from "lucide-react"
import { ServiceIcon } from "@/components/ui/service-icon"
import { useRouter } from "next/navigation"
import { useSSE } from "@/hooks/use-sse"
import { useSliceRefetch } from "@/hooks/use-slice-refetch"
import { getCompanyRequestsAction } from "@/actions/company.action"
import { useEffect, useState } from "react"

export function CompanyDashboardClient({ initialRequests, companyId }: { initialRequests: any[], companyId: string }) {
  const router = useRouter()
  const [requests, setRequests] = useState(initialRequests)
  
  const { jobUpdates, isConnected, fallbackMode } = useSSE(true)
  const { refetch } = useSliceRefetch()

  useEffect(() => {
    if (!jobUpdates) return
    if (jobUpdates.companyId !== companyId) return
    refetch(getCompanyRequestsAction, (data: any) => setRequests(data.requests || []))
  }, [jobUpdates, companyId, refetch])
  
  // Filter requests locally matching UI architecture
  const activeRequests = requests.filter(r => ["REQUESTED", "ASSIGNED", "IN_PROGRESS"].includes(r.status))
  const completedRequests = requests.filter(r => r.status === "COMPLETED")



  const getStatusColor = (status: string) => {
    switch(status?.toUpperCase()) {
      case 'REQUESTED': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'ASSIGNED': return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
      case 'IN_PROGRESS': return 'bg-orange-500/10 text-orange-600 border-orange-500/20';
      case 'COMPLETED': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
      default: return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
    }
  }

  return (
    <div className="min-h-screen bg-background pb-32 font-sans selection:bg-primary/20 transition-colors duration-300">
      {/* Premium Header */}
      <header className="sticky top-0 z-50 px-6 py-5 bg-background/80 backdrop-blur-2xl border-b border-border/50 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
             <Logo size="md" />
             <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground">Dashboard</h1>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">MaintainU Enterprise</p>
             </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button className="relative w-10 h-10 flex items-center justify-center rounded-xl bg-muted/60 hover:bg-muted border border-border transition-all active:scale-95 text-foreground shadow-sm">
              <span className="absolute top-2 right-2.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-background animate-pulse"></span>
              <Bell className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Global Prominent CTA Button */}
        <button 
           onClick={() => router.push("/company/requests/new")}
           className="group relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-primary to-primary/80 p-[1px] transition-all hover:scale-[1.01] active:scale-[0.98] shadow-lg shadow-primary/20 mt-2"
        >
            <div className="absolute inset-0 bg-white/20 transition-transform duration-500 group-hover:translate-x-full" style={{ transform: 'translateX(-100%) skewX(-15deg)'}} />
            <div className="flex items-center justify-center gap-2 bg-primary px-4 py-3.5 text-primary-foreground font-semibold tracking-wide rounded-2xl relative z-10 w-full">
                <Plus className="w-5 h-5 flex-shrink-0 stroke-[2.5]" />
                <span>Create Service Request</span>
            </div>
        </button>
      </header>

      <main className="px-6 py-8 space-y-10 animate-fade-in-up">
        {/* Connection Indicator */}
        {!isConnected && (
          <div className="text-xs text-amber-500 flex items-center gap-1 px-1 py-1 -mt-4">
            <Zap className="w-4 h-4" />
            Reconnecting...
          </div>
        )}
        {fallbackMode && (
          <div className="text-xs text-slate-400 flex items-center gap-1 px-1 py-1 -mt-4">
            <Clock className="w-4 h-4" />
            Live updates paused — refreshing every 30s
          </div>
        )}
        {/* Stats Section with Glassmorphic Cards */}
        <section className="space-y-4">
          <h2 className="text-xs font-bold text-foreground/50 uppercase tracking-widest pl-1">Overview</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-500 dark:bg-blue-600 text-white p-6 rounded-[2rem] flex flex-col items-center justify-between group shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 blur-2xl rounded-full -mr-8 -mt-8 transition-transform duration-700 group-hover:scale-150" />
              <div className="relative p-3 rounded-full bg-white/20 mb-4 z-10">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div className="text-center z-10 relative">
                 <p className="text-4xl font-black text-white tracking-tighter">{activeRequests.length}</p>
                 <p className="text-[10px] font-bold text-white/90 uppercase tracking-widest mt-1">Active Requests</p>
              </div>
            </div>
            
            <div className="bg-emerald-500 dark:bg-emerald-600 text-white p-6 rounded-[2rem] flex flex-col items-center justify-between group shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 blur-2xl rounded-full -mr-8 -mt-8 transition-transform duration-700 group-hover:scale-150" />
              <div className="relative p-3 rounded-full bg-white/20 mb-4 z-10">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
              <div className="text-center z-10 relative">
                 <p className="text-4xl font-black text-white tracking-tighter">{completedRequests.length}</p>
                 <p className="text-[10px] font-bold text-white/90 uppercase tracking-widest mt-1">Completed</p>
              </div>
            </div>
          </div>
        </section>

        {/* Recent Activity List dynamically parsing new Statuses */}
        <section className="space-y-4">
          <div className="flex items-center justify-between pl-1">
            <h2 className="text-xs font-bold text-foreground/50 uppercase tracking-widest">Recent Activity</h2>
            <button onClick={() => router.push("/company/requests")} className="text-[10px] font-black text-primary flex items-center gap-1.5 hover:opacity-80 transition-opacity tracking-widest">
               VIEW ALL <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {requests.length === 0 ? (
             <div className="flex flex-col items-center justify-center py-16 px-4 bg-muted/20 border border-dashed border-border/80 rounded-[2rem]">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-5 ring-4 ring-primary/5">
                   <Wrench className="w-8 h-8 text-primary/60" />
                </div>
                <p className="text-foreground font-semibold text-center text-base">No service requests yet.</p>
                <p className="text-muted-foreground text-sm text-center mt-1">Start by creating your first request above.</p>
             </div>
          ) : (
             <div className="flex flex-col space-y-3">
               {requests.slice(0, 5).map(req => (
                  <div 
                     key={req.id} 
                     onClick={() => router.push(`/company/requests/${req.id}`)}
                     className="group relative overflow-hidden bg-card border border-border/60 hover:border-primary/40 rounded-[1.25rem] p-4 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 cursor-pointer flex gap-4 items-center ring-1 ring-black/5 dark:ring-white/5"
                  >
                     <div className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-primary to-primary/30 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                     
                     {/* Dynamic Icon Avatar */}
                      <div className="w-12 h-12 bg-muted/50 rounded-[1.25rem] flex items-center justify-center shadow-inner text-primary/70 group-hover:scale-110 group-hover:text-primary transition-all">
                        <ServiceIcon type={req.serviceType} />
                      </div>

                     {/* Main Request Content */}
                     <div className="flex-1 min-w-0 py-0.5">
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                           <h3 className="text-sm font-bold truncate text-foreground">{req.serviceType}</h3>
                           <span className={`flex-shrink-0 px-2.5 py-0.5 rounded-md border text-[9px] font-black tracking-widest uppercase ${getStatusColor(req.status)}`}>
                             {req.status}
                           </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate mb-2.5 max-w-[85%]">{req.description || "No specific details provided."}</p>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                           <span className="bg-muted px-2 py-0.5 rounded flex items-center gap-1.5 text-foreground/70 border border-border/50 shadow-sm">
                             <Clock className="w-3 h-3" />
                             {req.preferredDate ? new Date(req.preferredDate).toLocaleDateString() : "TBD"}
                           </span>
                           <div className="w-1 h-1 rounded-full bg-border"></div>
                           <span className="text-primary/80">{req.priority || "NORMAL"} Priority</span>
                        </div>
                     </div>
                  </div>
               ))}
             </div>
          )}
        </section>
      </main>

      {/* Reused Bottom Navigation Component (Assumes exist in repo based on initial file) */}
      <BottomNav active="home" role="company" />
      
      {/* Global Entry Animation Keyframe */}
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
