"use server"

import { db } from "@/lib/db";
import { jobs, dailyAssignments, requests, companies, technicians, users } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { ActionResult } from "@/lib/validations/actions";
import { verifySessionToken } from "@/services/auth.service";
import { cookies } from "next/headers";

export interface CalendarJob {
    jobId: string;
    companyName: string;
    serviceType: string;
    priority: string;
    status: string;
    assignedTechnicianName: string | null;
    teamNames: string[];
}

export interface CalendarDay {
    date: string;
    jobCount: number;
    jobs: CalendarJob[];
}

async function requireAdmin() {
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;
    if (!token) throw new Error("Unauthorized");
    const session = await verifySessionToken(token);
    if (!session || session.role !== "admin") throw new Error("Unauthorized");
    return session;
}

export async function getCalendarJobsAction(month: number, year: number): Promise<ActionResult<CalendarDay[]>> {
    try {
        await requireAdmin();

        // Calculate start and end of month strings
        const startOfMonth = new Date(year, month - 1, 1);
        const startDateStr = startOfMonth.toISOString().split('T')[0];
        
        // Month is 1-indexed, so passing `month` exactly to Date gives the NEXT month's 0th day (last day of current month)
        const lastDayOfMonth = new Date(year, month, 0);
        const endDateStr = lastDayOfMonth.toISOString().split('T')[0];

        const results = await db.select({
            jobId: jobs.id,
            status: jobs.status,
            companyName: companies.companyName,
            serviceType: requests.serviceType,
            priority: requests.priority,
            assignedTechnicianName: users.name,
            workDate: sql<string>`COALESCE(${dailyAssignments.workDate}::text, DATE(${jobs.scheduledStart})::text)`
        })
        .from(jobs)
        .innerJoin(requests, eq(jobs.requestId, requests.id))
        .leftJoin(companies, eq(requests.companyId, companies.id))
        .leftJoin(technicians, eq(jobs.leadTechnicianId, technicians.id))
        .leftJoin(users, eq(technicians.userId, users.id))
        .leftJoin(dailyAssignments, eq(jobs.id, dailyAssignments.jobId))
        .where(
            sql`COALESCE(${dailyAssignments.workDate}::text, DATE(${jobs.scheduledStart})::text) >= ${startDateStr} AND COALESCE(${dailyAssignments.workDate}::text, DATE(${jobs.scheduledStart})::text) <= ${endDateStr}`
        );

        // Fetch attendance for the team
        const { attendance } = await import("@/db/schema");
        const attendanceResults = await db.select({
            jobId: dailyAssignments.jobId,
            workDate: dailyAssignments.workDate,
            technicianName: users.name
        })
        .from(attendance)
        .innerJoin(dailyAssignments, eq(attendance.dailyAssignmentId, dailyAssignments.id))
        .innerJoin(technicians, eq(attendance.technicianId, technicians.id))
        .innerJoin(users, eq(technicians.userId, users.id))
        .where(
            sql`COALESCE(${dailyAssignments.workDate}::text, '') >= ${startDateStr} AND COALESCE(${dailyAssignments.workDate}::text, '') <= ${endDateStr}`
        );

        const attendanceMap = new Map<string, string[]>(); // key: "jobId_workDate"
        for (const att of attendanceResults) {
            const key = `${att.jobId}_${att.workDate}`;
            if (!attendanceMap.has(key)) attendanceMap.set(key, []);
            const names = attendanceMap.get(key)!;
            if (att.technicianName && !names.includes(att.technicianName)) {
                names.push(att.technicianName);
            }
        }

        const dayMap = new Map<string, CalendarJob[]>();
        
        for (const row of results) {
            const dateStr = row.workDate;
            if (!dateStr) continue;
            
            if (!dayMap.has(dateStr)) {
                dayMap.set(dateStr, []);
            }
            
            const teamKey = `${row.jobId}_${dateStr}`;
            const teamNames = attendanceMap.get(teamKey) || (row.assignedTechnicianName ? [row.assignedTechnicianName] : []);
            
            const dayJobs = dayMap.get(dateStr)!;
            
            // Deduplicate by jobId to prevent React key errors
            if (!dayJobs.some(j => j.jobId === row.jobId)) {
                dayJobs.push({
                    jobId: row.jobId,
                    status: row.status,
                    companyName: row.companyName || "Unknown Company",
                    serviceType: row.serviceType,
                    priority: row.priority,
                    assignedTechnicianName: row.assignedTechnicianName,
                    teamNames
                });
            }
        }
        
        const calendarDays: CalendarDay[] = Array.from(dayMap.entries()).map(([date, dayJobs]) => ({
            date,
            jobCount: dayJobs.length,
            jobs: dayJobs
        }));

        return { success: true, data: calendarDays };
    } catch (error: unknown) {
        const e = error as Error;
        console.error("getCalendarJobsAction error:", e);
        return { success: false, error: e.message || "Failed", message: "Failed to fetch calendar jobs" };
    }
}
