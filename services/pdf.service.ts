import { renderToStream, renderToBuffer, DocumentProps } from '@react-pdf/renderer';
import { InvoicePDF, InvoiceData } from '@/components/pdf/InvoicePDF';
import { JobReportPDF, JobData } from '@/components/pdf/JobReportPDF';
import React from 'react';

export async function generateInvoicePDF(invoiceData: unknown): Promise<Buffer> {
    const element = React.createElement(InvoicePDF, { invoiceData: invoiceData as InvoiceData }) as unknown as React.ReactElement<DocumentProps>;
    const buffer = await renderToBuffer(element);
    // Depending on the version, renderToBuffer returns a Node Buffer.
    // If it complains about types, we typecast.
    return buffer as Buffer;
}

export async function generateJobReportPDF(jobData: unknown): Promise<Buffer> {
    const element = React.createElement(JobReportPDF, { jobData: jobData as JobData }) as unknown as React.ReactElement<DocumentProps>;
    const buffer = await renderToBuffer(element);
    return buffer as Buffer;
}
