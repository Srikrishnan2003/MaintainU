import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/jwt";

const f = createUploadthing();

const authMiddleware = async ({ req }: { req: Request }) => {
    let token = null;

    // 1. Try Next.js dynamic cookies() first
    try {
        const cookieStore = await cookies();
        token = cookieStore.get("session_token")?.value;
    } catch (e) {
        console.warn("Next.js cookies() failed in UploadThing context, falling back to manual header parsing", e);
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
    .middleware(async (req) => {
        const metadata = await authMiddleware(req);
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
    .middleware(async (req) => {
        const metadata = await authMiddleware(req);
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
    .middleware(async (req) => {
        const metadata = await authMiddleware(req);
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
