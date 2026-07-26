"use client"

import { useState, useMemo } from "react"
import { BottomNav } from "@/components/navigation/bottom-nav"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { FilterBar, FilterConfig } from "@/components/admin/FilterBar"
import { CheckCircle2, XCircle, Clock, Plus, RefreshCw, X } from "lucide-react"
import { approveSubstitutionAction, cancelSubstitutionAction, requestSubstitutionAction } from "@/actions/substitution.action"
import { toast } from "sonner"
import { useSearchParams } from "next/navigation"
import { ErrorBoundary } from "@/components/error-boundary"
import { AsyncBoundary } from "@/components/async-boundary"

export default function SubstitutionClient({ initialData }: { initialData: any[] }) {
  const [data, setData] = useState(initialData)
  const [showDialog, setShowDialog] = useState(false)
  
  // Dialog state
  const [form, setForm] = useState({
    attendanceId: "",
    originalTechnicianId: "",
    substituteTechnicianId: "",
    reason: "",
    salaryTransferred: false
  })

  const searchParams = useSearchParams()
  
  const search = searchParams.get("search") || ""
  const statusFilter = searchParams.get("status") || "All"

  const handleApprove = async (id: string) => {
    try {
      const res = await approveSubstitutionAction(id)
      if (res.success) {
        toast.success("Substitution approved")
        setData(data.map(d => d.id === id ? { ...d, adminDecision: "Approved" } : d))
      } else {
        toast.error(res.message)
      }
    } catch (e) {
      toast.error("An error occurred")
    }
  }

  const handleCancel = async (id: string) => {
    try {
      const res = await cancelSubstitutionAction(id)
      if (res.success) {
        toast.success("Substitution cancelled")
        setData(data.map(d => d.id === id ? { ...d, adminDecision: "Rejected" } : d))
      } else {
        toast.error(res.message)
      }
    } catch (e) {
      toast.error("An error occurred")
    }
  }

  const handleRequest = async () => {
    try {
      const res = await requestSubstitutionAction({
        ...form,
        originalTechnicianId: form.originalTechnicianId || "00000000-0000-0000-0000-000000000000",
        substituteTechnicianId: form.substituteTechnicianId || "00000000-0000-0000-0000-000000000000",
        attendanceId: form.attendanceId || "00000000-0000-0000-0000-000000000000",
        reason: form.reason,
        salaryTransferred: form.salaryTransferred
      })
      if (res.success) {
        toast.success("Substitution created")
        setShowDialog(false)
        // Refetch or add placeholder
        window.location.reload()
      } else {
        toast.error(res.message)
      }
    } catch (e) {
      toast.error("An error occurred")
    }
  }

  const filteredData = useMemo(() => {
    return data.filter(d => {
      if (statusFilter !== "All" && d.adminDecision !== statusFilter) return false
      if (search && !d.originalName.toLowerCase().includes(search.toLowerCase()) && !d.substituteName.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [data, search, statusFilter])

  const filterConfig: FilterConfig[] = [
    { key: "search", label: "Search", type: "search", placeholder: "Search technicians..." },
    { 
        key: "status", 
        label: "STATUS", 
        type: "select", 
        options: [
            { value: "All", label: "ALL" },
            { value: "Pending", label: "PENDING" },
            { value: "Approved", label: "APPROVED" },
            { value: "Rejected", label: "REJECTED" },
        ] 
    }
  ]

  return (
    <ErrorBoundary>
      <div className="min-h-screen pb-32">
        <header className="sticky top-0 z-20 px-6 py-4 glass border-b-0 flex items-center justify-between transition-all">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Substitutions</h1>
            <p className="text-xs text-muted-foreground font-medium">Manage workforce swaps</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowDialog(true)} className="bg-primary text-primary-foreground p-2 rounded-xl shadow-lg shadow-primary/20 hover:scale-105 transition-all">
              <Plus className="w-5 h-5" />
            </button>
            <ThemeToggle />
          </div>
        </header>

        <main className="px-6 py-6 transition-all">
          <div className="mb-6">
            <AsyncBoundary>
              <FilterBar config={filterConfig} />
            </AsyncBoundary>
          </div>

        <div className="space-y-4">
          {filteredData.length === 0 ? (
            <div className="glass-card p-12 rounded-[2.5rem] text-center border-dashed border-2 flex flex-col items-center gap-4">
              <div className="p-4 bg-muted/50 rounded-full text-muted-foreground/30">
                <Clock className="w-10 h-10" />
              </div>
              <div>
                <p className="text-foreground font-black text-base">No Substitutions Found</p>
                <p className="text-xs text-muted-foreground mt-1">There are no substitutions matching your criteria.</p>
              </div>
            </div>
          ) : (
            filteredData.map(sub => (
              <div key={sub.id} className="glass-card p-5 rounded-[2rem] border-2 border-transparent shadow-lg shadow-black/5 hover:border-primary/20 transition-all">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-black uppercase bg-muted px-2 py-0.5 rounded text-muted-foreground tracking-widest">
                        Job: {sub.jobReference ? sub.jobReference.substring(0, 8) : "N/A"}
                      </span>
                      <span className="text-[10px] font-bold text-muted-foreground">
                        {sub.workDate ? new Date(sub.workDate).toLocaleDateString() : "No Date"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-3">
                      <div>
                        <p className="text-xs text-muted-foreground font-bold">Original</p>
                        <p className="font-black text-foreground">{sub.originalName}</p>
                      </div>
                      <div className="w-6 h-px bg-border/50"></div>
                      <div>
                        <p className="text-xs text-primary font-bold">Substitute</p>
                        <p className="font-black text-primary">{sub.substituteName}</p>
                      </div>
                    </div>
                    <p className="text-sm mt-3 text-muted-foreground bg-muted/30 p-2 rounded-lg italic">
                      "{sub.reason}"
                    </p>
                  </div>
                  
                  <div className="flex flex-col items-end gap-2">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      sub.adminDecision === "Approved" ? "bg-green-500/10 text-green-500" :
                      sub.adminDecision === "Rejected" ? "bg-red-500/10 text-red-500" :
                      "bg-amber-500/10 text-amber-500"
                    }`}>
                      {sub.adminDecision}
                    </span>
                    
                    {sub.adminDecision === "Pending" && (
                      <div className="flex gap-2 mt-4">
                        <button onClick={() => handleApprove(sub.id)} className="p-2 bg-green-500/10 text-green-600 rounded-full hover:bg-green-500 hover:text-white transition-all">
                          <CheckCircle2 className="w-5 h-5" />
                        </button>
                        <button onClick={() => handleCancel(sub.id)} className="p-2 bg-red-500/10 text-red-600 rounded-full hover:bg-red-500 hover:text-white transition-all">
                          <XCircle className="w-5 h-5" />
                        </button>
                      </div>
                    )}
                    {sub.adminDecision === "Approved" && (
                      <div className="flex gap-2 mt-4">
                        <button onClick={() => handleCancel(sub.id)} className="p-2 bg-red-500/10 text-red-600 rounded-full hover:bg-red-500 hover:text-white transition-all text-xs font-bold px-4">
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* New Substitution Modal */}
      {showDialog && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card text-card-foreground p-6 rounded-[2rem] max-w-lg w-full border shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black">New Substitution</h2>
              <button onClick={() => setShowDialog(false)} className="p-2 rounded-full hover:bg-muted transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-muted-foreground">Attendance / Job ID</label>
                <input type="text" className="w-full bg-muted/50 border rounded-xl px-4 py-2 mt-1" placeholder="uuid" value={form.attendanceId} onChange={e => setForm({...form, attendanceId: e.target.value})} />
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground">Original Tech ID (Auto-fill)</label>
                <input type="text" className="w-full bg-muted/50 border rounded-xl px-4 py-2 mt-1" placeholder="uuid" value={form.originalTechnicianId} onChange={e => setForm({...form, originalTechnicianId: e.target.value})} />
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground">Substitute Tech ID</label>
                <input type="text" className="w-full bg-muted/50 border rounded-xl px-4 py-2 mt-1" placeholder="uuid" value={form.substituteTechnicianId} onChange={e => setForm({...form, substituteTechnicianId: e.target.value})} />
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground">Reason</label>
                <textarea className="w-full bg-muted/50 border rounded-xl px-4 py-2 mt-1" placeholder="Reason (min 5 chars)" value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} />
              </div>
              <div className="flex items-center gap-2 mt-2">
                <input type="checkbox" id="salaryT" checked={form.salaryTransferred} onChange={e => setForm({...form, salaryTransferred: e.target.checked})} />
                <label htmlFor="salaryT" className="text-sm font-bold">Transfer Salary Credit</label>
              </div>
              <button onClick={handleRequest} className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-black shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all mt-4">
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav active="substitutions" role="admin" />
    </div>
    </ErrorBoundary>
  )
}
