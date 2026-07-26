"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { CalendarDay, CalendarJob } from "@/actions/calendar.action"
import { ChevronLeft, ChevronRight, MapPin, Wrench, Calendar as CalendarIcon, User } from "lucide-react"
import { ErrorBoundary } from "@/components/error-boundary"
import Link from "next/link"

export function JobCalendarBase({ 
    calendarData, 
    month, 
    year 
}: { 
    calendarData: CalendarDay[], 
    month: number, 
    year: number 
}) {
    const router = useRouter()
    const [selectedDate, setSelectedDate] = useState<string | null>(null)

    const handlePrevMonth = () => {
        let m = month - 1;
        let y = year;
        if (m < 1) {
            m = 12;
            y--;
        }
        router.replace(`/admin/calendar?month=${m}&year=${y}`);
        setSelectedDate(null)
    }

    const handleNextMonth = () => {
        let m = month + 1;
        let y = year;
        if (m > 12) {
            m = 1;
            y++;
        }
        router.replace(`/admin/calendar?month=${m}&year=${y}`);
        setSelectedDate(null)
    }

    // Grid Math
    const firstDayOfMonth = new Date(year, month - 1, 1).getDay() // 0 = Sunday
    const daysInMonth = new Date(year, month, 0).getDate()
    const todayStr = new Date().toISOString().split('T')[0]

    const daysArray = []
    
    // Empty cells before start of month
    for (let i = 0; i < firstDayOfMonth; i++) {
        daysArray.push(null)
    }

    // Days in month
    for (let i = 1; i <= daysInMonth; i++) {
        const dStr = `${year}-${String(month).padStart(2, '0')}-${String(i).padStart(2, '0')}`
        const dayData = calendarData.find(d => d.date === dStr)
        daysArray.push({
            date: i,
            fullDate: dStr,
            jobs: dayData?.jobs || []
        })
    }

    const getPriorityColor = (priority: string) => {
        switch(priority.toUpperCase()) {
            case "CRITICAL": return "bg-red-500 text-white"
            case "HIGH": return "bg-orange-500 text-white"
            case "MEDIUM": return "bg-blue-500 text-white"
            case "LOW": return "bg-gray-400 text-white"
            default: return "bg-gray-400 text-white"
        }
    }

    const getStatusBadge = (status: string) => {
        switch(status.toUpperCase()) {
          case 'PENDING_ASSIGN': return 'bg-yellow-500/10 text-yellow-600';
          case 'ASSIGNED': return 'bg-purple-500/10 text-purple-600';
          case 'IN_PROGRESS': return 'bg-orange-500/10 text-orange-600';
          case 'COMPLETED': return 'bg-emerald-500/10 text-emerald-600';
          case 'FAILED': return 'bg-red-500/10 text-red-600';
          default: return 'bg-blue-500/10 text-blue-600';
        }
    }

    const selectedDayData = selectedDate ? daysArray.find(d => d && d.fullDate === selectedDate) : null;

    return (
        <div className="w-full max-w-7xl mx-auto flex flex-col gap-6">
            <header className="flex items-center justify-between bg-white/60 dark:bg-slate-950/60 backdrop-blur-2xl border border-white/40 dark:border-white/5 shadow-lg shadow-black/5 p-4 rounded-3xl">
                <button onClick={handlePrevMonth} className="p-2 hover:bg-muted rounded-full transition">
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <h2 className="text-xl font-black tracking-tight">
                    {new Date(year, month - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
                </h2>
                <button onClick={handleNextMonth} className="p-2 hover:bg-muted rounded-full transition">
                    <ChevronRight className="w-6 h-6" />
                </button>
            </header>

            <div className="bg-white/60 dark:bg-slate-950/60 backdrop-blur-2xl border border-white/40 dark:border-white/5 shadow-lg shadow-black/5 p-4 rounded-3xl w-full">
                <div className="grid grid-cols-7 gap-1 md:gap-2 text-center text-xs font-bold text-muted-foreground mb-2">
                    <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
                </div>

                <div className="grid grid-cols-7 gap-1 md:gap-2">
                    {(() => {
                        const rows: React.ReactNode[] = []
                        let currentRow: { day: any, idx: number }[] = []

                        daysArray.forEach((day, idx) => {
                            currentRow.push({ day, idx })
                            
                            if (currentRow.length === 7 || idx === daysArray.length - 1) {
                                // Render row
                                rows.push(
                                    <div key={`row-${idx}`} className="contents">
                                        {currentRow.map(({ day: rowDay, idx: rowIdx }) => {
                                            if (!rowDay) return <div key={`empty-${rowIdx}`} className="bg-muted/10 rounded-xl aspect-square md:aspect-[4/3] border border-transparent"></div>
                                            
                                            const isToday = rowDay.fullDate === todayStr
                                            const isSelected = rowDay.fullDate === selectedDate

                                            return (
                                                <div 
                                                    key={rowDay.fullDate} 
                                                    onClick={() => setSelectedDate(isSelected ? null : rowDay.fullDate)}
                                                    className={`
                                                        relative p-1 md:p-2 rounded-xl border flex flex-col cursor-pointer transition-all aspect-square md:aspect-[4/3] overflow-hidden
                                                        ${isToday ? "border-primary shadow-sm bg-primary/5" : "border-border/50 hover:border-primary/50 bg-background"}
                                                        ${isSelected ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}
                                                    `}
                                                >
                                                    <span className={`text-xs font-black ${isToday ? "text-primary" : "text-foreground"}`}>
                                                        {rowDay.date}
                                                    </span>
                                                    
                                                    <div className="mt-1 flex flex-col gap-1 overflow-hidden">
                                                        {rowDay.jobs.slice(0, 3).map((job: CalendarJob) => (
                                                            <div key={job.jobId} className={`text-[9px] font-bold px-1 py-0.5 rounded truncate ${getPriorityColor(job.priority)}`}>
                                                                {job.companyName}
                                                            </div>
                                                        ))}
                                                        {rowDay.jobs.length > 3 && (
                                                            <div className="text-[10px] font-bold text-muted-foreground mt-0.5">
                                                                +{rowDay.jobs.length - 3} more
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                        
                                        {/* Inject detail panel below this row if a day in this row is selected */}
                                        {currentRow.some(({ day: d }) => d?.fullDate === selectedDate) && selectedDayData && (
                                            <div className="col-span-7 mt-2 mb-4 bg-white/60 dark:bg-slate-950/60 backdrop-blur-2xl shadow-xl shadow-black/5 p-6 rounded-3xl border-2 border-primary/20 animate-in slide-in-from-top-2 fade-in duration-200">
                                                <div className="flex justify-between items-center mb-6">
                                                    <h3 className="text-xl font-black">
                                                        Jobs on {new Date(selectedDate!).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                                                    </h3>
                                                    <div className="text-sm font-bold text-muted-foreground bg-muted px-3 py-1 rounded-full">
                                                        {selectedDayData.jobs.length} Job(s)
                                                    </div>
                                                </div>

                                                {selectedDayData.jobs.length === 0 ? (
                                                    <div className="text-center py-10 text-muted-foreground">
                                                        <CalendarIcon className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                                        <p className="font-bold">No jobs scheduled for this date.</p>
                                                    </div>
                                                ) : (
                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                        {selectedDayData.jobs.map((job) => (
                                                            <Link href={`/admin/jobs/${job.jobId}`} key={job.jobId} className="block group">
                                                                <div className="border border-border/50 bg-background p-4 rounded-2xl hover:border-primary/50 hover:shadow-lg transition-all h-full flex flex-col">
                                                                    <div className="flex justify-between items-start mb-2">
                                                                        <h4 className="font-black text-foreground group-hover:text-primary transition-colors truncate pr-2">
                                                                            {job.companyName}
                                                                        </h4>
                                                                        <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded tracking-widest ${getPriorityColor(job.priority)}`}>
                                                                            {job.priority}
                                                                        </span>
                                                                    </div>
                                                                    
                                                                    <div className="flex items-center gap-2 mt-auto mb-3 text-sm text-muted-foreground font-medium">
                                                                        <Wrench className="w-4 h-4" />
                                                                        {job.serviceType}
                                                                    </div>

                                                                    <div className="flex flex-col gap-2 border-t border-border/50 pt-3">
                                                                        <div className="flex items-center justify-between">
                                                                            <span className={`text-[10px] uppercase font-black tracking-widest px-2 py-1 rounded-full ${getStatusBadge(job.status)}`}>
                                                                                {job.status.replace("_", " ")}
                                                                            </span>
                                                                        </div>
                                                                        <div className="flex flex-col gap-1 mt-1">
                                                                            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Team</span>
                                                                            {job.teamNames && job.teamNames.length > 0 ? (
                                                                                <div className="flex flex-wrap gap-1">
                                                                                    {job.teamNames.map((name, i) => (
                                                                                        <span key={i} className="text-xs font-bold bg-muted px-2 py-1 rounded-md text-foreground flex items-center gap-1.5">
                                                                                            <User className="w-3 h-3 text-primary" /> {name}
                                                                                        </span>
                                                                                    ))}
                                                                                </div>
                                                                            ) : (
                                                                                <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
                                                                                    <User className="w-3 h-3" />
                                                                                    <span>{job.assignedTechnicianName || "Unassigned"}</span>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </Link>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )
                                currentRow = []
                            }
                        })
                        return rows
                    })()}
                </div>
            </div>
        </div>
    )
}

export default function JobCalendar(props: any) {
    return (
        <ErrorBoundary>
            <JobCalendarBase {...props} />
        </ErrorBoundary>
    )
}
