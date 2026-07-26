import { SignJWT, jwtVerify, type JWTPayload } from "jose";

export interface SessionPayload extends JWTPayload {
    userId: string;
    role: string;
    status?: string;
    phone?: string;
}

// ─── Edge-compatible secret ─────────────────────────────────────────
function getSecret(): Uint8Array {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error("JWT_SECRET is not defined in environment variables");
    }
    return new TextEncoder().encode(secret);
}

// ─── Token Generation & Validation ──────────────────────────────────

export async function signToken(payload: SessionPayload, expiresDays: number): Promise<string> {
    return await new SignJWT(payload)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime(`${expiresDays}d`)
        .sign(getSecret());
}

export async function verifyToken(token: string): Promise<SessionPayload | null> {
    try {
        const { payload } = await jwtVerify(token, getSecret());
        return payload as SessionPayload;
    } catch {
        return null;
    }
}
