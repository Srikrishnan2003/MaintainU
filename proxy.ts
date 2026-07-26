import { authenticateRequest } from "@/middleware/auth.middleware";
import type { NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
    // ── Delegate all structural checks to the controller layer ──
    return await authenticateRequest(request);
}

export const config = {
    matcher: [
        "/admin", "/admin/:path*",
        "/company", "/company/:path*",
        "/technician", "/technician/:path*",
        "/company/login",
        "/technician/login",
        "/admin-login",
        "/onboarding/pending",
        "/register/:path*"
    ],
};
