"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { api } from "@/lib/api"
import { CheckCircle2, User, Loader2, ArrowLeft } from "lucide-react"
import { toast } from "sonner"
import { formatTicketId } from "@/lib/utils"

export default function AssignTeamPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const [technicians, setTechnicians] = useState<any[]>([])
    const [selectedTechs, setSelectedTechs] = useState<string[]>([])
    const [initialSelectedTechs, setInitialSelectedTechs] = useState<string[]>([])
    const [leadTech, setLeadTech] = useState<string | null>(null)
    const [initialLeadTech, setInitialLeadTech] = useState<string | null>(null)
    const [teamStatuses, setTeamStatuses] = useState<Record<string, string>>({})
    const [loading, setLoading] = useState(true)
    const [assigning, setAssigning] = useState(false)

    useEffect(() => {
        const fetchTechs = async () => {
            try {
                const [techsRes, teamRes] = await Promise.all([
                    api.getTechnicians(),
                    api.getMasterTeam(id)
                ]);
                const validTechs = techsRes.technicians.filter((t: any) => t.techId);
                setTechnicians(validTechs);
                if (teamRes.members && teamRes.members.length > 0) {
                    const activeMembers = teamRes.members.filter((m: any) => m.status !== 'Declined' && m.status !== 'Removed');
                    const initialIds = activeMembers.map((m: any) => m.id);
                    setSelectedTechs(initialIds);
                    setInitialSelectedTechs(initialIds);
                    
                    if (teamRes.leadTechnicianId && initialIds.includes(teamRes.leadTechnicianId)) {
                        setLeadTech(teamRes.leadTechnicianId);
                        setInitialLeadTech(teamRes.leadTechnicianId);
                    } else if (initialIds.length > 0) {
                        setLeadTech(initialIds[0]);
                        setInitialLeadTech(initialIds[0]);
                    }

                    const statuses: Record<string, string> = {};
                    teamRes.members.forEach((m: any) => {
                        statuses[m.id] = m.status;
                    });
                    setTeamStatuses(statuses);
                }
            } catch (e) {
                toast.error("Failed to load technicians or team")
            } finally {
                setLoading(false)
            }
        }
        fetchTechs()
    }, [])

    const toggleTech = (id: string) => {
        if (selectedTechs.includes(id)) {
            const newSelected = selectedTechs.filter((tid) => tid !== id);
            setSelectedTechs(newSelected)
            if (leadTech === id) {
                setLeadTech(newSelected.length > 0 ? newSelected[0] : null);
            }
        } else {
            setSelectedTechs([...selectedTechs, id])
            if (!leadTech) {
                setLeadTech(id);
            }
        }
    }

    const handleAssign = async () => {
        if (selectedTechs.length === 0) return
        setAssigning(true)
        try {
            const orderedTechs = [...selectedTechs].sort((a, b) => {
                if (a === leadTech) return -1;
                if (b === leadTech) return 1;
                return 0;
            });
            const res = await api.assignTeam(id, orderedTechs)
            if (res && res.success === false) {
                toast.error(res.message || "Failed to assign team")
                return
            }
            toast.success("Team assigned successfully")
            router.back() // Go back instead of hardcoded route to be dynamic
        } catch (e) {
            toast.error("Failed to assign team")
        } finally {
            setAssigning(false)
        }
    }

    return (
        <div className="min-h-screen pb-20">
            {/* Header */}
            <div className="sticky top-0 z-20 px-6 py-4 glass border-b-0 mb-6 transition-all">
                <button onClick={() => router.back()} className="mb-4 p-2 -ml-2 hover:bg-muted/50 rounded-full transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <h1 className="text-2xl font-bold tracking-tight">Assign Team</h1>
                <p className="text-muted-foreground text-sm font-medium">Select technicians for Request {formatTicketId(id)}</p>
            </div>

            <main className="px-6">

                {/* Tech List */}
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : (
                    <div className="space-y-3 mb-8">
                        {technicians.length === 0 ? (
                            <p className="text-muted-foreground text-center">No technicians available</p>
                        ) : (
                            technicians.map((tech) => (
                                <div
                                    key={tech.techId}
                                    onClick={() => toggleTech(tech.techId)}
                                    className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedTechs.includes(tech.techId)
                                        ? "bg-blue-500/10 border-blue-500"
                                        : "bg-card border-border hover:border-primary/50"
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                                                <User className="w-5 h-5 text-muted-foreground" />
                                            </div>
                                            <div>
                                                <p className="font-semibold">{tech.name}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {tech.skill} • {teamStatuses[tech.techId] ? (
                                                        <span className={`font-bold ${
                                                            teamStatuses[tech.techId] === 'Accepted' ? 'text-green-600' :
                                                            teamStatuses[tech.techId] === 'Declined' ? 'text-red-600' :
                                                            teamStatuses[tech.techId] === 'Removed' ? 'text-slate-500' :
                                                            'text-blue-600'
                                                        }`}>
                                                            {teamStatuses[tech.techId] === 'Invited' ? 'Waiting for acceptance' : teamStatuses[tech.techId]}
                                                        </span>
                                                    ) : tech.status}
                                                </p>
                                            </div>
                                        </div>
                                        {selectedTechs.includes(tech.techId) && (
                                            <div className="flex items-center gap-3">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setLeadTech(tech.techId);
                                                    }}
                                                    className={`px-3 py-1.5 text-[10px] uppercase font-bold rounded-xl transition-all ${leadTech === tech.techId ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/20' : 'bg-muted/50 border border-border text-muted-foreground hover:bg-orange-500/10 hover:text-orange-600 hover:border-orange-500/30'}`}
                                                >
                                                    {leadTech === tech.techId ? 'Lead Tech' : 'Make Lead'}
                                                </button>
                                                <CheckCircle2 className="w-6 h-6 text-blue-500 fill-current" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* Action Button */}
                <button
                    onClick={handleAssign}
                    disabled={selectedTechs.length === 0 || assigning || (initialSelectedTechs.length > 0 && selectedTechs.slice().sort().join(',') === initialSelectedTechs.slice().sort().join(',') && leadTech === initialLeadTech)}
                    className="w-full py-4 rounded-xl bg-primary text-white font-bold text-lg shadow-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {assigning && <Loader2 className="w-5 h-5 animate-spin" />}
                    {assigning ? "Processing..." : 
                     initialSelectedTechs.length > 0 ? "Save Team Changes" :
                     `Assign ${selectedTechs.length} Technician${selectedTechs.length !== 1 ? 's' : ''}`}
                </button>
            </main>
        </div>
    )
}
