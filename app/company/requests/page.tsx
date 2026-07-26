"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { BottomNav } from "@/components/navigation/bottom-nav"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { BiSearch, BiPlus, BiLoaderAlt } from "react-icons/bi"
import { Clock, Plus, Settings, Ticket, Wrench, ChevronRight, MessageSquare, Briefcase, Zap, Thermometer, Droplet, ArrowRight, Bell, Calendar } from "lucide-react"
import { ServiceIcon } from "@/components/ui/service-icon"
import { PageLoader } from "@/components/ui/page-loader"
import { api, Request } from "@/lib/api"
import { toast } from "sonner"
import { formatTicketId } from "@/lib/utils"
import { ErrorBoundary } from "@/components/error-boundary"

export default function CompanyRequestsPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<"all" | "active" | "completed">("all")
  const [requests, setRequests] = useState<Request[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const res = await api.getCompanyRequests()
        if (res.requests) {
          setRequests(res.requests as unknown as Request[])
        }
      } catch (error) {
        toast.error("Failed to load requests")
      } finally {
        setLoading(false)
      }
    }
    fetchRequests()
  }, [])

  const statusColors: Record<string, string> = {
    "Requested": "bg-blue-500/10 text-blue-600 border-blue-500/20",
    "Reviewing": "bg-purple-500/10 text-purple-600 border-purple-500/20",
    "Assigned": "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
    "Accepted": "bg-indigo-600 text-white border-indigo-600",
    "In_Progress": "bg-orange-500/10 text-orange-600 border-orange-500/20",
    "On_Hold": "bg-amber-500/10 text-amber-600 border-amber-500/20",
    "Failed": "bg-red-500/10 text-red-600 border-red-500/20",
    "Declined": "bg-orange-100 text-orange-700 border-orange-200",
    "Completed": "bg-green-500/10 text-green-600 border-green-500/20",
    "Rejected": "bg-red-600 text-white border-red-600 shadow-lg shadow-red-600/20",
    "Cancelled": "bg-slate-500/10 text-slate-600 border-slate-500/20",
  }



  const filteredRequests = requests.filter(req => {
    const matchesSearch = (req.serviceType || "").toLowerCase().includes(search.toLowerCase()) || 
                          formatTicketId(req.id).toLowerCase().includes(search.toLowerCase())
    
    if (!matchesSearch) return false
    
    if (activeTab === "completed") return req.status === "Completed"
    if (activeTab === "active") return !["Completed", "Cancelled", "Rejected"].includes(req.status)
    return true
  })

  return (
    <div className="min-h-screen pb-32 app-gradient">
      {/* Header */}
      <header className="sticky top-0 z-20 px-6 py-4 glass border-b-0 flex items-center justify-between transition-all">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Requests</h1>
          <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em]">Asset Management</p>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <button className="w-10 h-10 flex items-center justify-center glass rounded-xl transition-colors ring-1 ring-border/50 active:scale-95 bg-background/50 shadow-sm">
            <Bell className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
      </header>

      <main className="px-6 py-6 space-y-6">
        {/* Search Bar */}
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <BiSearch className="text-muted-foreground group-focus-within:text-primary transition-colors w-5 h-5" />
          </div>
          <input
            type="text"
            placeholder="Search request ID or service type..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-4 rounded-2xl border border-border bg-card/50 glass focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm font-medium"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-2 p-1 bg-muted/30 rounded-full w-fit">
          {(["all", "active", "completed"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2.5 rounded-full font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === tab
                ? "bg-primary text-white shadow-lg shadow-primary/25"
                : "text-muted-foreground hover:text-foreground"
                }`}
            >
              {tab === "all" && "All"}
              {tab === "active" && "Current"}
              {tab === "completed" && "History"}
            </button>
          ))}
        </div>

        {/* Requests List */}
        <ErrorBoundary>
          {loading ? (
          <PageLoader title="Loading Requests" subtitle="Fetching your service request log..." />
        ) : filteredRequests.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground border-2 border-dashed border-border/40 rounded-[2.5rem] glass-card flex flex-col items-center gap-3">
             <Wrench className="w-10 h-10 opacity-20" />
             <p className="text-[10px] font-black uppercase tracking-[0.2em]">No requests found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRequests.map((req) => (
                <div
                  key={req.id}
                  onClick={() => router.push(`/company/requests/${req.id}`)}
                  className="glass-card p-5 rounded-[2rem] flex flex-col gap-4 group cursor-pointer hover:border-primary/40 transition-all duration-300 hover:shadow-xl relative overflow-hidden"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-[4rem] h-[4rem] rounded-[1.25rem] bg-background/50 flex flex-col items-center justify-center text-primary border border-border shadow-inner group-hover:scale-105 transition-transform">
                        <ServiceIcon type={req.serviceType} className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-black text-lg text-foreground group-hover:text-primary transition-colors leading-tight">{req.serviceType}</h3>
                        <p className="text-[10px] text-muted-foreground font-black tracking-widest uppercase mt-1.5">{formatTicketId(req.id)}</p>
                      </div>
                    </div>
                    <span className={`text-[9px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest border transition-colors ${statusColors[req.status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                      {req.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1 px-1">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5">
                            <Calendar className="w-3 h-3 text-muted-foreground" />
                            <p className="text-[10px] font-bold text-muted-foreground">{req.preferredDate ? String(req.preferredDate) : "TBD"}</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Clock className="w-3 h-3 text-muted-foreground" />
                            <p className="text-[10px] font-bold text-muted-foreground">{req.timeSlot || "Flexible"}</p>
                        </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                  </div>
                </div>
              ))}
          </div>
        )}
        </ErrorBoundary>
      </main>

      {/* FAB */}
      <button
        onClick={() => router.push("/company/requests/new")}
        className="fixed bottom-24 right-6 w-14 h-14 rounded-[1.5rem] bg-primary text-white shadow-2xl shadow-primary/30 hover:scale-105 active:scale-95 transition-all flex items-center justify-center z-50 group">
        <BiPlus className="w-7 h-7 group-hover:rotate-90 transition-transform duration-300" />
      </button>

      <BottomNav active="requests" role="company" />
    </div>
  )
}
