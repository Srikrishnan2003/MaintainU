"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Play, RotateCcw, AlertCircle, Phone, User, Briefcase, Wrench, Building2, MapPin, Mail, FileText } from "lucide-react"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"

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
      <div className="w-full max-w-[400px] bg-card border border-border shadow-2xl rounded-3xl p-6 sm:p-8 animate-in zoom-in-95 slide-in-from-bottom-4 duration-500 overflow-hidden flex flex-col">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center shrink-0">
            <AlertCircle className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight leading-tight">Unfinished Registration</h2>
            <p className="text-xs text-muted-foreground">Resume your progress</p>
          </div>
        </div>
        
        {/* Carousel Container */}
        <div className="relative mb-6">
          <Carousel opts={{ align: "center" }} className="w-full">
            <CarouselContent>
              {/* Slide 1: Basic Details */}
              <CarouselItem>
                <div className="bg-muted/40 border border-muted rounded-2xl p-5 h-full">
                  <h3 className="text-[10px] font-bold text-primary uppercase tracking-wider mb-4">Step 1: {isTech ? "Personal" : "Company"}</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-sm font-medium">
                      {isTech ? <User className="w-4 h-4 text-muted-foreground" /> : <Building2 className="w-4 h-4 text-muted-foreground" />}
                      <span className="truncate">{data.name || data.companyName || "Not provided"}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm font-medium">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span>{data.phone || "Not provided"}</span>
                    </div>
                    {data.email && (
                      <div className="flex items-center gap-3 text-sm font-medium">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <span className="truncate">{data.email}</span>
                      </div>
                    )}
                    {data.address && (
                      <div className="flex items-start gap-3 text-sm font-medium">
                        <MapPin className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                        <span className="line-clamp-2 text-xs leading-relaxed">{data.address}</span>
                      </div>
                    )}
                  </div>
                </div>
              </CarouselItem>

              {/* Slide 2: Professional / Contact */}
              {(savedData.step !== "details-tech-1" && savedData.step !== "details-comp-1") && (
                <CarouselItem>
                  <div className="bg-muted/40 border border-muted rounded-2xl p-5 h-full">
                    <h3 className="text-[10px] font-bold text-primary uppercase tracking-wider mb-4">Step 2: {isTech ? "Professional" : "Contact"}</h3>
                    <div className="space-y-3">
                      {isTech ? (
                        <>
                          <div className="flex items-center gap-3 text-sm font-medium">
                            <Briefcase className="w-4 h-4 text-muted-foreground" />
                            <span>{data.experienceLevel || "Level not set"}</span>
                          </div>
                          <div className="flex items-center gap-3 text-sm font-medium">
                            <Wrench className="w-4 h-4 text-muted-foreground" />
                            <span>{data.primarySkill || "Trade not set"}</span>
                          </div>
                          {data.skills?.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-3">
                              {data.skills.slice(0, 3).map((s: string) => (
                                <span key={s} className="text-[10px] px-2 py-1 bg-background rounded-md border">{s}</span>
                              ))}
                              {data.skills.length > 3 && <span className="text-[10px] px-1.5 py-1 text-muted-foreground">+{data.skills.length - 3}</span>}
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-3 text-sm font-medium">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <span className="truncate">{data.contactName || "Contact not set"}</span>
                          </div>
                          <div className="flex items-center gap-3 text-sm font-medium">
                            <Phone className="w-4 h-4 text-muted-foreground" />
                            <span>{data.contactPhone || "Phone not set"}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </CarouselItem>
              )}

              {/* Slide 3: Docs (Tech only) */}
              {isTech && savedData.step === "verify-required" && (
                <CarouselItem>
                  <div className="bg-muted/40 border border-muted rounded-2xl p-5 h-full flex flex-col justify-center items-center">
                    <FileText className="w-10 h-10 text-green-500 mb-3 opacity-80" />
                    <span className="text-sm font-bold">Documents Uploaded</span>
                  </div>
                </CarouselItem>
              )}
            </CarouselContent>
            {/* The carousel navigation buttons are hidden on small screens and absolutely positioned */}
            <div className="hidden sm:block">
              <CarouselPrevious className="-left-4 top-1/2 -translate-y-1/2 bg-background shadow-md border-border" />
              <CarouselNext className="-right-4 top-1/2 -translate-y-1/2 bg-background shadow-md border-border" />
            </div>
          </Carousel>
        </div>

        <div className="space-y-3 mt-auto">
          <button 
            onClick={handleResume}
            disabled={isResuming}
            className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-bold flex items-center justify-center gap-2 hover:bg-primary/90 transition-all shadow-md active:scale-[0.98]"
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
