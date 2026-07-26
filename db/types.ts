import {
    users,
    companies,
    technicians,
    requests,
    jobs,
    jobStatusHistory,
    masterTeams,
    masterTeamMembers,
    dailyInvites,
    replacementWorkers,
    replacementAssignments,
    dailyAssignments,
    attendance,
    substitutions,
    jobUpdates,
    invoices,
    payments,
    ratings,
    technicianScores,
    notifications,
    otpVerifications
} from "./schema";

// ─── Table Types ────────────────────────────────────────────────────────
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Company = typeof companies.$inferSelect;
export type NewCompany = typeof companies.$inferInsert;

export type Technician = typeof technicians.$inferSelect;
export type NewTechnician = typeof technicians.$inferInsert;

export type Request = typeof requests.$inferSelect;
export type NewRequest = typeof requests.$inferInsert;

export type Job = typeof jobs.$inferSelect;
export type NewJob = typeof jobs.$inferInsert;

export type JobStatusHistory = typeof jobStatusHistory.$inferSelect;
export type NewJobStatusHistory = typeof jobStatusHistory.$inferInsert;

export type MasterTeam = typeof masterTeams.$inferSelect;
export type NewMasterTeam = typeof masterTeams.$inferInsert;

export type MasterTeamMember = typeof masterTeamMembers.$inferSelect;
export type NewMasterTeamMember = typeof masterTeamMembers.$inferInsert;

export type DailyInvite = typeof dailyInvites.$inferSelect;
export type NewDailyInvite = typeof dailyInvites.$inferInsert;

export type ReplacementWorker = typeof replacementWorkers.$inferSelect;
export type NewReplacementWorker = typeof replacementWorkers.$inferInsert;

export type ReplacementAssignment = typeof replacementAssignments.$inferSelect;
export type NewReplacementAssignment = typeof replacementAssignments.$inferInsert;

export type DailyAssignment = typeof dailyAssignments.$inferSelect;
export type NewDailyAssignment = typeof dailyAssignments.$inferInsert;

export type Attendance = typeof attendance.$inferSelect;
export type NewAttendance = typeof attendance.$inferInsert;

export type Substitution = typeof substitutions.$inferSelect;
export type NewSubstitution = typeof substitutions.$inferInsert;

export type JobUpdate = typeof jobUpdates.$inferSelect;
export type NewJobUpdate = typeof jobUpdates.$inferInsert;

export type Invoice = typeof invoices.$inferSelect;
export type NewInvoice = typeof invoices.$inferInsert;

export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;

export type Rating = typeof ratings.$inferSelect;
export type NewRating = typeof ratings.$inferInsert;

export type TechnicianScore = typeof technicianScores.$inferSelect;
export type NewTechnicianScore = typeof technicianScores.$inferInsert;

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;

export type OtpVerification = typeof otpVerifications.$inferSelect;
export type NewOtpVerification = typeof otpVerifications.$inferInsert;

// ─── Composite Interfaces ───────────────────────────────────────────────
export interface JobWithDetails extends Job {
    companyName: string | null;
    technicianName: string | null;
    requestDetails: Request | null;
}

export interface TechnicianWithUser extends Technician {
    userName: string | null;
    userPhone: string | null;
    userStatus: string | null;
}
