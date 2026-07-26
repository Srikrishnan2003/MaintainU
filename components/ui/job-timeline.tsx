"use client"

import { CheckCircle2, Play, UserPlus, FileText, Clock } from "lucide-react"

export interface JobTimelineProps {
  status: "REQUESTED" | "ASSIGNED" | "IN_PROGRESS" | "COMPLETED" | string;
  createdAt?: string | Date | null;
  assignedAt?: string | Date | null;
  startedAt?: string | Date | null;
  completedAt?: string | Date | null;
  companyName?: string;
  technicianName?: string;
  adminName?: string;
}

export function JobTimeline({
  status,
  createdAt,
  assignedAt,
  startedAt,
  completedAt,
  companyName = "Company",
  technicianName = "Technician",
  adminName = "System Admin" // Assignments usually handled by central admin
}: JobTimelineProps) {

  // Map strict sequence
  const getStatusLevel = (s: string) => {
    switch (s?.toUpperCase()) {
        case "REQUESTED": return 0;
        case "ASSIGNED": return 1;
        case "IN_PROGRESS": return 2;
        case "COMPLETED": return 3;
        default: return -1;
    }
  }

  const currentLevel = getStatusLevel(status);

  const stages = [
    {
      level: 0,
      title: "Request Created",
      icon: FileText,
      actor: companyName,
      time: createdAt,
      activeColor: "bg-blue-500",
      activeText: "text-blue-500",
      activeBg: "bg-blue-500/10",
      borderColor: "border-blue-500/20"
    },
    {
      level: 1,
      title: "Technician Assigned",
      icon: UserPlus,
      actor: adminName,
      time: assignedAt,
      activeColor: "bg-purple-500",
      activeText: "text-purple-500",
      activeBg: "bg-purple-500/10",
      borderColor: "border-purple-500/20"
    },
    {
      level: 2,
      title: "Work In Progress",
      icon: Play,
      actor: technicianName,
      time: startedAt,
      activeColor: "bg-orange-500",
      activeText: "text-orange-500",
      activeBg: "bg-orange-500/10",
      borderColor: "border-orange-500/20"
    },
    {
      level: 3,
      title: "Job Completed",
      icon: CheckCircle2,
      actor: technicianName,
      time: completedAt,
      activeColor: "bg-emerald-500",
      activeText: "text-emerald-500",
      activeBg: "bg-emerald-500/10",
      borderColor: "border-emerald-500/20"
    }
  ];

  const formatTime = (dateVal: string | Date | null | undefined) => {
      if (!dateVal) return null;
      return new Date(dateVal).toLocaleString([], {
          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });
  }

  return (
    <div className="w-full font-sans">
      <h3 className="text-sm font-bold text-foreground/80 uppercase tracking-widest mb-6 px-1">Job Lifecycle</h3>
      
      <div className="relative pl-4 space-y-6">
        {/* Continuous background line */}
        <div className="absolute top-4 bottom-4 left-[2.4rem] w-0.5 bg-border/50 rounded-full" />

        {stages.map((stage, index) => {
          const isCompleted = currentLevel >= stage.level;
          const isCurrent = currentLevel === stage.level;
          const displayTime = formatTime(stage.time);

          return (
            <div key={stage.level} className={`relative flex items-start gap-5 transition-all duration-500 ${isCompleted ? 'opacity-100' : 'opacity-40 grayscale-[50%]'}`}>
              
              {/* Vertical line fill overlay */}
              {isCompleted && index !== stages.length - 1 && (
                  <div className={`absolute top-10 left-[1.4rem] w-0.5 h-[120%] z-0 rounded-full ${stage.activeColor} shadow-[0_0_8px_rgba(0,0,0,0.2)] shadow-${stage.activeColor.replace('bg-', '')}`} />
              )}

              {/* Icon Container */}
              <div className={`relative z-10 w-12 h-12 rounded-[1rem] flex items-center justify-center flex-shrink-0 transition-transform duration-300 ${isCurrent ? 'scale-110 shadow-lg ring-4 ring-background' : ''} ${
                  isCompleted ? `${stage.activeColor} text-white shadow-md` : 'bg-muted border border-border/50 text-muted-foreground'
              }`}>
                <stage.icon className="w-5 h-5" strokeWidth={isCompleted ? 2.5 : 2} />
              </div>

              {/* Content Panel */}
              <div className={`flex-1 pt-0.5 pb-2 border-b border-border/40 last:border-0 ${isCurrent ? 'animate-pulse-slow' : ''}`}>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1">
                    <div>
                        <h4 className={`text-sm font-black tracking-wide ${isCompleted ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {stage.title}
                        </h4>
                        
                        {/* Actor Badge */}
                        <div className="flex items-center gap-1.5 mt-1.5">
                            <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest">BY</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${
                                isCompleted ? `${stage.activeBg} ${stage.activeText} ${stage.borderColor}` : 'bg-muted text-muted-foreground border-border/50'
                            }`}>
                                {isCompleted && (!stage.actor || stage.actor.trim() === "") ? 
                                    (stage.level === 0 ? "Company" : stage.level === 1 ? "Admin" : "Technician") 
                                    : stage.actor}
                            </span>
                        </div>
                    </div>

                    {/* Timestamp */}
                    <div className="flex items-center gap-1.5 mt-2 sm:mt-0 text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-muted/30 px-2.5 py-1 rounded-md border border-border/30">
                        <Clock className="w-3 h-3 opacity-60" />
                        {displayTime ? (
                            <span>{displayTime}</span>
                        ) : (
                            <span>{isCompleted ? 'Time Unknown' : 'Pending'}</span>
                        )}
                    </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes pulseSlow {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.85; }
        }
        .animate-pulse-slow {
            animation: pulseSlow 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}}/>
    </div>
  )
}
