import { ArrowRight, Loader2 } from "lucide-react"
import { Step, SignupFormData } from "../types"

interface StepProps {
  formData: SignupFormData;
  updateData: (data: Partial<SignupFormData>) => void;
  setStep: (step: Step) => void;
  isLoading: boolean;
  handleFirstStep?: () => void;
  router?: any;
}

export function CompanyStep1({ formData, updateData, isLoading, handleFirstStep, router }: StepProps) {
  return (
    <div className="space-y-4 animate-in slide-in-from-right-4 fade-in duration-300">
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-xs font-bold text-muted-foreground ml-1">Phone Number</label>
          <div className="flex gap-3">
            <div className="px-4 py-3 rounded-xl border border-border bg-muted/50 font-semibold text-muted-foreground text-sm">+91</div>
            <input
              type="tel"
              placeholder="98765 43210"
              value={formData.phone}
              onChange={(e) => updateData({ phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
              className="flex-1 px-4 py-3 rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium text-sm"
              maxLength={10}
            />
          </div>
        </div>
        <input
          type="text" placeholder="Company Name" value={formData.companyName} onChange={(e) => updateData({ companyName: e.target.value })}
          className="w-full px-4 py-3.5 rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
        />
        <div className="relative">
          <select
            value={formData.industry} onChange={(e) => updateData({ industry: e.target.value })}
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
          type="text" placeholder="GST Number" value={formData.gst} onChange={(e) => updateData({ gst: e.target.value.toUpperCase() })}
          className="w-full px-4 py-3.5 rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
          maxLength={15}
        />
        <input
          type="email" placeholder="Company Email" value={formData.email} onChange={(e) => updateData({ email: e.target.value })}
          className="w-full px-4 py-3.5 rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
        />
        <textarea
          placeholder="Business Address" value={formData.address} onChange={(e) => updateData({ address: e.target.value })}
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
  )
}

export function CompanyStep2({ formData, updateData, setStep }: StepProps) {
  return (
    <div className="space-y-4 animate-in slide-in-from-right-4 fade-in duration-300">
      <div className="space-y-4">
        <input
          type="text" placeholder="Contact Person Name" value={formData.contactName} onChange={(e) => updateData({ contactName: e.target.value })}
          className="w-full px-4 py-3.5 rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
        />
        <input
          type="tel" placeholder="Contact Phone" value={formData.contactPhone} onChange={(e) => updateData({ contactPhone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
          className="w-full px-4 py-3.5 rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
          maxLength={10}
        />
        <input
          type="email" placeholder="Contact Email" value={formData.contactEmail} onChange={(e) => updateData({ contactEmail: e.target.value })}
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
  )
}
