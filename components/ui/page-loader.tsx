import { Spinner } from "@/components/ui/spinner"

interface PageLoaderProps {
  title?: string
  subtitle?: string
}

export function PageLoader({ 
  title = "Syncing Data", 
  subtitle = "Retrieving live database logs" 
}: PageLoaderProps) {
  return (
    <div className="min-h-[80vh] w-full flex flex-col items-center justify-center gap-4">
      <div className="relative flex items-center justify-center">
        {/* Premium pulsing aesthetic rings */}
        <div className="absolute w-12 h-12 rounded-full border border-primary/20 animate-ping" />
        <div className="absolute w-8 h-8 rounded-full bg-primary/5 animate-pulse" />
        
        {/* Centered Spinner */}
        <Spinner className="size-8 text-primary relative z-10" />
      </div>
      <div className="flex flex-col items-center gap-1 text-center">
        <h3 className="text-sm font-bold text-foreground tracking-tight">{title}</h3>
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest animate-pulse">{subtitle}</p>
      </div>
    </div>
  )
}
