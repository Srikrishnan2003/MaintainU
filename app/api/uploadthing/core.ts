import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/jwt";

const f = createUploadthing();

const authMiddleware = async () => {
    const cookieStore = await cookies();
    const token = cookieStore.get("session_token")?.value;
    
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
        image: { maxFileSize: "4MB", maxFileCount: 1 },
        pdf: { maxFileSize: "4MB", maxFileCount: 1 }
    })
    .middleware(authMiddleware)
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Upload complete for userId:", metadata.userId);
      console.log("file url", file.url);
      return { url: file.url, name: file.name };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
