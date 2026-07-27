import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken, SessionPayload } from "@/lib/jwt";

export async function authenticateRequest(request: NextRequest) {
    const { pathname } = request.nextUrl;
    
    // Abstract the Session verification securely utilizing Modular imports
    const sessionToken = request.cookies.get("session_token")?.value;
    let session: SessionPayload | null = null;
    let tokenInvalid = false;
    
    if (sessionToken) {
        session = await verifyToken(sessionToken);
        if (!session) {
           tokenInvalid = true; 
        }
    }
    
    const adminSessionFlag = request.cookies.get("admin_session");

    // ── 1. Cross-Role Hard URL Isolation for Authenticated Users ──
    if (session) {
        const isRolePath = (path: string, prefix: string) => path === prefix || path.startsWith(`${prefix}/`);

        // Always allow access to login screens so users are never trapped by existing or old session cookies
        if (pathname === '/admin-login' || pathname === '/company/login' || pathname === '/technician/login' || pathname === '/login') {
            return NextResponse.next();
        }

        if (session.role === 'technician' && isRolePath(pathname, '/admin')) {
            return NextResponse.redirect(new URL('/', request.url));
        }
        if (session.role === 'technician' && isRolePath(pathname, '/company')) {
            return NextResponse.redirect(new URL('/', request.url));
        }
        if (session.role === 'company' && isRolePath(pathname, '/admin')) {
            return NextResponse.redirect(new URL('/', request.url));
        }
        if (session.role === 'company' && isRolePath(pathname, '/technician')) {
            return NextResponse.redirect(new URL('/', request.url));
        }
        if (session.role === 'admin' && isRolePath(pathname, '/company')) {
            return NextResponse.redirect(new URL('/', request.url));
        }
        if (session.role === 'admin' && isRolePath(pathname, '/technician')) {
            return NextResponse.redirect(new URL('/', request.url));
        }

        // Status-Based Access Control
        const status = session.status;
        
        if (status === "REJECTED") {
            const response = NextResponse.redirect(new URL("/login", request.url));
            response.cookies.delete("session_token");
            return response;
        }

        if (session.role === "technician") {
            if (status === "PENDING_PROFILE" && pathname !== "/technician/onboarding") {
                return NextResponse.redirect(new URL("/technician/onboarding", request.url));
            }
            if (status === "PENDING_APPROVAL" && pathname !== "/technician/pending") {
                return NextResponse.redirect(new URL("/technician/pending", request.url));
            }
            if (status === "ACTIVE") {
                if (pathname === "/technician/onboarding" || pathname === "/technician/pending" || pathname === "/onboarding" || pathname === "/") {
                    return NextResponse.redirect(new URL("/technician/dashboard", request.url));
                }
            }
        }

        if (session.role === "company") {
            if (status === "PENDING_PROFILE" && pathname !== "/company/onboarding") {
                return NextResponse.redirect(new URL("/company/onboarding", request.url));
            }
            if (status === "ACTIVE") {
                if (pathname === "/company/onboarding" || pathname === "/onboarding" || pathname === "/") {
                    return NextResponse.redirect(new URL("/company/dashboard", request.url));
                }
            }
        }

        if (session.role === "admin") {
            if (pathname === "/onboarding" || pathname === "/") {
                return NextResponse.redirect(new URL("/admin/dashboard", request.url));
            }
        }
    }

    // ── 2. Admin Route Protection (for Admin Role or Unauthenticated) ──
    if (pathname.startsWith("/admin") && pathname !== "/admin-login") {
        const isValidAdmin = !!session && session.role === "admin" && !!adminSessionFlag;

        if (pathname === "/admin") {
            if (isValidAdmin) {
                return NextResponse.redirect(new URL("/admin/dashboard", request.url));
            } else {
                const res = NextResponse.redirect(new URL("/admin-login", request.url));
                if (tokenInvalid) {
                    res.cookies.delete("session_token");
                    res.cookies.delete("admin_session");
                }
                return res;
            }
        }

        if (!isValidAdmin) {
            const res = NextResponse.redirect(new URL("/admin-login", request.url));
            if (tokenInvalid) {
                res.cookies.delete("session_token");
                res.cookies.delete("admin_session");
            }
            return res;
        }
    }

    // ── 3. Unauthenticated Access Protection ──
    const isRegisterScreen = pathname.startsWith("/register");

    if (!session) {
        if (tokenInvalid) {
            if (pathname === "/company/login" || pathname === "/technician/login" || pathname === "/admin-login" || pathname === "/login") {
                const clearRes = NextResponse.next();
                clearRes.cookies.delete("session_token");
                clearRes.cookies.delete("admin_session");
                return clearRes;
            }

            const response = NextResponse.redirect(new URL("/login", request.url));
            response.cookies.delete("session_token");
            response.cookies.delete("admin_session");

            if (pathname.startsWith("/company") && pathname !== "/company/login") {
                return NextResponse.redirect(new URL("/company/login", request.url));
            }
            if (pathname.startsWith("/technician") && pathname !== "/technician/login") {
                return NextResponse.redirect(new URL("/technician/login", request.url));
            }
            if (isRegisterScreen) {
                return response;
            }
        } else {
            // Allow public access to role login screens when unauthenticated
            if (pathname === "/company/login" || pathname === "/technician/login" || pathname === "/admin-login" || pathname === "/login") {
                return NextResponse.next();
            }

            if (pathname.startsWith("/company")) {
                return NextResponse.redirect(new URL("/company/login", request.url));
            }
            if (pathname.startsWith("/technician")) {
                return NextResponse.redirect(new URL("/technician/login", request.url));
            }
            if (isRegisterScreen) {
                return NextResponse.redirect(new URL("/login", request.url));
            }
        }
    }

    return NextResponse.next();
}
