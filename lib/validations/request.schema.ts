import { z } from "zod";

export const ServiceTypeEnum = z.enum([
  "ELECTRICAL",
  "PLUMBING",
  "HVAC",
  "MECHANICAL",
  "GENERAL",
]);

export const PriorityEnum = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);

export const StatusEnum = z.enum([
  "REQUESTED",
  "ASSIGNED",
  "IN_PROGRESS",
  "COMPLETED",
]);

export const createRequestSchema = z.object({
  companyId: z.string().uuid("Invalid company ID"),
  serviceType: ServiceTypeEnum,
  priority: PriorityEnum,
  location: z.string().min(5, "Location must be at least 5 characters long"),
  description: z.string().min(10, "Description must be at least 10 characters long"),
  preferredDate: z.string().or(z.date()).refine((val) => {
    const date = new Date(val);
    return !isNaN(date.getTime());
  }, "Invalid date format"),
  preferredTimeSlot: z.string().min(1, "Time slot is required"),
  technicianId: z.string().uuid("Invalid technician ID").optional().nullable(),
});

export const updateRequestSchema = createRequestSchema.partial().extend({
  status: StatusEnum.optional(),
});
