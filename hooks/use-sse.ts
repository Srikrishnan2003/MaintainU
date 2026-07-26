"use client";

import { useEffect, useRef, useState } from "react";

interface JobStatusUpdate {
  jobId: string;
  requestId: string;
  status: string;
  updatedAt: string;
  companyId: string;
  technicianId: string;
}

interface NotificationEvent {
    id: string;
    message: string;
    type: string;
    createdAt: string | Date;
}

interface AttendanceUpdate {
  technicianId: string;
  jobId: string;
  status: string;
  date: string;
}

interface AccountApproved {
    userId: string;
    role: string;
}

export function useSSE(enabled: boolean = true) {
    const [jobUpdates, setJobUpdates] = useState<JobStatusUpdate | null>(null);
    const [notifications, setNotifications] = useState<NotificationEvent | null>(null);
    const [attendanceUpdates, setAttendanceUpdates] = useState<AttendanceUpdate | null>(null);
    const [accountApproved, setAccountApproved] = useState<AccountApproved | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [fallbackMode, setFallbackMode] = useState(false);

    const eventSourceRef = useRef<EventSource | null>(null);
    const retryCountRef = useRef(0);
    const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const maxRetries = 5; // 1s, 2s, 4s, 8s, 16s, 30s max wait handled differently

    const connect = () => {
        if (!enabled || fallbackMode) return;
        
        // Clean up previous
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
        }

        const sse = new EventSource("/api/sse");
        eventSourceRef.current = sse;

        sse.onopen = () => {
            setIsConnected(true);
            retryCountRef.current = 0; // Reset on successful connection
        };

        sse.addEventListener("job_status_update", (e) => {
            try { setJobUpdates(JSON.parse(e.data)); } catch (err) {}
        });

        sse.addEventListener("notification", (e) => {
            try { setNotifications(JSON.parse(e.data)); } catch (err) {}
        });

        sse.addEventListener("attendance_update", (e) => {
            try { setAttendanceUpdates(JSON.parse(e.data)); } catch (err) {}
        });

        sse.addEventListener("account_approved", (e) => {
            try { setAccountApproved(JSON.parse(e.data)); } catch (err) {}
        });

        sse.addEventListener("ping", () => {
            // Heartbeat, do not trigger re-render
        });

        sse.onerror = () => {
            setIsConnected(false);
            sse.close();

            if (retryCountRef.current >= maxRetries) {
                setFallbackMode(true);
                return;
            }

            // Exponential backoff: 1s, 2s, 4s, 8s, 16s
            const backoffTime = Math.pow(2, retryCountRef.current) * 1000;
            retryCountRef.current += 1;

            retryTimeoutRef.current = setTimeout(() => {
                connect();
            }, backoffTime);
        };
    };

    useEffect(() => {
        connect();

        return () => {
            if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }
        };
    }, [enabled, fallbackMode]);

    return {
        jobUpdates,
        notifications,
        attendanceUpdates,
        accountApproved,
        isConnected,
        fallbackMode
    };
}
