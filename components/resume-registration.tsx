"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Play, RotateCcw, AlertCircle, Phone, User, Briefcase, Wrench, Building2, MapPin, Mail, FileText } from "lucide-react"

export function ResumeRegistration() {
  const router = useRouter();
  const [savedData, setSavedData] = useState<{ role: string; step: string; raw: any } | null>(null);
  const [isResuming, setIsResuming] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const role = localStorage.getItem("signup_role");
      const step = localStorage.getItem("signup_step");
      const dataRaw = localStorage.getItem("signup_formData");
      
      if (role && step && step !== "approved" && dataRaw) {
        try {
          const data = JSON.parse(dataRaw);
          setSavedData({ role, step, raw: data });
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

  const data = savedData.raw;
  const isTech = savedData.role === "technician";

  return (
    <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-sm bg-card border border-border shadow-2xl rounded-3xl p-6 sm:p-8 animate-in zoom-in-95 slide-in-from-bottom-4 duration-500 overflow-hidden flex flex-col">
        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-6">
          <AlertCircle className="w-6 h-6 text-primary" />
        </div>
        
        <h2 className="text-xl font-bold tracking-tight mb-2">Unfinished Registration</h2>
        <p className="text-sm text-muted-foreground mb-4">
          We noticed you were in the middle of registering. Swipe to review your saved progress:
        </p>
        
        {/* Carousel Container */}
        <div className="flex overflow-x-auto snap-x snap-mandatory gap-3 pb-4 mb-4 -mx-2 px-2 hidden-scrollbar" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          
          {/* Slide 1: Basic Details */}
          <div className="min-w-[85%] snap-center bg-muted/40 border border-muted rounded-2xl p-4 flex-shrink-0">
            <h3 className="text-[10px] font-bold text-primary uppercase tracking-wider mb-3">Step 1: {isTech ? "Personal" : "Company"}</h3>
            <div className="space-y-2.5">
              <div className="flex items-center gap-2.5 text-sm font-medium">
                {isTech ? <User className="w-4 h-4 text-muted-foreground" /> : <Building2 className="w-4 h-4 text-muted-foreground" />}
                <span className="truncate">{data.name || data.companyName || "Not provided"}</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm font-medium">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span>{data.phone || "Not provided"}</span>
              </div>
              {data.email && (
                <div className="flex items-center gap-2.5 text-sm font-medium">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span className="truncate">{data.email}</span>
                </div>
              )}
              {data.address && (
                <div className="flex items-start gap-2.5 text-sm font-medium">
                  <MapPin className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                  <span className="line-clamp-2 text-xs leading-relaxed">{data.address}</span>
                </div>
              )}
            </div>
          </div>

          {/* Slide 2: Professional / Contact */}
          {(savedData.step !== "details-tech-1" && savedData.step !== "details-comp-1") && (
            <div className="min-w-[85%] snap-center bg-muted/40 border border-muted rounded-2xl p-4 flex-shrink-0">
              <h3 className="text-[10px] font-bold text-primary uppercase tracking-wider mb-3">Step 2: {isTech ? "Professional" : "Contact"}</h3>
              <div className="space-y-2.5">
                {isTech ? (
                  <>
                    <div className="flex items-center gap-2.5 text-sm font-medium">
                      <Briefcase className="w-4 h-4 text-muted-foreground" />
                      <span>{data.experienceLevel || "Level not set"}</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-sm font-medium">
                      <Wrench className="w-4 h-4 text-muted-foreground" />
                      <span>{data.primarySkill || "Trade not set"}</span>
                    </div>
                    {data.skills?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {data.skills.slice(0, 3).map((s: string) => (
                          <span key={s} className="text-[9px] px-2 py-0.5 bg-background rounded-full border">{s}</span>
                        ))}
                        {data.skills.length > 3 && <span className="text-[9px] px-1 py-0.5 text-muted-foreground">+{data.skills.length - 3}</span>}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2.5 text-sm font-medium">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span className="truncate">{data.contactName || "Contact not set"}</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-sm font-medium">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span>{data.contactPhone || "Phone not set"}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Slide 3: Docs (Tech only) */}
          {isTech && savedData.step === "verify-required" && (
            <div className="min-w-[85%] snap-center bg-muted/40 border border-muted rounded-2xl p-4 flex-shrink-0">
              <h3 className="text-[10px] font-bold text-primary uppercase tracking-wider mb-3">Step 3: Documents</h3>
              <div className="space-y-2.5">
                <div className="flex items-center gap-2.5 text-sm font-medium">
                  <FileText className="w-4 h-4 text-green-500" />
                  <span>Documents Uploaded</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-3 mt-auto">
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
      <style dangerouslySetInnerHTML={{__html: `
        .hidden-scrollbar::-webkit-scrollbar { display: none; }
      `}} />
    </div>
  );
}
