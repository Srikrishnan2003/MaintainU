import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/jwt";

const f = createUploadthing();

const authMiddleware = async ({ req }: { req: Request }) => {
    // 1. Try NextRequest cookies method if available
    let token = (req as any).cookies?.get?.("session_token")?.value;

    // 2. Fallback to next/headers cookies()
    if (!token) {
        try {
            const cookieStore = await cookies();
            token = cookieStore.get("session_token")?.value;
        } catch (e) {
            // ignore
        }
    }
    
    if (!token) {
        console.error("UploadThing Auth Error: No token found");
        throw new UploadThingError({ code: "UNAUTHORIZED", message: "Unauthorized: Missing session token" });
    }
    
    const payload = await verifyToken(token);
    if (!payload || !payload.userId) {
        console.error("UploadThing Auth Error: Invalid token");
        throw new UploadThingError({ code: "UNAUTHORIZED", message: "Unauthorized: Invalid session token" });
    }
    
    return { userId: payload.userId, role: payload.role };
};

export const ourFileRouter = {
  jobPhoto: f({ image: { maxFileSize: "4MB", maxFileCount: 5 } })
    .middleware(authMiddleware)
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Upload complete for userId:", metadata.userId);
      console.log("file url", file.url);
      return { url: file.url, name: file.name };
    }),

  requestAttachment: f({ 
        image: { maxFileSize: "8MB", maxFileCount: 3 },
        pdf: { maxFileSize: "8MB", maxFileCount: 3 }
    })
    .middleware(authMiddleware)
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Upload complete for userId:", metadata.userId);
      console.log("file url", file.url);
      return { url: file.url, name: file.name };
    }),

  technicianDocs: f({ 
        blob: { maxFileSize: "8MB", maxFileCount: 1 }
    })
    .middleware(authMiddleware)
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Upload complete for userId:", metadata.userId);
      console.log("file url", file.url);
      return { url: file.url, name: file.name };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
