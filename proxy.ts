import { authenticateRequest } from "@/middleware/auth.middleware";
import type { NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
    // ── Delegate all structural checks to the controller layer ──
    return await authenticateRequest(request);
}

export const config = {
  matcher: [
    '/((?!api/sse|_next/static|_next/image|favicon.ico).*)',
  ],
};
