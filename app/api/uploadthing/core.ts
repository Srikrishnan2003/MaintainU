import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/jwt";

const f = createUploadthing();

const authMiddleware = async ({ req }: { req: Request }) => {
    // 1. Try NextRequest cookies method if available
    let token = (req as any).cookies?.get?.("session_token")?.value;

    // 2. Fallback to standard Request cookie header parsing
    if (!token) {
        const cookieHeader = req.headers.get("cookie");
        if (cookieHeader) {
            const cookiesObj = cookieHeader.split("; ").reduce((acc, current) => {
                const [name, ...value] = current.split("=");
                acc[name] = value.join("=");
                return acc;
            }, {} as Record<string, string>);
            token = cookiesObj["session_token"];
        }
    }

    // 3. Fallback to next/headers cookies()
    if (!token) {
        try {
            const cookieStore = await cookies();
            token = cookieStore.get("session_token")?.value;
        } catch (e) {
            // ignore
        }
    }
    
    if (!token) throw new UploadThingError("Unauthorized");
    
    const payload = await verifyToken(token);
    if (!payload || !payload.userId) throw new UploadThingError("Invalid token");
    
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
