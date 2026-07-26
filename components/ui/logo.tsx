import React from "react"
import { cn } from "@/lib/utils"

interface LogoProps {
  className?: string
  size?: "sm" | "md" | "lg" | "xl" | "2xl"
}

export function Logo({ className, size = "md" }: LogoProps) {
  const sizeClasses = {
    sm: "w-8 h-8 p-1 rounded-xl",
    md: "w-10 h-10 p-1.5 rounded-xl",
    lg: "w-12 h-12 p-2 rounded-2xl",
    xl: "w-16 h-16 p-2.5 rounded-2xl",
    "2xl": "w-20 h-20 p-3 rounded-3xl",
  }

  return (
    <div
      className={cn(
        "bg-white flex items-center justify-center shadow-md overflow-hidden shrink-0 border border-border/20",
        sizeClasses[size],
        className
      )}
    >
      <img
        src="/maintainu-logo.png"
        alt="MaintainU Logo"
        className="w-full h-full object-contain"
      />
    </div>
  )
}
