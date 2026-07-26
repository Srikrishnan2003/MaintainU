import { z } from "zod";
import { invoiceStatusEnum } from "@/db/schema";

const statuses = invoiceStatusEnum.enumValues as ["Draft", "Sent", "Paid", "Overdue", "Cancelled"];

export const createInvoiceSchema = z.object({
  jobId: z.string().uuid("Invalid Job ID"),
  laborCost: z.number().nonnegative(),
  materialCost: z.number().nonnegative().optional().default(0),
  platformFee: z.number().nonnegative().optional().default(0),
  totalAmount: z.number().positive(),
});

export const updateInvoiceStatusSchema = z.object({
  invoiceId: z.string().uuid("Invalid Invoice ID"),
  status: z.enum(statuses),
});

export const getInvoicesFiltersSchema = z.object({
  status: z.enum(statuses).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  search: z.string().optional(),
});
