"use client"

import { cn } from "@/lib/utils"

interface JobStatusBadgeProps {
  status: string
  className?: string
}

const statusConfig: Record<string, { label: string, color: string, border: string }> = {
  "Requested": { label: "Requested", color: "bg-blue-500/10 text-blue-600", border: "border-blue-500/20" },
  "Reviewing": { label: "Reviewing", color: "bg-purple-500/10 text-purple-600", border: "border-purple-500/20" },
  "Pending_Assign": { label: "Ready to Assign", color: "bg-indigo-500/10 text-indigo-600", border: "border-indigo-500/20" },
  "Assigned": { label: "Assigned", color: "bg-indigo-600 text-white", border: "border-indigo-600" },
  "Accepted": { label: "Accepted", color: "bg-green-500/10 text-green-600", border: "border-green-500/20" },
  "Declined": { label: "Declined", color: "bg-red-500/10 text-red-600", border: "border-red-500/20" },
  "In_Progress": { label: "In Progress", color: "bg-orange-500/10 text-orange-600", border: "border-orange-500/20" },
  "On_Hold": { label: "On Hold", color: "bg-amber-500/10 text-amber-600", border: "border-amber-500/20" },
  "Failed": { label: "Failed", color: "bg-red-600 text-white", border: "border-red-600 shadow-lg shadow-red-600/20" },
  "Completed": { label: "Completed", color: "bg-green-600 text-white", border: "border-green-600 shadow-lg shadow-green-600/20" },
  "Cancelled": { label: "Cancelled", color: "bg-slate-500/10 text-slate-600", border: "border-slate-500/20" },
}

export function JobStatusBadge({ status, className }: JobStatusBadgeProps) {
  const config = statusConfig[status] || { label: status, color: "bg-muted text-muted-foreground", border: "border-border" }

  return (
    <span className={cn(
      "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all duration-300",
      config.color,
      config.border,
      className
    )}>
      {config.label}
    </span>
  )
}
