import { Loader2, ShieldCheck } from "lucide-react"
import { Step, SignupFormData } from "../types"

interface ReviewStepProps {
  role: "company" | "technician"
  formData: SignupFormData
  isLoading: boolean
  handleSubmitForVerification: () => void
  setStep: (step: Step) => void
}

export function FinalReviewStep({ role, formData, isLoading, handleSubmitForVerification, setStep }: ReviewStepProps) {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto ring-8 ring-blue-50 dark:ring-blue-950/20">
        <ShieldCheck className="w-10 h-10 text-blue-600 dark:text-blue-400" />
      </div>

      <div className="bg-white/50 dark:bg-card/50 rounded-2xl p-6 text-sm space-y-3 border border-border/50 max-h-[250px] overflow-y-auto scrollbar-hide shadow-inner">
        <div className="flex justify-between border-b border-border/50 pb-2">
          <span className="font-semibold text-muted-foreground">Main Phone:</span>
          <span className="font-mono">+91 {formData.phone}</span>
        </div>
        {role === 'technician' ? (
          <>
            <div className="flex justify-between"><span className="text-muted-foreground">Name:</span> <span className="font-medium">{formData.name || "-"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Skill:</span> <span className="font-medium">{formData.primarySkill || "-"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Exp:</span> <span className="font-medium">{formData.experience || "0"} YRS ({formData.experienceLevel || "-"})</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Docs:</span> <span className="font-medium text-blue-600">{formData.eAadhaar && formData.ePan && formData.resume && formData.photo ? "Full" : "Partial"}</span></div>
          </>
        ) : (
          <>
            <div className="flex justify-between"><span className="text-muted-foreground">Company:</span> <span className="font-medium">{formData.companyName || "-"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Industry:</span> <span className="font-medium">{formData.industry || "-"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">GST:</span> <span className="uppercase font-medium">{formData.gst || "-"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Contact:</span> <span className="font-medium">{formData.contactName || "-"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Contact Phone:</span> <span className="font-medium">{formData.contactPhone || "-"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Company Email:</span> <span className="font-medium">{formData.email || "-"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Business Address:</span> <span className="font-medium">{formData.address || "-"}</span></div>
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
  )
}
