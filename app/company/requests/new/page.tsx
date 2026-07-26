"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { Zap, Settings, Wrench, Thermometer, Droplet, X, Loader2, ChevronLeft, ChevronRight, CheckCircle, File as FileIcon, Trash2 } from "lucide-react"
import { ServiceIcon } from "@/components/ui/service-icon"
import { UploadDropzone } from "@/lib/uploadthing"

export default function NewRequestPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    serviceType: "",
    priority: "Normal",
    description: "",
    photos: [] as string[],
    date: "",
    timeSlot: "",
    location: "",
    supervisor: "",
    supervisorPhone: "",
  })

  const handleServiceSelect = (service: string) => {
    setFormData({ ...formData, serviceType: service })
  }

  const handleNext = () => {
    if (step === 1 && !formData.serviceType) {
      toast.error("Please select a service type");
      return;
    }
    if (step === 2 && formData.description.length < 50) {
      toast.error(`Description must be at least 50 characters (currently ${formData.description.length}).`);
      return;
    }
    if (step === 3 && (!formData.date || !formData.timeSlot || formData.location.trim().length < 3)) {
      toast.error("Please select a date, time slot, and provide a valid location (min 3 characters)");
      return;
    }
    if (step < 4) setStep(step + 1)
  }

  const handlePrev = () => {
    if (step > 1) setStep(step - 1)
  }

  const handleSubmit = async () => {
    console.log("handleSubmit called", formData)
    setIsLoading(true)
    try {
      // Filter out empty photos
      const cleanData = {
        ...formData,
        photos: formData.photos.filter(p => p.trim() !== "")
      }
      console.log("Sending request with data:", cleanData)

      const res = await api.createRequest(cleanData)
      console.log("Response received:", res)

      if (res.success) {
        toast.success("Request created successfully")
        router.push(`/company/requests/${res.id}`)
      } else {
        console.error("Request failed:", res.message, res.fieldErrors)
        if (res.message === "Not authenticated" || res.message === "User not found") {
          toast.error("Session expired. Please login again.")
          router.push("/login")
        } else if (res.fieldErrors) {
          const errs = Object.values(res.fieldErrors).flat().join(", ");
          toast.error(`Validation Error: ${errs}`);
        } else {
          toast.error(res.message || "Failed to create request")
        }
      }
    } catch (e) {
      console.error("Exception during request:", e)
      toast.error("Failed to create request")
    } finally {
      setIsLoading(false)
    }
  }


  return (
    <div className="min-h-screen pb-32 bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-20 px-6 py-4 glass border-b-0 flex items-center justify-between transition-all mb-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight">New Request</h1>
          <p className="text-xs text-muted-foreground font-medium">Create maintenance ticket</p>
        </div>
        <button
          onClick={() => router.back()}
          className="w-10 h-10 flex items-center justify-center hover:bg-muted/80 rounded-xl transition-colors ring-1 ring-border/50 active:scale-95 bg-background/50 shadow-sm"
        >
          <X className="w-5 h-5" />
        </button>
      </header>

      <main className="px-6">
        {/* Progress Indicator */}
        <div className="flex gap-2 mb-8">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`flex-1 h-1.5 rounded-full transition-all ${s <= step ? "bg-primary shadow-sm shadow-primary/30" : "bg-muted"}`}
            />
          ))}
        </div>

        {/* Step 1: Service Type */}
        {step === 1 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <h2 className="text-lg font-bold mb-1">Select Service Type</h2>
            <p className="text-muted-foreground text-sm mb-6">What maintenance do you need?</p>

            <div className="space-y-3 mb-8">
              {[
                { id: "Electrical", label: "Electrical" },
                { id: "Mechanical", label: "Mechanical" },
                { id: "Assembly", label: "Assembly" },
                { id: "HVAC", label: "HVAC" },
                { id: "Plumbing", label: "Plumbing" },
              ].map((service) => (
                <button
                  key={service.id}
                  type="button"
                  onClick={() => handleServiceSelect(service.id)}
                  className={`glass-card p-4 w-full flex items-center gap-4 text-left transition-all group ${formData.serviceType === service.id
                    ? "ring-2 ring-primary border-primary/50 bg-primary/5"
                    : "hover:border-primary/50"
                    }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${formData.serviceType === service.id
                    ? "bg-primary text-white"
                    : "bg-muted text-muted-foreground group-hover:text-primary"
                    }`}>
                    {<ServiceIcon type={service.id} className="w-6 h-6" />}
                  </div>
                  <span className="font-semibold">{service.label}</span>
                  {formData.serviceType === service.id && (
                    <CheckCircle className="w-5 h-5 text-primary ml-auto" />
                  )}
                </button>
              ))}
            </div>

            {/* Priority Selector */}
            <div className="mb-8">
              <label className="text-sm font-semibold mb-3 block">Priority Level</label>
              <div className="flex gap-2 p-1 bg-muted/50 rounded-xl border border-border">
                {["Normal", "Urgent", "Emergency"].map((priority) => (
                  <button
                    key={priority}
                    type="button"
                    onClick={() => setFormData({ ...formData, priority })}
                    className={`flex-1 py-2.5 rounded-lg font-semibold text-sm transition-all ${formData.priority === priority
                      ? "bg-background text-foreground shadow-sm ring-1 ring-border"
                      : "text-muted-foreground hover:text-foreground"
                      } ${formData.priority === priority && priority === "Urgent" ? "text-orange-600 dark:text-orange-400" : ""
                      } ${formData.priority === priority && priority === "Emergency" ? "text-red-600 dark:text-red-400" : ""
                      }`}
                  >
                    {priority}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Description & Photos */}
        {step === 2 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <h2 className="text-lg font-bold mb-1">Describe the Issue</h2>
            <p className="text-muted-foreground text-sm mb-6">Provide details about what needs maintenance</p>

            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the maintenance issue in detail (min 50 characters)..."
              className="w-full h-40 p-4 rounded-xl border border-border bg-card/50 glass focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none mb-2"
            />
            <div className="flex justify-end mb-6">
              <span className={`text-xs font-medium ${formData.description.length < 50 ? 'text-red-500/80' : 'text-green-500/80'}`}>
                {formData.description.length} / 50 min characters
              </span>
            </div>

            <div className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-semibold block">Issue Photos & Documents</label>
              </div>

              <div className="space-y-3">
                <UploadDropzone
                  endpoint="requestAttachment"
                  onUploadBegin={() => {
                    toast.loading("Uploading file...", { id: "upload-toast" });
                  }}
                  onClientUploadComplete={(res) => {
                    toast.dismiss("upload-toast");
                    if (res && res.length > 0) {
                      const newPhotos = res.map(file => file.url);
                      setFormData(prev => ({ ...prev, photos: [...prev.photos, ...newPhotos] }));
                      toast.success("Files uploaded successfully");
                    }
                  }}
                  onUploadError={(error: Error) => {
                    toast.dismiss("upload-toast");
                    toast.error(`Upload failed: ${error.message}`);
                  }}
                  className="ut-label:text-primary ut-button:bg-primary ut-button:ut-readying:bg-primary/50 border-border bg-card/30 rounded-xl transition-all"
                />

                {formData.photos.length > 0 && (
                  <div className="grid gap-2 mt-4">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Attached Files</p>
                    {formData.photos.map((url, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-xl border border-border bg-card/50 glass">
                        <div className="flex items-center gap-3 overflow-hidden">
                           <div className="w-12 h-12 shrink-0 bg-muted rounded-lg overflow-hidden flex items-center justify-center relative shadow-sm border border-border">
                             <img 
                               src={url} 
                               alt="preview" 
                               className="w-full h-full object-cover" 
                               onError={(e) => { 
                                 e.currentTarget.style.display = 'none'; 
                                 if (e.currentTarget.nextElementSibling) {
                                   e.currentTarget.nextElementSibling.classList.remove('hidden');
                                 }
                               }} 
                             />
                             <FileIcon className="w-6 h-6 text-muted-foreground hidden absolute" />
                           </div>
                           <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium hover:underline truncate">
                             View Attachment {idx + 1}
                           </a>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const newPhotos = formData.photos.filter((_, i) => i !== idx)
                            setFormData({ ...formData, photos: newPhotos })
                          }}
                          className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Schedule */}
        {step === 3 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <h2 className="text-lg font-bold mb-1">Schedule</h2>
            <p className="text-muted-foreground text-sm mb-6">When do you need the service?</p>

            <div className="space-y-6 mb-8">
              <div>
                <label className="text-sm font-semibold mb-2 block">Preferred Date</label>
                <input
                  type="date"
                  className="w-full p-4 rounded-xl border border-border bg-card/50 glass focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>

              <div>
                <label className="text-sm font-semibold mb-3 block">Time Slot</label>
                <div className="grid grid-cols-2 gap-3">
                  {["Morning", "Afternoon", "Evening", "Flexible"].map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setFormData({ ...formData, timeSlot: slot })}
                      className={`py-3 px-4 rounded-xl border font-semibold text-sm transition-all ${formData.timeSlot === slot
                        ? "bg-primary/10 border-primary text-primary"
                        : "bg-card border-border hover:border-primary/50 text-muted-foreground"
                        }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold mb-2 block">Site Location</label>
                <input
                  type="text"
                  placeholder="e.g. Factory Unit 1, Sector 5"
                  className="w-full p-4 rounded-xl border border-border bg-card/50 glass focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all mb-6"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
              </div>

              <div>
                <label className="text-sm font-semibold mb-2 block">Site Supervisor</label>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Full name"
                    className="w-full p-4 rounded-xl border border-border bg-card/50 glass focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    value={formData.supervisor}
                    onChange={(e) => setFormData({ ...formData, supervisor: e.target.value })}
                  />
                  <input
                    type="tel"
                    placeholder="+91 Phone number"
                    className="w-full p-4 rounded-xl border border-border bg-card/50 glass focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    value={formData.supervisorPhone}
                    onChange={(e) => setFormData({ ...formData, supervisorPhone: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Review */}
        {step === 4 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <h2 className="text-lg font-bold mb-1">Review Request</h2>
            <p className="text-muted-foreground text-sm mb-6">Confirm details before submission</p>

            <div className="space-y-4 mb-8">
              <div className="glass-card p-5 rounded-2xl">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Service Type</p>
                <div className="flex items-center gap-2">
                  <div className="text-primary"><ServiceIcon type={formData.serviceType} className="w-6 h-6" /></div>
                  <p className="text-lg font-semibold capitalize">{formData.serviceType}</p>
                </div>
              </div>
              <div className="glass-card p-5 rounded-2xl">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Priority</p>
                <p className={`text-lg font-semibold ${formData.priority === 'Urgent' ? 'text-orange-600' :
                  formData.priority === 'Emergency' ? 'text-red-600' : ''
                  }`}>{formData.priority}</p>
              </div>
              <div className="glass-card p-5 rounded-2xl">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Description</p>
                <p className="text-sm leading-relaxed">{formData.description || "No description added"}</p>
              </div>
              <div className="glass-card p-5 rounded-2xl">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Schedule</p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{formData.date || "Date not set"}</p>
                    <p className="text-sm text-muted-foreground">{formData.timeSlot}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formData.location || "No location"}</p>
                    <p className="text-sm text-muted-foreground">{formData.supervisor || "No supervisor"} ({formData.supervisorPhone})</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex gap-3 mt-8">
          <button
            onClick={handlePrev}
            disabled={step === 1}
            className="flex-1 py-4 px-6 rounded-xl border border-border font-semibold text-muted-foreground hover:bg-muted transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>

          {step < 4 ? (
            <button
              onClick={handleNext}
              className="flex-[2] py-4 px-6 rounded-xl bg-primary text-primary-foreground font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="flex-[2] py-4 px-6 rounded-xl bg-primary text-primary-foreground font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
              {isLoading ? "Submitting..." : "Submit Request"}
            </button>
          )}
        </div>
      </main>
    </div>
  )
}
