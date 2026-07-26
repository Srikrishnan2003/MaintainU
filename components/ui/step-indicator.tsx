"use client"

import { CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface StepIndicatorProps {
  currentStatus: string
  className?: string
}

const steps = [
  { id: '1', label: 'Assigned', statuses: ['Assigned', 'Declined', 'Pending_Assign', 'Team_Forming'] },
  { id: '2', label: 'Accepted', statuses: ['Accepted', 'Team_Confirmed'] },
  { id: '3', label: 'In Progress', statuses: ['In_Progress', 'In Progress', 'On_Hold', 'Failed', 'On_The_Way', 'Arrived', 'In_Zone', 'Exited_Zone', 'Work_Started'] },
  { id: '4', label: 'Completed', statuses: ['Completed', 'Work_Completed', 'Sign_Pending', 'Invoiced', 'Paid'] },
]

export function StepIndicator({ currentStatus, className }: StepIndicatorProps) {
  const currentIndex = steps.findIndex(step => step.statuses.includes(currentStatus))
  const displayIndex = currentIndex === -1 ? 0 : currentIndex

  return (
    <div className={cn("flex items-center justify-between w-full px-4 py-2", className)}>
      {steps.map((step, index) => {
        const isCompleted = displayIndex > index || ['Completed', 'Work_Completed', 'Invoiced', 'Paid'].includes(currentStatus)
        const isCurrent = displayIndex === index
        
        return (
          <div key={step.id} className="flex flex-col items-center gap-2 flex-1 relative">
            {/* Line connecting steps */}
            {index < steps.length - 1 && (
              <div className={cn(
                "absolute top-[14px] left-[50%] w-full h-[2px] z-0",
                displayIndex > index ? "bg-primary" : "bg-muted"
              )} />
            )}
            
            <div className={cn(
              "w-8 h-8 rounded-full border-2 flex items-center justify-center z-10 transition-all duration-500",
              isCompleted ? "bg-primary border-primary" : 
              isCurrent ? "bg-background border-primary shadow-[0_0_10px_rgba(var(--primary),0.3)]" : 
              "bg-background border-muted"
            )}>
              {isCompleted ? (
                <CheckCircle2 className="w-5 h-5 text-white" />
              ) : (
                <span className={cn(
                  "text-[10px] font-black",
                  isCurrent ? "text-primary" : "text-muted-foreground"
                )}>
                  {step.id}
                </span>
              )}
            </div>
            
            <span className={cn(
              "text-[8px] font-black uppercase tracking-widest text-center transition-colors duration-300",
              isCurrent ? "text-primary scale-105" : "text-muted-foreground/60"
            )}>
              {step.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}
