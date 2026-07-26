import { z } from "zod";
import { requestStatusEnum, serviceTypeEnum, priorityEnum, statusEnum } from "@/db/schema";

export const requestsFilterSchema = z.object({
    search: z.string().optional(),
    serviceType: z.string().optional(),
    priority: z.string().optional(),
    status: z.string().optional(),
});
export type RequestsFilterParams = z.infer<typeof requestsFilterSchema>;

export const techniciansFilterSchema = z.object({
    search: z.string().optional(),
    status: z.enum(statusEnum.enumValues).optional(),
    serviceType: z.string().optional(),
});
export type TechniciansFilterParams = z.infer<typeof techniciansFilterSchema>;

export const jobsFilterSchema = z.object({
    search: z.string().optional(),
    jobStatus: z.enum(requestStatusEnum.enumValues).optional(),
    serviceType: z.string().optional(),
    priority: z.string().optional(),
});
export type JobsFilterParams = z.infer<typeof jobsFilterSchema>;

export const approvalsFilterSchema = z.object({
    search: z.string().optional(),
    status: z.string().optional(),
});
export type ApprovalsFilterParams = z.infer<typeof approvalsFilterSchema>;
