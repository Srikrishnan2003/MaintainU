"use client"

import { useState, useEffect, useRef, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2, Clock, ShieldCheck, Home, Lock, Phone, ArrowRight, CheckCircle2, Building2, Wrench } from "lucide-react"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { useSSE } from "@/hooks/use-sse"
import { Logo } from "@/components/ui/logo"

type Step = "login" | "verify-required" | "waiting" | "approved" | "otp-entry"

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  // Auto-fill phone from URL if present
  const initialPhone = searchParams?.get("phone") || ""

  const [phone, setPhone] = useState(initialPhone)
  const [role, setRole] = useState<"company" | "technician" | "admin">("company")
  const [step, setStep] = useState<Step>("login")
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [otpInput, setOtpInput] = useState<string[]>(["", "", "", "", "", ""])
  const pollingRef = useRef<NodeJS.Timeout | null>(null)

  const { accountApproved, fallbackMode } = useSSE(step === "waiting")

  // OTP Animation State
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""])
  const [animatingIndex, setAnimatingIndex] = useState(-1)

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
        if (step === "waiting") {
          const res = await api.refreshSession()
          if (res.success && (res.status === 'ACTIVE')) {
            if (pollingRef.current) clearInterval(pollingRef.current)
            pollingRef.current = null
            toast.success("Account approved!")
            setStep("approved")
          }
        }
      } catch (e) {
        // Silently ignore polling errors
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

    // Start animation after a brief delay
    setTimeout(animateOtp, 500)
  }, [step, router, role])

  const handleLogin = async () => {
    if (phone.length !== 10) {
      toast.error("Please enter a valid 10-digit phone number")
      return
    }
    setErrorMessage("")

    setIsLoading(true)
    try {
      const status = await api.checkUserStatus(phone)

      if (!status.exists) {
        setErrorMessage("No account available. Please Sign Up to continue.")
        toast.error("No account found with this phone number. Please register first.")
      } else {
        setRole(status.role)
        if (status.status === 'PENDING_APPROVAL' || status.status === 'PENDING_PROFILE') {
          setStep("waiting")
        } else if (status.status === 'ACTIVE') {
          // Trigger OTP send
          const res = await api.sendOTP(phone, status.role === 'admin' ? undefined : status.role)
          if (res.success || res.message.includes("OTP")) {
            toast.success("OTP sent to your console!")
            setStep("otp-entry")
            setOtpInput(["", "", "", "", "", ""])
            // Focus first OTP field
            setTimeout(() => {
              document.getElementById("otp-input-0")?.focus()
            }, 100)
          } else {
            toast.error(res.message || "Failed to send OTP")
          }
        } else if (status.status === 'REJECTED') {
          toast.error("Account suspended or rejected. Please contact support.")
        }
      }
    } catch (error) {
      toast.error("An error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyOTP = async (codeStr: string) => {
    if (codeStr.length !== 6) {
      toast.error("Please enter a 6-digit OTP")
      return
    }

    setIsLoading(true)
    try {
      const res = await api.verifyOTP(phone, codeStr) as { success: boolean; message?: string; role?: string; data?: any }
      if (res.success) {
        toast.success("Welcome back!")
        const userRole = res.data?.role || res.role || role
        const targetDashboard = userRole === 'technician' ? '/technician/dashboard' : '/company/dashboard'
        router.push(targetDashboard)
      } else {
        toast.error(res.message || "Invalid OTP code")
      }
    } catch (e) {
      toast.error("Verification failed. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  // When user clicks Submit for Verification
  const handleSubmitForVerification = async () => {
    setIsLoading(true)
    try {
      const sigupRole = role === 'admin' ? 'company' : role
      const res = await api.sendOTP(phone, sigupRole)

      if (res.error === 'PENDING_APPROVAL' || res.error === 'PENDING_PROFILE') {
        toast.info(res.message || "Account submitted for verification")
        setStep("waiting")
      } else if (res.success) {
        toast.info("Account exists. Please login.")
        setStep("login")
      } else {
        toast.error(res.message || "Failed to submit")
      }
    } catch (error) {
      toast.error("Failed. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleOtpChange = (index: number, val: string) => {
    const cleanVal = val.replace(/\D/g, "")
    if (!cleanVal) return

    const newOtpInput = [...otpInput]
    newOtpInput[index] = cleanVal
    setOtpInput(newOtpInput)

    const fullCode = newOtpInput.join("")
    if (fullCode.length === 6) {
      handleVerifyOTP(fullCode)
    } else if (index < 5) {
      document.getElementById(`otp-input-${index + 1}`)?.focus()
    }
  }

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      const newOtpInput = [...otpInput]
      newOtpInput[index] = ""
      setOtpInput(newOtpInput)

      if (index > 0) {
        document.getElementById(`otp-input-${index - 1}`)?.focus()
      }
    }
  }

  const handleResendOTP = async () => {
    if (role === "admin") return;
    setIsLoading(true)
    try {
      const res = await api.sendOTP(phone, role as "company" | "technician")
      if (res.success) {
        toast.success("OTP resent successfully!")
        setOtpInput(["", "", "", "", "", ""])
        document.getElementById("otp-input-0")?.focus()
      } else {
        toast.error(res.message || "Failed to resend OTP")
      }
    } catch {
      toast.error("An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const resetFlow = () => {
    setStep("login")
    setPhone("")
    setOtpDigits(["", "", "", "", "", ""])
    setOtpInput(["", "", "", "", "", ""])
    setAnimatingIndex(-1)
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-950 dark:to-slate-900">
      <div className="w-full max-w-md glass p-6 sm:p-8 rounded-2xl sm:rounded-3xl shadow-xl">
        <div className="flex justify-center mb-8">
            <Logo size="xl" />
        </div>
        
        {/* Header */}
        <div className="mb-6 sm:mb-8 space-y-2 sm:space-y-3 text-center">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            {step === "login" && "Welcome Back"}
            {step === "verify-required" && "Admin Verification Required"}
            {step === "waiting" && "Verification Pending"}
            {step === "approved" && "Verified!"}
            {step === "otp-entry" && "Enter Verification Code"}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            {step === "login" && "Sign in to continue to MaintainU"}
            {step === "verify-required" && "Your account requires admin verification"}
            {step === "waiting" && "Please wait for admin approval"}
            {step === "approved" && "Entering OTP automatically..."}
            {step === "otp-entry" && `We've sent a 6-digit OTP code to +91 ${phone}`}
          </p>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-10 sm:py-12 space-y-4 animate-in fade-in duration-300">
            <div className="relative">
              <div className="w-10 h-10 sm:w-12 sm:h-12 border-4 border-primary/30 rounded-full border-t-primary animate-spin"></div>
            </div>
            <p className="text-sm font-medium text-muted-foreground animate-pulse">Processing request...</p>
          </div>
        ) : step === "approved" ? (
          /* OTP Animation Screen */
          <div className="space-y-6 text-center animate-in fade-in duration-300">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto ring-8 ring-green-50 dark:ring-green-950/20">
              <CheckCircle2 className="w-8 h-8 sm:w-10 sm:h-10 text-green-600 dark:text-green-400" />
            </div>

            <div className="space-y-2 sm:space-y-3">
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">Account Approved!</h2>
              <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed">
                Your OTP is being entered automatically...
              </p>
            </div>

            {/* OTP Animation Boxes */}
            <div className="flex justify-center gap-2 sm:gap-3 my-6 sm:my-8 min-h-[3.5rem] sm:min-h-[4rem]">
              {otpDigits.map((digit, index) => (
                digit ? (
                  <div
                    key={index}
                    className={`w-10 h-14 sm:w-12 sm:h-16 rounded-xl sm:rounded-2xl border flex items-center justify-center text-xl sm:text-2xl font-bold transition-all duration-300 ${index === animatingIndex
                      ? "border-primary bg-primary/10 text-primary scale-110 ring-4 ring-primary/10 shadow-[0_0_20px_rgba(var(--primary),0.3)]"
                      : "border-green-500/50 bg-green-500/10 text-green-600 dark:text-green-400 shadow-[0_0_10px_rgba(34,197,94,0.2)]"
                      }`}
                  >
                    <span className="animate-in zoom-in duration-200 slide-in-from-bottom-2">{digit}</span>
                  </div>
                ) : null
              ))}
            </div>

            <div className="flex gap-3 items-center justify-center text-xs text-muted-foreground pt-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Verifying...</span>
            </div>
          </div>
        ) : step === "waiting" ? (
          /* Waiting/Pending Screen */
          <div className="space-y-6 text-center animate-in fade-in duration-300">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mx-auto ring-8 ring-orange-50 dark:ring-orange-950/20">
              <Clock className="w-8 h-8 sm:w-10 sm:h-10 text-orange-600 dark:text-orange-400 animate-pulse" />
            </div>

            <div className="space-y-2 sm:space-y-3">
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">Verification In Progress</h2>
              <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed px-2">
                Your account is currently under review. Please wait here while we verify your details.
              </p>
            </div>

            <div className="bg-white/50 dark:bg-card/50 rounded-2xl p-4 text-xs sm:text-sm text-left border border-border/50">
              <div className="flex gap-3 mb-2">
                <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0" />
                <p className="font-semibold">What happens next?</p>
              </div>
              <p className="text-muted-foreground pl-7 sm:pl-8">
                An admin will verify your details. Once approved, you will be automatically redirected.
              </p>
            </div>

            <div className="flex gap-2 sm:gap-3 items-center justify-center text-[10px] sm:text-xs text-muted-foreground pt-1 sm:pt-2">
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-orange-500 rounded-full animate-pulse"></div>
              <span>Checking for approval...</span>
            </div>

            <button
              onClick={resetFlow}
              className="w-full py-2.5 sm:py-3 px-6 rounded-xl bg-white dark:bg-card border border-border hover:bg-muted/50 transition-all text-sm sm:text-base font-semibold flex items-center justify-center gap-2 mt-4"
            >
              <Home className="w-4 h-4" />
              Try Different Number
            </button>

            <button
              onClick={() => setStep("verify-required")}
              className="w-full py-2 px-6 rounded-xl text-[10px] sm:text-xs text-muted-foreground hover:text-primary transition-all font-medium flex items-center justify-center gap-2"
            >
              Selected wrong role? Re-submit Request
            </button>
          </div>
        ) : step === "verify-required" ? (
          /* Admin Verification Required Screen */
          <div className="space-y-6 text-center animate-in fade-in duration-300">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto ring-8 ring-blue-50 dark:ring-blue-950/20">
              <ShieldCheck className="w-8 h-8 sm:w-10 sm:h-10 text-blue-600 dark:text-blue-400" />
            </div>

            <div className="space-y-2 sm:space-y-3">
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">New Account Verification</h2>
              <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed px-2">
                To ensure platform security, all new accounts require administrator verification before access is granted.
              </p>
            </div>

            <div className="bg-white/50 dark:bg-card/50 rounded-2xl p-4 text-xs sm:text-sm text-left border border-border/50">
              <div className="flex gap-3 items-center mb-3">
                <Phone className="w-4 h-4 text-primary shrink-0" />
                <span className="font-semibold">Phone Number:</span>
                <span className="font-mono text-muted-foreground">+91 {phone}</span>
              </div>
              <hr className="border-border/50 my-3" />
              <p className="text-muted-foreground text-[10px] sm:text-xs">
                By clicking "Submit for Verification", your phone number will be sent to our administrators for approval.
              </p>
            </div>

            {/* Role Selection (Signup) */}
            <div className="space-y-2 text-left">
              <label className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">I am registering as a...</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setRole("company")}
                  className={`p-3 sm:p-4 rounded-xl border-2 flex flex-col items-center justify-center gap-1 sm:gap-2 transition-all ${role === "company"
                    ? "bg-primary/5 border-primary text-primary shadow-sm"
                    : "bg-white/50 dark:bg-card/50 border-border text-muted-foreground hover:bg-muted/50 hover:border-border/80"
                    }`}
                >
                  <Building2 className="w-5 h-5 sm:w-6 sm:h-6" />
                  <span className="text-[10px] sm:text-xs font-bold">Company</span>
                </button>
                <button
                  onClick={() => setRole("technician")}
                  className={`p-3 sm:p-4 rounded-xl border-2 flex flex-col items-center justify-center gap-1 sm:gap-2 transition-all ${role === "technician"
                    ? "bg-primary/5 border-primary text-primary shadow-sm"
                    : "bg-white/50 dark:bg-card/50 border-border text-muted-foreground hover:bg-muted/50 hover:border-border/80"
                    }`}
                >
                  <Wrench className="w-5 h-5 sm:w-6 sm:h-6" />
                  <span className="text-[10px] sm:text-xs font-bold">Technician</span>
                </button>
              </div>
            </div>

            <button
              onClick={handleSubmitForVerification}
              disabled={isLoading}
              className="w-full py-3 sm:py-3.5 px-6 rounded-xl bg-primary text-white text-sm sm:text-base font-bold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              <ShieldCheck className="w-4 h-4" />
              Submit for Verification
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={resetFlow}
              className="w-full py-2.5 sm:py-3 px-6 rounded-xl bg-white dark:bg-card border border-border hover:bg-muted/50 transition-all text-sm sm:text-base font-semibold flex items-center justify-center gap-2"
            >
              <Home className="w-4 h-4" />
              Go Back
            </button>
          </div>
        ) : step === "otp-entry" ? (
          /* OTP Entry Screen */
          <div className="space-y-6 text-center animate-in fade-in duration-300">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto ring-8 ring-primary/5">
              <Lock className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
            </div>

            <div className="flex justify-center gap-2 sm:gap-3 my-6 sm:my-8">
              {otpInput.map((digit, index) => (
                <input
                  key={index}
                  id={`otp-input-${index}`}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(index, e)}
                  className="w-11 h-14 sm:w-12 sm:h-16 rounded-xl sm:rounded-2xl border border-border text-center text-xl sm:text-2xl font-bold bg-white/50 dark:bg-card/50 focus:bg-white dark:focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-foreground"
                />
              ))}
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={handleResendOTP}
                disabled={isLoading}
                className="text-xs text-primary font-bold hover:underline"
              >
                Resend OTP
              </button>
              <button
                type="button"
                onClick={resetFlow}
                className="w-full py-2.5 sm:py-3 px-6 rounded-xl bg-white dark:bg-card border border-border hover:bg-muted/50 transition-all text-sm sm:text-base font-semibold flex items-center justify-center gap-2"
              >
                Go Back / Change Number
              </button>
            </div>
          </div>
        ) : (
          /* Login Form */
          <div className="space-y-4 sm:space-y-6">

            {/* Role automatically determined by phone number */}

            {/* Phone Number */}
            <div className="space-y-1.5 sm:space-y-2">
              <label className="text-xs sm:text-sm font-medium ml-1">Phone Number</label>
              <div className="flex gap-2 sm:gap-3">
                <div className="px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border border-border bg-muted/50 text-sm sm:text-base font-semibold whitespace-nowrap text-muted-foreground">
                  +91
                </div>
                <input
                  type="tel"
                  placeholder="98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  onKeyDown={(e) => e.key === 'Enter' && phone.length === 10 && handleLogin()}
                  className="flex-1 px-4 py-2.5 sm:py-3 rounded-xl border border-border bg-white/50 dark:bg-card/50 focus:bg-white dark:focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm sm:text-base font-medium tracking-wide text-foreground"
                  maxLength={10}
                />
              </div>
            </div>

            {/* Login Button */}
            <button
              type="button"
              onClick={handleLogin}
              disabled={phone.length !== 10 || isLoading}
              className="w-full py-3 sm:py-3.5 px-6 rounded-xl bg-primary text-white text-sm sm:text-base font-bold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {isLoading ? "Sending OTP..." : "Sign In"}
            </button>
          </div>
        )
        }

        {/* Sign Up Link */}
        {step === "login" && (
          <div className="mt-8 pt-6 border-t border-border/50 text-center space-y-4">
            {errorMessage && (
              <div className="flex items-center justify-center gap-2 p-2 mt-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 animate-in slide-in-from-right-2">
                <span className="text-[10px] font-medium text-center">{errorMessage}</span>
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              Don't have an account?{" "}
              <button
                onClick={() => router.push("/onboarding")}
                className="text-primary font-bold hover:underline"
              >
                Sign Up
              </button>
            </p>
          </div>
        )}

      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}
