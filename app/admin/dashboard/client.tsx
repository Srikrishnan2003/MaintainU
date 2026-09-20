"use client"

import { BottomNav } from "@/components/navigation/bottom-nav"
import { AlertCircle, Briefcase, Users, Calendar, DollarSign, Clock, CheckCircle, Bell, UserPlus, Map as MapIcon, Zap, Wrench, Droplets, ChevronRight, Eye, MoreVertical, Star, Settings, Cog, Package } from "lucide-react"
import { useRouter } from "next/navigation"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { ErrorBoundary } from "@/components/error-boundary"
import { Logo } from "@/components/ui/logo"
import { useEffect, useState } from "react"
import { useSSE } from "@/hooks/use-sse"
import { useSliceRefetch } from "@/hooks/use-slice-refetch"
import { usePushNotifications } from "@/hooks/use-push-notifications"
import { getAdminStatsAction, getActivityFeedAction } from "@/actions/admin.action"

export function AdminDashboardClient({ initialStats }: { initialStats: any }) {
  const router = useRouter()
  // Hydrate initial stats from server
  const [stats, setStats] = useState(initialStats)
  const [unreadCount, setUnreadCount] = useState(0)

  const { jobUpdates, attendanceUpdates, notifications, isConnected, fallbackMode } = useSSE(true)
  const { refetch } = useSliceRefetch()

  // Initialize native push notifications
  usePushNotifications()

  useEffect(() => {
    if (!jobUpdates) return
    refetch(getAdminStatsAction, (res: any) => {
      if (res.data) setStats((prev: any) => ({ ...prev, ...res.data }))
    })
    refetch(getActivityFeedAction, (res: any) => {
      if (res.data) setStats((prev: any) => ({ ...prev, systemActivity: res.data }))
    })
  }, [jobUpdates, refetch])

  useEffect(() => {
    if (!notifications) return
    setUnreadCount(prev => prev + 1)
  }, [notifications])

  // Subscribing to SSE for live updates could go here if needed
  // For now, it uses initialStats statically based on Clarification 2 style
  // (though the clarification was specifically for technician dashboard, it applies here conceptually)

  const statCards = [
    { label: "Pending Requests", value: stats.pendingRequests.toString(), icon: AlertCircle, bgClass: "bg-red-500 dark:bg-red-600", path: "/admin/requests?tab=new" },
    { label: "Active Jobs", value: stats.activeJobs.toString(), icon: Clock, bgClass: "bg-blue-500 dark:bg-blue-600", path: "/admin/requests?tab=in-progress" },
    { label: "Completed", value: stats.completedJobs.toString(), icon: CheckCircle, bgClass: "bg-green-500 dark:bg-green-600", path: "/admin/requests?tab=completed" },
    { label: "User Management", value: (stats.totalUsers || 0).toString(), icon: UserPlus, bgClass: "bg-purple-500 dark:bg-purple-600", path: "/admin/onboarding" }
  ]

  const getServiceIcon = (type: string) => {
    switch (type) {
      case 'Electrical': return <Zap className="w-5 h-5" />;
      case 'Plumbing': return <Droplets className="w-5 h-5" />;
      case 'Mechanical': return <Cog className="w-5 h-5" />;
      case 'Assembly': return <Package className="w-5 h-5" />;
      default: return <Wrench className="w-5 h-5" />;
    }
  }

  return (
    <div className="min-h-screen pb-32">
      {/* Header */}
      <header className="sticky top-0 z-20 px-6 py-4 glass border-b-0 flex items-center justify-between transition-all">
        <div className="flex items-center gap-4">
          <Logo size="md" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-xs text-muted-foreground font-medium">Overview & Stats</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <button className="relative w-10 h-10 flex items-center justify-center hover:bg-muted/80 rounded-xl transition-colors ring-1 ring-border/50 active:scale-95 bg-background/50 shadow-sm">
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-background animate-pulse" />
            )}
          </button>
        </div>
      </header>

      <main className="px-6 py-6 space-y-8">
        {/* Connection Indicator */}
        {!isConnected && (
          <div className="text-xs text-amber-500 flex items-center gap-1 px-1 py-1">
            <AlertCircle className="w-4 h-4" />
            Reconnecting...
          </div>
        )}
        {fallbackMode && (
          <div className="text-xs text-slate-400 flex items-center gap-1 px-1 py-1">
            <Clock className="w-4 h-4" />
            Live updates paused — refreshing every 30s
          </div>
        )}
        {/* Alert Banner */}
        {stats.pendingTechs > 0 && (
          <ErrorBoundary>
            <div
              onClick={() => router.push('/admin/onboarding')}
              className="group relative overflow-hidden p-4 rounded-xl cursor-pointer shadow-sm hover:shadow-md transition-all glass-card border-red-500/30"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/10 rounded-full blur-2xl -mr-10 -mt-10 transition-all group-hover:bg-red-500/20" />
              <div className="flex items-start gap-4 relative z-10">
                <div className="p-2.5 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 shadow-sm">
                  <AlertCircle className="w-5 h-5" strokeWidth={2} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-foreground">Action Required</p>
                  <p className="text-xs text-muted-foreground mt-0.5"><span className="font-semibold text-red-600 dark:text-red-400">{stats.pendingTechs} onboarding request(s)</span> await your approval.</p>
                </div>
                <div className="flex items-center justify-center h-full my-auto">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                </div>
              </div>
            </div>
          </ErrorBoundary>
        )}

        {/* Zone Overrun Alert */}
        {stats.zoneAlerts > 0 && (
          <ErrorBoundary>
            <div
              onClick={() => router.push('/admin/requests?tab=in-progress')}
              className="group relative overflow-hidden p-4 rounded-xl cursor-pointer shadow-sm hover:shadow-md transition-all glass-card border-amber-500/30 bg-amber-500/5"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl -mr-10 -mt-10 transition-all group-hover:bg-amber-500/20" />
              <div className="flex items-start gap-4 relative z-10">
                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shadow-sm">
                  <Clock className="w-5 h-5" strokeWidth={2} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-foreground inline-flex items-center gap-2">
                    Zone Watch Alert
                    <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-ping" />
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    <span className="font-semibold text-amber-600 dark:text-amber-400">{stats.zoneAlerts} job(s)</span> are exceeding their estimated time in phone-restricted zones.
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground opacity-30 my-auto" />
              </div>
            </div>
          </ErrorBoundary>
        )}

        {/* Stats Grid */}
        <ErrorBoundary>
          <section>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {statCards.map((stat, idx) => (
                <div
                  key={idx}
                  onClick={() => router.push(stat.path)}
                  className={`${stat.bgClass} text-white p-4 rounded-2xl flex flex-col items-center text-center relative overflow-hidden cursor-pointer hover:scale-105 hover:opacity-90 transition-all shadow-lg`}
                >
                  <div className={`absolute top-0 right-0 w-16 h-16 rounded-full blur-2xl -mr-8 -mt-8 bg-white/30`} />
                  <div className={`relative p-2.5 rounded-full bg-white/20 mb-3`}>
                    <stat.icon className="w-6 h-6 text-white" />
                  </div>
                  <p className="text-2xl font-bold tracking-tight relative z-10">{stat.value}</p>
                  <p className="text-[10px] uppercase font-bold tracking-wider text-white/90 mt-1 relative z-10">{stat.label}</p>
                </div>
              ))}
            </div>
          </section>
        </ErrorBoundary>



        {/* System Activity */}
        <ErrorBoundary>
          <section>
            <div className="flex items-center justify-between mb-5 px-1">
              <h2 className="text-xl font-bold tracking-tight">System Activity</h2>
              <button onClick={() => router.push('/admin/requests')} className="text-xs font-bold text-primary uppercase tracking-widest hover:underline flex items-center gap-1">
                Live Feed <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              </button>
            </div>
            <div className="space-y-4">
              {stats.systemActivity.length === 0 ? (
                <div className="glass-card p-12 rounded-[2.5rem] text-center border-dashed border-2 flex flex-col items-center gap-3">
                  <div className="p-4 bg-muted/50 rounded-full text-muted-foreground/30">
                    <Briefcase className="w-10 h-10" />
                  </div>
                  <p className="text-muted-foreground font-bold text-sm">No System Activity Yet</p>
                  <p className="text-xs text-muted-foreground max-w-[200px]">New requests, jobs, and technician approvals will appear here.</p>
                </div>
              ) : (
                stats.systemActivity.map((item: any) => (
                  <div
                    key={`${item.type}-${item.id}`}
                    onClick={() => {
                      if (item.type === 'approval') router.push('/admin/technicians?tab=pending');
                      else router.push(`/admin/requests/${item.requestId}`);
                    }}
                    className="glass-card p-5 rounded-[2rem] flex items-center justify-between border-white/5 cursor-pointer hover:border-primary/40 hover:bg-muted/30 transition-all group relative overflow-hidden active:scale-[0.99] shadow-lg shadow-black/5"
                  >
                    <div className="flex items-center gap-4 relative z-10">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner transition-transform group-hover:scale-110 ${item.type === 'approval' ? 'bg-blue-500/10 text-blue-600' :
                        item.subtitle === 'Electrical' ? 'bg-yellow-500/10 text-yellow-600' :
                          item.subtitle === 'Mechanical' ? 'bg-slate-500/10 text-slate-600' :
                            item.subtitle === 'Plumbing' ? 'bg-cyan-500/10 text-cyan-600' :
                              'bg-primary/10 text-primary'
                        }`}>
                        {item.type === 'approval' ? <UserPlus className="w-6 h-6" /> : getServiceIcon(item.subtitle)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-black text-foreground text-base tracking-tight leading-tight group-hover:text-primary transition-colors">{item.title}</h3>
                          {item.type === 'request' && (
                            <span className="bg-red-500/10 text-red-600 text-[8px] font-black px-1.5 py-0.5 rounded uppercase">URGENT</span>
                          )}
                          {item.type === 'approval' && (
                            <span className="bg-blue-500/10 text-blue-600 text-[8px] font-black px-1.5 py-0.5 rounded uppercase">VERIFY</span>
                          )}
                        </div>
                        <p className="text-xs font-bold text-muted-foreground mt-0.5 flex items-center gap-1.5">
                          <span className={`w-1 h-1 rounded-full ${item.type === 'approval' ? 'bg-blue-500' : 'bg-primary/40'}`} />
                          {item.subtitle}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 relative z-10">
                      <div className="text-right hidden sm:block">
                        <span className={`px-3 py-1 text-[10px] font-black rounded-lg uppercase tracking-widest border transition-all ${item.status === 'Completed' ? 'bg-green-500/10 text-green-600 border-green-500/20' :
                          item.status === 'Pending Approval' ? 'bg-blue-500/10 text-blue-600 border-blue-500/20 animate-pulse' :
                            item.status === 'In Progress' || item.status === 'In_Progress' || item.status === 'Requested' ? 'bg-orange-500/10 text-orange-600 border-orange-500/20 animate-pulse' :
                              'bg-blue-500/10 text-blue-600 border-blue-500/20'
                          }`}>
                          {item.status.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-background/50 border border-border/50 text-muted-foreground group-hover:text-primary group-hover:bg-primary/10 transition-all shadow-sm">
                        <Eye className="w-5 h-5" />
                      </div>
                    </div>

                    {/* Subtle Background Decoration */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                ))
              )}
            </div>
          </section>
        </ErrorBoundary>
      </main>

      <BottomNav active="home" role="admin" />
    </div>
  )
}
