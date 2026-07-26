"use client"

import { useState } from "react"
import { submitCompanyOnboarding } from "@/actions/company.action"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { Loader2, Building2, User, MapPin, ArrowRight } from "lucide-react"
import { ThemeToggle } from "@/components/ui/theme-toggle"

export default function CompanyOnboarding() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const [formData, setFormData] = useState({
      companyName: "",
      contactPerson: "",
      address: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault()
      setLoading(true)

      try {
          const res = await submitCompanyOnboarding(formData)

          if (res.success) {
              toast.success(res.message)
              router.push("/company/dashboard")
          } else {
              toast.error(res.message)
          }
      } catch (error) {
          toast.error("An unexpected error occurred")
      } finally {
          setLoading(false)
      }
  }

  return (
      <div className="min-h-screen app-gradient selection:bg-primary/20 pb-20">
          <header className="px-6 py-6 flex items-center justify-between sticky top-0 z-50 bg-background/80 backdrop-blur-2xl border-b border-border/50">
              <div>
                  <h1 className="text-2xl font-black tracking-tight flex items-center gap-2 text-foreground">
                      Company Profile <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  </h1>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mt-1">Setup Your Enterprise Data</p>
              </div>
              <ThemeToggle />
          </header>

          <main className="px-6 pt-8 max-w-2xl mx-auto animate-in slide-in-from-bottom-6 duration-700">
              {/* Context Banner */}
              <div className="mb-8 p-5 rounded-[1.5rem] bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex gap-4 items-start shadow-sm">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                      <h3 className="font-bold text-sm tracking-wide">Enterprise Setup</h3>
                      <p className="text-xs font-medium opacity-80 mt-1 leading-relaxed">You're one step away from actively managing service requests. Please provide your core business details to unlock the dashboard.</p>
                  </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-8">
                  <section className="space-y-5">
                      {/* Company Name */}
                      <div className="space-y-2">
                          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">Registered Company Name</label>
                          <div className="relative">
                              <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                              <input 
                                  type="text" 
                                  required
                                  placeholder="e.g. Acme Industries Ltd."
                                  value={formData.companyName}
                                  onChange={(e) => setFormData(prev => ({...prev, companyName: e.target.value}))}
                                  className="w-full pl-11 pr-4 py-3.5 rounded-[1.25rem] bg-card border border-border/60 focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none text-sm font-bold text-foreground transition-all shadow-sm"
                              />
                          </div>
                      </div>

                      {/* Contact Person */}
                      <div className="space-y-2">
                          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">Primary Contact Person</label>
                          <div className="relative">
                              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                              <input 
                                  type="text" 
                                  required
                                  placeholder="e.g. John Smith"
                                  value={formData.contactPerson}
                                  onChange={(e) => setFormData(prev => ({...prev, contactPerson: e.target.value}))}
                                  className="w-full pl-11 pr-4 py-3.5 rounded-[1.25rem] bg-card border border-border/60 focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none text-sm font-bold text-foreground transition-all shadow-sm"
                              />
                          </div>
                      </div>

                      {/* Full Address */}
                      <div className="space-y-2">
                          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">Corporate or Site Address</label>
                          <div className="relative">
                              <MapPin className="absolute left-4 top-4 w-4 h-4 text-muted-foreground" />
                              <textarea 
                                  required
                                  rows={3}
                                  placeholder="Enter complete address including ZIP code..."
                                  value={formData.address}
                                  onChange={(e) => setFormData(prev => ({...prev, address: e.target.value}))}
                                  className="w-full pl-11 pr-4 py-3.5 rounded-[1.25rem] bg-card border border-border/60 focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none text-sm font-medium text-foreground transition-all resize-none shadow-sm leading-relaxed"
                              />
                          </div>
                      </div>
                  </section>

                  {/* Submission Layer */}
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
                                      Validating...
                                  </>
                              ) : (
                                  <>
                                      Initialize Dashboard <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                  </>
                              )}
                          </div>
                      </button>
                      <p className="text-center text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-4">By initializing, you agree to the platform terms of service</p>
                  </div>
              </form>
          </main>
      </div>
  )
}
