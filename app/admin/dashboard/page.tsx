import { AdminDashboardClient } from "./client"
import { getTechniciansAction, getRequestsAction, getUsersAction } from "@/actions/admin.action"
import { getJobsAction } from "@/actions/lifecycle.action"

export default async function AdminDashboard() {
  const [techsRes, jobsRes, reqsRes, usersRes] = await Promise.all([
    getTechniciansAction().catch(() => ({ technicians: [] })),
    getJobsAction().catch(() => ({ data: [] })),
    getRequestsAction().catch(() => ({ requests: [] })),
    getUsersAction().catch(() => ({ users: [] }))
  ]);

  const pendingTechsCount = (usersRes?.users || []).filter((u: any) =>
    u.status === 'PENDING_APPROVAL' || u.status === 'PENDING_PROFILE'
  ).length

  // Pending = Requests that are NOT yet fully assigned/confirmed
  const pendingRequests = (reqsRes?.requests || []).filter((r: any) =>
    ["Requested", "Reviewing", "Team_Forming", "Invites_Sent", "New"].includes(r.status)
  ).length

  const activeJobs = (jobsRes?.data || []).filter((j: any) =>
    ["In Progress", "In_Progress", "Accepted", "Team_Confirmed", "Dispatched", "On_The_Way", "Arrived", "Work_Started"].includes(j.status)
  ).length

  const completedJobs = (jobsRes?.data || []).filter((j: any) =>
    ["Completed", "Work_Completed", "Sign_Pending"].includes(j.status)
  ).length

  // Create a unified System Activity feed (Deduplicated)
  const activityMap = new Map<string, any>();

  // Add requests first
  (reqsRes?.requests || []).forEach((r: any) => {
    activityMap.set(r.id, {
      id: r.id,
      type: 'request',
      title: r.companyName,
      subtitle: r.serviceType,
      status: r.status,
      createdAt: r.createdAt,
      requestId: r.id
    });
  });

  // Overlay with jobs (jobs take precedence as they are more 'current')
  (jobsRes?.data || []).forEach((j: any) => {
    activityMap.set(j.requestId, {
      id: j.id,
      type: 'job',
      title: j.companyName,
      subtitle: j.serviceType,
      status: j.status,
      createdAt: j.createdAt,
      requestId: j.requestId
    });
  });

  // Add pending technicians to activity
  (techsRes?.technicians || [])
    .filter((t: any) => (t.status === "Pending" || t.status === "pending") && t.name !== 'New User')
    .forEach((t: any) => {
      activityMap.set(`tech-${t.id}`, {
        id: t.id,
        type: 'approval',
        title: t.name,
        subtitle: 'New Technician',
        status: 'Pending Approval',
        createdAt: t.joinedAt,
        requestId: null // Special handling for click
      });
    });

  const activityFeed = Array.from(activityMap.values())
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6)

  // Calculate Zone Alerts
  const zoneAlerts = (jobsRes?.data || []).filter((j: any) => {
    if (j.status !== "In_Zone") return false
    const req = (reqsRes?.requests || []).find((r: any) => r.id === j.requestId)
    if (!req || !req.isRestrictedArea || !j.enteredAreaAt) return false
    
    const entryTime = new Date(j.enteredAreaAt).getTime()
    const durationMs = (req.estimatedZoneDuration || 60) * 60 * 1000
    const bufferMs = 15 * 60 * 1000
    return Date.now() > (entryTime + durationMs + bufferMs)
  })

  const onlineTechs = (techsRes?.technicians || []).filter((t: any) => t.isOnline).length
  const totalTechs = (techsRes?.technicians || []).filter((t: any) => 
    t.status !== 'PENDING_APPROVAL' && t.status !== 'PENDING_PROFILE' && t.status !== 'REJECTED'
  ).length

  const totalUsers = (usersRes?.users || []).length

  const initialStats = {
    pendingRequests,
    activeJobs,
    completedJobs,
    systemActivity: activityFeed,
    pendingTechs: pendingTechsCount,
    onlineTechs,
    totalTechs,
    zoneAlerts: zoneAlerts.length,
    totalUsers
  };

  return <AdminDashboardClient initialStats={initialStats} />
}
