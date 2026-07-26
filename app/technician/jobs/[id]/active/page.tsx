"use client"

import { useState, useEffect, use, useRef } from "react"
import { useRouter } from "next/navigation"
import { Phone, CheckCircle2, Loader2, ArrowLeft, PauseCircle, AlertOctagon, PlayCircle, Clock, MessageSquare } from "lucide-react"
import { api, Job } from "@/lib/api"
import { toast } from "sonner"
import { StepIndicator } from "@/components/ui/step-indicator"
import { JobStatusBadge } from "@/components/ui/job-status-badge"

export default function ActiveJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [job, setJob] = useState<Job | null>(null)
  const [isLead, setIsLead] = useState(false)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [updateMessage, setUpdateMessage] = useState("")
  const [postingUpdate, setPostingUpdate] = useState(false)

  const shareLocation = async (manual = false) => {
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        if (!navigator.geolocation) reject(new Error("No Geolocation"));
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });

      const res = await api.checkIn(id, {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      });

      if (res && res.success) {
          if (manual) toast.success("Location shared successfully");
          const updated = await api.getJobById(id);
          if (updated.job) setJob(updated.job as Job);
      } else if (manual) {
          toast.error("Failed to check in");
      }
    } catch (e) {
      console.error("Location error", e);
      if (manual) toast.error("Could not share location");
      if (!manual) {
          const res = await api.checkIn(id, { latitude: 12.9716, longitude: 77.5946 });
          if (res && res.success) {
              const updated = await api.getJobById(id);
              if (updated.job) setJob(updated.job as Job);
          }
      }
    }
  }

  const handlePause = async () => {
    const reason = window.prompt("Reason for putting this job on hold (e.g., waiting for parts):")
    if (!reason) return;

    setActionLoading(true)
    try {
      const res = await api.pauseJob(id, reason)
      if (res.success) {
        toast.success("Job put on hold")
        router.push('/technician/dashboard')
      } else {
        toast.error(res.message || "Failed to pause job")
      }
    } catch (e) {
      toast.error("An error occurred")
    } finally {
      setActionLoading(false)
    }
  }

  const handleFail = async () => {
    const reason = window.prompt("Reason why this job failed:")
    if (!reason) return;

    setActionLoading(true)
    try {
      const res = await api.failJob(id, reason)
      if (res.success) {
        toast.success("Job marked as failed")
        router.push('/technician/dashboard')
      } else {
        toast.error(res.message || "Failed to mark as failed")
      }
    } catch (e) {
      toast.error("An error occurred")
    } finally {
      setActionLoading(false)
    }
  }

  const handleCheckOut = async () => {
    setActionLoading(true)
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        if (!navigator.geolocation) reject(new Error("No Geolocation"));
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });

      const res = await api.checkOut(id, {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      });

      if (res.success) {
        toast.success("Checked out for the day")
        router.push('/technician/dashboard')
      } else {
        toast.error(res.message || "Failed to check out")
      }
    } catch (e) {
      console.error("Location error during checkout", e);
      toast.error("Could not capture location for checkout")
    } finally {
      setActionLoading(false)
    }
  }

  const handlePostUpdate = async () => {
    if (!updateMessage.trim()) return;
    setPostingUpdate(true)
    try {
      const res = await api.postJobUpdate(id, updateMessage.trim(), [])
      if (res.success) {
        toast.success("Update posted successfully")
        setUpdateMessage("")
      } else {
        toast.error("Failed to post update")
      }
    } catch (e) {
      toast.error("An error occurred")
    } finally {
      setPostingUpdate(false)
    }
  }

  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        const res = await api.getJobById(id)
        if (!isMounted) return;
        if (res.job) {
          setJob(res.job as Job)
          setIsLead(!!res.isLead)
          if (['Accepted', 'In Progress', 'In_Progress'].includes(res.job.status)) {
            await shareLocation(false);
          }
          if (!isMounted) return;

          if (typeof window !== "undefined" && navigator.geolocation) {
            let lastPing = 0;
            watchIdRef.current = navigator.geolocation.watchPosition(
              async (position) => {
                if (!isMounted) return;
                const now = Date.now();
                if (now - lastPing > 60000) { // 1 minute throttle
                  lastPing = now;
                  try {
                    await api.checkIn(id, {
                      latitude: position.coords.latitude,
                      longitude: position.coords.longitude
                    });
                  } catch (e) {
                    console.error("Silent check-in failed", e);
                  }
                }
              },
              (err) => console.error("WatchPosition error:", err),
              { enableHighAccuracy: true, maximumAge: 30000, timeout: 27000 }
            );
          }
        }
      } catch (error) {
        toast.error("Failed to load job details")
      } finally {
        setLoading(false)
      }
    }

    fetchData()

    return () => {
      isMounted = false;
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    }
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen app-gradient flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
        <span className="text-sm font-bold text-muted-foreground animate-pulse">Loading active session...</span>
      </div>
    )
  }

  if (!job) return <div className="p-6">Job not found</div>

  return (
    <div className="min-h-screen px-6 pt-6 pb-48 app-gradient">
      {/* Header */}
      <div className="relative text-center mb-8">
        <button onClick={() => router.push('/technician/dashboard')} className="absolute left-0 top-0 w-10 h-10 glass rounded-xl flex items-center justify-center hover:bg-muted/50 transition-all shrink-0 active:scale-90">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">Currently Working</p>
        <h1 className="text-2xl font-black">{String(job.company || "Company")}</h1>
      </div>

      {/* Progress Tracker */}
      <section className="px-1 mb-8">
        <StepIndicator currentStatus={job.status} />
      </section>

      {/* Status Badge */}
      <div className="flex justify-center mb-6">
        <JobStatusBadge status={job.status} />
      </div>

      {/* On Hold Alert */}
      {job.status === 'On_Hold' && (
        <div className="glass-card p-6 rounded-[2rem] border-amber-500/20 bg-amber-500/5 mb-8 flex gap-4 animate-in fade-in slide-in-from-top-4">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/20 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-black text-amber-900 uppercase tracking-widest">Paused</p>
            <p className="text-xs font-bold text-amber-700/80 leading-tight">This job is currently on hold. Tap 'Resume' below to continue.</p>
          </div>
        </div>
      )}

      {/* Check In Status */}
      {['In_Progress', 'In Progress'].includes(job.status) && (
        <div className="glass-card p-6 rounded-[2rem] border-green-500/20 bg-green-500/5 mb-8 text-center flex flex-col items-center justify-center min-h-[120px] shadow-xl shadow-green-500/5">
          <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-4 animate-pulse">
            <CheckCircle2 className="w-8 h-8 text-green-600" strokeWidth={2.5} />
          </div>
          <p className="text-xl font-black text-green-600 tracking-tight">ACTIVE SESSION</p>
          <p className="text-xs font-bold text-green-600/70 mt-1 uppercase tracking-widest">You are currently checked in</p>
        </div>
      )}

      {/* Supervisor */}
      <div className="glass-card p-5 rounded-3xl mb-6">
        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-4">Site Supervisor</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center font-bold text-muted-foreground text-sm uppercase">
               {String(job.supervisor || "S").charAt(0)}
            </div>
            <p className="font-bold text-foreground">{String(job.supervisor || "Field Supervisor")}</p>
          </div>
          <a href={`tel:${job.supervisorPhone || ''}`} className="w-10 h-10 glass rounded-xl flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-all active:scale-90">
            <Phone className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Job Update Form */}
      {['In_Progress', 'In Progress', 'Work_Started'].includes(job.status) && (
        <div className="glass-card p-5 rounded-3xl mb-6 border-primary/20">
          <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-4">Post Live Update</p>
          <textarea
            value={updateMessage}
            onChange={(e) => setUpdateMessage(e.target.value)}
            placeholder="What's the current progress?"
            className="w-full px-4 py-3 rounded-2xl border border-border bg-background focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm mb-3 resize-none min-h-[80px]"
          />
          <button
            onClick={handlePostUpdate}
            disabled={postingUpdate || !updateMessage.trim()}
            className="w-full py-3 bg-primary/10 text-primary rounded-xl font-black text-xs uppercase tracking-widest hover:bg-primary/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {postingUpdate ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
            Send Update
          </button>
        </div>
      )}

      {/* Issues / Support */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <button 
          onClick={handlePause}
          disabled={actionLoading}
          className="p-5 rounded-[2.2rem] glass border-amber-500/20 bg-amber-500/5 text-amber-600 flex flex-col items-center gap-2 hover:bg-amber-500/10 transition-all active:scale-95 disabled:opacity-50 group"
        >
          <PauseCircle className="w-6 h-6 group-hover:scale-110 transition-transform" />
          <span className="font-black text-[9px] uppercase tracking-widest">Put On Hold</span>
        </button>
        <button 
          onClick={handleFail}
          disabled={actionLoading}
          className="p-5 rounded-[2.2rem] glass border-red-500/20 bg-red-500/5 text-red-600 flex flex-col items-center gap-2 hover:bg-red-500/10 transition-all active:scale-95 disabled:opacity-50 group"
        >
          <AlertOctagon className="w-6 h-6 group-hover:scale-110 transition-transform" />
          <span className="font-black text-[9px] uppercase tracking-widest">Work Failed</span>
        </button>
      </div>

      {/* Action Buttons */}
      <div className="fixed bottom-0 left-0 right-0 p-6 glass border-t-0 z-50">
        {job.status === 'On_Hold' ? (
           <button
            onClick={() => shareLocation(true)}
            className="w-full py-4.5 bg-primary text-white rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-2xl flex items-center justify-center gap-3 active:scale-95 transition-all"
           >
             <PlayCircle className="w-5 h-5" />
             Resume Work
           </button>
        ) : (
          <div className="flex gap-3">
            <button
              onClick={handleCheckOut}
              disabled={actionLoading}
              className={`py-4.5 border border-primary text-primary bg-primary/5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-primary/10 active:scale-95 transition-all flex items-center justify-center gap-2 ${isLead ? 'flex-1' : 'w-full'}`}
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
              Check Out
            </button>
            {isLead && (
              <button
                onClick={() => router.push(`/technician/jobs/${id}/signature`)}
                disabled={actionLoading}
                className="flex-[2] py-4.5 bg-primary text-primary-foreground rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-2xl shadow-primary/30 hover:shadow-primary/40 active:scale-95 transition-all flex items-center justify-center gap-3"
              >
                {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                {actionLoading ? "Processing..." : "Complete"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
