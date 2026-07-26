import { CalendarClientWrapper } from "./client"
import { getCalendarJobsAction } from "@/actions/calendar.action"
import { BottomNav } from "@/components/navigation/bottom-nav"
import { ThemeToggle } from "@/components/ui/theme-toggle"

export default async function AdminCalendarPage({
    searchParams
}: {
    searchParams: Promise<{ month?: string, year?: string }>
}) {
    const params = await searchParams
    const date = new Date()
    const currentMonth = date.getMonth() + 1
    const currentYear = date.getFullYear()

    const month = params.month ? parseInt(params.month) : currentMonth
    const year = params.year ? parseInt(params.year) : currentYear

    const res = await getCalendarJobsAction(month, year)
    const calendarData = res.success && res.data ? res.data : []

    return (
        <div className="min-h-screen pb-32">
            <header className="sticky top-0 z-20 px-6 py-4 glass border-b-0 flex items-center justify-between transition-all">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Job Calendar</h1>
                    <p className="text-xs text-muted-foreground font-medium">Schedule overview</p>
                </div>
                <div className="flex items-center gap-3">
                    <ThemeToggle />
                </div>
            </header>

            <main className="px-6 py-6 transition-all">
                <CalendarClientWrapper calendarData={calendarData} month={month} year={year} />
            </main>

            <BottomNav active="calendar" role="admin" />
        </div>
    )
}
