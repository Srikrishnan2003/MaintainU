"use client"

import { BottomNav } from "@/components/navigation/bottom-nav"
import { useEffect, useState } from "react"
import { api, Job } from "@/lib/api"
import { useRouter } from "next/navigation"
import { Bell, Zap, MapPin, Calendar, ArrowRight, CheckCircle, Clock, AlertCircle, Wrench, Droplets, Eye } from "lucide-react"
import { ServiceIcon } from "@/components/ui/service-icon"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { Logo } from "@/components/ui/logo"
import { useSSE } from "@/hooks/use-sse"
import { useSliceRefetch } from "@/hooks/use-slice-refetch"
import { getJobsAction } from "@/actions/lifecycle.action"
import { getTechnicianProfileAction } from "@/actions/technician.action"
import { getTechnicianInviteAction } from "@/actions/team.action"
import { getDailyInviteAction } from "@/actions/roster.action"

export function TechnicianDashboardClient({ initialJobs, initialProfile, initialInvite, initialDailyInvite, technicianId }: any) {
  const router = useRouter()
  const [jobs, setJobs] = useState<any[]>(initialJobs || [])
  const [activeJob, setActiveJob] = useState<any>(() => {
    const jobsData = initialJobs || [];
    return jobsData.find((j: any) => j.status === 'In Progress' || j.status === 'In_Progress') ||
      jobsData.find((j: any) => j.status === 'Accepted' || j.status === 'Team_Confirmed') || null;
  })
  const [techName, setTechName] = useState(initialProfile?.name?.split(' ')[0] || "Technician")
  const [techStatus, setTechStatus] = useState<string>(initialProfile?.status || "Pending")

  const [invite, setInvite] = useState<any>(initialInvite || null)
  const [dailyInvite, setDailyInvite] = useState<any>(initialDailyInvite || null)
  const [processingInvite, setProcessingInvite] = useState(false)

  useEffect(() => {
    setJobs(initialJobs || [])
    const jobsData = initialJobs || []
    const newActive = jobsData.find((j: any) => j.status === 'In Progress' || j.status === 'In_Progress' || j.status === 'On_The_Way' || j.status === 'Arrived' || j.status === 'Work_Started') ||
      jobsData.find((j: any) => j.status === 'Accepted' || j.status === 'Team_Confirmed') || null
    setActiveJob(newActive)
  }, [initialJobs])

  const { jobUpdates, accountApproved, notifications, isConnected, fallbackMode } = useSSE(true)
  const { refetch } = useSliceRefetch()

  useEffect(() => {
    if (!jobUpdates) return
    if (jobUpdates.technicianId !== technicianId) return
    refetch(getJobsAction, (res: any) => {
      const fetchedJobs = res.data || []
      setJobs(fetchedJobs)
      const newActive = fetchedJobs.find((j: any) => j.status === 'In Progress' || j.status === 'In_Progress' || j.status === 'On_The_Way' || j.status === 'Arrived' || j.status === 'Work_Started') ||
        fetchedJobs.find((j: any) => j.status === 'Accepted' || j.status === 'Team_Confirmed') || null
      setActiveJob(newActive)
    })
  }, [jobUpdates, technicianId, refetch]);

  useEffect(() => {
    if (!accountApproved) return
    refetch(getTechnicianProfileAction, (res: any) => {
      if (res && res.data && res.data.status) setTechStatus(res.data.status);
    })
  }, [accountApproved, refetch]);

  useEffect(() => {
    if (!notifications) return
    refetch(getDailyInviteAction, (data: any) => setDailyInvite(data?.invite || null))
    refetch(getTechnicianInviteAction, (data: any) => setInvite(data?.invite || null))
  }, [notifications, refetch]);

  const handleInviteResponse = async (accept: boolean) => {
    if (!invite) return
    setProcessingInvite(true)
    try {
      const res = await api.respondToInvite(invite.id, accept)
      if (res.success) {
        setInvite(null)
        router.refresh()
      }
    } catch (e) {
      console.error("Invite response error", e)
    } finally {
      setProcessingInvite(false)
    }
  }

  const handleDailyInviteResponse = async (accept: boolean) => {
    if (!dailyInvite) return
    setProcessingInvite(true)
    try {
      const res = await api.respondToDailyInvite(dailyInvite.id, accept)
      if (res.success) {
        setDailyInvite(null)
        router.refresh()
      }
    } catch (e) {
      console.error("Daily invite response error", e)
    } finally {
      setProcessingInvite(false)
    }
  }

  const completedCount = jobs.filter(j => j.status === 'Completed').length
  const pendingCount = jobs.filter(j => j.status === 'Pending').length // Invitations
  const activeCount = jobs.filter(j => j.status === 'In Progress' || j.status === 'In_Progress' || j.status === 'Accepted' || j.status === 'Team_Confirmed').length

  const stats = [
    { label: "Completed", value: completedCount.toString(), icon: CheckCircle, bgClass: "bg-green-500 dark:bg-green-600" },
    { label: "Invitations", value: pendingCount.toString(), icon: AlertCircle, bgClass: "bg-orange-500 dark:bg-orange-600" },
    { label: "Active Jobs", value: activeCount.toString(), icon: Clock, bgClass: "bg-blue-500 dark:bg-blue-600" },
  ]

  if (techStatus !== 'ACTIVE' && techStatus !== 'Online' && techStatus !== 'In_Progress') {
    return (
      <div className="min-h-screen app-gradient flex flex-col items-center justify-center p-6 text-center">
        <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-6 animate-pulse">
          <Clock className="w-12 h-12 text-primary" strokeWidth={1.5} />
        </div>
        <h2 className="text-2xl font-black mb-2 uppercase tracking-tight">Profile Under Review</h2>
        <p className="text-muted-foreground text-sm max-w-xs mb-8 leading-relaxed font-medium">
          Our administrative team is currently reviewing your profile. You will receive full access once approved.
        </p>
        <div className="glass-card p-6 rounded-3xl w-full max-w-sm border-t-4 border-t-primary">
          <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground mb-4">Estimated Time</p>
          <p className="text-xl font-bold">24-48 Hours</p>
          <div className="mt-6 flex items-center gap-2 justify-center py-2 px-4 bg-muted/50 rounded-xl">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest">Awaiting Verification</span>
          </div>
        </div>

        <button
          onClick={() => router.push('/login')}
          className="mt-12 text-xs font-black uppercase tracking-widest text-primary hover:underline underline-offset-4"
        >
          Back to Login
        </button>
      </div>
    )
  }



  return (
    <div className="min-h-screen pb-32">
      {/* Header */}
      <header className="sticky top-0 z-20 px-6 py-4 glass border-b-0 flex items-center justify-between mb-2 transition-all">
        <div className="flex items-center gap-4">
          <Logo size="md" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Hello, {techName}</h1>
            <p className="text-muted-foreground text-xs font-medium">Ready for today's work?</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <button onClick={() => router.push("/technician/notifications")} className="w-10 h-10 flex items-center justify-center hover:bg-muted/80 rounded-xl transition-colors ring-1 ring-border/50 active:scale-95 bg-background/50 shadow-sm">
            <Bell className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="px-6 space-y-8">
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
        {/* Master Team Invite Card */}
        {invite && (
          <div className="glass-card p-6 rounded-3xl relative overflow-hidden group border-orange-500/30 shadow-lg shadow-orange-500/10 animate-in slide-in-from-top-4 duration-500 bg-gradient-to-br from-orange-500/5 to-transparent">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-bold text-foreground">Master Team Invite</h2>
                <span className="text-[10px] font-black uppercase tracking-widest text-orange-600 bg-orange-500/10 px-2.5 py-1 rounded-full border border-orange-500/20">New</span>
              </div>

              <div className="mb-6 bg-background/40 backdrop-blur-sm p-4 rounded-2xl border border-border/50">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-1">{invite.ticketId ? invite.ticketId.substring(0, 8).toUpperCase() : 'JOB INVITE'}</p>
                    <p className="font-bold text-foreground">{invite.serviceType || 'Maintenance'} Service</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">{invite.description || 'You have been invited to join the Master Team for this job.'}</p>

                {(invite.preferredDate || invite.timeSlot) && (
                  <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border/50">
                    {invite.preferredDate && (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-orange-500" />
                        <span className="text-xs font-semibold">{String(invite.preferredDate)}</span>
                      </div>
                    )}
                    {invite.timeSlot && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-orange-500" />
                        <span className="text-xs font-semibold">{invite.timeSlot}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={() => router.push(`/technician/jobs/${invite.jobId}`)}
                  className="w-full py-3 rounded-xl border border-orange-500/30 bg-orange-500/10 text-orange-600 font-bold text-sm hover:bg-orange-500/20 transition-colors flex items-center justify-center gap-2"
                >
                  <Eye className="w-4 h-4" /> View Full Details
                </button>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleInviteResponse(false)}
                    disabled={processingInvite}
                    className="flex-1 py-3 rounded-xl border border-border bg-background/50 text-foreground font-semibold text-sm hover:bg-muted transition-colors disabled:opacity-50"
                  >
                    Decline
                  </button>
                  <button
                    onClick={() => handleInviteResponse(true)}
                    disabled={processingInvite}
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold text-sm shadow-lg shadow-orange-500/20 hover:scale-[1.02] transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {processingInvite ? "Processing..." : "Accept"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Daily Work Invite Card */}
        {dailyInvite && (
          <div className="glass-card p-6 rounded-3xl relative overflow-hidden group border-green-500/30 shadow-lg shadow-green-500/10 animate-in slide-in-from-top-4 duration-500 bg-gradient-to-br from-green-500/5 to-transparent">
            <div className="absolute top-0 right-0 p-4 opacity-50">
              <Calendar className="w-12 h-12 text-green-500 rotate-12" />
            </div>
            <div className="relative z-10">
              <h2 className="text-xl font-bold text-foreground mb-2">Daily Work Invite</h2>
              <p className="text-sm text-muted-foreground mb-2">
                You are invited to work on <span className="font-bold text-foreground">{dailyInvite.workDate}</span>
              </p>
              <p className="text-xs text-muted-foreground mb-6">
                Please confirm your availability for today's assignments.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => handleDailyInviteResponse(false)}
                  disabled={processingInvite}
                  className="flex-1 py-3 rounded-xl border border-border bg-background/50 text-foreground font-semibold text-sm hover:bg-muted transition-colors disabled:opacity-50"
                >
                  Not Available
                </button>
                <button
                  onClick={() => handleDailyInviteResponse(true)}
                  disabled={processingInvite}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold text-sm shadow-lg shadow-green-500/20 hover:scale-[1.02] transition-transform disabled:opacity-50"
                >
                  {processingInvite ? "Processing..." : "I'm Available"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Today's Assignment */}
        {activeJob ? (
          <div className="glass-card p-5 rounded-3xl relative overflow-hidden group border-primary/20 shadow-lg shadow-primary/5">
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-primary/20 to-blue-500/20 rounded-full blur-3xl -mr-16 -mt-16 transition-all group-hover:scale-110" />

            <div className="relative z-10">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
                    <p className="text-[10px] text-primary uppercase tracking-wider font-bold">Today's Focus</p>
                  </div>
                  <h3 className="text-xl font-bold tracking-tight">{activeJob.companyName}</h3>
                </div>
                <span className="px-2.5 py-1 bg-background/50 backdrop-blur-md border border-white/20 rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-sm">
                  {activeJob.status}
                </span>
              </div>

              <div className="flex items-center gap-2 text-sm text-foreground/80 mb-2 font-medium">
                  <span className="bg-primary/20 p-2 rounded-xl text-primary">
                    <ServiceIcon type={activeJob.serviceType} className="w-4 h-4" />
                  </span>
                <span>{activeJob.serviceType}</span>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
                <MapPin className="w-4 h-4" />
                <span className="truncate max-w-[200px]">{activeJob.timeSlot || "Flexible"} - {activeJob.location || "On Site"}</span>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => router.push(`/technician/jobs/${activeJob.id}`)}
                  className="flex-1 py-3 rounded-xl border border-border/50 bg-background/50 hover:bg-background/80 font-semibold text-sm transition-all backdrop-blur-sm"
                >
                  View Details
                </button>
                <button
                  onClick={() => router.push(`/technician/jobs/${activeJob.id}/active`)}
                  className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-all shadow-lg shadow-primary/20 text-sm active:scale-95"
                >
                  {activeJob.hasActiveSession ? "Active Session" : "Check In"}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="glass-card p-8 rounded-3xl text-center mb-8 border-dashed flex flex-col items-center justify-center gap-2">
            <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-2">
              <Calendar className="w-6 h-6 text-muted-foreground/50" />
            </div>
            <p className="text-muted-foreground font-medium">No active assignment for today.</p>
            <p className="text-xs text-muted-foreground/70">Enjoy your day off!</p>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          {stats.map((stat, idx) => (
            <div key={idx} className={`${stat.bgClass} text-white p-3 rounded-2xl flex flex-col items-center text-center relative overflow-hidden group shadow-lg`}>
              <div className={`absolute top-0 right-0 w-12 h-12 rounded-full blur-xl -mr-6 -mt-6 bg-white/30 group-hover:scale-150 transition-transform duration-500`} />
              <div className={`relative p-2 rounded-full bg-white/20 mb-2`}>
                <stat.icon className="w-5 h-5 text-white" />
              </div>
              <p className="text-xl font-bold tracking-tight relative z-10">{stat.value}</p>
              <p className="text-[8px] uppercase font-bold tracking-wider text-white/90 mt-0.5 relative z-10">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Upcoming Jobs */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">Upcoming Jobs</h2>
            <button className="text-xs font-semibold text-primary uppercase tracking-wide hover:underline">View All</button>
          </div>
          <div className="space-y-3">
            {jobs.filter(j => j.id !== activeJob?.id && j.status !== 'Completed' && j.status !== 'Work_Completed').slice(0, 3).map((job) => (
              <div key={job.id} onClick={() => router.push(`/technician/jobs/${job.id}`)} className="glass-card p-4 rounded-2xl flex items-center justify-between group cursor-pointer hover:border-primary/30 transition-all border-transparent">
                <div className="flex gap-4 items-center">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${job.serviceType === 'Electrical' ? 'bg-yellow-500/10 text-yellow-600' : 'bg-primary/10 text-primary'}`}>
                    <ServiceIcon type={job.serviceType} className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{job.companyName}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3 h-3" /> 
                      {job.preferredDate ? `${job.preferredDate} • ` : ''}
                      {job.timeSlot || 'Flexible'}
                    </p>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-muted/50 group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            ))}
            {jobs.filter(j => j.id !== activeJob?.id && j.status !== 'Completed' && j.status !== 'Work_Completed').length === 0 && (
              <div className="text-center py-8 text-muted-foreground bg-muted/5 rounded-2xl border border-dashed">
                <p className="text-sm">No upcoming jobs scheduled</p>
              </div>
            )}
          </div>
        </div>

      </main>

      <BottomNav active="home" role="technician" />
    </div>
  )
}
