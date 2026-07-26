"use client"

import { useState, useEffect } from "react"
import { BottomNav } from "@/components/navigation/bottom-nav"
import { PageLoader } from "@/components/ui/page-loader"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { 
  Zap, 
  Droplets, 
  Clock, 
  Wrench, 
  PenTool, 
  MapPin, 
  Calendar, 
  ChevronRight, 
  CheckCircle,
  PlayCircle,
  Play,
  CheckCircle2,
  Loader2,
  ArrowRight
} from "lucide-react"
import { ServiceIcon } from "@/components/ui/service-icon"
import { ErrorBoundary } from "@/components/error-boundary"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useSSE } from "@/hooks/use-sse"
import { useSliceRefetch } from "@/hooks/use-slice-refetch"
import { getJobsAction } from "@/actions/lifecycle.action"

export default function TechnicianDashboard() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<"today" | "assigned" | "completed">("today")
  const [jobs, setJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const { jobUpdates, isConnected, fallbackMode } = useSSE(true)
  const { refetch } = useSliceRefetch()

  const fetchJobs = async () => {
    try {
      const res = await getJobsAction()
      const allJobs = res.data || []
      
      const normalizedJobs = allJobs.map((j: any) => ({
          ...j,
          status: j.status.toUpperCase() === 'PENDING' || j.status.toUpperCase() === 'ACCEPTED' ? 'ASSIGNED' : 
                  j.status.toUpperCase() === 'IN_PROGRESS' || j.status.toUpperCase() === 'IN PROGRESS' ? 'IN_PROGRESS' : 
                  j.status.toUpperCase()
      }))

      setJobs(normalizedJobs)
    } catch (error) {
      toast.error("Failed to fetch jobs")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchJobs()
  }, [])

  useEffect(() => {
    if (!jobUpdates) return
    refetch(getJobsAction, (res: any) => {
      const allJobs = res.data || []
      const normalizedJobs = allJobs.map((j: any) => ({
          ...j,
          status: j.status.toUpperCase() === 'PENDING' || j.status.toUpperCase() === 'ACCEPTED' ? 'ASSIGNED' : 
                  j.status.toUpperCase() === 'IN_PROGRESS' || j.status.toUpperCase() === 'IN PROGRESS' ? 'IN_PROGRESS' : 
                  j.status.toUpperCase()
      }))
      setJobs(normalizedJobs)
    })
  }, [jobUpdates, refetch])

  const todaysJobs = jobs.filter(j => j.status === 'IN_PROGRESS' || j.status === 'ASSIGNED') // Normally filtering by Date too, simplifying for demo
  const assignedJobs = jobs.filter(j => j.status === 'ASSIGNED')
  const completedJobs = jobs.filter(j => j.status === 'WORK_COMPLETED' || j.status === 'COMPLETED')

  const handleAction = async (jobId: string, action: "START" | "COMPLETE") => {
    try {
        if (action === "START") {
            toast.success("Job Started!")
            setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: 'IN_PROGRESS' } : j))
        } else {
            toast.success("Job Completed!")
            setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: 'COMPLETED' } : j))
            router.push(`/technician/jobs/${jobId}`)
        }
    } catch (e) {
        toast.error(`Failed to ${action.toLowerCase()} job`)
    }
  }



  const currentList = activeTab === "today" ? todaysJobs : activeTab === "assigned" ? assignedJobs : completedJobs

  return (
    <div className="min-h-screen bg-background pb-32 font-sans selection:bg-primary/20 transition-colors duration-300">
      {/* Mobile-First Header */}
      <header className="sticky top-0 z-50 px-5 py-5 bg-background/90 backdrop-blur-2xl border-b border-border/50">
        <div className="flex items-center justify-between mb-5">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-foreground">My Jobs</h1>
              <p className="text-xs text-primary font-bold uppercase tracking-widest mt-0.5 animate-pulse">Online & Ready</p>
            </div>
            <ThemeToggle />
        </div>

        {/* Large Tab Switcher */}
        <div className="flex p-1.5 bg-muted/50 rounded-2xl gap-1 ring-1 ring-border shadow-inner">
          <button
            onClick={() => setActiveTab("today")}
            className={`flex-1 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
              activeTab === "today"
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25 translate-y-[-1px]"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            TODAY
          </button>
          <button
            onClick={() => setActiveTab("assigned")}
            className={`flex-1 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all relative ${
              activeTab === "assigned"
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25 translate-y-[-1px]"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            ASSIGNED
            {assignedJobs.length > 0 && activeTab !== "assigned" && (
                <span className="absolute top-2 right-4 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("completed")}
            className={`flex-1 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
              activeTab === "completed"
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25 translate-y-[-1px]"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            COMPLETED
          </button>
        </div>
      </header>

      <main className="px-5 py-6 animate-fade-in-up">
        {/* Connection Indicator */}
        {!isConnected && (
          <div className="text-xs text-amber-500 flex items-center gap-1 px-1 py-1 -mt-4 mb-2">
            <Zap className="w-4 h-4" />
            Reconnecting...
          </div>
        )}
        {fallbackMode && (
          <div className="text-xs text-slate-400 flex items-center gap-1 px-1 py-1 -mt-4 mb-2">
            <Clock className="w-4 h-4" />
            Live updates paused — refreshing every 30s
          </div>
        )}
        <ErrorBoundary>
        {loading ? (
          <PageLoader title="Loading Jobs" subtitle="Fetching your scheduled tasks..." />
        ) : currentList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center rounded-[2rem] border-2 border-dashed border-border/60 bg-muted/20">
             <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                <CheckCircle2 className="w-10 h-10 text-primary/60" />
             </div>
             <p className="text-xl font-black text-foreground">You're all caught up!</p>
             <p className="text-sm font-semibold text-muted-foreground mt-2">No jobs pending for {activeTab}.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {currentList.map(job => (
              <div 
                key={job.id} 
                className="relative overflow-hidden bg-card border border-border/80 rounded-[2rem] p-5 shadow-sm active:scale-[0.98] transition-all"
              >
                {/* Background Decor */}
                <div className={`absolute -right-8 -top-8 w-32 h-32 blur-3xl opacity-30 rounded-full ${job.status === 'IN_PROGRESS' ? 'bg-orange-500' : 'bg-primary'}`} />

                <div className="flex justify-between items-start mb-5 relative z-10">
                    <div className="flex gap-4 items-center">
                        <div className={`w-16 h-16 rounded-[1.25rem] flex items-center justify-center shadow-inner ${job.status === 'IN_PROGRESS' ? 'bg-orange-500/10 text-orange-600' : 'bg-primary/10 text-primary'}`}>
                            <ServiceIcon type={job.service || job.type} className="w-8 h-8" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-foreground">{job.service || job.type}</h2>
                            <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">{job.companyName || job.company}</p>
                        </div>
                    </div>
                </div>

                <div className="space-y-3 mb-6 relative z-10">
                    <div className="flex gap-3 items-center bg-muted/40 p-3 rounded-2xl border border-border/50">
                        <MapPin className="w-5 h-5 text-primary flex-shrink-0" />
                        <span className="text-sm font-bold truncate pr-2">{job.location || "123 Industrial Park, Sector 4"}</span>
                    </div>

                    <div className="flex gap-2">
                        <span className={`px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-widest ${
                            job.status === 'IN_PROGRESS' ? 'bg-orange-500/10 text-orange-600 border-orange-500/20' : 
                            'bg-blue-500/10 text-blue-600 border-blue-500/20'
                        }`}>
                            {job.status.replace("_", " ")}
                        </span>
                    </div>
                </div>

                {/* Massive Action Buttons */}
                <div className="relative z-10 border-t border-border/50 pt-5 mt-2">
                    {job.status === 'ASSIGNED' ? (
                        <button 
                            onClick={() => handleAction(job.id, "START")}
                            className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-primary to-primary/80 py-5 rounded-[1.5rem] text-primary-foreground font-black text-sm uppercase tracking-widest shadow-xl shadow-primary/25 hover:shadow-2xl active:shadow-sm transition-all"
                        >
                            <Play className="w-6 h-6 fill-current" />
                            ACCEPT & START
                        </button>
                    ) : job.status === 'IN_PROGRESS' ? (
                        <div className="flex flex-col gap-3">
                            <button 
                                onClick={() => handleAction(job.id, "COMPLETE")}
                                className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-emerald-500 to-emerald-400 py-5 rounded-[1.5rem] text-white font-black text-sm uppercase tracking-widest shadow-xl shadow-emerald-500/25 active:scale-95 transition-all"
                            >
                                <CheckCircle2 className="w-6 h-6" />
                                COMPLETE JOB
                            </button>
                            <button 
                                onClick={() => router.push(`/technician/jobs/${job.id}`)}
                                className="w-full flex items-center justify-center gap-2 py-4 rounded-[1.5rem] bg-muted/50 text-foreground font-black text-xs uppercase tracking-widest hover:bg-muted active:scale-95 transition-all border border-border"
                            >
                                Job Details <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    ) : job.status === 'WORK_COMPLETED' || job.status === 'COMPLETED' ? (
                        <div className="flex flex-col gap-3">
                            <p className="text-center text-[11px] font-black text-muted-foreground uppercase tracking-widest mb-1">
                                {job.status === 'WORK_COMPLETED' ? 'Completion is in review' : 'Job fully completed'}
                            </p>
                            <button 
                                onClick={() => router.push(`/technician/jobs/${job.id}`)}
                                className="w-full flex items-center justify-center gap-2 py-4 rounded-[1.5rem] bg-muted/50 text-foreground font-black text-xs uppercase tracking-widest hover:bg-muted active:scale-95 transition-all border border-border"
                            >
                                View Details <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
        </ErrorBoundary>
      </main>

      <BottomNav active="jobs" role="technician" />

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}}/>
    </div>
  )
}
