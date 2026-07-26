"use client"

import { BottomNav } from "@/components/navigation/bottom-nav"
import { CheckCircle2, Loader2, ArrowLeft, Clock, Calendar, MapPin, User, Phone, AlertTriangle, FileText, Briefcase, Star, MessageSquare, AlertOctagon, Info } from "lucide-react"
import { toast } from "sonner"
import { useEffect, useState, use } from "react"
import { api, Request } from "@/lib/api"
import { useRouter } from "next/navigation"
import { formatTicketId } from "@/lib/utils"

export default function RequestDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [request, setRequest] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.getRequestById(id)
        if (res.request) {
          setRequest(res.request)
        }
      } catch (error) {
        console.error("Failed to fetch request", error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen app-gradient flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
        <span className="text-sm font-black text-muted-foreground uppercase tracking-widest animate-pulse">Syncing details...</span>
      </div>
    )
  }

  if (!request) {
    return (
      <div className="min-h-screen app-gradient flex flex-col items-center justify-center gap-4">
        <p className="font-bold text-muted-foreground">Request not found</p>
        <button onClick={() => router.back()} className="text-primary text-sm font-bold mt-4">Go Back</button>
      </div>
    )
  }

  const steps = ["Ticket Sent", "Team Assigned", "Work Started", "Finished"]

  const getStepIndex = (status: string) => {
    switch (status) {
      case "Requested":
      case "Reviewing":
        return 0;
      case "Assigned":
      case "Accepted":
      case "Declined":
      case "Team_Confirmed":
        return 1;
      case "In_Progress":
      case "On_Hold":
      case "Failed":
      case "Arrived":
        return 2;
      case "Completed":
      case "Paid":
      case "Invoiced":
        return 3;
      default:
        return 0;
    }
  }

  const currentStepIndex = getStepIndex(request.status)
  const isRejected = request.status === "Rejected"
  const isCancelled = request.status === "Cancelled"

  return (
    <div className="min-h-screen pb-32 app-gradient">
      {/* Header */}
      <header className="px-6 pt-8 pb-6 bg-background/50 backdrop-blur-xl border-b border-border/40 sticky top-0 z-40 transition-all">
        <div className="flex items-center justify-between mb-8">
            <button onClick={() => router.back()} className="w-10 h-10 glass rounded-xl flex items-center justify-center hover:bg-muted/50 transition-all shrink-0 active:scale-90">
                <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <div className="text-right">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none">Job Profile</p>
                <h1 className="text-sm font-black text-foreground mt-1">{formatTicketId(request.id)}</h1>
            </div>
        </div>

        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-colors shadow-sm ${
                    isRejected ? "bg-red-600 text-white border-red-600" :
                    isCancelled ? "bg-slate-500 text-white border-slate-500" :
                    "bg-primary/10 text-primary border-primary/20"
                }`}>
                    {request.status.replace('_', ' ')}
                </div>
                <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm ${request.priority === 'Emergency' ? 'bg-red-600 text-white border-red-600' :
                    request.priority === 'Urgent' ? 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' :
                        'bg-blue-500/10 text-blue-500 border-blue-500/20'
                    }`}>
                    {request.priority}
                </span>
            </div>
            <h2 className="text-2xl font-black text-foreground leading-tight tracking-tight pr-8">{request.description}</h2>
        </div>
      </header>

      <div className="px-6 space-y-6 pt-6 relative z-10">
        
        {/* Alerts / Important Statuses */}
        {request.status === 'On_Hold' && (
            <div className="p-5 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex gap-4 animate-in fade-in slide-in-from-top-4">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5 text-amber-600" />
                </div>
                <div className="space-y-1">
                    <p className="text-sm font-black text-amber-900 uppercase tracking-widest">Job Paused</p>
                    <p className="text-xs font-bold text-amber-700/80 leading-snug">This job is currently on hold. We'll update you as soon as work resumes.</p>
                </div>
            </div>
        )}

        {isRejected && (
            <div className="p-5 rounded-3xl bg-red-600 text-white border border-red-700 shadow-xl shadow-red-600/20 flex gap-4 animate-in fade-in slide-in-from-top-4">
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                    <AlertOctagon className="w-5 h-5 text-white" />
                </div>
                <div className="space-y-1">
                    <p className="text-sm font-black uppercase tracking-widest">Request Not Approved</p>
                    <p className="text-xs font-bold text-white/90 leading-snug">Admin has rejected this maintenance request. Please contact support for more details.</p>
                </div>
            </div>
        )}

        {/* Progress Card */}
        {!isRejected && !isCancelled && (
            <section className="glass-card p-6 rounded-[2.5rem] shadow-xl bg-card border-t border-white/20">
                <div className="flex items-center gap-2 mb-8">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Clock className="w-4 h-4 text-primary" />
                    </div>
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Service Progress</p>
                </div>

                <div className="relative pl-8 space-y-10 before:absolute before:left-[14px] before:top-2 before:bottom-2 before:w-[2px] before:bg-muted/40 before:rounded-full">
                    {steps.map((step, idx) => {
                        const isCompleted = currentStepIndex >= idx
                        const isCurrent = currentStepIndex === idx
                        return (
                            <div key={step} className="relative flex items-start gap-5 group">
                                <div className={`
                                    absolute left-[-26px] w-6 h-6 rounded-full border-2 transition-all duration-700 z-10 flex items-center justify-center
                                    ${isCompleted ? 'bg-primary border-primary shadow-lg shadow-primary/30' : 
                                    isCurrent ? 'bg-primary/20 border-primary animate-pulse' : 
                                    'bg-background border-muted group-hover:border-primary/40'}
                                `}>
                                    {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5 text-white" /> : <div className={`w-1.5 h-1.5 rounded-full ${isCurrent ? 'bg-primary' : 'bg-muted/50'}`} />}
                                </div>
                                <div className={`transition-all duration-300 ${isCurrent ? 'translate-x-2' : ''}`}>
                                    <p className={`text-sm font-black uppercase tracking-widest ${isCompleted || isCurrent ? 'text-foreground' : 'text-muted-foreground/50'}`}>{step}</p>
                                    <p className="text-[10px] text-muted-foreground font-black tracking-[0.2em] mt-1">
                                        {isCompleted ? "DONE" : isCurrent ? "ACTIVE" : "PENDING"}
                                    </p>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </section>
        )}

        {/* Meta Grid */}
        <section className="grid grid-cols-2 gap-4">
            <div className="glass-card p-5 rounded-[2rem] flex flex-col gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Preferred Date</p>
                    <p className="font-black text-foreground mt-1">{request.preferredDate ? String(request.preferredDate) : "TBD"}</p>
                </div>
            </div>
            <div className="glass-card p-5 rounded-[2rem] flex flex-col gap-3">
                <div className="w-10 h-10 rounded-2xl bg-orange-500/10 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Target Slot</p>
                    <p className="font-black text-foreground mt-1">{request.timeSlot || "Anytime"}</p>
                </div>
            </div>
        </section>

        {/* Description */}
        <section className="glass-card p-6 rounded-[2.5rem]">
            <div className="flex items-center gap-2 mb-4">
                <FileText className="w-4 h-4 text-primary" />
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Full Details</p>
            </div>
            <p className="text-sm font-medium leading-relaxed text-foreground/80 bg-muted/20 p-5 rounded-3xl border border-border/50">
                {request.description}
            </p>
        </section>

        {/* Photos */}
        {request.photos && (request.photos as string[]).filter((url: string) => url?.trim() !== "").length > 0 && (
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 px-1">
             <div className="flex items-center gap-2 mb-4">
                <span className="w-1 h-3.5 bg-primary rounded-full" />
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Reference Media ({ (request.photos as string[]).filter((url: string) => url?.trim() !== "").length })</p>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x">
              {(request.photos as string[]).filter((url: string) => url?.trim() !== "").map((url: string, idx: number) => {
                const isPdf = url.toLowerCase().endsWith('.pdf');
                return (
                  <div
                    key={idx}
                    className="w-64 aspect-video relative rounded-3xl overflow-hidden glass border border-border/50 shrink-0 group shadow-lg snap-center active:scale-95 transition-all bg-muted/20"
                    onClick={() => window.open(url, '_blank')}
                  >
                    {isPdf ? (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-muted-foreground group-hover:text-primary transition-colors">
                        <FileText className="w-12 h-12" />
                        <span className="text-xs font-bold uppercase tracking-widest">PDF Document</span>
                      </div>
                    ) : (
                      <img src={url} alt={`Attachment ${idx + 1}`} className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-105" />
                    )}
                    <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[1px]">
                       <div className="w-10 h-10 rounded-xl bg-white/90 dark:bg-black/50 flex items-center justify-center shadow-xl">
                          <Info className="w-5 h-5 text-primary" />
                       </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Team Card */}
        {request.supervisor && (
            <section className="glass-card p-6 rounded-[2.5rem] shadow-lg">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-4">Assignee</p>
                <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-3xl border border-border/50">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black text-xl shadow-inner">
                        {request.supervisor.charAt(0)}
                    </div>
                    <div className="flex-1">
                        <p className="font-black text-foreground">{request.supervisor}</p>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-1">Lead Supervisor</p>
                    </div>
                    {request.supervisorPhone && (
                        <a href={`tel:${request.supervisorPhone}`} className="w-12 h-12 bg-green-500/10 text-green-600 rounded-2xl hover:bg-green-500/20 transition-all flex items-center justify-center active:scale-90 shadow-sm border border-green-500/20">
                            <Phone className="w-5 h-5" />
                        </a>
                    )}
                </div>
            </section>
        )}


      </div >

      <BottomNav active="requests" role="company" />
    </div >
  )
}
