"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { X, Loader2, CheckCircle2 } from "lucide-react"

import { api } from "@/lib/api"
import { toast } from "sonner"
import { UploadButton } from "@/lib/uploadthing"

export default function TechnicianRegisterContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const phone = searchParams?.get("phone") ?? ""
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)

  const [formData, setFormData] = useState({
    name: "",
    dob: "",
    gender: "",
    address: "",
    experience: "",
    primarySkill: "",
    aadharFront: "",
    aadharBack: "",
    pan: "",
    profilePhoto: "",
    resume: "",
    bankName: "",
    accountHolder: "",
    accountNumber: "",
    ifsc: "",
    upi: ""
  })

  // Fetch existing data on mount
  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true)
      try {
        const res = await api.refreshSession()
        if (res.success) {
          const profile = await api.getTechnicianProfile()
          if (profile.success && profile.data) {
            const data = profile.data;
            const docs = (data.documents || {}) as unknown as Record<string, string | undefined>;
            const bank = (data.bankDetails || {}) as unknown as Record<string, string | undefined>;
            
            setFormData(prev => ({
              ...prev,
              name: data.name || "",
              dob: data.dob || "",
              gender: data.gender || "",
              address: data.address || "",
              experience: data.experience?.toString() || "",
              primarySkill: data.primarySkill || "",
              aadharFront: docs.aadharFront || "",
              aadharBack: docs.aadharBack || "",
              pan: docs.panCard || docs.pan || "",
              profilePhoto: docs.profilePhotoUrl || docs.profilePhoto || "",
              resume: docs.resumeUrl || docs.resume || "",
              bankName: bank.bankName || "",
              accountHolder: bank.accountHolder || data.name || "",
              accountNumber: bank.accountNumber || "",
              ifsc: bank.ifsc || "",
              upi: bank.upi || ""
            }))

            // Determine starting step
            if (!data.dob || !data.gender || !data.address) setStep(1)
            else if (!data.experience || !data.primarySkill) setStep(2)
            else if (!docs.aadharFront || !docs.panCard) setStep(3)
            else setStep(4)
          }
        }
      } catch (err) {
        console.error("Failed to load profile", err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchProfile()
  }, [])

  const handleNext = () => {
    if (step < 4) setStep(step + 1)
  }

  const handleSubmit = async () => {
    setIsLoading(true)
    try {
      const res = await api.registerTechnician({ 
        phone, 
        ...formData,
        documents: {
          aadharFront: formData.aadharFront,
          aadharBack: formData.aadharBack,
          panCard: formData.pan,
          profilePhoto: formData.profilePhoto,
          resume: formData.resume
        }
      })
      if (res.success) {
        toast.success("Profile completed!")
        router.push("/technician/dashboard")
      }
    } catch (e) {
      toast.error("Registration failed")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="app-technician min-h-screen px-6 pt-6 pb-24 bg-background">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Register as Technician</h1>
        <button onClick={() => router.back()} className="p-2 hover:bg-muted rounded-full transition-colors">
          <X className="w-5 h-5" strokeWidth={2} />
        </button>
      </div>

      <div className="flex gap-2 mb-8">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className={`flex-1 h-1.5 rounded-full transition-all ${s <= step ? "bg-primary" : "bg-muted"}`} />
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-4 mb-8 animate-in slide-in-from-right-4 fade-in duration-300">
          <h2 className="text-lg font-bold text-foreground">Personal Details</h2>
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Full Name"
              className="w-full px-4 py-3.5 rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <input
              type="date"
              className="w-full px-4 py-3.5 rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium"
              value={formData.dob}
              onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
            />
            <div className="relative">
              <select
                className="w-full px-4 py-3.5 rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all appearance-none font-medium text-foreground bg-transparent"
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
              >
                <option>Select Gender</option>
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>
            <input
              type="text"
              placeholder="Address"
              className="w-full px-4 py-3.5 rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4 mb-8 animate-in slide-in-from-right-4 fade-in duration-300">
          <h2 className="text-lg font-bold text-foreground">Professional Details</h2>
          <div className="space-y-4">
            <input
              type="number"
              placeholder="Years of Experience"
              className="w-full px-4 py-3.5 rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium"
              value={formData.experience}
              onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
            />
            <div className="relative">
              <select
                className="w-full px-4 py-3.5 rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all appearance-none font-medium"
                value={formData.primarySkill}
                onChange={(e) => setFormData({ ...formData, primarySkill: e.target.value })}
              >
                <option>Select Primary Skill</option>
                <option>Electrical</option>
                <option>Mechanical</option>
                <option>HVAC</option>
                <option>Plumbing</option>
                <option>Assembly</option>
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-6 mb-8 animate-in slide-in-from-right-4 fade-in duration-300">
          <h2 className="text-lg font-bold text-foreground">Identity & Documents</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-dashed border-border bg-card/50 flex flex-col items-center gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Profile Photo</span>
              {formData.profilePhoto ? (
                <img src={formData.profilePhoto} className="w-20 h-20 rounded-full object-cover border-2 border-primary" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center text-muted-foreground">Photo</div>
              )}
              <UploadButton
                endpoint="technicianDocs"
                onClientUploadComplete={(res) => {
                  setFormData(prev => ({ ...prev, profilePhoto: res[0].url }))
                  toast.success("Photo uploaded")
                }}
                onUploadError={(error) => {
                  toast.error("Upload failed")
                }}
                className="ut-button:bg-primary ut-button:ut-readying:bg-primary/50 text-xs shadow-none"
              />
            </div>

            <div className="p-4 rounded-xl border border-dashed border-border bg-card/50 flex flex-col items-center gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Resume (PDF)</span>
              {formData.resume ? (
                <div className="flex items-center gap-2 text-primary font-bold text-sm">
                  <CheckCircle2 className="w-4 h-4" /> Resume Attached
                </div>
              ) : (
                <div className="w-20 h-10 rounded-lg bg-muted flex items-center justify-center text-xs text-muted-foreground">No File</div>
              )}
              <UploadButton
                endpoint="technicianDocs"
                onClientUploadComplete={(res) => {
                  setFormData(prev => ({ ...prev, resume: res[0].url }))
                  toast.success("Resume uploaded")
                }}
                onUploadError={(error) => {
                  toast.error("PDF Upload failed")
                }}
                className="ut-button:bg-primary text-xs shadow-none"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-4 rounded-xl border border-border bg-card space-y-3">
              <label className="text-sm font-bold text-foreground">Aadhaar Card (Front)</label>
              <div className="flex items-center gap-4">
                {formData.aadharFront && <img src={formData.aadharFront} className="w-16 h-10 rounded object-cover border border-border" />}
                <UploadButton
                  endpoint="technicianDocs"
                  onClientUploadComplete={(res) => {
                    setFormData(prev => ({ ...prev, aadharFront: res[0].url }))
                    toast.success("Aadhaar Front uploaded")
                  }}
                  onUploadError={(error) => {
                  toast.error("Upload failed")
                }}
                  className="ut-button:bg-primary ut-button:h-9 ut-button:px-4 text-xs ut-button:w-auto"
                />
              </div>
            </div>

            <div className="p-4 rounded-xl border border-border bg-card space-y-3">
              <label className="text-sm font-bold text-foreground">Aadhaar Card (Back)</label>
              <div className="flex items-center gap-4">
                {formData.aadharBack && <img src={formData.aadharBack} className="w-16 h-10 rounded object-cover border border-border" />}
                <UploadButton
                  endpoint="technicianDocs"
                  onClientUploadComplete={(res) => {
                    setFormData(prev => ({ ...prev, aadharBack: res[0].url }))
                    toast.success("Aadhaar Back uploaded")
                  }}
                  onUploadError={(error) => {
                  toast.error("Upload failed")
                }}
                  className="ut-button:bg-primary ut-button:h-9 ut-button:px-4 text-xs ut-button:w-auto"
                />
              </div>
            </div>

            <div className="p-4 rounded-xl border border-border bg-card space-y-3">
              <label className="text-sm font-bold text-foreground">PAN Card</label>
              <div className="flex items-center gap-4">
                {formData.pan && <img src={formData.pan} className="w-16 h-10 rounded object-cover border border-border" />}
                <UploadButton
                  endpoint="technicianDocs"
                  onClientUploadComplete={(res) => {
                    setFormData(prev => ({ ...prev, pan: res[0].url }))
                    toast.success("PAN uploaded")
                  }}
                  onUploadError={(error) => {
                  toast.error("Upload failed")
                }}
                  className="ut-button:bg-primary ut-button:h-9 ut-button:px-4 text-xs ut-button:w-auto"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4 mb-8 animate-in slide-in-from-right-4 fade-in duration-300">
          <h2 className="text-lg font-bold text-foreground">Bank Details</h2>
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Bank Name"
              className="w-full px-4 py-3.5 rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium"
              value={formData.bankName}
              onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
            />
            <input
              type="text"
              placeholder="Account Holder Name"
              className="w-full px-4 py-3.5 rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium"
              value={formData.accountHolder}
              onChange={(e) => setFormData({ ...formData, accountHolder: e.target.value })}
            />
            <input
              type="text"
              placeholder="Account Number"
              className="w-full px-4 py-3.5 rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium"
              value={formData.accountNumber}
              onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
            />
            <input
              type="text"
              placeholder="IFSC Code"
              className="w-full px-4 py-3.5 rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium uppercase placeholder:normal-case"
              value={formData.ifsc}
              onChange={(e) => setFormData({ ...formData, ifsc: e.target.value })}
            />
            <input
              type="text"
              placeholder="UPI ID (Optional)"
              className="w-full px-4 py-3.5 rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium"
              value={formData.upi}
              onChange={(e) => setFormData({ ...formData, upi: e.target.value })}
            />
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-4 fixed bottom-8 left-6 right-6">
        <button
          onClick={() => setStep(step - 1)}
          disabled={step === 1}
          className="py-3.5 px-6 rounded-xl border border-border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold shadow-sm"
        >
          Back
        </button>
        {step < 4 ? (
          <button
            onClick={handleNext}
            className="flex-1 py-3.5 px-6 rounded-xl bg-primary text-primary-foreground font-bold hover:opacity-90 transition-all shadow-lg shadow-primary/20"
          >
            Next
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="flex-1 py-3.5 px-6 rounded-xl bg-primary text-primary-foreground font-bold hover:opacity-90 transition-all shadow-lg shadow-primary/20 flex items-center justify-center"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : step === 4 ? "Complete Setup" : "Submit Application"}
          </button>
        )}
      </div>

      {isLoading && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <p className="text-sm font-bold text-muted-foreground">Checking Profile Status...</p>
          </div>
        </div>
      )}
    </div>
  )
}
