import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', color: '#1f2937' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 40 },
  headerLeft: { flexDirection: 'column' },
  headerRight: { flexDirection: 'column', alignItems: 'flex-end' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#111827', marginBottom: 4, letterSpacing: 1 },
  invoiceId: { fontSize: 10, color: '#6b7280' },
  logo: { width: 40, height: 40, backgroundColor: '#3b82f6', borderRadius: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 10, fontWeight: 'bold', marginBottom: 8, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1 },
  section: { marginBottom: 30 },
  text: { fontSize: 10, marginBottom: 4, color: '#374151' },
  textBold: { fontSize: 11, fontWeight: 'bold', marginBottom: 4, color: '#111827' },
  grid: { flexDirection: 'row', gap: 40 },
  col: { flex: 1 },
  table: { marginTop: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#f3f4f6', paddingVertical: 12 },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 2, borderBottomColor: '#e5e7eb', paddingVertical: 12 },
  rowLabel: { fontSize: 11, color: '#374151' },
  rowValue: { fontSize: 11, color: '#111827' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 14, backgroundColor: '#f9fafb', paddingHorizontal: 12, marginTop: 16, borderRadius: 6 },
  totalLabel: { fontSize: 14, fontWeight: 'bold', color: '#111827' },
  totalValue: { fontSize: 14, fontWeight: 'bold', color: '#111827' },
  badgeDraft: { backgroundColor: '#f3f4f6', color: '#4b5563' },
  badgeSent: { backgroundColor: '#eff6ff', color: '#2563eb' },
  badgePaid: { backgroundColor: '#ecfdf5', color: '#059669' },
  badgeOverdue: { backgroundColor: '#fef2f2', color: '#dc2626' },
  badgeCancelled: { backgroundColor: '#f3f4f6', color: '#9ca3af' },
  badgeBase: { fontSize: 10, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 4, textTransform: 'uppercase', marginTop: 6, alignSelf: 'flex-start' },
  footer: { position: 'absolute', bottom: 40, left: 40, right: 40, flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingTop: 16 },
  footerText: { fontSize: 9, color: '#9ca3af' }
});

const formatCurrency = (amount: number) => {
    // Note: react-pdf doesn't always render ₹ well with default fonts unless a specific font is loaded. 
    // We will use standard Rs. or INR if ₹ doesn't render, but the prompt says: "use ₹ symbol throughout".
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export interface InvoiceData {
    id: string;
    status: string;
    companyName: string;
    companyAddress: string | null;
    companyEmail: string | null;
    companyGstin: string | null;
    jobTitle: string;
    jobId: string;
    generatedAt: Date | string | null;
    laborCost: number | string;
    materialCost: number | string | null;
    platformFee: number | string | null;
    totalAmount: number | string;
}

export const InvoicePDF = ({ invoiceData }: { invoiceData: InvoiceData }) => {
    const getBadgeStyle = (status: string) => {
        switch(status?.toUpperCase()) {
            case "DRAFT": return styles.badgeDraft;
            case "SENT": return styles.badgeSent;
            case "PAID": return styles.badgePaid;
            case "OVERDUE": return styles.badgeOverdue;
            case "CANCELLED": return styles.badgeCancelled;
            default: return styles.badgeDraft;
        }
    };

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <View style={styles.logo}></View>
                        <Text style={styles.textBold}>MaintainU Platform</Text>
                        <Text style={styles.text}>123 Maintenance Hub</Text>
                        <Text style={styles.text}>Tech City, IN 400001</Text>
                    </View>
                    <View style={styles.headerRight}>
                        <Text style={styles.title}>INVOICE</Text>
                        <Text style={styles.invoiceId}>#{invoiceData.id}</Text>
                        <Text style={[styles.badgeBase, getBadgeStyle(invoiceData.status)]}>{invoiceData.status}</Text>
                    </View>
                </View>

                {/* Details Grid */}
                <View style={[styles.grid, styles.section]}>
                    <View style={styles.col}>
                        <Text style={styles.sectionTitle}>Bill To</Text>
                        <Text style={styles.textBold}>{invoiceData.companyName}</Text>
                        {invoiceData.companyAddress && <Text style={styles.text}>{invoiceData.companyAddress}</Text>}
                        {invoiceData.companyEmail && <Text style={styles.text}>{invoiceData.companyEmail}</Text>}
                        {invoiceData.companyGstin && <Text style={styles.text}>GSTIN: {invoiceData.companyGstin}</Text>}
                    </View>
                    <View style={styles.col}>
                        <Text style={styles.sectionTitle}>Job Reference</Text>
                        <Text style={styles.textBold}>{invoiceData.jobTitle}</Text>
                        <Text style={styles.text}>Job ID: {invoiceData.jobId}</Text>
                        <Text style={styles.text}>Date: {invoiceData.generatedAt ? new Date(invoiceData.generatedAt).toLocaleDateString() : new Date().toLocaleDateString()}</Text>
                    </View>
                </View>

                {/* Costs Breakdown */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Cost Breakdown</Text>
                    
                    <View style={styles.table}>
                        <View style={styles.rowHeader}>
                            <Text style={[styles.rowLabel, { fontWeight: 'bold' }]}>Description</Text>
                            <Text style={[styles.rowValue, { fontWeight: 'bold' }]}>Amount</Text>
                        </View>
                        
                        <View style={styles.row}>
                            <Text style={styles.rowLabel}>Labor Cost</Text>
                            <Text style={styles.rowValue}>{formatCurrency(Number(invoiceData.laborCost))}</Text>
                        </View>

                        {Number(invoiceData.materialCost) > 0 && (
                            <View style={styles.row}>
                                <Text style={styles.rowLabel}>Material Cost</Text>
                                <Text style={styles.rowValue}>{formatCurrency(Number(invoiceData.materialCost))}</Text>
                            </View>
                        )}

                        {Number(invoiceData.platformFee) > 0 && (
                            <View style={styles.row}>
                                <Text style={styles.rowLabel}>Platform Fee</Text>
                                <Text style={styles.rowValue}>{formatCurrency(Number(invoiceData.platformFee))}</Text>
                            </View>
                        )}

                        <View style={styles.totalRow}>
                            <Text style={styles.totalLabel}>Total Due</Text>
                            <Text style={styles.totalValue}>{formatCurrency(Number(invoiceData.totalAmount))}</Text>
                        </View>
                    </View>
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                    <Text style={styles.footerText}>Generated on {new Date().toLocaleDateString()}</Text>
                    <Text style={styles.footerText}>MaintainU Platform</Text>
                </View>
            </Page>
        </Document>
    );
};
