import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/jwt";
import { eventEmitter } from "@/lib/event-emitter";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    const token = req.cookies.get("session_token")?.value;
    if (!token) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload || !payload.userId) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const userId = payload.userId;
    let isConnected = true;

    const stream = new ReadableStream({
        start(controller) {
            const encoder = new TextEncoder();
            
            const sendEvent = (event: string, data: unknown) => {
                if (!isConnected) return;
                const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
                controller.enqueue(encoder.encode(message));
            };

            // Heartbeat
            const heartbeatInterval = setInterval(() => {
                sendEvent("ping", { time: new Date().toISOString() });
            }, 20000);

            // Listeners
            const onJobStatusUpdate = (data: unknown) => sendEvent("job_status_update", data);
            const onNotification = (data: unknown) => sendEvent("notification", data);
            const onAttendanceUpdate = (data: unknown) => sendEvent("attendance_update", data);
            const onAccountApproved = (data: unknown) => sendEvent("account_approved", data);

            // Subscribe
            eventEmitter.on('job_status_update', onJobStatusUpdate);
            eventEmitter.on(`notification:${userId}`, onNotification);
            eventEmitter.on('attendance_update', onAttendanceUpdate);
            eventEmitter.on(`account_approved:${userId}`, onAccountApproved);

            // Handle cleanup
            req.signal.addEventListener("abort", () => {
                isConnected = false;
                clearInterval(heartbeatInterval);
                eventEmitter.off('job_status_update', onJobStatusUpdate);
                eventEmitter.off(`notification:${userId}`, onNotification);
                eventEmitter.off('attendance_update', onAttendanceUpdate);
                eventEmitter.off(`account_approved:${userId}`, onAccountApproved);
                try { controller.close(); } catch (e) {}
            });
        }
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no" // Important for Nginx/Vercel
        }
    });
}
