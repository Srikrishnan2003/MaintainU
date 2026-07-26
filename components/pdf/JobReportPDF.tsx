import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', color: '#1f2937' },
  header: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 2, borderBottomColor: '#2563eb', paddingBottom: 20, marginBottom: 30 },
  headerLeft: { flexDirection: 'column' },
  headerRight: { flexDirection: 'column', alignItems: 'flex-end' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#2563eb', marginBottom: 4, letterSpacing: 1 },
  jobId: { fontSize: 10, color: '#6b7280' },
  sectionTitle: { fontSize: 10, fontWeight: 'bold', marginBottom: 12, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1, borderBottomWidth: 1, borderBottomColor: '#e5e7eb', paddingBottom: 4 },
  section: { marginBottom: 24 },
  text: { fontSize: 10, marginBottom: 6, color: '#374151', lineHeight: 1.4 },
  textBold: { fontSize: 11, fontWeight: 'bold', marginBottom: 4, color: '#111827' },
  grid: { flexDirection: 'row', gap: 20 },
  col: { flex: 1 },
  timelineItem: { flexDirection: 'row', marginBottom: 10 },
  timelineDate: { width: 120, fontSize: 10, color: '#6b7280' },
  timelineContent: { flex: 1, fontSize: 10, color: '#111827' },
  badge: { fontSize: 9, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 4, textTransform: 'uppercase', backgroundColor: '#f3f4f6', color: '#374151', alignSelf: 'flex-start', marginTop: 4 },
  footer: { position: 'absolute', bottom: 40, left: 40, right: 40, flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingTop: 16 },
  footerText: { fontSize: 9, color: '#9ca3af' },
  statsBox: { backgroundColor: '#f9fafb', padding: 12, borderRadius: 6, flexDirection: 'row', gap: 20, marginTop: 10 },
  stat: { flex: 1 },
  statLabel: { fontSize: 9, color: '#6b7280', textTransform: 'uppercase', marginBottom: 4 },
  statValue: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
  updateBox: { padding: 10, backgroundColor: '#f9fafb', borderRadius: 4, marginBottom: 8 },
  updateHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  updateDate: { fontSize: 9, color: '#6b7280' },
  updateStatus: { fontSize: 9, fontWeight: 'bold', color: '#2563eb' },
  updateMessage: { fontSize: 10, color: '#374151' },
  updatePhotos: { fontSize: 8, color: '#9ca3af', marginTop: 4, fontStyle: 'italic' }
});

interface JobUpdate {
    status: string;
    message: string | null;
    photoCount: number;
    createdAt: Date | string;
}

export interface JobData {
    id: string;
    status: string;
    companyName: string;
    serviceType: string;
    priority: string;
    description: string | null;
    leadTechnicianName: string | null;
    teamMembers: string[];
    assignedAt: Date | string | null;
    startedAt: Date | string | null;
    completedAt: Date | string | null;
    attendanceSummary: {
        present: number;
        absent: number;
        total: number;
    };
    updates: JobUpdate[];
}

export const JobReportPDF = ({ jobData }: { jobData: JobData }) => {
    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <Text style={styles.title}>JOB REPORT</Text>
                        <Text style={styles.jobId}>Job ID: {jobData.id}</Text>
                    </View>
                    <View style={styles.headerRight}>
                        <Text style={styles.textBold}>{jobData.companyName}</Text>
                        <Text style={styles.badge}>{jobData.status}</Text>
                    </View>
                </View>

                {/* Core Details & Team Grid */}
                <View style={[styles.grid, styles.section]}>
                    <View style={styles.col}>
                        <Text style={styles.sectionTitle}>Job Details</Text>
                        <Text style={styles.text}><Text style={{ fontWeight: 'bold' }}>Service:</Text> {jobData.serviceType}</Text>
                        <Text style={styles.text}><Text style={{ fontWeight: 'bold' }}>Priority:</Text> {jobData.priority}</Text>
                        {jobData.description && (
                            <Text style={styles.text}><Text style={{ fontWeight: 'bold' }}>Description:</Text> {jobData.description}</Text>
                        )}
                    </View>
                    <View style={styles.col}>
                        <Text style={styles.sectionTitle}>Technician Assignment</Text>
                        <Text style={styles.textBold}>Lead: {jobData.leadTechnicianName || "Unassigned"}</Text>
                        {jobData.teamMembers && jobData.teamMembers.length > 0 && (
                            <Text style={styles.text}>Team: {jobData.teamMembers.join(", ")}</Text>
                        )}
                    </View>
                </View>

                {/* Timeline */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Lifecycle Timeline</Text>
                    {jobData.assignedAt && (
                        <View style={styles.timelineItem}>
                            <Text style={styles.timelineDate}>{new Date(jobData.assignedAt).toLocaleString()}</Text>
                            <Text style={styles.timelineContent}>Job Assigned</Text>
                        </View>
                    )}
                    {jobData.startedAt && (
                        <View style={styles.timelineItem}>
                            <Text style={styles.timelineDate}>{new Date(jobData.startedAt).toLocaleString()}</Text>
                            <Text style={styles.timelineContent}>Work Started</Text>
                        </View>
                    )}
                    {jobData.completedAt && (
                        <View style={styles.timelineItem}>
                            <Text style={styles.timelineDate}>{new Date(jobData.completedAt).toLocaleString()}</Text>
                            <Text style={styles.timelineContent}>Work Completed</Text>
                        </View>
                    )}
                </View>

                {/* Attendance Summary */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Attendance Summary</Text>
                    <View style={styles.statsBox}>
                        <View style={styles.stat}>
                            <Text style={styles.statLabel}>Present Days</Text>
                            <Text style={styles.statValue}>{jobData.attendanceSummary.present}</Text>
                        </View>
                        <View style={styles.stat}>
                            <Text style={styles.statLabel}>Absent Days</Text>
                            <Text style={styles.statValue}>{jobData.attendanceSummary.absent}</Text>
                        </View>
                        <View style={styles.stat}>
                            <Text style={styles.statLabel}>Total Scheduled</Text>
                            <Text style={styles.statValue}>{jobData.attendanceSummary.total}</Text>
                        </View>
                    </View>
                </View>

                {/* Updates Log */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Update Log</Text>
                    {jobData.updates && jobData.updates.length > 0 ? (
                        jobData.updates.map((update: JobUpdate, idx: number) => (
                            <View key={idx} style={styles.updateBox}>
                                <View style={styles.updateHeader}>
                                    <Text style={styles.updateStatus}>{update.status}</Text>
                                    <Text style={styles.updateDate}>{new Date(update.createdAt).toLocaleString()}</Text>
                                </View>
                                {update.message && <Text style={styles.updateMessage}>{update.message}</Text>}
                                {update.photoCount > 0 && (
                                    <Text style={styles.updatePhotos}>Includes {update.photoCount} photo(s)</Text>
                                )}
                            </View>
                        ))
                    ) : (
                        <Text style={styles.text}>No updates recorded for this job.</Text>
                    )}
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
