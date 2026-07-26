import { TechnicianDashboardClient } from "./client"
import { getJobsAction } from "@/actions/lifecycle.action"
import { getTechnicianProfileAction } from "@/actions/technician.action"
import { getTechnicianInviteAction } from "@/actions/team.action"
import { getDailyInviteAction } from "@/actions/roster.action"

export default async function TechnicianDashboard() {
  let initialJobs: any[] = [];
  let initialProfile: any = null;
  let initialInvite: any = null;
  let initialDailyInvite: any = null;

  try {
    const [res, profileRes, inviteRes, dailyInviteRes] = await Promise.all([
      getJobsAction().catch(() => ({ data: [] })),
      getTechnicianProfileAction().catch(() => ({ success: false, data: null })),
      getTechnicianInviteAction().catch(() => ({ invite: null })),
      getDailyInviteAction().catch(() => ({ invite: null }))
    ])

    if (profileRes.success && profileRes.data) {
      initialProfile = profileRes.data;
    }

    if (inviteRes?.invite) {
      initialInvite = inviteRes.invite;
    }

    if (dailyInviteRes?.invite) {
      initialDailyInvite = dailyInviteRes.invite;
    }

    if (res?.data) {
      initialJobs = res.data;
    }
  } catch (error) {
    console.error("Failed to fetch jobs", error)
  }

  return (
    <TechnicianDashboardClient 
      initialJobs={initialJobs} 
      initialProfile={initialProfile} 
      initialInvite={initialInvite} 
      initialDailyInvite={initialDailyInvite} 
      technicianId={initialProfile?.id || ""}
    />
  )
}
