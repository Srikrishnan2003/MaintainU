"use client"

import { useState } from "react"
import { UploadButton } from "@/lib/uploadthing"
import { submitTechnicianOnboarding } from "@/actions/technician.action"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { 
    Loader2, 
    CheckCircle2, 
    User, 
    FileText, 
    Briefcase, 
    MapPin,
    Calendar,
    Wrench,
    ArrowRight
} from "lucide-react"
import { ThemeToggle } from "@/components/ui/theme-toggle"

export default function TechnicianOnboarding() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)

    // Form State
    const [formData, setFormData] = useState({
        dob: "",
        gender: "Male",
        address: "",
        experience: 0,
        primarySkill: "ELECTRICAL"
    })

    // Documents State
    const [docs, setDocs] = useState({
        profilePhoto: "",
        aadhaar: "",
        pan: ""
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!docs.profilePhoto || !docs.aadhaar || !docs.pan) {
            toast.error("Please upload all required documents (Photo, Aadhaar, PAN)")
            return
        }

        setLoading(true)
        try {
            const res = await submitTechnicianOnboarding({
                ...formData,
                documents: docs
            })

            if (res.success) {
                toast.success(res.message)
                router.push("/technician/pending") // Redirect to some pending approval screen
            } else {
                toast.error(res.message)
            }
        } catch (error) {
            toast.error("An unexpected error occurred")
        } finally {
            setLoading(false)
        }
    }

    const CustomUploadUI = ({ label, field }: { label: string, field: keyof typeof docs }) => (
        <div className="relative group overflow-hidden bg-card/50 border border-border/80 rounded-[1.5rem] p-4 flex flex-col items-center justify-center gap-3 transition-all hover:border-primary/50">
            {docs[field] ? (
                <div className="absolute inset-0 bg-emerald-500/10 flex flex-col items-center justify-center gap-2">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">UPLOADED</span>
                </div>
            ) : (
                <>
                    <FileText className="w-6 h-6 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                    <p className="text-xs font-bold text-muted-foreground tracking-wide text-center uppercase">{label}</p>
                    <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                        {/* We are tying all of these to the same mock endpoint for structure, since they all accept images/pdfs */}
                        <UploadButton
                            endpoint="technicianDocs"
                            onClientUploadComplete={(res) => {
                                if (res?.[0]) {
                                    setDocs(prev => ({ ...prev, [field]: res[0].url }))
                                    toast.success(`${label} uploaded!`)
                                }
                            }}
                            onUploadError={() => { toast.error("Upload failed") }}
                            appearance={{
                                button: "bg-primary text-xs font-bold tracking-widest uppercase rounded-xl shadow-lg ring-2 ring-background px-6 scale-90",
                                allowedContent: "hidden"
                            }}
                        />
                    </div>
                </>
            )}
        </div>
    )

    return (
        <div className="min-h-screen app-gradient selection:bg-primary/20 pb-20">
            <header className="px-6 py-6 flex items-center justify-between sticky top-0 z-50 bg-background/80 backdrop-blur-2xl border-b border-border/50">
                <div>
                    <h1 className="text-2xl font-black tracking-tight flex items-center gap-2 text-foreground">
                        Onboarding <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    </h1>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mt-1">Complete your profile</p>
                </div>
                <ThemeToggle />
            </header>

            <main className="px-6 pt-6 animate-in slide-in-from-bottom-6 duration-700">
                <form onSubmit={handleSubmit} className="space-y-8">
                    
                    {/* Basic Details Section */}
                    <section className="space-y-4">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                <User className="w-4 h-4" />
                            </div>
                            <h2 className="text-sm font-bold tracking-widest text-foreground uppercase opacity-80">Basic Intel</h2>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">Date of Birth</label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <input 
                                        type="date" 
                                        required
                                        value={formData.dob}
                                        onChange={(e) => setFormData(prev => ({...prev, dob: e.target.value}))}
                                        className="w-full pl-10 pr-4 py-3 rounded-[1.25rem] bg-card border border-border/60 focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none text-sm font-medium transition-all"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">Gender</label>
                                <select 
                                    className="w-full px-4 py-3 rounded-[1.25rem] bg-card border border-border/60 focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none text-sm font-medium transition-all appearance-none"
                                    value={formData.gender}
                                    onChange={(e) => setFormData(prev => ({...prev, gender: e.target.value}))}
                                >
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">Full Address</label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-3.5 w-4 h-4 text-muted-foreground" />
                                <textarea 
                                    required
                                    rows={2}
                                    placeholder="Enter your current residential address..."
                                    value={formData.address}
                                    onChange={(e) => setFormData(prev => ({...prev, address: e.target.value}))}
                                    className="w-full pl-10 pr-4 py-3 rounded-[1.25rem] bg-card border border-border/60 focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none text-sm font-medium transition-all resize-none leading-relaxed"
                                />
                            </div>
                        </div>
                    </section>

                    {/* Professional Section */}
                    <section className="space-y-4 pt-4 border-t border-border/40">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                                <Briefcase className="w-4 h-4" />
                            </div>
                            <h2 className="text-sm font-bold tracking-widest text-foreground uppercase opacity-80">Professional</h2>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">Experience (Years)</label>
                                <input 
                                    type="number" 
                                    required
                                    min="0"
                                    value={formData.experience}
                                    onChange={(e) => setFormData(prev => ({...prev, experience: parseInt(e.target.value) || 0}))}
                                    className="w-full px-4 py-3 rounded-[1.25rem] bg-card border border-border/60 focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none text-sm font-medium transition-all text-center"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">Primary Skill</label>
                                <div className="relative">
                                    <Wrench className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <select 
                                        className="w-full pl-9 pr-4 py-3 rounded-[1.25rem] bg-card border border-border/60 focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none text-sm font-bold transition-all appearance-none"
                                        value={formData.primarySkill}
                                        onChange={(e) => setFormData(prev => ({...prev, primarySkill: e.target.value}))}
                                    >
                                        <option value="ELECTRICAL">Electrical</option>
                                        <option value="PLUMBING">Plumbing</option>
                                        <option value="MECHANICAL">Mechanical</option>
                                        <option value="HVAC">HVAC</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Documents Vault Section */}
                    <section className="space-y-4 pt-4 border-t border-border/40">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500">
                                <FileText className="w-4 h-4" />
                            </div>
                            <h2 className="text-sm font-bold tracking-widest text-foreground uppercase opacity-80">Document Vault</h2>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                            <div className="col-span-2">
                                <CustomUploadUI label="Scan Profile Photo" field="profilePhoto" />
                            </div>
                            <CustomUploadUI label="Aadhaar Card" field="aadhaar" />
                            <CustomUploadUI label="PAN Card" field="pan" />
                        </div>
                        <p className="text-[10px] text-muted-foreground font-bold text-center mt-3 uppercase tracking-widest">Supports PDF & Image Formats • Max 4MB</p>
                    </section>

                    {/* Submission Protocol */}
                    <div className="pt-6 pb-12">
                        <button 
                            type="submit"
                            disabled={loading}
                            className="group relative w-full overflow-hidden rounded-[1.5rem] bg-gradient-to-r from-primary to-primary/80 p-[1px] transition-all hover:scale-[1.01] active:scale-[0.98] shadow-xl shadow-primary/20 disabled:opacity-50 disabled:pointer-events-none"
                        >
                            <div className="absolute inset-0 bg-white/20 transition-transform duration-500 group-hover:translate-x-full" style={{ transform: 'translateX(-100%) skewX(-15deg)'}} />
                            <div className="flex items-center justify-center gap-3 bg-primary px-4 py-4 text-primary-foreground font-black tracking-widest uppercase rounded-[1.5rem] relative z-10 w-full text-sm">
                                {loading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        Submit Profile <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </div>
                        </button>
                        <p className="text-center text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-4">Automated Verification Protocol Active</p>
                    </div>
                </form>
            </main>
        </div>
    )
}
