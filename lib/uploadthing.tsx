"use client";

import { useEffect, useState } from "react";
import {
  generateUploadButton,
  generateUploadDropzone,
  generateReactHelpers,
} from "@uploadthing/react";
import type { OurFileRouter } from "@/app/api/uploadthing/core";
import { getSessionTokenAction } from "@/actions/auth.action";

const BaseUploadButton = generateUploadButton<OurFileRouter>();
const BaseUploadDropzone = generateUploadDropzone<OurFileRouter>();
export const { useUploadThing, uploadFiles } = generateReactHelpers<OurFileRouter>();

export function UploadButton(props: React.ComponentProps<typeof BaseUploadButton>) {
    const [token, setToken] = useState<string | null>(null);
    useEffect(() => { getSessionTokenAction().then(setToken); }, []);
    
    if (!token) return <div className="animate-pulse w-full h-10 bg-muted rounded-xl" />;
    
    return <BaseUploadButton {...props} input={{ session_token: token }} />;
}

export function UploadDropzone(props: React.ComponentProps<typeof BaseUploadDropzone>) {
    const [token, setToken] = useState<string | null>(null);
    useEffect(() => { getSessionTokenAction().then(setToken); }, []);
    
    if (!token) return <div className="animate-pulse w-full h-40 bg-muted rounded-xl" />;
    
    return <BaseUploadDropzone {...props} input={{ session_token: token }} />;
}
