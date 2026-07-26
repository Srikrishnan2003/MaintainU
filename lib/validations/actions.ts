import { z } from "zod";
import {
  serviceTypeEnum,
  priorityEnum,
  statusEnum,
  requestStatusEnum,
  roleEnum
} from "@/db/schema";

// --- Shared Utility ---
export type ActionResult<T = void> =
  | { success: true; data?: T; message?: string; [key: string]: any }
  | { success: false; error?: string; message?: string; fieldErrors?: Record<string, string[] | undefined>; [key: string]: any };

export function validateAction<T>(schema: z.ZodType<T>, data: unknown): { success: true; data: T } | { success: false; error: string; message: string; fieldErrors: Record<string, string[] | undefined> } {
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      error: "Validation failed",
      message: "Please check the form for errors",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }
  return { success: true, data: parsed.data };
}

// --- Enum Helpers ---
const serviceTypes = serviceTypeEnum.enumValues as [string, ...string[]];
const priorities = priorityEnum.enumValues as [string, ...string[]];
const statuses = statusEnum.enumValues as [string, ...string[]];
const requestStatuses = requestStatusEnum.enumValues as [string, ...string[]];
const roles = roleEnum.enumValues as [string, ...string[]];

const phoneRegex = /^(\+91)?[6-9]\d{9}$/;

// --- Schemas ---

export const createRequestSchema = z.object({
  serviceType: z.string().min(2, "Service type is required"),
  priority: z.string().min(2, "Priority is required"),
  description: z.string().min(10, "Description must be at least 10 characters").max(1000, "Description is too long"),
  location: z.string().min(3, "Location must be at least 3 characters"),
  supervisorName: z.string().min(2, "Supervisor name must be at least 2 characters").optional().or(z.literal("")),
  supervisor: z.string().min(2, "Supervisor name must be at least 2 characters").optional().or(z.literal("")),
  supervisorPhone: z.string().regex(phoneRegex, "Invalid Indian phone number").optional().or(z.literal("")),
  timeSlot: z.string().optional(),
  preferredTimeSlot: z.string().optional(),
  date: z.string().optional(),
  preferredDate: z.string().optional(),
  photos: z.array(z.string().url()).max(3, "Maximum 3 attachments allowed").optional(),
});

export const companyProfileSchema = z.object({
  companyName: z.string().min(2, "Company Name must be at least 2 characters").optional(),
  spokespersonPhone: z.string().regex(phoneRegex, "Invalid Indian phone number").optional(),
  address: z.string().min(5, "Address must be at least 5 characters").optional(),
  industryType: z.string().optional(),
  gstin: z.string().optional(),
  contactPerson: z.string().min(2, "Contact person must be at least 2 characters").optional(),
  email: z.string().email("Invalid email format").optional(),
});

export const technicianProfileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
  phone: z.string().regex(phoneRegex, "Invalid Indian phone number").optional(),
  skills: z.union([
    z.array(z.enum(serviceTypes)),
    z.string().transform((val) => val.split(",").map(s => s.trim()).filter(Boolean) as string[])
  ]).optional(),
  primarySkill: z.enum(serviceTypes).optional(),
  experience: z.union([z.string(), z.number()]).optional(),
  bio: z.string().max(500, "Bio cannot exceed 500 characters").optional(),
  address: z.string().min(5, "Address must be at least 5 characters").optional(),
});

export const technicianDocumentsSchema = z.record(z.string().url("Invalid document URL").optional());

export const jobUpdateSchema = z.object({
  jobId: z.string().uuid("Invalid Job ID"),
  message: z.string().min(1, "Message is required"),
  photos: z.array(z.string().url()).max(5, "Maximum 5 photos allowed").optional(),
});

export const attendanceLocationSchema = z.object({
  jobId: z.string().uuid("Invalid Job ID").optional(), // Optional since markAttendance doesn't use it, but checkIn does
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().optional(),
  status: z.string().optional(),
});

export const adminLoginSchema = z.object({
  phone: z.string().regex(/^(\+91)?[6-9]\d{9}$/, "Invalid phone number"),
  inputPass: z.string().min(1, "Password is required"),
});

export const reviewRequestSchema = z.object({
  requestId: z.string().uuid("Invalid Request ID"),
  status: z.enum(requestStatuses),
  reason: z.string().optional(),
});

export const jobActionSchema = z.object({
  jobId: z.string().uuid("Invalid Job ID"),
  reason: z.string().min(5, "Reason must be at least 5 characters").max(500, "Reason is too long"),
});

export const updateUserStatusSchema = z.object({
  userId: z.string().uuid("Invalid User ID"),
  status: z.enum(statuses),
  role: z.enum(roles).optional(),
});
