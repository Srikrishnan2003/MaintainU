"use client"

import dynamic from 'next/dynamic'
import { CalendarSkeleton } from "@/components/skeletons/CalendarSkeleton"

const JobCalendar = dynamic(() => import("@/components/admin/JobCalendar"), {
  ssr: false,
  loading: () => <CalendarSkeleton />
})

export function CalendarClientWrapper({ calendarData, month, year }: { calendarData: any, month: number, year: number }) {
  return <JobCalendar calendarData={calendarData} month={month} year={year} />
}
