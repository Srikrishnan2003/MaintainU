import { EventEmitter } from 'events';

// Create a global singleton to persist across hot reloads in development
const globalForEventEmitter = global as unknown as { eventEmitter: EventEmitter };
export const eventEmitter = globalForEventEmitter.eventEmitter || new EventEmitter();

if (process.env.NODE_ENV !== 'production') {
    globalForEventEmitter.eventEmitter = eventEmitter;
}

// Increase max listeners since many clients could connect
eventEmitter.setMaxListeners(0);

export function emitJobStatusUpdate(jobId: string, requestId: string, companyId: string, technicianId: string, status: string, updatedAt: Date | string) {
    const updatedAtStr = updatedAt instanceof Date ? updatedAt.toISOString() : updatedAt;
    eventEmitter.emit('job_status_update', { jobId, requestId, companyId, technicianId, status, updatedAt: updatedAtStr });
}

export function emitNotification(userId: string, notification: { id: string, message: string, type: string, createdAt: Date | string }) {
    eventEmitter.emit(`notification:${userId}`, notification);
}

export function emitAttendanceUpdate(technicianId: string, jobId: string, status: string, date: string) {
    eventEmitter.emit('attendance_update', { technicianId, jobId, status, date });
}

export function emitAccountApproved(userId: string, role: string) {
    eventEmitter.emit(`account_approved:${userId}`, { userId, role });
}
