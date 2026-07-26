"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Wrench, Loader2, MapPin, Briefcase, Star, Info, X, User, Plus } from "lucide-react"
import { completeTechnicianProfileAction } from "@/actions/technician.action"

export default function TechnicianSetupPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [skillInput, setSkillInput] = useState("")
    const [formData, setFormData] = useState({
        name: "",
        experience: "",
        primarySkill: "",
        skills: "",
        address: "",
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            const res = await completeTechnicianProfileAction({
                ...formData,
                experience: Number(formData.experience),
            })
            if (res?.success) {
                toast.success("Profile completed successfully!")
                router.push("/technician/dashboard")
            } else {
                if (res?.fieldErrors) {
                    toast.error(`Validation Error: ${Object.values(res.fieldErrors).flat().join(", ")}`)
                } else {
                    toast.error(res?.message || "Failed to update profile")
                }
            }
        } catch (error) {
            toast.error("An error occurred")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-950 dark:to-slate-900">
            <div className="w-full max-w-lg glass p-8 rounded-3xl shadow-xl">
                <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 ring-8 ring-primary/5">
                        <Wrench className="w-10 h-10 text-primary" />
                    </div>
                    <h1 className="text-2xl font-bold">Complete Your Profile</h1>
                    <p className="text-muted-foreground text-sm">Add your skills to get matched with jobs</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium ml-1">Full Name</label>
                        <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input
                                type="text"
                                required
                                placeholder="Enter your full name"
                                className="w-full pl-11 pr-4 py-3 rounded-xl border border-border bg-white/50 dark:bg-card/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium ml-1">Primary Skill</label>
                        <div className="relative">
                            <Star className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <select
                                required
                                className="w-full pl-11 pr-4 py-3 rounded-xl border border-border bg-white/50 dark:bg-card/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all appearance-none"
                                value={formData.primarySkill}
                                onChange={(e) => setFormData({ ...formData, primarySkill: e.target.value })}
                            >
                                <option value="">Select Primary Skill</option>
                                <option value="Electrical">Electrical</option>
                                <option value="Mechanical">Mechanical</option>
                                <option value="HVAC">HVAC</option>
                                <option value="Plumbing">Plumbing</option>
                                <option value="Assembly">Assembly</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium ml-1">Years of Experience</label>
                        <div className="relative">
                            <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input
                                type="number"
                                min="0"
                                max="50"
                                required
                                placeholder="e.g. 5"
                                className="w-full pl-11 pr-4 py-3 rounded-xl border border-border bg-white/50 dark:bg-card/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                value={formData.experience}
                                onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium ml-1">Other Skills</label>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Info className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <input
                                    type="text"
                                    list="skill-options"
                                    placeholder="Type or select a skill..."
                                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-border bg-white/50 dark:bg-card/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                    value={skillInput}
                                    onChange={(e) => setSkillInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault()
                                            const val = skillInput.trim()
                                            if (val) {
                                                const current = formData.skills ? formData.skills.split(",").map(s => s.trim()).filter(Boolean) : []
                                                if (!current.includes(val)) {
                                                    setFormData({ ...formData, skills: [...current, val].join(", ") })
                                                }
                                                setSkillInput("")
                                            }
                                        }
                                    }}
                                />
                                <datalist id="skill-options">
                                    {["Welding", "Painting", "Drilling", "Carpentry", "Tiling", "Roofing", "Masonry", "Landscaping", "Cleaning", "Pest Control"].map(s => (
                                        <option key={s} value={s} />
                                    ))}
                                </datalist>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    const val = skillInput.trim()
                                    if (val) {
                                        const current = formData.skills ? formData.skills.split(",").map(s => s.trim()).filter(Boolean) : []
                                        if (!current.includes(val)) {
                                            setFormData({ ...formData, skills: [...current, val].join(", ") })
                                        }
                                        setSkillInput("")
                                    }
                                }}
                                className="px-4 bg-primary/10 text-primary rounded-xl hover:bg-primary/20 transition-colors flex items-center justify-center"
                            >
                                <Plus className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Badges */}
                        <div className="flex flex-wrap gap-2 mt-2 min-h-[30px]">
                            {formData.skills.split(",").map(s => s.trim()).filter(Boolean).map((skill) => (
                                <span key={skill} className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center gap-1 animate-in fade-in zoom-in duration-200">
                                    {skill}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const current = formData.skills.split(",").map(s => s.trim()).filter(Boolean)
                                            setFormData({ ...formData, skills: current.filter(s => s !== skill).join(", ") })
                                        }}
                                        className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </span>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium ml-1">Current Address</label>
                        <div className="relative">
                            <MapPin className="absolute left-4 top-3 w-4 h-4 text-muted-foreground" />
                            <textarea
                                required
                                placeholder="Where do you live?"
                                className="w-full pl-11 pr-4 py-3 rounded-xl border border-border bg-white/50 dark:bg-card/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all min-h-[100px] resize-none"
                                value={formData.address}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3.5 px-6 rounded-xl bg-primary text-white font-bold hover:bg-primary/90 disabled:opacity-50 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 mt-4"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                        {loading ? "Saving Profile..." : "Save & Continue"}
                    </button>
                </form>
            </div>
        </div>
    )
}
