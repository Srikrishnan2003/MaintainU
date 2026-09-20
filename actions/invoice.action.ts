"use server";

import { db } from "@/lib/db";
import { invoices, jobs, requests, companies, users } from "@/db/schema";
import { eq, and, desc, asc, sql } from "drizzle-orm";
import { requireRole, getSession } from "@/services/auth.service";
import { ActionResult, validateAction } from "@/lib/validations/actions";
import { createInvoiceSchema, updateInvoiceStatusSchema, getInvoicesFiltersSchema } from "@/lib/validations/invoice.validations";
import { z } from "zod";
import { generateInvoicePDF } from "@/services/pdf.service";
import { UTApi } from "uploadthing/server";
import { sendEmail } from "@/services/email.service";

const utapi = new UTApi();

// ─── Return type interfaces ───────────────────────────────────────────────────

interface InvoiceListItem {
    id: string;
    jobId: string;
    totalAmount: number;
    status: "Draft" | "Sent" | "Paid" | "Overdue" | "Cancelled" | null;
    generatedAt: Date | null;
    pdfUrl: string | null;
    companyName: string;
    companyId: string;
}

interface InvoiceDetail {
    id: string;
    jobId: string;
    laborCost: number;
    materialCost: number | null;
    platformFee: number | null;
    totalAmount: number;
    status: "Draft" | "Sent" | "Paid" | "Overdue" | "Cancelled" | null;
    pdfUrl: string | null;
    generatedAt: Date | null;
    sentAt: Date | null;
    companyName: string;
    companyAddress: string | null;
    companyEmail: string | null;
    companyGstin: string | null;
    jobTitle: string;
    jobDescription: string | null;
    companyUserId: string;
}


/**
 * Admin Action: Create an invoice linked to a job.
 */
export async function createInvoiceAction(data: unknown): Promise<ActionResult<{ invoiceId: string }>> {
    const validation = validateAction(createInvoiceSchema, data);
    if (!validation.success) {
        return validation;
    }
    const validatedData = validation.data;

    try {
        await requireRole("admin");

        // Verify job exists and has a requestId
        const job = await db.query.jobs.findFirst({ where: eq(jobs.id, validatedData.jobId) });
        if (!job || !job.requestId) {
            return { success: false, message: "Job not found or invalid" };
        }

        // Guard: prevent duplicate invoices for the same job
        const existing = await db.query.invoices.findFirst({ where: eq(invoices.jobId, validatedData.jobId) });
        if (existing) {
            return { success: false, message: "An invoice already exists for this job" };
        }

        // Insert invoice
        const [newInvoice] = await db.insert(invoices).values({
            jobId: validatedData.jobId,
            laborCost: validatedData.laborCost,
            materialCost: validatedData.materialCost,
            platformFee: validatedData.platformFee,
            totalAmount: validatedData.totalAmount,
            status: "Draft",
        }).returning();

        return { success: true, data: { invoiceId: newInvoice.id } };
    } catch (e: unknown) {
        const err = e as Error;
        console.error("createInvoiceAction error:", err);
        return { success: false, message: err.message || "Failed to create invoice" };
    }
}

/**
 * Admin Action: Fetch completed jobs that do not yet have an invoice.
 */
export async function getEligibleJobsAction(): Promise<ActionResult<{ id: string; companyName: string; completedAt: Date | null }[]>> {
    try {
        await requireRole("admin");

        // Jobs with status "Completed" that have no corresponding invoice row
        const eligible = await db
            .select({
                id: jobs.id,
                companyName: companies.companyName,
                completedAt: jobs.completedAt,
            })
            .from(jobs)
            .innerJoin(requests, eq(jobs.requestId, requests.id))
            .innerJoin(companies, eq(requests.companyId, companies.id))
            .where(
                and(
                    eq(jobs.status, "Completed"),
                    sql`NOT EXISTS (SELECT 1 FROM invoices WHERE invoices.job_id = ${jobs.id})`
                )
            )
            .orderBy(desc(jobs.completedAt));

        return { success: true, data: eligible };
    } catch (e: unknown) {
        const err = e as Error;
        console.error("getEligibleJobsAction error:", err);
        return { success: false, message: "Failed to fetch eligible jobs" };
    }
}


/**
 * Shared Action: Fetch invoices based on role and filters.
 */
export async function getInvoicesAction(filters?: unknown): Promise<ActionResult<InvoiceListItem[]>> {
    const validation = validateAction(getInvoicesFiltersSchema, filters || {});
    if (!validation.success) return validation;
    const { status, search, dateFrom, dateTo } = validation.data;

    try {
        const session = await getSession();
        if (!session) return { success: false, message: "Not authenticated" };

        let query = db.select({
            id: invoices.id,
            jobId: invoices.jobId,
            totalAmount: invoices.totalAmount,
            status: invoices.status,
            generatedAt: invoices.generatedAt,
            pdfUrl: invoices.pdfUrl,
            companyName: companies.companyName,
            companyId: companies.id,
        })
        .from(invoices)
        .innerJoin(jobs, eq(invoices.jobId, jobs.id))
        .innerJoin(requests, eq(jobs.requestId, requests.id))
        .innerJoin(companies, eq(requests.companyId, companies.id))
        .$dynamic();

        const conditions = [];

        // Role-based scoping
        if (session.role === "company") {
            const company = await db.query.companies.findFirst({ where: eq(companies.userId, session.userId) });
            if (!company) return { success: false, message: "Company profile not found" };
            conditions.push(eq(companies.id, company.id));
        }

        // Filters
        if (status) conditions.push(eq(invoices.status, status));
        if (search) conditions.push(sql`lower(${companies.companyName}) LIKE lower(${'%' + search + '%'})`);
        if (dateFrom) conditions.push(sql`date(${invoices.generatedAt}) >= date(${dateFrom})`);
        if (dateTo) conditions.push(sql`date(${invoices.generatedAt}) <= date(${dateTo})`);

        if (conditions.length > 0) {
            query = query.where(and(...conditions));
        }

        const results = await query.orderBy(desc(invoices.generatedAt));
        return { success: true, data: results };
    } catch (e: unknown) {
        const err = e as Error;
        console.error("getInvoicesAction error:", err);
        return { success: false, message: "Failed to fetch invoices" };
    }
}

/**
 * Shared Action: Fetch full invoice details by ID.
 */
export async function getInvoiceByIdAction(invoiceId: string): Promise<ActionResult<InvoiceDetail>> {
    const idValidation = z.string().uuid().safeParse(invoiceId);
    if (!idValidation.success) return { success: false, message: "Invalid invoice ID" };

    try {
        const session = await getSession();
        if (!session) return { success: false, message: "Not authenticated" };

        const [invoiceDetail] = await db.select({
            id: invoices.id,
            jobId: invoices.jobId,
            laborCost: invoices.laborCost,
            materialCost: invoices.materialCost,
            platformFee: invoices.platformFee,
            totalAmount: invoices.totalAmount,
            status: invoices.status,
            pdfUrl: invoices.pdfUrl,
            generatedAt: invoices.generatedAt,
            sentAt: invoices.sentAt,
            companyName: companies.companyName,
            companyAddress: companies.address,
            companyEmail: companies.email,
            companyGstin: companies.gstin,
            jobTitle: requests.serviceType,
            jobDescription: requests.description,
            companyUserId: companies.userId,
        })
        .from(invoices)
        .innerJoin(jobs, eq(invoices.jobId, jobs.id))
        .innerJoin(requests, eq(jobs.requestId, requests.id))
        .innerJoin(companies, eq(requests.companyId, companies.id))
        .where(eq(invoices.id, invoiceId))
        .limit(1);

        if (!invoiceDetail) return { success: false, message: "Invoice not found" };

        if (session.role === "technician") {
            return { success: false, message: "Unauthorized" };
        }
        
        if (session.role === "company" && invoiceDetail.companyUserId !== session.userId) {
            return { success: false, message: "Unauthorized access to this invoice" };
        }

        return { success: true, data: invoiceDetail };
    } catch (e: unknown) {
        const err = e as Error;
        console.error("getInvoiceByIdAction error:", err);
        return { success: false, message: "Failed to load invoice details" };
    }
}

/**
 * Admin Action: Update the status of an invoice.
 */
export async function updateInvoiceStatusAction(invoiceId: string, status: unknown): Promise<ActionResult> {
    const validation = validateAction(updateInvoiceStatusSchema, { invoiceId, status });
    if (!validation.success) return validation;

    try {
        await requireRole("admin");
        
        await db.update(invoices)
            .set({ 
                status: validation.data.status,
                ...(validation.data.status === "Sent" ? { sentAt: new Date() } : {})
            })
            .where(eq(invoices.id, validation.data.invoiceId));

        if (validation.data.status === "Sent") {
            const invoiceDetails = await db.select({
                id: invoices.id,
                totalAmount: invoices.totalAmount,
                companyEmail: companies.email,
                companyName: companies.companyName
            })
            .from(invoices)
            .innerJoin(jobs, eq(invoices.jobId, jobs.id))
            .innerJoin(requests, eq(jobs.requestId, requests.id))
            .innerJoin(companies, eq(requests.companyId, companies.id))
            .where(eq(invoices.id, validation.data.invoiceId))
            .limit(1);

            const record = invoiceDetails[0];
            if (record && record.companyEmail) {
                try {
                    sendEmail({
                        to: record.companyEmail,
                        subject: `Invoice Sent - ${record.companyName} (#${record.id.slice(0, 8)})`,
                        body: `Hello ${record.companyName},\n\nAn invoice (#${record.id.slice(0, 8)}) has been generated and sent for your recent job. The total amount due is ₹${record.totalAmount}.\n\nPlease log in to your dashboard to view and pay the invoice.\n\nRegards,\nMaintainU Admin`
                    }).catch(err => console.error("Email send error (updateInvoiceStatus):", err));
                } catch (err) {
                    console.error("Email send error (updateInvoiceStatus):", err);
                }
            }
        }

        return { success: true, message: "Invoice status updated" };
    } catch (e: unknown) {
        const err = e as Error;
        console.error("updateInvoiceStatusAction error:", err);
        return { success: false, message: "Failed to update status" };
    }
}

/**
 * Admin Action: Delete a draft invoice.
 */
export async function deleteInvoiceAction(invoiceId: string): Promise<ActionResult> {
    const idValidation = z.string().uuid().safeParse(invoiceId);
    if (!idValidation.success) return { success: false, message: "Invalid invoice ID" };

    try {
        await requireRole("admin");

        const invoice = await db.query.invoices.findFirst({ where: eq(invoices.id, invoiceId) });
        if (!invoice) return { success: false, message: "Invoice not found" };

        if (invoice.status !== "Draft") {
            return { success: false, message: "Only Draft invoices can be deleted" };
        }

        await db.delete(invoices).where(eq(invoices.id, invoiceId));
        return { success: true, message: "Invoice deleted successfully" };
    } catch (e: unknown) {
        const err = e as Error;
        console.error("deleteInvoiceAction error:", err);
        return { success: false, message: "Failed to delete invoice" };
    }
}

/**
 * Shared Action: Generate PDF for an Invoice
 */
export async function generateInvoicePDFAction(invoiceId: string): Promise<ActionResult<{ pdfUrl: string }>> {
    try {
        // 1. Fetch full data (this action enforces admin/company ownership internally)
        const invoiceRes = await getInvoiceByIdAction(invoiceId);
        if (!invoiceRes.success || !invoiceRes.data) {
            return { success: false, message: invoiceRes.message || "Failed to load invoice" };
        }

        const invoiceData = invoiceRes.data;

        // 2. Generate PDF
        const pdfBuffer = await generateInvoicePDF(invoiceData);

        // 3. Upload to UploadThing
        const utFile = new File([new Uint8Array(pdfBuffer)], `invoice-${invoiceId}.pdf`, { type: "application/pdf" });
        const uploadResponse = await utapi.uploadFiles([utFile]);

        if (!uploadResponse || uploadResponse.length === 0 || uploadResponse[0].error) {
            console.error("UploadThing Error:", uploadResponse?.[0]?.error);
            return { success: false, message: "Failed to upload PDF" };
        }

        const pdfUrl = uploadResponse[0].data.url;

        // 4. Update Database
        await db.update(invoices).set({ pdfUrl }).where(eq(invoices.id, invoiceId));

        return { success: true, data: { pdfUrl }, message: "PDF generated successfully" };
    } catch (e: unknown) {
        const err = e as Error;
        console.error("generateInvoicePDFAction error:", err);
        return { success: false, message: "Failed to generate PDF" };
    }
}

export type InvoiceExportRow = {
    invoiceNumber: string;
    companyName: string;
    laborCost: number;
    materialCost: number;
    platformFee: number;
    totalAmount: number;
    status: string;
    createdAt: string;
};

/**
 * Admin Action: Exports invoice data.
 */
export async function exportInvoicesAction(period?: { from: string; to: string }): Promise<ActionResult<InvoiceExportRow[]>> {
    try {
        await requireRole("admin");

        let query = db.select({
            id: invoices.id,
            companyName: companies.companyName,
            laborCost: invoices.laborCost,
            materialCost: invoices.materialCost,
            platformFee: invoices.platformFee,
            totalAmount: invoices.totalAmount,
            status: invoices.status,
            generatedAt: invoices.generatedAt,
        })
        .from(invoices)
        .innerJoin(jobs, eq(invoices.jobId, jobs.id))
        .innerJoin(requests, eq(jobs.requestId, requests.id))
        .innerJoin(companies, eq(requests.companyId, companies.id))
        .$dynamic();

        const conditions = [];
        if (period?.from) {
            conditions.push(sql`date(${invoices.generatedAt}) >= date(${period.from})`);
        }
        if (period?.to) {
            conditions.push(sql`date(${invoices.generatedAt}) <= date(${period.to})`);
        }

        if (conditions.length > 0) {
            query = query.where(and(...conditions));
        }

        const results = await query.orderBy(desc(invoices.generatedAt));

        const rows: InvoiceExportRow[] = results.map(row => ({
            invoiceNumber: row.id,
            companyName: row.companyName || "",
            laborCost: row.laborCost,
            materialCost: row.materialCost || 0,
            platformFee: row.platformFee || 0,
            totalAmount: row.totalAmount,
            status: row.status || "",
            createdAt: row.generatedAt ? row.generatedAt.toISOString() : "",
        }));

        return { success: true, message: "Export ready", data: rows };
    } catch (e: any) {
        return { success: false, message: e.message || "Failed to export invoices" };
    }
}

