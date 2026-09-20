"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

export function ResumeRegistration() {
  const router = useRouter();
  const [resuming, setResuming] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedRole = localStorage.getItem("signup_role");
      const savedStep = localStorage.getItem("signup_step");
      if (savedRole && savedStep && savedStep !== "approved") {
        setResuming(true);
        router.push(`/signup?role=${savedRole}`);
      }
    }
  }, [router]);

  if (!resuming) return null;
  return (
    <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
      <p className="text-sm font-bold text-muted-foreground animate-pulse">Resuming registration...</p>
    </div>
  );
}
