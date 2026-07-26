"use client"

import { useState, useEffect } from "react"
import { BottomNav } from "@/components/navigation/bottom-nav"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { BiUser, BiCheck, BiSearch, BiCalendarCheck, BiGroup, BiSave } from "react-icons/bi"
import { toast } from "sonner"
import { Loader2, Calendar as CalendarIcon, Users } from "lucide-react"
import { api } from "@/lib/api"
import { format } from "date-fns"

export default function DailySelectPage() {
    const [activeTab, setActiveTab] = useState<"daily" | "master">("daily")

    // Master Team State
    const [allTechnicians, setAllTechnicians] = useState<any[]>([])
    const [masterTeamIds, setMasterTeamIds] = useState<string[]>([])
    // TODO: Replace with dynamic job selection UI
    const [activeJobId] = useState<string>("")

    // Daily Schedule State
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0])
    const [dailySelectedIds, setDailySelectedIds] = useState<string[]>([])
    const [masterTeamMembers, setMasterTeamMembers] = useState<any[]>([])

    const [isProcessing, setIsProcessing] = useState(false)
    const [loading, setLoading] = useState(true)

    // Load Initial Data
    useEffect(() => {
        loadData()
    }, [activeTab])

    const loadData = async () => {
        setLoading(true)
        try {
            if (activeTab === "master") {
                // Load all techs and current master team
                const [allRes, masterRes] = await Promise.all([
                    api.getTechnicians(),
                    api.getMasterTeam(activeJobId)
                ])
                if (allRes.technicians) {
                    // Filter valid techs
                    const valid = allRes.technicians.filter((t: any) => t.status !== 'Banned' && t.status !== 'Rejected' && t.status !== 'pending')
                    setAllTechnicians(valid)
                }
                if (masterRes.members) {
                    setMasterTeamIds(masterRes.members.map((m: any) => m.id))
                }
            } else {
                // Load Master Team for Daily Select
                const res = await api.getMasterTeam(activeJobId)
                if (res.members) {
                    setMasterTeamMembers(res.members)
                }
            }
        } catch (e) {
            toast.error("Failed to load data")
        } finally {
            setLoading(false)
        }
    }

    // Master Team Logic
    const toggleMasterMember = (id: string) => {
        setMasterTeamIds(prev =>
            prev.includes(id) ? prev.filter(mid => mid !== id) : [...prev, id]
        )
    }

    const saveMasterTeam = async () => {
        setIsProcessing(true)
        try {
            await api.updateMasterTeam(activeJobId, masterTeamIds)
            toast.success("Master Team updated successfully")
        } catch (e) {
            toast.error("Failed to update Master Team")
        } finally {
            setIsProcessing(false)
        }
    }

    // Daily Schedule Logic
    const toggleDailyMember = (id: string) => {
        // Prevent selecting declined members? Or just warn?
        // Let's allow but maybe the UI status is enough.
        setDailySelectedIds(prev =>
            prev.includes(id) ? prev.filter(did => did !== id) : [...prev, id]
        )
    }

    // Filter master members to only show Accepted/Invited? Or show all with status?
    // Requirement: "show on admin the techcian no not available" 
    // We can interpret Declined as "Not Available"
    // Filter master members
    // Requirement: "show on admin the technician no not available"
    // We show all, but we will visually mark Declined as unavailable.
    const availableMasterMembers = masterTeamMembers.filter(m => m.status !== 'Removed') // Keep Declined to show them

    const handleSelectAllDaily = () => {
        if (dailySelectedIds.length === masterTeamMembers.length) {
            setDailySelectedIds([])
        } else {
            setDailySelectedIds(masterTeamMembers.map(m => m.id))
        }
    }

    const saveDailyRoster = async () => {
        if (dailySelectedIds.length === 0) {
            toast.error("Please select at least one technician")
            return
        }

        setIsProcessing(true)
        try {
            const res = await api.createDailyRoster(dailySelectedIds, selectedDate)
            if (res.success) {
                toast.success(`Scheduled ${res.count} technicians for ${format(new Date(selectedDate), "MMM dd")}`)
                // Don't clear selected IDs immediately OR clear only successfully scheduled ones?
                // Keeping selection allows context. But maybe clear for next date?
                // setDailySelectedIds([]) 
            } else {
                toast.error(res.message || "Failed to update roster")
            }
        } catch (e) {
            toast.error("Error updating roster")
        } finally {
            setIsProcessing(false)
        }
    }

    // Replacement Logic
    const [showReplacementModal, setShowReplacementModal] = useState(false)
    const [replacements, setReplacements] = useState<any[]>([])
    const [loadingReplacements, setLoadingReplacements] = useState(false)

    const openReplacementModal = async () => {
        setShowReplacementModal(true)
        setLoadingReplacements(true)
        try {
            // We need fresh replacements every time as status might change
            const res = await api.getAvailableReplacements()
            if (res.replacements) {
                // Filter out already selected daily IDs to avoid duplicates if any
                setReplacements(res.replacements.filter((r: any) => !dailySelectedIds.includes(r.id)))
            }
        } catch (e) {
            toast.error("Failed to load replacements")
        } finally {
            setLoadingReplacements(false)
        }
    }

    const selectReplacement = (tech: any) => {
        // Add to daily selected list
        setDailySelectedIds(prev => [...prev, tech.id])
        // Also add to masterTeamMembers temporarily for display context (marked as replacement)
        setMasterTeamMembers(prev => [...prev, { ...tech, isReplacement: true }])
        setShowReplacementModal(false)
        toast.success(`${tech.name} added as replacement`)
    }

    return (
        <div className="min-h-screen pb-32">
            {/* Sticky Header */}
            <header className="sticky top-0 z-20 px-6 py-4 glass border-b-0 transition-all space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Staff Management</h1>
                        <p className="text-xs text-muted-foreground font-medium">Manage master list and daily schedules</p>
                    </div>
                    <ThemeToggle />
                </div>

                {/* Custom Tabs */}
                <div className="flex p-1 bg-muted/50 rounded-xl relative">
                    <button
                        onClick={() => setActiveTab("daily")}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-all ${activeTab === "daily"
                            ? "bg-background text-primary shadow-sm ring-1 ring-border"
                            : "text-muted-foreground hover:text-foreground"
                            }`}
                    >
                        <CalendarIcon className="w-4 h-4" /> Daily Schedule
                    </button>
                    <button
                        onClick={() => setActiveTab("master")}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-all ${activeTab === "master"
                            ? "bg-background text-primary shadow-sm ring-1 ring-border"
                            : "text-muted-foreground hover:text-foreground"
                            }`}
                    >
                        <Users className="w-4 h-4" /> Master List
                    </button>
                </div>

                {/* Date Picker for Daily Tab */}
                {activeTab === "daily" && (
                    <div className="flex items-center gap-3 bg-card/50 p-2 rounded-xl border border-border">
                        <CalendarIcon className="w-5 h-5 text-muted-foreground ml-2" />
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="bg-transparent border-none focus:outline-none text-sm font-semibold w-full"
                        />
                    </div>
                )}
            </header>

            <main className="px-6 py-4 space-y-6">
                {/* Statistics / Info */}
                {activeTab === "daily" ? (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between px-1">
                            <div className="text-sm font-medium text-muted-foreground">
                                Available: <span className="text-foreground font-bold">{masterTeamMembers.filter(m => m.status === 'Accepted').length}</span>
                                <span className="mx-2 text-muted-foreground/50">|</span>
                                Pending: <span className="text-yellow-500 font-bold">{masterTeamMembers.filter(m => m.status === 'Invited').length}</span>
                                <span className="mx-2 text-muted-foreground/50">|</span>
                                Declined: <span className="text-red-500 font-bold">{masterTeamMembers.filter(m => m.status === 'Declined').length}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={async () => {
                                    setIsProcessing(true)
                                    try {
                                        const res = await api.sendDailyInvites(selectedDate)
                                        if (res.success) {
                                            toast.success(`Sent ${res.invitesSent} daily invites`)
                                            loadData()
                                        } else {
                                            toast.error(res.message || "Failed to send invites")
                                        }
                                    } catch (e) {
                                        toast.error("Error sending invites")
                                    } finally {
                                        setIsProcessing(false)
                                    }
                                }}
                                disabled={isProcessing}
                                className="text-xs font-bold text-green-600 bg-green-500/10 px-3 py-1.5 rounded-lg hover:bg-green-500/20 transition-colors flex items-center gap-1 disabled:opacity-50"
                            >
                                <BiCalendarCheck className="w-4 h-4" /> Send Daily Invites
                            </button>
                            <button
                                onClick={openReplacementModal}
                                className="text-xs font-bold text-blue-600 bg-blue-500/10 px-3 py-1.5 rounded-lg hover:bg-blue-500/20 transition-colors flex items-center gap-1"
                            >
                                <BiGroup className="w-4 h-4" /> Find Replacement
                            </button>
                            <button
                                onClick={handleSelectAllDaily}
                                className="text-xs font-bold text-primary hover:text-primary/80 transition-colors ml-auto"
                            >
                                {dailySelectedIds.length === masterTeamMembers.filter(m => m.status === 'Accepted').length ? "Deselect All" : "Select Available"}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="px-4 py-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs text-blue-600 dark:text-blue-400 font-medium flex gap-2">
                        <Users className="w-4 h-4 flex-shrink-0" />
                        Select technicians to include in the Main Roster. They will receive an invitation to join.
                    </div>
                )}

                {/* List */}
                <div className="space-y-3">
                    {loading ? (
                        <div className="text-center py-10">
                            <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                            <p className="text-xs text-muted-foreground mt-2 uppercase tracking-widest">Loading...</p>
                        </div>
                    ) : (activeTab === "daily" ? availableMasterMembers : allTechnicians).length === 0 ? (
                        <div className="text-center py-10 border border-dashed rounded-2xl">
                            {activeTab === "daily"
                                ? "No members in Master Team. Go to 'Master List' to add staff."
                                : "No technicians found."}
                        </div>
                    ) : (
                        (activeTab === "daily" ? availableMasterMembers : allTechnicians).map((tech: any) => {
                            // Determine selection state based on active tab
                            const isSelected = activeTab === "daily"
                                ? dailySelectedIds.includes(tech.id || tech.techId)
                                : masterTeamIds.includes(tech.id || tech.techId)

                            const id = tech.id || tech.techId // Normalized ID accessor

                            return (
                                <div
                                    key={id}
                                    onClick={() => {
                                        if (activeTab === "daily" && tech.status === 'Declined') {
                                            toast.error("Technician has declined the Master Team invitation.")
                                            return
                                        }
                                        activeTab === "daily" ? toggleDailyMember(id) : toggleMasterMember(id)
                                    }}
                                    className={`glass-card p-4 rounded-2xl flex items-center gap-4 cursor-pointer transition-all border 
                                        ${activeTab === "daily" && tech.status === 'Declined' ? "opacity-60 grayscale-[0.5] hover:border-red-500/30" :
                                            isSelected
                                                ? "border-primary/50 bg-primary/5 shadow-[0_0_20px_rgba(var(--primary),0.1)]"
                                                : "hover:border-primary/30"
                                        }`}
                                >
                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isSelected
                                        ? "border-primary bg-primary text-primary-foreground"
                                        : "border-muted-foreground/30"
                                        }`}>
                                        {isSelected && <BiCheck className="w-4 h-4" />}
                                    </div>

                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center text-2xl shadow-inner">
                                        <BiUser className="text-muted-foreground" />
                                    </div>

                                    <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                            <p className={`font-bold text-lg leading-tight transition-colors ${isSelected ? "text-primary" : ""}`}>
                                                {tech.name}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">{tech.skill}</p>
                                            {activeTab === "daily" && (
                                                <>
                                                    <span className="w-1 h-1 rounded-full bg-border" />
                                                    <span className={`text-[10px] font-bold uppercase 
                                                        ${tech.status === 'Accepted' ? 'text-green-500' :
                                                            tech.status === 'Invited' ? 'text-yellow-500' :
                                                                tech.status === 'Declined' ? 'text-red-500' : 'text-muted-foreground'}`}>
                                                        {tech.status}
                                                    </span>
                                                </>
                                            )}
                                            {/* Master List Status Badge */}
                                            {activeTab === "master" && masterTeamIds.includes(tech.id || tech.techId) && (
                                                <span className="ml-2 text-[10px] font-bold uppercase bg-primary/10 text-primary px-2 py-0.5 rounded-md">
                                                    Included
                                                </span>
                                            )}
                                            {tech.isReplacement && (
                                                <span className="text-[10px] font-bold uppercase text-purple-600 bg-purple-100 px-2 py-0.5 rounded-md">
                                                    Replacement
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>
            </main >

            {/* Floating Action Button */}
            < div className="fixed bottom-[100px] left-6 right-6 z-40" >
                <button
                    onClick={activeTab === "daily" ? saveDailyRoster : saveMasterTeam}
                    disabled={(activeTab === "daily" && dailySelectedIds.length === 0) || isProcessing}
                    className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold shadow-xl shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none hover:translate-y-[-2px] active:translate-y-[1px] transition-all flex items-center justify-center gap-2"
                >
                    {isProcessing ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Processing...
                        </>
                    ) : activeTab === "daily" ? (
                        <>
                            <BiCalendarCheck className="w-6 h-6" />
                            Confirm Schedule
                        </>
                    ) : (
                        <>
                            <BiSave className="w-6 h-6" />
                            Update Master List
                        </>
                    )}
                </button>
            </div >

            {/* Replacement Modal */}
            {
                showReplacementModal && (
                    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                        <div className="bg-background w-full max-w-md rounded-2xl shadow-2xl border border-border overflow-hidden animate-in slide-in-from-bottom-10 duration-300">
                            <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
                                <h2 className="text-lg font-bold">Select Replacement</h2>
                                <button onClick={() => setShowReplacementModal(false)} className="p-2 rounded-full hover:bg-muted transition-colors">
                                    <BiCheck className="rotate-45 w-5 h-5 text-muted-foreground" />
                                </button>
                            </div>

                            <div className="p-4 max-h-[60vh] overflow-y-auto space-y-3">
                                {loadingReplacements ? (
                                    <div className="text-center py-8">
                                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                                        <p className="text-xs text-muted-foreground mt-2">Finding available staff...</p>
                                    </div>
                                ) : replacements.length === 0 ? (
                                    <div className="text-center py-8 border border-dashed rounded-xl">
                                        <p className="text-muted-foreground text-sm">No available replacements found.</p>
                                    </div>
                                ) : (
                                    replacements.map(tech => (
                                        <div
                                            key={tech.id}
                                            onClick={() => selectReplacement(tech)}
                                            className="p-3 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 cursor-pointer transition-all flex items-center gap-3"
                                        >
                                            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                                                <BiUser className="text-muted-foreground" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-sm">{tech.name}</p>
                                                <p className="text-xs text-muted-foreground">{tech.skill} • Rating: {Number(tech.rating).toFixed(1)}</p>
                                            </div>
                                            <div className="ml-auto">
                                                <span className="text-[10px] uppercase font-bold text-green-600 bg-green-100 px-2 py-1 rounded-md">
                                                    Select
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )
            }

            <BottomNav active="more" role="admin" />
        </div >
    )
}
