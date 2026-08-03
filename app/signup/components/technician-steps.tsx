import { ArrowRight, Loader2, Home, CheckCircle2, FileText } from "lucide-react"
import { UploadButton } from "@/lib/uploadthing"
import { toast } from "sonner"
import { Step, SignupFormData } from "../types"
import { DocumentationUpload } from "./documentation-upload"
interface StepProps {
  formData: SignupFormData;
  updateData: (data: Partial<SignupFormData>) => void;
  setStep: (step: Step) => void;
  isLoading: boolean;
  handleFirstStep?: () => void;
  router?: any;
}

const tradeSpecializations: Record<string, string[]> = {
  "Electrical": ["High Voltage", "Panel Wiring", "Appliance Repair", "Lighting", "Troubleshooting"],
  "Mechanical": ["Heavy Machinery", "Welding", "Automotive", "Pumps/Motors", "Conveyors"],
  "HVAC": ["AC Installation", "Heating Systems", "Ductwork", "Refrigeration", "Maintenance"],
  "Plumbing": ["Piping", "Drain Cleaning", "Water Heaters", "Leak Detection", "Commercial"],
  "Assembly": ["Furniture", "Electronics", "Industrial", "Quality Control"],
};

const experienceLevels = [
  { value: "Apprentice", label: "Apprentice", desc: "0-2 Yrs" },
  { value: "Journeyman", label: "Journeyman", desc: "3-5 Yrs" },
  { value: "Master", label: "Master", desc: "5+ Yrs" }
];

export function TechnicianStep1({ formData, updateData, isLoading, handleFirstStep, router }: StepProps) {
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
          type="text" placeholder="Full Name" value={formData.name} onChange={(e) => updateData({ name: e.target.value })}
          className="w-full px-4 py-3.5 rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
        />
        <div className="space-y-1">
          <label className="text-xs font-semibold text-muted-foreground ml-1">Date of Birth</label>
          <input
            type="date" value={formData.dob} onChange={(e) => updateData({ dob: e.target.value })}
            className="w-full px-4 py-3.5 rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
          />
        </div>
        <div className="relative">
          <select
            value={formData.gender} onChange={(e) => updateData({ gender: e.target.value })}
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
          placeholder="Full Address" value={formData.address} onChange={(e) => updateData({ address: e.target.value })}
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

export function TechnicianStep2({ formData, updateData, setStep }: StepProps) {
  return (
    <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
      <div className="space-y-3">
        <label className="text-sm font-bold text-foreground">Experience Level</label>
        <div className="grid grid-cols-3 gap-2">
          {experienceLevels.map(level => (
            <button
              key={level.value}
              onClick={() => updateData({ experienceLevel: level.value })}
              className={`p-3 rounded-xl border flex flex-col items-center justify-center text-center transition-all ${formData.experienceLevel === level.value ? "bg-primary text-primary-foreground border-primary shadow-md" : "bg-card border-border text-foreground hover:bg-muted"}`}
            >
              <span className="font-bold text-sm">{level.label}</span>
              <span className={`text-[10px] mt-1 ${formData.experienceLevel === level.value ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{level.desc}</span>
            </button>
          ))}
        </div>
      </div>


      <div className="space-y-3">
        <label className="text-sm font-bold text-foreground">Primary Trade</label>
        <div className="relative">
          <select
            value={formData.primarySkill} onChange={(e) => updateData({ primarySkill: e.target.value, skills: [] })}
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

      {formData.primarySkill && tradeSpecializations[formData.primarySkill] && (
        <div className="space-y-3 animate-in fade-in zoom-in duration-300">
          <label className="text-sm font-bold text-foreground">Specializations</label>
          <div className="flex flex-wrap gap-2">
            {tradeSpecializations[formData.primarySkill].map(skill => (
              <button
                key={skill}
                onClick={() => {
                  const newSkills = formData.skills.includes(skill)
                    ? formData.skills.filter(s => s !== skill)
                    : [...formData.skills, skill];
                  updateData({ skills: newSkills });
                }}
                className={`px-3 py-1.5 rounded-full border text-xs font-bold transition-all ${formData.skills.includes(skill) ? "bg-primary text-primary-foreground border-primary shadow-sm" : "bg-card border-border text-foreground hover:bg-muted"}`}
              >
                {skill}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button onClick={() => setStep("details-tech-1")} className="flex-1 py-4 rounded-xl border border-border font-bold">Back</button>
        <button onClick={() => setStep("details-tech-3")} className="flex-[2] py-4 rounded-xl bg-primary text-white font-bold flex items-center justify-center gap-2">
          Next <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

export function TechnicianStep3({ formData, updateData, setStep, isLoading }: StepProps) {
  return (
    <DocumentationUpload
      initialData={{
        photo: formData.photo,
        resume: formData.resume,
        eAadhaar: formData.eAadhaar,
        ePan: formData.ePan,
      }}
      onBack={() => setStep("details-tech-2")}
      onSubmit={(data) => {
        updateData(data)
        setStep("verify-required")
      }}
      isSubmitting={isLoading}
    />
  )
}
