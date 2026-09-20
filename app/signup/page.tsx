"use client"

import { useState, useEffect, useRef, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { useSSE } from "@/hooks/use-sse"
import { Step, SignupFormData } from "./types"
import { TechnicianStep1, TechnicianStep2, TechnicianStep3 } from "./components/technician-steps"
import { CompanyStep1, CompanyStep2 } from "./components/company-steps"
import { FinalReviewStep } from "./components/review-step"
import { WaitingStep, ApprovedStep } from "./components/status-screens"

function SignupContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const role = searchParams?.get("role") as "company" | "technician"

  const [isLoading, setIsLoading] = useState(false)
  const [step, setStep] = useState<Step>(role === 'technician' ? "details-tech-1" : "details-comp-1")

  const [formData, setFormData] = useState<SignupFormData>({
    phone: searchParams?.get("phone") || "",
    name: "", dob: "", gender: "", address: "", experience: "", experienceLevel: "", skills: [], primarySkill: "",
    eAadhaar: "", ePan: "", resume: "", photo: "",
    bankName: "", accountNumber: "", ifsc: "", upi: "",
    companyName: "", industry: "", gst: "", email: "", contactName: "", contactPhone: "", contactEmail: ""
  })

  const updateData = (data: Partial<SignupFormData>) => setFormData(prev => ({ ...prev, ...data }))

  // Load state from local storage on initial mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedRole = localStorage.getItem("signup_role");
      if (savedRole === role) {
        const savedData = localStorage.getItem("signup_formData");
        const savedStep = localStorage.getItem("signup_step");
        if (savedData) setFormData(JSON.parse(savedData));
        if (savedStep) setStep(savedStep as Step);
      } else {
        localStorage.setItem("signup_role", role || "");
      }
    }
  }, [role]);

  // Save state to local storage when it changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("signup_formData", JSON.stringify(formData));
      localStorage.setItem("signup_step", step);
    }
  }, [formData, step]);

  // Redirect to onboarding if role is missing or invalid
  useEffect(() => {
    const roleParam = searchParams?.get("role")
    if (roleParam !== "company" && roleParam !== "technician") {
      router.replace("/onboarding?role=company")
    }
  }, [searchParams, router])

  if (role !== "company" && role !== "technician") return null

  // OTP Animation State
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""])
  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  const { accountApproved, fallbackMode } = useSSE(step === "waiting")

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
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
          if (pollingRef.current) clearInterval(pollingRef.current)
          toast.success("Account approved!")
          setStep("approved")
        }
      } catch (e) {}
    }

    if (pollingRef.current) clearInterval(pollingRef.current)
    pollingRef.current = setInterval(pollForApproval, 30000)
    pollForApproval()

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [step, fallbackMode])

  // OTP Animation effect when approved
  useEffect(() => {
    if (step !== "approved") return

    const generatedOtp = Array.from({ length: 6 }, () => Math.floor(Math.random() * 10).toString())
    let index = 0

    const animateOtp = () => {
      if (index < 6) {
        setOtpDigits(prev => {
          const newDigits = [...prev]
          newDigits[index] = generatedOtp[index]
          return newDigits
        })
        index++
        setTimeout(animateOtp, 300)
      } else {
        setTimeout(() => {
          router.push(role === 'technician' ? "/technician/dashboard" : "/company/dashboard")
        }, 800)
      }
    }

    setTimeout(animateOtp, 500)
  }, [step, router, role])

  const handleFirstStep = async () => {
    if (formData.phone.length !== 10) return toast.error("Please enter a valid 10-digit phone number")
    if (role === 'technician') {
      if (!formData.name.trim() || !formData.dob || !formData.gender || !formData.address.trim()) return toast.error("Please fill in all personal details")
    } else {
      if (!formData.companyName.trim() || !formData.industry || !formData.gst || !formData.email || !formData.address.trim()) return toast.error("Please fill in all company details")
    }

    setIsLoading(true)
    try {
      const status = await api.checkUserStatus(formData.phone)
      if (!status.exists) {
        setStep(role === 'technician' ? "details-tech-2" : "details-comp-2")
      } else {
        if (status.status === 'PENDING_PROFILE' || status.status === 'PENDING_APPROVAL') {
          setStep("waiting")
        } else if (status.status === 'ACTIVE') {
          toast.info("Account exists and is active. Please login.")
          router.push(`/login?phone=${formData.phone}`)
        } else if (status.status === 'banned') {
          toast.error("Account suspended.")
        } else if (status.status === 'REJECTED') {
          toast.info("Updating existing application...")
          setStep(role === 'technician' ? "details-tech-2" : "details-comp-2")
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
        name: formData.name, dob: formData.dob, gender: formData.gender, address: formData.address, experience: formData.experience, experienceLevel: formData.experienceLevel, skills: formData.skills, primarySkill: formData.primarySkill,
        documents: { eAadhaar: formData.eAadhaar, ePan: formData.ePan, resume: formData.resume, photo: formData.photo },
        bankDetails: { bankName: formData.bankName, accountNumber: formData.accountNumber, ifsc: formData.ifsc, upi: formData.upi }
      } : {
        companyName: formData.companyName, industryType: formData.industry, address: formData.address, gstin: formData.gst, email: formData.email, contactPerson: formData.contactName, spokespersonPhone: formData.contactPhone, contactEmail: formData.contactEmail
      }
      const res = await api.sendOTP(formData.phone, role, details)
      if (res.error === 'PENDING_PROFILE' || res.error === 'PENDING_APPROVAL' || (res.success === false && res.message.includes("pending"))) {
        toast.info(res.message || "Account submitted for verification")
        setStep("waiting")
      } else if (res.success) {
        if (res.error === 'PENDING_PROFILE' || res.error === 'PENDING_APPROVAL') setStep("waiting")
        else {
          toast.info("Account already active.")
          localStorage.removeItem("signup_formData")
          localStorage.removeItem("signup_step")
          router.push(`/login?phone=${formData.phone}`)
        }
      } else {
        if (res.error === 'PENDING_PROFILE' || res.error === 'PENDING_APPROVAL') setStep("waiting")
        else toast.error(res.message || "Failed to submit")
      }
    } catch (error) {
      toast.error("Failed. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (role === 'company' || role === 'technician') document.title = role === 'company' ? 'MaintainU Portal' : 'MaintainU Field'
  }, [role])

  const appClass = role === 'company' ? 'app-company' : 'app-technician'
  const appName = role === 'company' ? 'MaintainU Portal' : 'MaintainU Field'

  return (
    <div className={`${appClass} min-h-screen flex items-center justify-center p-4 sm:p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-950 dark:to-slate-900`}>
      <div className="w-full max-w-xl glass p-6 sm:p-8 rounded-2xl sm:rounded-3xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="mb-6 space-y-2 text-center">
          <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-1">
            {role === "technician" ? "Technician Setup" : "Company Setup"}
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

        {step === "details-tech-1" && <TechnicianStep1 formData={formData} updateData={updateData} setStep={setStep} isLoading={isLoading} handleFirstStep={handleFirstStep} router={router} />}
        {step === "details-tech-2" && <TechnicianStep2 formData={formData} updateData={updateData} setStep={setStep} isLoading={isLoading} />}
        {step === "details-tech-3" && <TechnicianStep3 formData={formData} updateData={updateData} setStep={setStep} isLoading={isLoading} />}
        {step === "details-comp-1" && <CompanyStep1 formData={formData} updateData={updateData} setStep={setStep} isLoading={isLoading} handleFirstStep={handleFirstStep} router={router} />}
        {step === "details-comp-2" && <CompanyStep2 formData={formData} updateData={updateData} setStep={setStep} isLoading={isLoading} />}
        {step === "verify-required" && <FinalReviewStep role={role} formData={formData} setStep={setStep} isLoading={isLoading} handleSubmitForVerification={handleSubmitForVerification} />}
        {step === "waiting" && <WaitingStep />}
        {step === "approved" && <ApprovedStep otpDigits={otpDigits} />}
      </div>
    </div>
  )
}

export default function SignupScreen() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>}>
      <SignupContent />
    </Suspense>
  )
}
