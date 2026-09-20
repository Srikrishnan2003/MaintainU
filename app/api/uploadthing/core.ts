import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/jwt";
import { z } from "zod";

const f = createUploadthing();

const authMiddleware = async ({ req, sessionToken }: { req: Request, sessionToken?: string | null }) => {
    let token = sessionToken || null;

    // 0. Try Authorization header first (fallback)
    if (!token) {
        const authHeader = req.headers.get("authorization");
        if (authHeader && authHeader.startsWith("Bearer ")) {
            token = authHeader.replace("Bearer ", "");
        }
    }

    // 1. Try Next.js dynamic cookies() first
    if (!token) {
        try {
            const cookieStore = await cookies();
            token = cookieStore.get("session_token")?.value || null;
        } catch (e) {
            console.warn("Next.js cookies() failed in UploadThing context, falling back to manual header parsing", e);
        }
    }

    // 2. Fallback to manual parsing from the raw Request headers
    if (!token) {
        const cookieHeader = req.headers.get("cookie");
        if (cookieHeader) {
            const match = cookieHeader.match(/session_token=([^;]+)/);
            if (match) token = match[1];
        }
    }
    
    if (!token) {
        console.error("UploadThing Auth Error: No token found. Cookies present:", req.headers.get("cookie") ? "Yes" : "No");
        throw new UploadThingError({ code: "FORBIDDEN", message: "Unauthorized: Missing session token" });
    }
    
    const payload = await verifyToken(token);
    if (!payload || !payload.userId) {
        console.error("UploadThing Auth Error: Invalid token");
        throw new UploadThingError({ code: "FORBIDDEN", message: "Unauthorized: Invalid session token" });
    }
    
    return { userId: payload.userId, role: payload.role };
};

export const ourFileRouter = {
  jobPhoto: f({ image: { maxFileSize: "4MB", maxFileCount: 5 } })
    .input(z.object({ session_token: z.string().optional() }))
    .middleware(async ({ req, input }) => {
        const metadata = await authMiddleware({ req, sessionToken: input?.session_token });
        if (metadata.role !== "technician" && metadata.role !== "admin") throw new UploadThingError("Unauthorized role");
        return metadata;
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Upload complete for userId:", metadata.userId);
      console.log("file url", file.url);
      return { url: file.url, name: file.name };
    }),

  requestAttachment: f({ 
        image: { maxFileSize: "8MB", maxFileCount: 3 },
        pdf: { maxFileSize: "8MB", maxFileCount: 3 }
    })
    .input(z.object({ session_token: z.string().optional() }))
    .middleware(async ({ req, input }) => {
        const metadata = await authMiddleware({ req, sessionToken: input?.session_token });
        if (metadata.role !== "company" && metadata.role !== "admin") throw new UploadThingError("Unauthorized role");
        return metadata;
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Upload complete for userId:", metadata.userId);
      console.log("file url", file.url);
      return { url: file.url, name: file.name };
    }),

  technicianDocs: f({ 
        blob: { maxFileSize: "8MB", maxFileCount: 1 }
    })
    .input(z.object({ session_token: z.string().optional(), isSignup: z.boolean().optional() }))
    .middleware(async ({ req, input }) => {
        if (input?.isSignup) {
            return { userId: "anonymous-signup", role: "signup" };
        }
        const metadata = await authMiddleware({ req, sessionToken: input?.session_token });
        if (metadata.role !== "technician" && metadata.role !== "admin") throw new UploadThingError("Unauthorized role");
        return metadata;
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Upload complete for userId:", metadata.userId);
      console.log("file url", file.url);
      return { url: file.url, name: file.name };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
