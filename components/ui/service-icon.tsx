import { Zap, Droplets, Wrench, Cog, Package, Thermometer, PenTool } from "lucide-react"

export function getServiceIcon(type: string, className: string = "w-5 h-5") {
  const normalizedType = type?.toUpperCase() || ''
  switch (normalizedType) {
    case 'ELECTRICAL': return <Zap className={className} />;
    case 'PLUMBING': return <Droplets className={className} />;
    case 'MECHANICAL': return <Cog className={className} />;
    case 'ASSEMBLY': return <Package className={className} />;
    case 'HVAC': return <Thermometer className={className} />;
    case 'CARPENTRY': return <PenTool className={className} />;
    default: return <Wrench className={className} />;
  }
}

export function ServiceIcon({ type, className = "w-5 h-5" }: { type: string, className?: string }) {
  return getServiceIcon(type, className)
}
