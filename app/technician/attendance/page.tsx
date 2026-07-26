"use client"

import { useState, useEffect } from "react"
import { BottomNav } from "@/components/navigation/bottom-nav"
import { api } from "@/lib/api"
import { format } from "date-fns"
import { Calendar, CheckCircle, Clock, MapPin, XCircle, Bell, ChevronLeft, ChevronRight } from "lucide-react"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { useRouter } from "next/navigation"

export default function AttendancePage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [history, setHistory] = useState<any[]>([])
    const [currentDate, setCurrentDate] = useState(new Date())
    const [viewMode, setViewMode] = useState<'list' | 'calendar'>('calendar')

    useEffect(() => {
        fetchHistory()
    }, [])

    const fetchHistory = async () => {
        setLoading(true)
        try {
            const res = await api.getTechnicianAttendance()
            if (res.success && res.data) {
                setHistory(res.data)
            }
        } catch (e) {
            console.error("Failed to fetch attendance")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen pb-32">
            {/* Header */}
            <header className="sticky top-0 z-30 px-6 py-4 glass border-b-0 mb-6 flex items-center justify-between transition-all shadow-sm">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Attendance</h1>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Work Log & Tracking</p>
                </div>
                <div className="flex items-center gap-3">
                    <ThemeToggle />
                    <button
                        onClick={() => router.push("/technician/notifications")}
                        className="w-10 h-10 flex items-center justify-center hover:bg-muted/80 rounded-xl transition-colors ring-1 ring-border/50 active:scale-95 bg-background/50 shadow-sm"
                    >
                        <Bell className="w-5 h-5 text-foreground" />
                    </button>
                </div>
            </header>

            <main className="px-6 space-y-6">

                {/* Today's Action Card removed as check-in is done through assigned jobs */}
                {/* Toggle View */}
                <div className="flex items-center gap-2 bg-muted/30 p-1 rounded-xl w-fit mx-auto mb-4">
                    <button 
                        onClick={() => setViewMode('calendar')}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${viewMode === 'calendar' ? 'bg-background shadow text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        Calendar
                    </button>
                    <button 
                        onClick={() => setViewMode('list')}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${viewMode === 'list' ? 'bg-background shadow text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        List
                    </button>
                </div>

                {/* History / Calendar */}
                <section>
                    {viewMode === 'list' ? (
                    <div className="space-y-3">
                        {history.length === 0 ? (
                            <p className="text-center text-muted-foreground text-sm py-8">No records found</p>
                        ) : (
                            history.map((record) => (
                                <div key={record.id} className="glass-card p-4 rounded-xl flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${record.status?.toLowerCase() === 'present' ? 'bg-green-100 dark:bg-green-900/20' : 'bg-red-100 dark:bg-red-900/20'}`}>
                                            <Calendar className={`w-5 h-5 ${record.status?.toLowerCase() === 'present' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`} />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-sm">{format(new Date(record.date), "MMM d, yyyy")}</p>
                                            <p className="text-xs text-muted-foreground capitalize">
                                                {record.status} {record.companyName ? `• ${record.companyName}` : ''}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-bold font-mono">{record.checkInTime || "-"}</p>
                                        <p className="text-[10px] text-muted-foreground">Check In</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                    ) : (
                        <div className="bg-white/60 dark:bg-slate-950/60 backdrop-blur-2xl border border-white/40 dark:border-white/5 shadow-lg shadow-black/5 p-4 rounded-2xl">
                            <div className="flex items-center justify-between mb-4">
                                <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))} className="p-2 hover:bg-muted rounded-full transition">
                                    <ChevronLeft className="w-5 h-5" />
                                </button>
                                <h3 className="text-sm font-bold tracking-tight">
                                    {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                                </h3>
                                <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))} className="p-2 hover:bg-muted rounded-full transition">
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            </div>
                            
                            <div className="grid grid-cols-7 gap-1 mb-2">
                                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                                    <div key={day} className="text-center text-[10px] font-bold text-muted-foreground uppercase tracking-wider py-1">
                                        {day}
                                    </div>
                                ))}
                            </div>
                            
                            <div className="grid grid-cols-7 gap-1">
                                {Array.from({ length: new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay() }).map((_, i) => (
                                    <div key={`empty-${i}`} className="aspect-square rounded-lg bg-muted/20" />
                                ))}
                                
                                {Array.from({ length: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate() }).map((_, i) => {
                                    const dStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`;
                                    const record = history.find(h => h.date === dStr);
                                    
                                    return (
                                        <div 
                                            key={i} 
                                            className={`aspect-square rounded-lg flex flex-col items-center justify-center border relative group
                                                ${record ? 
                                                    (record.status?.toLowerCase() === 'present' ? 'bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-400')
                                                    : 'bg-background border-border/50 text-foreground/70'
                                                }
                                            `}
                                        >
                                            <span className="text-xs font-semibold">{i + 1}</span>
                                            {record?.companyName && (
                                                <div className="absolute inset-0 bg-background/95 backdrop-blur-sm border rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-1 z-10 pointer-events-none">
                                                    <span className="text-[8px] font-bold text-center leading-tight truncate w-full text-foreground whitespace-normal line-clamp-3">
                                                        {record.companyName}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                            
                            <div className="flex gap-4 items-center justify-center mt-6 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-green-500" /> Worked</div>
                            </div>
                        </div>
                    )}
                </section>

            </main>
            <BottomNav active="attendance" role="technician" />
        </div>
    )
}
