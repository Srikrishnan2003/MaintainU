"use client"

import { useEffect, useState } from "react"
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet"
import { Users, MapPin } from "lucide-react"
import "leaflet/dist/leaflet.css"
import L from "leaflet"

// Fix Leaflet Default Icon
const icon = L.icon({
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
})

const teamIcon = L.divIcon({
    className: 'custom-team-icon',
    html: `<div style="background-color: #3b82f6; color: white; border-radius: 9999px; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 2px solid white; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">Team</div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
})

interface TechLocation {
    id: string
    name: string
    lat: number
    lng: number
    status: "active"
    locationName: string
}

interface LocationMapProps {
    techs: TechLocation[]
    mapStyleUrl: string
}

export default function LocationMap({ techs, mapStyleUrl }: LocationMapProps) {
    const [isMounted, setIsMounted] = useState(false)
    const [isInitializing, setIsInitializing] = useState(true)

    useEffect(() => {
        setIsMounted(true)
        // Simulate initialization for smooth UX (prevents tile flash)
        const timer = setTimeout(() => setIsInitializing(false), 1500)
        return () => clearTimeout(timer)
    }, [])

    // Logic to Group Techs
    const groupedLocations = techs.reduce((acc, tech) => {
        const key = `${tech.lat},${tech.lng}`
        if (!acc[key]) acc[key] = []
        acc[key].push(tech)
        return acc
    }, {} as Record<string, TechLocation[]>)

    if (!isMounted) {
        return (
            <div className="w-full h-full min-h-[500px] bg-muted/10 flex items-center justify-center rounded-3xl border border-border/50 backdrop-blur-sm">
                <div className="flex flex-col items-center gap-3 bg-white/50 dark:bg-black/50 p-6 rounded-2xl shadow-xl backdrop-blur-md border border-white/20">
                    <div className="relative">
                        <div className="w-12 h-12 rounded-full border-4 border-primary/30 border-t-primary animate-spin"></div>
                        <MapPin className="w-5 h-5 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                    </div>
                    <span className="text-sm font-bold tracking-wide text-foreground/80">Initializing Map...</span>
                </div>
            </div>
        )
    }

    return (
        <div className="w-full h-full min-h-[500px] relative z-0 group">
            {/* Initialization Overlay */}
            <div className={`absolute inset-0 z-[1000] bg-background/80 backdrop-blur-sm flex items-center justify-center transition-opacity duration-700 ${isInitializing ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                <div className="flex flex-col items-center gap-3 bg-white/80 dark:bg-black/80 p-6 rounded-2xl shadow-2xl border border-white/20 scale-100 transition-transform duration-500">
                    <div className="relative">
                        <div className="w-10 h-10 rounded-full border-b-2 border-primary animate-spin"></div>
                    </div>
                    <span className="text-xs font-bold uppercase tracking-widest text-primary animate-pulse">Locating Assets...</span>
                </div>
            </div>

            <MapContainer
                center={[12.9716, 77.5946] as unknown as [number, number]}
                zoom={12}
                style={{ height: '100%', width: '100%', minHeight: '500px' }}
                className="z-0 rounded-3xl"
            >
                <TileLayer
                    url={mapStyleUrl}
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />

                {Object.values(groupedLocations).map((group, idx) => {
                    const isTeam = group.length > 1
                    const position: [number, number] = [group[0].lat, group[0].lng]

                    return (
                        <Marker
                            key={idx}
                            position={position}
                            icon={isTeam ? teamIcon : icon}
                        >
                            <Popup className="rounded-xl overflow-hidden shadow-xl border-0">
                                <div className="p-1 min-w-[200px]">
                                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
                                        {isTeam ? <Users className="w-4 h-4 text-blue-500" /> : <MapPin className="w-4 h-4 text-primary" />}
                                        <span className="font-bold text-sm">
                                            {isTeam ? "Team Location" : "Technician Location"}
                                        </span>
                                    </div>

                                    <p className="text-xs text-gray-500 mb-3 flex items-start gap-1">
                                        <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
                                        {group[0].locationName}
                                    </p>

                                    <div className="space-y-2">
                                        {group.map(tech => (
                                            <div key={tech.id} className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg">
                                                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                                                    {tech.name.charAt(0)}
                                                </div>
                                                <span className="text-sm font-medium">{tech.name}</span>
                                                <span className="ml-auto w-2 h-2 rounded-full bg-green-500 animate-pulse" title="Active" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    )
                })}
            </MapContainer>
        </div>
    )
}
