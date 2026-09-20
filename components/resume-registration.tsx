"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Play, RotateCcw, AlertCircle, Phone, User } from "lucide-react"

export function ResumeRegistration() {
  const router = useRouter();
  const [savedData, setSavedData] = useState<{ role: string; name: string; phone: string; step: string } | null>(null);
  const [isResuming, setIsResuming] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const role = localStorage.getItem("signup_role");
      const step = localStorage.getItem("signup_step");
      const dataRaw = localStorage.getItem("signup_formData");
      
      if (role && step && step !== "approved" && dataRaw) {
        try {
          const data = JSON.parse(dataRaw);
          setSavedData({
            role,
            step,
            name: data.name || data.companyName || "Unfinished Profile",
            phone: data.phone || "No phone provided",
          });
        } catch (e) {
          // Ignore parse errors
        }
      }
    }
  }, []);

  if (!savedData) return null;

  const handleResume = () => {
    setIsResuming(true);
    router.push(`/signup?role=${savedData.role}`);
  };

  const handleStartFresh = () => {
    localStorage.removeItem("signup_role");
    localStorage.removeItem("signup_step");
    localStorage.removeItem("signup_formData");
    setSavedData(null);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-sm bg-card border border-border shadow-2xl rounded-3xl p-6 sm:p-8 animate-in zoom-in-95 slide-in-from-bottom-4 duration-500">
        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-6">
          <AlertCircle className="w-6 h-6 text-primary" />
        </div>
        
        <h2 className="text-xl font-bold tracking-tight mb-2">Unfinished Registration</h2>
        <p className="text-sm text-muted-foreground mb-6">
          We noticed you were in the middle of registering as a <strong>{savedData.role}</strong>. Would you like to pick up where you left off?
        </p>
        
        <div className="bg-muted/50 rounded-xl p-4 mb-8 space-y-3">
          <div className="flex items-center gap-3 text-sm font-medium">
            <User className="w-4 h-4 text-muted-foreground" />
            <span className="truncate">{savedData.name}</span>
          </div>
          <div className="flex items-center gap-3 text-sm font-medium">
            <Phone className="w-4 h-4 text-muted-foreground" />
            <span>{savedData.phone}</span>
          </div>
        </div>

        <div className="space-y-3">
          <button 
            onClick={handleResume}
            disabled={isResuming}
            className="w-full py-4 rounded-xl bg-primary text-white font-bold flex items-center justify-center gap-2 hover:bg-primary/90 transition-all shadow-md active:scale-[0.98]"
          >
            {isResuming ? (
              <span className="animate-pulse">Loading...</span>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                Resume Registration
              </>
            )}
          </button>
          
          <button 
            onClick={handleStartFresh}
            disabled={isResuming}
            className="w-full py-4 rounded-xl border border-border bg-card font-bold flex items-center justify-center gap-2 hover:bg-muted/50 transition-all active:scale-[0.98]"
          >
            <RotateCcw className="w-4 h-4" />
            Start from Scratch
          </button>
        </div>
      </div>
    </div>
  );
}
