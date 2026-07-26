import { cookies } from "next/headers";
import { SessionPayload, signToken, verifyToken } from "@/lib/jwt";

// ─── Constants ──────────────────────────────────────────────────────
const COOKIE_NAME = "session_token";
const ADMIN_COOKIE_NAME = "admin_session";
const SESSION_EXPIRY_DAYS = 7;

// ─── createSession ──────────────────────────────────────────────────
export async function createSession(user: {
    id: string;
    role: string;
    status?: string;
    phone?: string;
}): Promise<void> {
    const payload: SessionPayload = {
        userId: user.id,
        role: user.role,
        ...(user.status && { status: user.status }),
        ...(user.phone && { phone: user.phone }),
    };

    const token = await signToken(payload, SESSION_EXPIRY_DAYS);

    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: SESSION_EXPIRY_DAYS * 24 * 60 * 60, // seconds
    });

    // If admin, also set the admin flag cookie
    if (user.role === "admin") {
        cookieStore.set(ADMIN_COOKIE_NAME, "true", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: SESSION_EXPIRY_DAYS * 24 * 60 * 60,
        });
    }
}

// ─── getSession ─────────────────────────────────────────────────────
export async function getSession(): Promise<SessionPayload | null> {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get(COOKIE_NAME)?.value;

        if (!token) return null;

        return await verifyToken(token);
    } catch {
        return null;
    }
}

// ─── getCurrentUser ─────────────────────────────────────────────────
export async function getCurrentUser(): Promise<SessionPayload> {
    const session = await getSession();
    if (!session) {
        throw new Error("Unauthorized: No valid session");
    }
    return session;
}

// ─── destroySession ─────────────────────────────────────────────────
export async function destroySession(): Promise<void> {
    const cookieStore = await cookies();
    cookieStore.delete(COOKIE_NAME);
    cookieStore.delete(ADMIN_COOKIE_NAME);
}

// ─── verifySessionToken ─────────────────────────────────────────────
export { verifyToken as verifySessionToken } from "@/lib/jwt";

// ─── Protected Server Action Helpers ────────────────────────────────
export async function requireAuth(): Promise<SessionPayload> {
    const user = await getCurrentUser();
    if (!user) {
        throw new Error("Unauthorized");
    }
    return user;
}

export async function requireRole(role: string | string[]): Promise<SessionPayload> {
    const user = await requireAuth();
    const roles = Array.isArray(role) ? role : [role];
    if (!roles.includes(user.role)) {
        throw new Error("Forbidden: Insufficient role");
    }
    return user;
}
