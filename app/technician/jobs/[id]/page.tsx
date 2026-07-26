"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { api, Job } from "@/lib/api"
import { ArrowLeft, MapPin, Calendar, Clock, Phone, Loader2, PlayCircle, CheckCircle } from "lucide-react"
import { format } from "date-fns"
import { PageLoader } from "@/components/ui/page-loader"
import { toast } from "sonner"
import { formatTicketId } from "@/lib/utils"
import { JobStatusBadge } from "@/components/ui/job-status-badge"
import { StepIndicator } from "@/components/ui/step-indicator"
import { Info } from "lucide-react"
import { useSSE } from "@/hooks/use-sse"

type ExtendedJob = Job & {
  photos?: string[];
  updates?: { type: string; message: string; createdAt: string | Date; photos?: string[] }[];
};

export default function JobDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [job, setJob] = useState<ExtendedJob | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const { jobUpdates } = useSSE(true)

  useEffect(() => {
    if (jobUpdates && job && job.id === jobUpdates.jobId) {
      setJob(prev => prev ? ({ ...prev, status: jobUpdates.status as Job["status"] }) : null)
    }
  }, [jobUpdates])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.getJobById(id)
        if (res.job) {
          setJob(res.job as Job)
        }
      } catch (error) {
        toast.error("Failed to load job")
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [id])

  const handleAccept = async () => {
    setActionLoading(true)
    try {
      const res = await api.acceptJob(id)
      if (res && res.success === false) {
          toast.error(res.message || "Failed to accept job")
          return
      }
      setJob(prev => prev ? ({ ...prev, status: "Accepted" }) : null)
      toast.success("Job accepted")
      router.refresh()
    } catch (e) {
      toast.error("An error occurred")
    } finally {
      setActionLoading(false)
    }
  }

  const handleDecline = async () => {
    const reason = window.prompt("Please provide a reason for declining this job:")
    if (reason === null) return; // User cancelled prompt

    setActionLoading(true)
    try {
      await api.respondToJobInvite(id, false, reason)
      toast.success("Job declined")
      router.push('/technician/dashboard')
    } catch (e) {
      toast.error("Failed to decline job")
    } finally {
      setActionLoading(false)
    }
  }

  const handleStart = () => {
    router.push(`/technician/jobs/${id}/active`)
  }

  if (loading) return (
    <PageLoader title="Loading Details" subtitle="Fetching work order records..." />
  )

  if (!job) return (
    <div className="min-h-screen app-gradient flex items-center justify-center">
      <div className="glass-card p-10 rounded-3xl text-center">
        <p className="font-bold text-muted-foreground">Job not found</p>
        <button onClick={() => router.back()} className="text-primary text-sm font-bold mt-4">Go Back</button>
      </div>
    </div>
  )

  const isCompleted = job.status === 'Completed';
  const isInProgress = job.status === 'In Progress' || job.status === 'In_Progress';

  return (
    <div className="min-h-screen pb-32 app-gradient">
      {/* Header */}
      <header className="sticky top-0 z-30 px-6 py-6 glass border-b-0 mb-8 flex items-center justify-between shadow-sm">
        <button onClick={() => router.back()} className="w-10 h-10 glass rounded-xl flex items-center justify-center hover:bg-muted/50 transition-all shrink-0 active:scale-90">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="text-right">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none">Job Order</p>
          <h1 className="text-sm font-black text-foreground mt-1">{formatTicketId(job.id)}</h1>
        </div>
      </header>

      <main className="px-6 space-y-6">
        {/* Progress Tracker */}
        <section className="px-1 mb-8">
          <StepIndicator currentStatus={job.status} />
        </section>

        {/* Status Card */}
        <div className="flex justify-center mb-4">
          <JobStatusBadge status={job.status} />
        </div>

        {/* ... (Main content remains same) ... */}
        {/* Main Info Card */}
        <section className="glass-card p-6 rounded-[2rem] border-t border-white/20">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-3">Client Company</p>
          <h2 className="text-2xl font-black text-foreground mb-4 leading-tight">{String(job.company || "Company")}</h2>

          <div className="flex items-start gap-3 p-4 bg-muted/30 rounded-2xl border border-border/50">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5 text-primary" />
            </div>
            <p className="text-sm font-bold text-foreground/80 leading-snug">{String(job.address || job.location || "Location not provided")}</p>
          </div>
        </section>

        {/* Schedule Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="glass-card p-5 rounded-3xl">
            <Calendar className="w-5 h-5 text-primary mb-3" />
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Date</p>
            <p className="font-bold text-sm text-foreground mt-1">{job.date ? new Date(String(job.date)).toLocaleDateString() : "Today"}</p>
          </div>
          <div className="glass-card p-5 rounded-3xl">
            <Clock className="w-5 h-5 text-primary mb-3" />
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Time Slot</p>
            <p className="font-bold text-sm text-foreground mt-1">{String(job.time || job.timeSlot || "Flexible")}</p>
          </div>
        </div>

        {/* Description */}
        <section className="glass-card p-6 rounded-[2rem]">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-4">Service Details</p>
          <p className="text-sm font-medium leading-relaxed text-foreground/70 bg-muted/20 p-4 rounded-2xl border border-border/50">
            {String(job.description || `Maintenance requested for ${String(job.service || 'general')} systems. Please perform initial inspection and report findings.`)}
          </p>
        </section>

        {/* Contact */}
        <section className="glass-card p-5 rounded-3xl flex items-center justify-between border-b-4 border-b-primary/20">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-muted/50 flex items-center justify-center font-black text-muted-foreground">
              {String(job.supervisor || "S").charAt(0)}
            </div>
            <div>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Supervisor</p>
              <p className="font-bold text-foreground">{String(job.supervisor || "N/A")}</p>
            </div>
          </div>
          <a
            href={`tel:${job.supervisorPhone || ''}`}
            className="w-12 h-12 rounded-2xl glass hover:bg-primary hover:text-white transition-all flex items-center justify-center text-primary active:scale-90"
          >
            <Phone className="w-5 h-5" />
          </a>
        </section>

        {/* Reference Photos */}
        {job.photos && job.photos.filter((url: string) => url?.trim() !== "").length > 0 && (
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-2 mb-4 px-1">
              <span className="w-1 h-4 bg-primary rounded-full" />
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Reference Photos</p>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide px-1 snap-x">
              {job.photos.filter((url: string) => url?.trim() !== "").map((url: string, idx: number) => (
                <div
                  key={idx}
                  className="w-64 aspect-[4/3] rounded-[2rem] overflow-hidden glass border border-border/50 shrink-0 group active:scale-95 transition-all shadow-lg snap-center relative"
                  onClick={() => window.open(url, '_blank')}
                >
                  <img
                    src={url}
                    alt={`Job photo ${idx + 1}`}
                    className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-105"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "https://placehold.co/400x300/e2e8f0/64748b?text=Broken+Link"
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center p-4">
                    <p className="text-[8px] font-black text-white uppercase tracking-[0.3em]">Tap to Enlarge</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}


      </main>

      {/* Action Footer */}
      <footer className="fixed bottom-0 left-0 right-0 p-6 glass border-t-0 z-40">
        {(job.status === 'Assigned') ? (
          <div className="flex gap-3">
            <button
              onClick={handleDecline}
              disabled={actionLoading}
              className="flex-1 py-4.5 border border-red-200 bg-red-50 text-red-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-100 transition-all flex items-center justify-center gap-2">
              Decline
            </button>
            <button
              onClick={handleAccept}
              disabled={actionLoading}
              className="flex-[2] py-4.5 bg-primary text-primary-foreground rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-2xl shadow-primary/30 hover:shadow-primary/40 active:scale-95 transition-all flex items-center justify-center gap-3">
              {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
              {actionLoading ? "Processing..." : "Accept Job"}
            </button>
          </div>
        ) : (job.status === 'Accepted' || isInProgress || job.status === 'Team_Confirmed' || job.status === 'On_The_Way' || job.status === 'Arrived') ? (
          <button
            onClick={handleStart}
            className="w-full py-4.5 bg-green-600 text-white rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-2xl shadow-green-600/30 hover:bg-green-700 active:scale-95 transition-all flex items-center justify-center gap-3 animate-in slide-in-from-bottom-2">
            <PlayCircle className="w-5 h-5" />
            {(job.hasActiveSession) ? 'Resume Work' : 'Check In'}
          </button>
        ) : (
          <div className="w-full py-4.5 bg-muted/50 text-muted-foreground border border-border/60 rounded-2xl font-black text-sm uppercase tracking-[0.2em] flex items-center justify-center gap-2">
            <CheckCircle className="w-5 h-5 opacity-50" />
            {(job.status as string) === 'Completed' ? 'Job Completed' : (job.status as string) === 'Work_Completed' ? 'Review for Completion' : 'Task Terminal'}
          </div>
        )}
      </footer>
    </div>
  )
}
