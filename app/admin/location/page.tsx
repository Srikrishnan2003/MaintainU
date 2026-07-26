"use client"

import { BottomNav } from "@/components/navigation/bottom-nav"
import { ArrowLeft, MapPin, Loader2, Sun, Moon, Globe, Bell } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import dynamic from 'next/dynamic'
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { api } from "@/lib/api"
import { useSSE } from "@/hooks/use-sse"

// Lazy Load Map Component
const LocationMap = dynamic(() => import('@/components/admin/LocationMap'), {
    ssr: false,
    loading: () => (
        <div className="w-full h-full min-h-[500px] bg-muted/10 flex items-center justify-center rounded-3xl border border-border/50 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3 bg-white/50 dark:bg-black/50 p-6 rounded-2xl shadow-xl backdrop-blur-md border border-white/20">
                <div className="relative">
                    <div className="w-12 h-12 rounded-full border-4 border-primary/30 border-t-primary animate-spin"></div>
                    <MapPin className="w-5 h-5 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
                <span className="text-sm font-bold tracking-wide text-foreground/80">Loading Map...</span>
            </div>
        </div>
    )
})

interface TechLocation {
    id: string
    name: string
    lat: number
    lng: number
    status: "active"
    locationName: string
}

export default function AdminLocationPage() {
    const router = useRouter()
    const [activeTechs, setActiveTechs] = useState<TechLocation[]>([])
    const [loadingConfig, setLoadingConfig] = useState(true)
    const [currentStyle, setCurrentStyle] = useState<"day" | "night" | "satellite">("day")

    const { attendanceUpdates, fallbackMode } = useSSE(true)

    const mapStyles = {
        day: {
            url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
            name: "Day",
            icon: Sun
        },
        night: {
            url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
            name: "Night",
            icon: Moon
        },
        satellite: {
            url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
            name: "Satellite",
            icon: Globe
        }
    }

    useEffect(() => {
        const fetchTechs = async () => {
            try {
                const res = await api.getTechnicians()
                if (res.technicians) {
                    const mapped = res.technicians
                        .filter((t: any) => t.lat && t.lng)
                        .map((t: any) => ({
                            id: t.id,
                            name: t.name,
                            lat: t.lat,
                            lng: t.lng,
                            status: "active" as "active",
                            locationName: t.locationName || "Unknown"
                        }))
                    setActiveTechs(mapped)
                }
            } catch (e) {
                console.error("Failed to fetch locations", e)
            } finally {
                setLoadingConfig(false)
            }
        }
        fetchTechs()
    }, [])

    useEffect(() => {
        if (attendanceUpdates) {
            const fetchTechs = async () => {
                try {
                    const res = await api.getTechnicians()
                    if (res.technicians) {
                        const mapped = res.technicians
                            .filter((t: any) => t.lat && t.lng)
                            .map((t: any) => ({
                                id: t.id,
                                name: t.name,
                                lat: t.lat,
                                lng: t.lng,
                                status: "active" as "active",
                                locationName: t.locationName || "Unknown"
                            }))
                        setActiveTechs(mapped)
                    }
                } catch (e) {
                    console.error("Failed to fetch locations", e)
                }
            }
            fetchTechs()
        }
    }, [attendanceUpdates])

    useEffect(() => {
        if (!fallbackMode) return
        const fetchTechs = async () => {
            try {
                const res = await api.getTechnicians()
                if (res.technicians) {
                    const mapped = res.technicians
                        .filter((t: any) => t.lat && t.lng)
                        .map((t: any) => ({
                            id: t.id,
                            name: t.name,
                            lat: t.lat,
                            lng: t.lng,
                            status: "active" as "active",
                            locationName: t.locationName || "Unknown"
                        }))
                    setActiveTechs(mapped)
                }
            } catch (e) {}
        }
        const interval = setInterval(fetchTechs, 30000)
        return () => clearInterval(interval)
    }, [fallbackMode])

    return (
        <div className="min-h-screen pb-32 app-gradient">
            {/* Header */}
            <header className="sticky top-0 z-20 px-6 py-4 glass border-b-0 flex items-center justify-between transition-all">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.back()}
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors -ml-2"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight">Live Map</h1>
                        <p className="text-xs text-muted-foreground font-medium">Technician Tracking</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <ThemeToggle />
                    <button className="w-10 h-10 flex items-center justify-center hover:bg-muted/80 rounded-xl transition-colors ring-1 ring-border/50 active:scale-95 bg-background/50 shadow-sm">
                        <Bell className="w-5 h-5" />
                    </button>
                </div>
            </header>

            {/* Map Area */}
            <main className="px-6 py-6 h-[calc(100vh-140px)] min-h-[500px] flex flex-col">
                <div className="flex-1 relative rounded-3xl overflow-hidden shadow-lg border border-border/50">

                    {/* Layer Switcher */}
                    <div className="absolute top-4 right-4 flex flex-col gap-2 z-[400]">
                        <div className="glass-card p-1.5 rounded-xl flex flex-col gap-1 shadow-lg bg-white/90 dark:bg-black/80 backdrop-blur-xl">
                            {Object.entries(mapStyles).map(([key, style]) => (
                                <button
                                    key={key}
                                    onClick={() => setCurrentStyle(key as "day" | "night" | "satellite")}
                                    className={`p-2 rounded-lg transition-all flex items-center justify-center ${currentStyle === key ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
                                    title={style.name}
                                >
                                    <style.icon className="w-5 h-5" />
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Lazy Loaded Map */}
                    <LocationMap techs={activeTechs} mapStyleUrl={mapStyles[currentStyle].url} />

                    {/* Floating Legend */}
                    <div className="absolute bottom-6 left-6 right-6 p-4 glass-card rounded-2xl flex items-center justify-around text-xs font-medium z-30 bg-white/90 dark:bg-black/90 backdrop-blur-md shadow-lg border border-border/10">
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></span>
                            Team
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--primary),0.5)]"></span>
                            Single Tech
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></span>
                            Active Now
                        </div>
                    </div>

                </div>
            </main>

            <BottomNav active="home" role="admin" />
        </div>
    )
}
