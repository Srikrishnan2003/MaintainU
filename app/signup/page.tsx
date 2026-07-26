"use client"

import { useState, useEffect, useRef, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2, ShieldCheck, CheckCircle2, Clock, Home, ArrowRight, FileText } from "lucide-react"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { UploadButton } from "@/lib/uploadthing"
import { useSSE } from "@/hooks/use-sse"

type Step = "details-tech-1" | "details-tech-2" | "details-tech-3" | "details-comp-1" | "details-comp-2" | "verify-required" | "waiting" | "approved"

function SignupContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const role = searchParams?.get("role") as "company" | "technician"

  const [phone, setPhone] = useState(searchParams?.get("phone") || "")
  const [isLoading, setIsLoading] = useState(false)
  const [step, setStep] = useState<Step>(role === 'technician' ? "details-tech-1" : "details-comp-1")

  // Redirect to onboarding if role is missing or invalid
  useEffect(() => {
    const roleParam = searchParams?.get("role")
    if (roleParam !== "company" && roleParam !== "technician") {
      router.replace("/onboarding")
    }
  }, [searchParams, router])

  if (role !== "company" && role !== "technician") {
    return null
  }

  // Common/Technician Data
  const [name, setName] = useState("")
  const [dob, setDob] = useState("")
  const [gender, setGender] = useState("")
  const [address, setAddress] = useState("")
  const [experience, setExperience] = useState("")
  const [primarySkill, setPrimarySkill] = useState("")
  
  // Documents
  const [aadharFront, setAadharFront] = useState("")
  const [aadharBack, setAadharBack] = useState("")
  const [panCard, setPanCard] = useState("")
  const [resume, setResume] = useState("")
  const [photo, setPhoto] = useState("")
  
  // Bank Details
  const [bankName, setBankName] = useState("")
  const [accountNumber, setAccountNumber] = useState("")
  const [ifsc, setIfsc] = useState("")
  const [upi, setUpi] = useState("")

  // Company Data
  const [companyName, setCompanyName] = useState("")
  const [industry, setIndustry] = useState("")
  const [gst, setGst] = useState("")
  const [email, setEmail] = useState("")
  const [contactName, setContactName] = useState("")
  const [contactPhone, setContactPhone] = useState("")
  const [contactEmail, setContactEmail] = useState("")

  // OTP Animation State
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""])
  const [animatingIndex, setAnimatingIndex] = useState(-1)
  const pollingRef = useRef<NodeJS.Timeout | null>(null)

  const { accountApproved, fallbackMode } = useSSE(step === "waiting")

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
      }
    }
  }, [])

  // Handle SSE Approval
  useEffect(() => {
    if (step === "waiting" && accountApproved) {
      toast.success("Account approved!")
      setStep("approved")
    }
  }, [step, accountApproved])

  // Fallback Polling
  useEffect(() => {
    if (step !== "waiting" || !fallbackMode) return

    const pollForApproval = async () => {
      try {
        const res = await api.refreshSession()
        if (res.success && res.status === 'ACTIVE') {
          if (pollingRef.current) {
            clearInterval(pollingRef.current)
            pollingRef.current = null
          }
          toast.success("Account approved!")
          setStep("approved")
        }
      } catch (e) {
        // Silently ignore
      }
    }

    if (pollingRef.current) clearInterval(pollingRef.current)
    pollingRef.current = setInterval(pollForApproval, 30000)
    pollForApproval()

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
    }
  }, [step, fallbackMode])

  // OTP Animation effect when approved
  useEffect(() => {
    if (step !== "approved") return

    // Generate random secure code
    const generatedOtp = Array.from({ length: 6 }, () => Math.floor(Math.random() * 10).toString())
    let index = 0

    const animateOtp = () => {
      if (index < 6) {
        setAnimatingIndex(index)
        setOtpDigits(prev => {
          const newDigits = [...prev]
          newDigits[index] = generatedOtp[index]
          return newDigits
        })
        index++
        setTimeout(animateOtp, 300)
      } else {
        // Animation complete, redirect to dashboard
        setTimeout(() => {
          router.push(role === 'technician' ? "/technician/dashboard" : "/company/dashboard")
        }, 800)
      }
    }

    setTimeout(animateOtp, 500)
  }, [step, router, role, phone])

  const handleFirstStep = async () => {
    if (phone.length !== 10) {
      toast.error("Please enter a valid 10-digit phone number")
      return
    }

    if (role === 'technician') {
      if (!name.trim() || !dob || !gender || !address.trim()) {
        toast.error("Please fill in all personal details")
        return
      }
    } else {
      if (!companyName.trim() || !industry || !gst || !email || !address.trim()) {
        toast.error("Please fill in all company details")
        return
      }
    }

    setIsLoading(true)
    try {
      const status = await api.checkUserStatus(phone)

      if (!status.exists) {
        if (role === 'technician') {
          setStep("details-tech-2")
        } else {
          setStep("details-comp-2")
        }
      } else {
        if (status.status === 'PENDING_PROFILE' || status.status === 'PENDING_APPROVAL') {
          setStep("waiting")
        } else if (status.status === 'ACTIVE') {
          toast.info("Account exists and is active. Please login.")
          router.push(`/login?phone=${phone}`)
        } else if (status.status === 'banned') {
          toast.error("Account suspended.")
        } else if (status.status === 'REJECTED') {
          toast.info("Updating existing application...")
          if (role === 'technician') {
            setStep("details-tech-2")
          } else {
            setStep("details-comp-2")
          }
        } else {
          toast.error(`Account status: ${status.status}. Please contact support.`);
        }
      }
    } catch (e) {
      toast.error("An error occurred.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmitForVerification = async () => {
    setIsLoading(true)
    try {
      const details = role === 'technician' ? {
        name,
        dob,
        gender,
        address,
        experience,
        primarySkill,
        documents: { aadharFront, aadharBack, panCard, resume, photo },
        bankDetails: { bankName, accountNumber, ifsc, upi }
      } : {
        companyName,
        industryType: industry,
        address,
        gstin: gst,
        email,
        contactPerson: contactName,
        spokespersonPhone: contactPhone,
        contactEmail
      }

      const res = await api.sendOTP(phone, role, details)

      if (res.error === 'PENDING_PROFILE' || res.error === 'PENDING_APPROVAL' || (res.success === false && res.message.includes("pending"))) {
        toast.info(res.message || "Account submitted for verification")
        setStep("waiting")
      } else if (res.success) {
        if (res.error === 'PENDING_PROFILE' || res.error === 'PENDING_APPROVAL') setStep("waiting")
        else {
          toast.info("Account already active.")
          router.push(`/login?phone=${phone}`)
        }
      } else {
        if (res.error === 'PENDING_PROFILE' || res.error === 'PENDING_APPROVAL') {
          setStep("waiting")
        } else {
          toast.error(res.message || "Failed to submit")
        }
      }
    } catch (error) {
      toast.error("Failed. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const resetFlow = () => {
    setStep(role === 'technician' ? "details-tech-1" : "details-comp-1")
    setPhone("")
  }

  useEffect(() => {
    if (role === 'company' || role === 'technician') {
      document.title = role === 'company' ? 'MaintainU Portal' : 'MaintainU Field'
    }
  }, [role])

  const appClass = role === 'company' ? 'app-company' : 'app-technician'
  const appName = role === 'company' ? 'MaintainU Portal' : 'MaintainU Field'

  return (
    <div className={`${appClass} min-h-screen flex items-center justify-center p-4 sm:p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-950 dark:to-slate-900`}>
      <div className="w-full max-w-lg glass p-6 sm:p-8 rounded-2xl sm:rounded-3xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="mb-6 space-y-2 text-center">
          <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-1">
            {appName} — {role === "technician" ? "Technician Registration" : "Company Registration"}
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            {step === "details-tech-1" && "Personal Details"}
            {step === "details-tech-2" && "Professional Details"}
            {step === "details-tech-3" && "Documentation"}
            {step === "details-comp-1" && "Company Details"}
            {step === "details-comp-2" && "Primary Contact"}
            {step === "verify-required" && "Final Review"}
            {step === "waiting" && "Verification Pending"}
            {step === "approved" && "Verified!"}
          </h1>
        </div>

        {/* Technician Step 1: Personal + Phone */}
        {step === "details-tech-1" && (
          <div className="space-y-4 animate-in slide-in-from-right-4 fade-in duration-300">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground ml-1">Phone Number</label>
                <div className="flex gap-3">
                  <div className="px-4 py-3 rounded-xl border border-border bg-muted/50 font-semibold text-muted-foreground text-sm">+91</div>
                  <input
                    type="tel"
                    placeholder="98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className="flex-1 px-4 py-3 rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium text-sm"
                    maxLength={10}
                  />
                </div>
              </div>
              <input
                type="text" placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3.5 rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
              />
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground ml-1">Date of Birth</label>
                <input
                  type="date" value={dob} onChange={(e) => setDob(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                />
              </div>
              <div className="relative">
                <select
                  value={gender} onChange={(e) => setGender(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium appearance-none"
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                   <ArrowRight className="w-4 h-4 rotate-90" />
                </div>
              </div>
              <textarea
                placeholder="Full Address" value={address} onChange={(e) => setAddress(e.target.value)}
                className="w-full px-4 py-3.5 rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium min-h-[100px]"
              />
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => router.push("/onboarding")} 
                className="flex-1 py-4 rounded-xl border border-border font-bold hover:bg-muted/50 transition-colors"
                disabled={isLoading}
              >
                Back
              </button>
              <button 
                onClick={handleFirstStep} 
                className="flex-[2] py-4 rounded-xl bg-primary text-white font-bold flex items-center justify-center gap-2"
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Next Step"}
                {!isLoading && <ArrowRight className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}

        {/* Technician Step 2: Professional */}
        {step === "details-tech-2" && (
          <div className="space-y-4 animate-in slide-in-from-right-4 fade-in duration-300">
            <div className="space-y-4">
              <input
                type="number" placeholder="Years of Experience" value={experience} onChange={(e) => setExperience(e.target.value)}
                className="w-full px-4 py-3.5 rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
              />
              <div className="relative">
                <select
                  value={primarySkill} onChange={(e) => setPrimarySkill(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium appearance-none"
                >
                  <option value="">Select Primary Skill</option>
                  <option value="Electrical">Electrical</option>
                  <option value="Mechanical">Mechanical</option>
                  <option value="HVAC">HVAC</option>
                  <option value="Plumbing">Plumbing</option>
                  <option value="Assembly">Assembly</option>
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                  <ArrowRight className="w-4 h-4 rotate-90" />
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep("details-tech-1")} className="flex-1 py-4 rounded-xl border border-border font-bold">Back</button>
              <button onClick={() => setStep("details-tech-3")} className="flex-[2] py-4 rounded-xl bg-primary text-white font-bold flex items-center justify-center gap-2">
                Next <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {step === "details-tech-3" && (
          <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
            <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider px-1">Required Documents</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Profile Photo */}
              <div className="p-4 rounded-2xl border border-dashed border-border bg-card/30 flex flex-col items-center gap-3 transition-all hover:bg-card/50">
                <div className="flex flex-col items-center">
                   <span className="text-[10px] font-black uppercase text-muted-foreground">Profile Photo</span>
                   <span className="text-[9px] text-muted-foreground/60 font-medium">Image • Max 2MB</span>
                </div>
                {photo ? (
                  <img src={photo} className="w-14 h-14 rounded-full object-cover border-2 border-primary shadow-sm" />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground/40 border border-border">
                    <Home className="w-6 h-6" />
                  </div>
                )}
                <UploadButton
                  endpoint="technicianDocs"
                  onClientUploadComplete={(res) => {
                    setPhoto(res[0].url)
                    toast.success("Profile photo uploaded successfully")
                  }}
                  onUploadError={(error) => {
                    toast.error(`Photo Error: ${error.message}`, {
                      style: { background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca' }
                    })
                  }}
                  content={{ button: () => photo ? "Update Photo" : "Upload Photo" }}
                  appearance={{
                    button: `w-full h-9 text-[11px] font-bold rounded-xl transition-all shadow-sm ${photo ? 'bg-green-600 hover:bg-green-700' : 'bg-primary hover:bg-primary/90'}`,
                    allowedContent: "hidden"
                  }}
                />
              </div>

              {/* Resume */}
              <div className="p-4 rounded-2xl border border-dashed border-border bg-card/30 flex flex-col items-center gap-3 transition-all hover:bg-card/50">
                <div className="flex flex-col items-center">
                   <span className="text-[10px] font-black uppercase text-muted-foreground">Resume / CV</span>
                   <span className="text-[9px] text-muted-foreground/60 font-medium">PDF Only • Max 4MB</span>
                </div>
                {resume ? (
                  <div className="w-14 h-14 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center text-green-600">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-muted/50 flex items-center justify-center text-muted-foreground/40 border border-border">
                    <FileText className="w-6 h-6" />
                  </div>
                )}
                <UploadButton
                  endpoint="technicianDocs"
                  onClientUploadComplete={(res) => {
                    setResume(res[0].url)
                    toast.success("Resume uploaded successfully")
                  }}
                  onUploadError={(error) => {
                    toast.error(`Resume Error: ${error.message}`, {
                      style: { background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca' }
                    })
                  }}
                  content={{ button: () => resume ? "Update PDF" : "Upload PDF" }}
                  appearance={{
                    button: `w-full h-9 text-[11px] font-bold rounded-xl transition-all shadow-sm ${resume ? 'bg-green-600 hover:bg-green-700' : 'bg-primary hover:bg-primary/90'}`,
                    allowedContent: "hidden"
                  }}
                />
              </div>
            </div>

            <div className="space-y-3">
              {[
                { label: "Aadhaar Card (Front)", state: aadharFront, setter: setAadharFront, type: "Image • Max 2MB" },
                { label: "Aadhaar Card (Back)", state: aadharBack, setter: setAadharBack, type: "Image • Max 2MB" },
                { label: "PAN Card", state: panCard, setter: setPanCard, type: "Image • Max 2MB" }
              ].map((doc, idx) => (
                <div key={idx} className="p-3.5 rounded-2xl border border-border bg-white dark:bg-card/50 flex items-center justify-between gap-4 transition-all hover:border-primary/30">
                  <div className="flex flex-col">
                    <label className="text-xs font-bold text-foreground">{doc.label}</label>
                    <span className="text-[9px] text-muted-foreground/70 font-medium">{doc.type}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {doc.state && <img src={doc.state} className="w-10 h-6 rounded-md object-cover border border-border shadow-sm" />}
                    <UploadButton
                      endpoint="technicianDocs"
                      onClientUploadComplete={(res) => {
                        doc.setter(res[0].url)
                        toast.success(`${doc.label} uploaded`)
                      }}
                      onUploadError={(error) => {
                        toast.error(`${doc.label} Error: ${error.message}`, {
                          style: { background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca' }
                        })
                      }}
                      content={{ button: () => doc.state ? "Update" : "Upload" }}
                      appearance={{
                        button: `h-8 px-4 text-[10px] font-bold rounded-lg transition-all shadow-sm ${doc.state ? 'bg-green-600 hover:bg-green-700' : 'bg-primary hover:bg-primary/90'}`,
                        allowedContent: "hidden"
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep("details-tech-2")} className="flex-1 py-4 rounded-xl border border-border font-bold">Back</button>
              <button onClick={() => setStep("verify-required")} className="flex-[2] py-4 rounded-xl bg-primary text-white font-bold flex items-center justify-center gap-2">
                Review <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}


        {/* Company Step 1: Company Details + Phone */}
        {step === "details-comp-1" && (
          <div className="space-y-4 animate-in slide-in-from-right-4 fade-in duration-300">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground ml-1">Phone Number</label>
                <div className="flex gap-3">
                  <div className="px-4 py-3 rounded-xl border border-border bg-muted/50 font-semibold text-muted-foreground text-sm">+91</div>
                  <input
                    type="tel"
                    placeholder="98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className="flex-1 px-4 py-3 rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium text-sm"
                    maxLength={10}
                  />
                </div>
              </div>
              <input
                type="text" placeholder="Company Name" value={companyName} onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-4 py-3.5 rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
              />
              <div className="relative">
                <select
                  value={industry} onChange={(e) => setIndustry(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium appearance-none"
                >
                  <option value="">Select Industry</option>
                  <option value="Manufacturing">Manufacturing</option>
                  <option value="Textile">Textile</option>
                  <option value="Food & Beverage">Food & Beverage</option>
                  <option value="Other">Other</option>
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                   <ArrowRight className="w-4 h-4 rotate-90" />
                </div>
              </div>
              <input
                type="text" placeholder="GST Number" value={gst} onChange={(e) => setGst(e.target.value.toUpperCase())}
                className="w-full px-4 py-3.5 rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                maxLength={15}
              />
              <input
                type="email" placeholder="Company Email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3.5 rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
              />
              <textarea
                placeholder="Business Address" value={address} onChange={(e) => setAddress(e.target.value)}
                className="w-full px-4 py-3.5 rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium min-h-[100px]"
              />
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => router.push("/onboarding")} 
                className="flex-1 py-4 rounded-xl border border-border font-bold hover:bg-muted/50 transition-colors"
                disabled={isLoading}
              >
                Back
              </button>
              <button 
                onClick={handleFirstStep} 
                className="flex-[2] py-4 rounded-xl bg-primary text-white font-bold flex items-center justify-center gap-2"
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Next Step"}
                {!isLoading && <ArrowRight className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}

        {/* Company Step 2: Contact Details */}
        {step === "details-comp-2" && (
          <div className="space-y-4 animate-in slide-in-from-right-4 fade-in duration-300">
            <div className="space-y-4">
              <input
                type="text" placeholder="Contact Person Name" value={contactName} onChange={(e) => setContactName(e.target.value)}
                className="w-full px-4 py-3.5 rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
              />
              <input
                type="tel" placeholder="Contact Phone" value={contactPhone} onChange={(e) => setContactPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                className="w-full px-4 py-3.5 rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                maxLength={10}
              />
              <input
                type="email" placeholder="Contact Email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)}
                className="w-full px-4 py-3.5 rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep("details-comp-1")} className="flex-1 py-4 rounded-xl border border-border font-bold">Back</button>
              <button onClick={() => setStep("verify-required")} className="flex-[2] py-4 rounded-xl bg-primary text-white font-bold flex items-center justify-center gap-2">
                Review <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Final Step: Review & Submit */}
        {step === "verify-required" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto ring-8 ring-blue-50 dark:ring-blue-950/20">
              <ShieldCheck className="w-10 h-10 text-blue-600 dark:text-blue-400" />
            </div>

            <div className="bg-white/50 dark:bg-card/50 rounded-2xl p-6 text-sm space-y-3 border border-border/50 max-h-[250px] overflow-y-auto scrollbar-hide shadow-inner">
              <div className="flex justify-between border-b border-border/50 pb-2">
                <span className="font-semibold text-muted-foreground">Main Phone:</span>
                <span className="font-mono">+91 {phone}</span>
              </div>
              {role === 'technician' ? (
                <>                   <div className="flex justify-between"><span className="text-muted-foreground">Name:</span> <span className="font-medium">{name || "-"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Skill:</span> <span className="font-medium">{primarySkill || "-"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Exp:</span> <span className="font-medium">{experience || "0"} YRS</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Docs:</span> <span className="font-medium text-blue-600">{aadharFront && aadharBack && panCard && resume && photo ? "Full" : "Partial"}</span></div>
                </>
              ) : (
                <>
                  <div className="flex justify-between"><span className="text-muted-foreground">Company:</span> <span className="font-medium">{companyName || "-"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Industry:</span> <span className="font-medium">{industry || "-"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">GST:</span> <span className="uppercase font-medium">{gst || "-"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Contact:</span> <span className="font-medium">{contactName || "-"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Contact Phone:</span> <span className="font-medium">{contactPhone || "-"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Company Email:</span> <span className="font-medium">{email || "-"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Business Address:</span> <span className="font-medium">{address || "-"}</span></div>
                </>
              )}
            </div>

            <div className="space-y-3">
              <button
                onClick={handleSubmitForVerification}
                disabled={isLoading}
                className="w-full py-4 rounded-xl bg-primary text-white font-bold hover:bg-primary/90 disabled:opacity-50 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
              >
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                {isLoading ? "Submitting..." : "Submit for Approval"}
              </button>
               <button
                 onClick={() => role === 'technician' ? setStep("details-tech-3") : setStep("details-comp-2")}
                 className="w-full py-3 rounded-xl border border-border font-bold hover:bg-muted/50 transition-all"
              >
                Back to Edit
              </button>
            </div>
          </div>
        )}

        {/* Status Screens */}
        {step === "waiting" && (
           <div className="space-y-6 text-center animate-in fade-in duration-300 py-10">
             <div className="w-24 h-24 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mx-auto ring-8 ring-orange-50 dark:ring-orange-950/20 shadow-lg">
               <Clock className="w-12 h-12 text-orange-600 dark:text-orange-400 animate-pulse" />
             </div>
             <div className="space-y-3">
               <h2 className="text-2xl font-black tracking-tight">Reviewing Profile</h2>
               <p className="text-muted-foreground text-sm leading-relaxed px-6">
                 All details submitted! Our administrative team is currently reviewing your profile.
                 <br /><span className="text-[10px] mt-2 block opacity-70">This screen will update automatically.</span>
               </p>
             </div>
             <div className="flex gap-2 items-center justify-center text-xs text-muted-foreground pt-4">
               <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" />
               <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce [animation-delay:0.2s]" />
               <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce [animation-delay:0.4s]" />
             </div>
           </div>
        )}

        {step === "approved" && (
          <div className="space-y-6 text-center animate-in fade-in duration-300 py-10">
            <div className="w-24 h-24 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto ring-8 ring-green-50 dark:ring-green-950/20 shadow-lg">
              <CheckCircle2 className="w-12 h-12 text-green-600 dark:text-green-400" />
            </div>
            <div className="space-y-3">
              <h2 className="text-2xl font-bold">Approved!</h2>
              <p className="text-muted-foreground text-sm">Automating your login access...</p>
            </div>
            <div className="flex justify-center gap-3 my-8">
              {otpDigits.map((digit, i) => (
                <div key={i} className={`w-12 h-16 rounded-2xl border flex items-center justify-center text-3xl font-bold transition-all ${digit ? "border-green-500 bg-green-500/10 text-green-600 shadow-md" : "border-border bg-background"}`}>
                  <span className="animate-in zoom-in duration-300">{digit}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function SignupScreen() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      }
    >
      <SignupContent />
    </Suspense>
  )
}
