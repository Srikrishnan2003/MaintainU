"use client"

/**
 * maintainU Centralized API Library
 * This file acts as a bridge between the frontend and the modular server actions.
 */

import type { GetJobsFilters } from "@/actions/lifecycle.action"

// Types
export interface User {
  id: string
  role: "company" | "technician" | "admin"
  // Matches statusEnum in db/schema.ts exactly
  status: "PENDING_PROFILE" | "PENDING_APPROVAL" | "ACTIVE" | "REJECTED"
  name?: string | null
  phone: string
  profileCompleted?: boolean
  [key: string]: any
}

export interface Request {
  id: string
  companyId: string
  companyName: string
  serviceType: string
  priority: string
  description: string
  status: string
  preferredDate?: string | Date | null
  timeSlot?: string | null
  date?: string | Date
  companyLocation?: string
  technicianName?: string | null
  createdAt: string | number | Date
  [key: string]: any
}

export interface Notification {
  id: string
  userId: string
  type: string
  title: string
  message: string
  link?: string | null
  isRead: boolean
  createdAt: Date | string
}

export interface Job {
  id: string
  requestId: string
  technicianId: string | null
  status: "Pending" | "Accepted" | "Assigned" | "Declined" | "In Progress" | "In_Progress" | "On_Hold" | "Failed" | "Completed" | "Team_Confirmed" | "Dispatched" | "On_The_Way" | "Arrived"
  [key: string]: any
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean
  message?: string
  data?: T
  error?: string
}

// Auth response type — discriminated union for type narrowing
export type AuthResponse =
  | { success: true; role: "admin" | "company" | "technician"; message?: string }
  | { success: false; error?: string; message?: string; role?: string }

export const api = {
  // ─── Auth ──────────────────────────────────────────────────────────
  
  async sendOTP(phone: string, role?: "company" | "technician", details?: Record<string, any>) {
    const { sendOTP } = await import("@/actions/auth.action")
    return sendOTP(phone, role, details)
  },

  async verifyOTP(phone: string, otp: string) {
    const { verifyOTPAction } = await import("@/actions/auth.action")
    return verifyOTPAction(phone, otp)
  },

  async logout() {
    const { logoutAction } = await import("@/actions/auth.action")
    return logoutAction()
  },

  async refreshSession() {
    const { refreshSessionAction } = await import("@/actions/auth.action")
    return refreshSessionAction()
  },

  async checkUserStatus(phone: string) {
    const { checkUserStatusAction } = await import("@/actions/auth.action")
    return checkUserStatusAction(phone)
  },


  // ─── Registration ──────────────────────────────────────────────────

  async registerCompany(data: any) {
    const { submitCompanyOnboarding } = await import("@/actions/company.action")
    return submitCompanyOnboarding(data)
  },

  async registerTechnician(data: any) {
    const { completeTechnicianProfileAction } = await import("@/actions/technician.action")
    return completeTechnicianProfileAction(data)
  },

  // ─── Company ───────────────────────────────────────────────────────
  
  async getCompanyProfile() {
    const { getCompanyProfileAction } = await import("@/actions/company.action")
    return getCompanyProfileAction()
  },

  async getCompanyRequests() {
    const { getCompanyRequestsAction } = await import("@/actions/company.action")
    return getCompanyRequestsAction()
  },

  async submitCompanyOnboarding(data: any) {
    const { submitCompanyOnboarding } = await import("@/actions/company.action")
    return submitCompanyOnboarding(data)
  },

  async updateCompanyProfile(data: any) {
    const { updateCompanyProfileAction } = await import("@/actions/company.action")
    return updateCompanyProfileAction(data)
  },

  // ─── Request ───────────────────────────────────────────────────────
  
  async createRequest(data: any) {
    const { createRequest } = await import("@/actions/request.action")
    return createRequest(data)
  },

  async getRequestById(id: string) {
    const { getRequestByIdAction } = await import("@/actions/request.action")
    return getRequestByIdAction(id)
  },

  async deleteRequest(id: string) {
    const { deleteRequestAction } = await import("@/actions/request.action")
    return deleteRequestAction(id)
  },

  async reviewRequest(requestId: string, status: string, reason?: string) {
    const { reviewRequestAction } = await import("@/actions/request.action")
    return reviewRequestAction(requestId, status, reason)
  },

  // ─── Job / Technician ──────────────────────────────────────────────
  
  async submitTechnicianOnboarding(data: any) {
    const { submitTechnicianOnboarding } = await import("@/actions/technician.action")
    return submitTechnicianOnboarding(data)
  },

  async getTechnicianProfile() {
    const { getTechnicianProfileAction } = await import("@/actions/technician.action")
    return getTechnicianProfileAction()
  },

  async updateTechnicianProfile(data: any) {
    const { updateTechnicianProfileAction } = await import("@/actions/technician.action")
    return updateTechnicianProfileAction(data)
  },

  async getTechnicianWorkCalendar(technicianId: string, month: number, year: number) {
    const { getTechnicianWorkCalendarAction } = await import("@/actions/admin.action")
    return getTechnicianWorkCalendarAction(technicianId, month, year)
  },

  async completeTechnicianProfile(data: any) {
    const { completeTechnicianProfileAction } = await import("@/actions/technician.action")
    return completeTechnicianProfileAction(data)
  },

  async getJobs(filters?: GetJobsFilters) {
    const { getJobsAction } = await import("@/actions/lifecycle.action")
    return getJobsAction(filters)
  },

  async getJobById(id: string) {
    const { getJobByIdAction } = await import("@/actions/lifecycle.action")
    return getJobByIdAction(id)
  },

  async respondToJobInvite(requestId: string, accept: boolean, reason?: string) {
    const { respondToJobInviteAction } = await import("@/actions/lifecycle.action")
    return respondToJobInviteAction(requestId, accept, reason)
  },

  async acceptJob(jobId: string) {
    const { respondToJobInviteAction } = await import("@/actions/lifecycle.action")
    return respondToJobInviteAction(jobId, true)
  },

  async checkIn(jobId: string, location: { latitude: number; longitude: number; [key: string]: any }) {
    const { checkInAction } = await import("@/actions/lifecycle.action")
    return checkInAction(jobId, location)
  },

  async checkOut(jobId: string, location: { latitude: number; longitude: number; [key: string]: any }) {
    const { checkOutAction } = await import("@/actions/lifecycle.action")
    return checkOutAction(jobId, location)
  },

  async updateJobStatus(jobId: string, notes: string, photos?: string[]) {
    const { postJobUpdateAction } = await import("@/actions/technician.action")
    return postJobUpdateAction(jobId, notes, photos || [])
  },

  async pauseJob(jobId: string, reason: string) {
    const { pauseJobAction } = await import("@/actions/lifecycle.action")
    return pauseJobAction(jobId, reason)
  },

  async failJob(jobId: string, reason: string) {
    const { failJobAction } = await import("@/actions/lifecycle.action")
    return failJobAction(jobId, reason)
  },

  async postJobUpdate(jobId: string, message: string, photos: string[] = []) {
    const { postJobUpdateAction } = await import("@/actions/technician.action")
    return postJobUpdateAction(jobId, message, photos)
  },

  async completeJob(jobId: string, signature: string) {
    const { completeJob } = await import("@/actions/lifecycle.action")
    return completeJob(jobId, signature)
  },

  async finalizeJobAcceptance(requestIdOrJobId: string) {
    const { finalizeJobAcceptanceAction } = await import("@/actions/lifecycle.action")
    return finalizeJobAcceptanceAction(requestIdOrJobId)
  },

  async markAttendance(location: any) {
    const { markAttendanceAction } = await import("@/actions/technician.action")
    return markAttendanceAction(location)
  },

  async getTechnicianAttendance() {
    const { getTechnicianAttendanceAction } = await import("@/actions/technician.action")
    return getTechnicianAttendanceAction()
  },

  // ─── Admin ──────────────────────────────────────────────────────────
  
  async getRequests() {
    const { getRequestsAction } = await import("@/actions/admin.action")
    return getRequestsAction()
  },

  async getDeleteRequestWarning(requestId: string) {
    const { getDeleteRequestWarningAction } = await import("@/actions/admin.action")
    return getDeleteRequestWarningAction(requestId)
  },

  async deleteRequestCascading(requestId: string) {
    const { deleteRequestCascadingAction } = await import("@/actions/admin.action")
    return deleteRequestCascadingAction(requestId)
  },

  async assignTechnician(requestId: string, technicianId: string) {
    const { assignTechnicianToRequest } = await import("@/actions/admin.action")
    return assignTechnicianToRequest(requestId, technicianId)
  },

  async assignTeam(jobId: string, techIds: string[]) {
    const { updateMasterTeamAction } = await import("@/actions/team.action")
    return updateMasterTeamAction(jobId, techIds)
  },



  async getMasterTeam(jobId: string) {
    const { getMasterTeamAction } = await import("@/actions/team.action")
    return getMasterTeamAction(jobId)
  },

  async resetAssignment(jobId: string, reason?: string) {
    const { adminResetAssignmentAction } = await import("@/actions/lifecycle.action")
    return adminResetAssignmentAction(jobId, reason)
  },

  async createDailyRoster(techIds: string[], date?: string) {
    const { createDailyRosterAction } = await import("@/actions/roster.action")
    return createDailyRosterAction(techIds, date)
  },

  async updateMasterTeam(jobId: string, techIds: string[]) {
    const { updateMasterTeamAction } = await import("@/actions/team.action")
    return updateMasterTeamAction(jobId, techIds)
  },



  async getAvailableReplacements(excludeIds?: string[]) {
    const { getAvailableReplacementsAction } = await import("@/actions/replacement.action")
    return getAvailableReplacementsAction(excludeIds || [])
  },

  async getTechnicianInvite() {
    const { getTechnicianInviteAction } = await import("@/actions/team.action")
    return getTechnicianInviteAction()
  },

  async respondToInvite(inviteId: string, accept: boolean) {
    const { respondToMasterTeamInviteAction } = await import("@/actions/team.action")
    return respondToMasterTeamInviteAction(inviteId, accept)
  },

  async respondToMasterTeamInvite(inviteId: string, accept: boolean) {
    const { respondToMasterTeamInviteAction } = await import("@/actions/team.action")
    return respondToMasterTeamInviteAction(inviteId, accept)
  },

  async getTechnicians() {
    const { getTechniciansAction } = await import("@/actions/admin.action")
    return getTechniciansAction()
  },

  async getUsers() {
    const { getUsersAction } = await import("@/actions/admin.action")
    return getUsersAction()
  },

  async updateUserStatus(userId: string, status: "PENDING_PROFILE" | "PENDING_APPROVAL" | "ACTIVE" | "REJECTED", role?: "admin" | "company" | "technician") {
    const { updateUserStatusAction } = await import("@/actions/admin.action")
    return updateUserStatusAction(userId, status, role)
  },

  async getUserDetails(userId: string) {
    const { getUserDetailsAction } = await import("@/actions/admin.action")
    return getUserDetailsAction(userId)
  },


  async deleteUser(userId: string) {
    const { deleteUserAction } = await import("@/actions/admin.action")
    return deleteUserAction(userId)
  },

  async getFeedback() {
    const { getFeedbackAction } = await import("@/actions/review.action")
    return getFeedbackAction()
  },

  async adminLogin(phone: string, pass: string) {
    const { adminLoginAction } = await import("@/actions/admin.action")
    return adminLoginAction(phone, pass)
  },

  async changeAdminPassword(currentPass: string, newPass: string, confirmPass?: string) {
    const { changeAdminPasswordAction } = await import("@/actions/admin-setup.action")
    return changeAdminPasswordAction(currentPass, newPass, confirmPass)
  },

  async approveTechnician(techId: string) {
    const { approveTechnician } = await import("@/actions/admin.action")
    return approveTechnician(techId)
  },

  async rejectTechnician(techId: string, reason: string) {
    const { rejectTechnician } = await import("@/actions/admin.action")
    return rejectTechnician(techId, reason)
  },


  // ─── Daily Invites ─────────────────────────────────────────────────
  
  async sendDailyInvites(workDate?: string) {
    const { sendDailyInvitesAction } = await import("@/actions/roster.action")
    return sendDailyInvitesAction(workDate)
  },

  async getDailyInvite() {
    const { getDailyInviteAction } = await import("@/actions/roster.action")
    return getDailyInviteAction()
  },

  async respondToDailyInvite(inviteId: string, accept: boolean) {
    const { respondToDailyInviteAction } = await import("@/actions/roster.action")
    return respondToDailyInviteAction(inviteId, accept)
  },

  async getDailyInviteStatuses(workDate?: string) {
    const { getDailyInviteStatusesAction } = await import("@/actions/roster.action")
    return getDailyInviteStatusesAction(workDate)
  },

  // ─── Replacement Workers ───────────────────────────────────────────
  
  async addReplacementWorker(technicianId: string, skills?: string[]) {
    const { addReplacementWorkerAction } = await import("@/actions/replacement.action")
    return addReplacementWorkerAction(technicianId, skills)
  },

  async getReplacementWorkers() {
    const { getReplacementWorkersAction } = await import("@/actions/replacement.action")
    return getReplacementWorkersAction()
  },

  async assignReplacementWorker(workerId: string, assignmentId: string, masterTeamId?: string) {
    const { assignReplacementWorkerAction } = await import("@/actions/replacement.action")
    return assignReplacementWorkerAction(workerId, assignmentId, masterTeamId)
  },

  // ─── Signature Sharing ──────────────────────────────────────────────
  
  async getJobSignatureDetails(jobId: string) {
    const { getJobSignatureDetailsAction } = await import("@/actions/signature.action")
    return getJobSignatureDetailsAction(jobId)
  },

  async shareSignature(jobId: string) {
    const { shareSignatureAction } = await import("@/actions/signature.action")
    return shareSignatureAction(jobId)
  },

  // ─── Notifications ───────────────────────────────────────────────────
  
  async getNotifications() {
    const { getNotificationsAction } = await import("@/actions/notification.action")
    return getNotificationsAction()
  },

  async markNotificationAsRead(id: string) {
    const { markNotificationAsReadAction } = await import("@/actions/notification.action")
    return markNotificationAsReadAction(id)
  },

  async markAllNotificationsAsRead() {
    const { markAllNotificationsAsReadAction } = await import("@/actions/notification.action")
    return markAllNotificationsAsReadAction()
  },

  async submitRating(jobId: string, technicianId: string, score: number, review?: string) {
    const { submitRatingAction } = await import("@/actions/review.action")
    return submitRatingAction(jobId, technicianId, score, review)
  },



  async finalizeRequest(requestId: string) {
    const { finalizeRequestAction } = await import("@/actions/admin.action")
    return finalizeRequestAction(requestId)
  },
}
