"use client"

import { useEffect, useState } from "react"
import { MapContainer, TileLayer, Marker, Tooltip, Popup } from "react-leaflet"
import { MapPin } from "lucide-react"
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

export default function MiniMap({ locations, lat, lng }: { locations?: { lat: number, lng: number, name?: string }[], lat?: number, lng?: number }) {
    const [isMounted, setIsMounted] = useState(false)

    useEffect(() => {
        setIsMounted(true)
    }, [])

    const allLocs = locations || (lat && lng ? [{ lat, lng }] : [])
    
    if (!isMounted || allLocs.length === 0) {
        return (
            <div className="w-full h-40 bg-muted/20 animate-pulse rounded-[1.5rem] flex items-center justify-center">
                <MapPin className="w-6 h-6 text-muted-foreground/30" />
            </div>
        )
    }

    const centerLat = allLocs[0].lat
    const centerLng = allLocs[0].lng

    // Group locations that are within ~50 meters of each other (0.0005 degrees)
    const groupedLocations: { lat: number, lng: number, names: string[] }[] = []
    
    allLocs.forEach(loc => {
        const existingGroup = groupedLocations.find(g => 
            Math.abs(g.lat - loc.lat) < 0.0005 && Math.abs(g.lng - loc.lng) < 0.0005
        )
        if (existingGroup) {
            if (loc.name) existingGroup.names.push(loc.name)
        } else {
            groupedLocations.push({
                lat: loc.lat,
                lng: loc.lng,
                names: loc.name ? [loc.name] : []
            })
        }
    })

    return (
        <div className="w-full h-40 rounded-[1.5rem] overflow-hidden border border-border/50 relative z-0 shadow-sm mt-3 group">
            <MapContainer
                key={`${centerLat}-${centerLng}-${groupedLocations.length}`}
                center={[centerLat, centerLng]}
                zoom={14}
                style={{ height: '100%', width: '100%' }}
                zoomControl={true}
                scrollWheelZoom={true}
                dragging={true}
                doubleClickZoom={true}
            >
                <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                />
                {groupedLocations.map((group, i) => (
                    <Marker key={i} position={[group.lat, group.lng]} icon={icon}>
                        {group.names.length > 0 && (
                            <Tooltip 
                                direction="top" 
                                offset={[0, -40]} 
                                opacity={1} 
                                permanent 
                                className={group.names.length > 1 
                                    ? "font-bold border-none shadow-md rounded-lg bg-primary text-primary-foreground" 
                                    : "font-bold border-none shadow-md rounded-lg"}
                            >
                                {group.names.length > 1 ? `Team (${group.names.length})` : group.names[0]}
                            </Tooltip>
                        )}
                        
                        {group.names.length > 0 && (
                            <Popup className="rounded-xl">
                                <div className="p-1">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">
                                        {group.names.length > 1 ? 'Team Members at this location' : 'Technician'}
                                    </p>
                                    <ul className="space-y-1">
                                        {group.names.map((name, idx) => (
                                            <li key={idx} className="text-sm font-bold flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                                {name}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </Popup>
                        )}
                    </Marker>
                ))}
            </MapContainer>
            
            <div className="absolute bottom-3 right-3 z-[1001] opacity-0 group-hover:opacity-100 transition-opacity">
                <a 
                    href={`https://maps.google.com/?q=${centerLat},${centerLng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-background/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-border text-[9px] font-black uppercase tracking-widest text-primary shadow-lg hover:bg-background transition-colors block"
                >
                    Open in Maps
                </a>
            </div>
        </div>
    )
}
