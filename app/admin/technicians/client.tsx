"use client"

import { useState, useMemo } from "react"
import { AsyncBoundary } from "@/components/async-boundary"
import { ErrorBoundary } from "@/components/error-boundary"
import { BottomNav } from "@/components/navigation/bottom-nav"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { Loader2, Plus, Search, Shield, User, Users, X, Edit, MessageSquare, Briefcase, Star, MapPin, FileText, ExternalLink, Eye, Check, Download } from "lucide-react"
import { CardSkeleton } from "@/components/skeletons"
import { exportTechniciansAction } from "@/actions/technician.action"
import { exportToCSV } from "@/services/export.service"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription
} from "@/components/ui/dialog"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { FilterBar, FilterConfig } from "@/components/admin/FilterBar"
import { TechnicianWorkCalendar } from "@/components/admin/TechnicianWorkCalendar"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
export default function AdminTechniciansClient({ initialData }: { initialData: any[] }) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<"all" | "pending">("all")
  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await exportTechniciansAction()
      if (res.success && res.data) {
        exportToCSV(res.data, "technicians_report.csv")
        toast.success("Technicians report exported successfully")
      } else {
        toast.error(res.message || "Failed to export report")
      }
    } catch (e) {
      toast.error("An error occurred during export")
    } finally {
      setExporting(false)
    }
  }

  const handleExportPDF = async () => {
    setExporting(true)
    try {
      const res = await exportTechniciansAction()
      if (res.success && res.data) {
        const doc = new jsPDF()

        // Modern and Professional Header
        doc.setFillColor(31, 41, 55) // Dark slate background for header
        doc.rect(0, 0, 210, 40, 'F')
        
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(22)
        doc.setFont("helvetica", "bold")
        doc.text("MaintainU", 14, 20)
        
        doc.setFontSize(11)
        doc.setFont("helvetica", "normal")
        doc.setTextColor(200, 200, 200)
        doc.text("Technician Workforce Report", 14, 28)

        // Date Info
        doc.setFontSize(9)
        doc.setTextColor(150, 150, 150)
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 34)

        const tableColumn = ["Name", "Phone", "Service Type", "Status", "Joined Date"]
        const tableRows = res.data.map((row: any) => [
          row.name || "N/A",
          row.phone || "N/A",
          row.serviceType || "General",
          row.status || "N/A",
          row.joinedDate ? new Date(row.joinedDate).toLocaleDateString() : "N/A"
        ])

        autoTable(doc, {
          head: [tableColumn],
          body: tableRows,
          startY: 50,
          theme: 'grid',
          headStyles: {
            fillColor: [31, 41, 55],
            textColor: 255,
            fontSize: 10,
            fontStyle: 'bold',
            halign: 'center'
          },
          bodyStyles: {
            fontSize: 9,
            textColor: 50,
          },
          alternateRowStyles: {
            fillColor: [249, 250, 251]
          },
          columnStyles: {
            0: { cellWidth: 40 }, // Name
            1: { cellWidth: 35 }, // Phone
            2: { cellWidth: 35, halign: 'center' }, // Service
            3: { cellWidth: 30, halign: 'center' }, // Status
            4: { cellWidth: 'auto', halign: 'center' } // Joined
          },
          margin: { top: 50, bottom: 20 },
        })

        // Footer
        const pageCount = (doc as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages()
        for (let i = 1; i <= pageCount; i++) {
          doc.setPage(i)
          doc.setFontSize(8)
          doc.setTextColor(150)
          doc.text(
            `Page ${i} of ${pageCount}`,
            doc.internal.pageSize.getWidth() / 2,
            doc.internal.pageSize.getHeight() - 10,
            { align: 'center' }
          )
        }

        doc.save("technicians_report.pdf")
        toast.success("PDF report generated successfully")
      } else {
        toast.error(res.message || "Failed to generate PDF")
      }
    } catch (e) {
      toast.error("An error occurred during PDF export")
    } finally {
      setExporting(false)
    }
  }

  const technicians = useMemo(() => {
    const all = initialData.filter((t: any) => 
      t.status !== 'PENDING_APPROVAL' && t.status !== 'PENDING_PROFILE' && t.status !== 'Pending'
    )
    const pending = initialData.filter((t: any) => (t.status === 'PENDING_APPROVAL' || t.status === 'PENDING_PROFILE' || t.status === 'Pending') && t.name !== 'New User')
    return { all, pending }
  }, [initialData])

  const [detailsOpen, setDetailsOpen] = useState(false)
  const [selectedUserDetails, setSelectedUserDetails] = useState<any>(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [editFormData, setEditFormData] = useState<any>({})
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  
  const [confirmAction, setConfirmAction] = useState<{ type: 'restore' | 'ban' | 'remove' } | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const handleEditChange = (field: string, value: string) => {
      setEditFormData((prev: any) => ({ ...prev, [field]: value }))
  }

  const handleSaveEdit = async () => {
      if (!selectedUserDetails) return
      setIsSavingEdit(true)
      try {
          const res = await api.updateTechnicianByAdmin(selectedUserDetails.details.id, editFormData)
          if (res.success) {
              toast.success("Profile updated successfully")
              setIsEditingProfile(false)
              router.refresh()
              // Re-fetch details to show updated info
              handleViewDetails(selectedUserDetails.id)
          } else {
              toast.error(res.message || "Failed to update profile")
          }
      } catch (e) {
          toast.error("An error occurred while saving")
      } finally {
          setIsSavingEdit(false)
      }
  }
  
  const handleConfirmAction = async () => {
      if (!confirmAction || !selectedUserDetails) return;
      
      setActionLoading(true);
      try {
          if (confirmAction.type === 'restore') {
              await api.updateUserStatus(selectedUserDetails.id, "ACTIVE", "technician");
              toast.success("Technician restored successfully");
              setDetailsOpen(false);
              router.refresh();
          } else if (confirmAction.type === 'ban') {
              await api.updateUserStatus(selectedUserDetails.id, "REJECTED", "technician");
              toast.success("Technician banned successfully");
              setDetailsOpen(false);
              router.refresh();
          } else if (confirmAction.type === 'remove') {
              const res = await api.deleteUser(selectedUserDetails.id);
              if (res.success) {
                  toast.success("Technician removed successfully");
                  setDetailsOpen(false);
                  router.refresh();
              } else {
                  toast.error(res.message || "Failed to remove technician");
              }
          }
      } catch (e) {
          toast.error("An error occurred");
      } finally {
          setActionLoading(false);
          setConfirmAction(null);
      }
  }

  const handleViewDetails = async (userId: string) => {
    setDetailsOpen(true)
    setDetailsLoading(true)
    setSelectedUserDetails(null)
    try {
      const res = await api.getUserDetails(userId)
      if (res.success && res.user) {
        setSelectedUserDetails(res.user)
      } else {
        toast.error("Failed to load details")
        setDetailsOpen(false)
      }
    } catch {
      toast.error("Error loading details")
      setDetailsOpen(false)
    } finally {
      setDetailsLoading(false)
    }
  }



  // Helper to handle approval
  const handleApprove = async (id: string, name: string) => {
    try {
      await api.updateUserStatus(id, "ACTIVE")
      toast.success(`Approved technician ${name}`)
      router.refresh()
    } catch {
      toast.error("Failed to approve")
    }
  }

  const handleReject = async (id: string, name: string) => {
    try {
      await api.updateUserStatus(id, "REJECTED")
      toast.error(`Rejected technician ${name}`)
      router.refresh()
    } catch {
      toast.error("Failed to reject")
    }
  }

  // Determine list based on tab
  const currentList = activeTab === "pending" ? technicians.pending : technicians.all

  const filterConfig: FilterConfig[] = [
      { key: "search", label: "Search", type: "search", placeholder: "Search technicians..." },
      { 
          key: "status", 
          label: "STATUSES", 
          type: "select", 
          options: [
              { value: "ACTIVE", label: "ACTIVE" },
              { value: "PENDING_APPROVAL", label: "PENDING" },
              { value: "REJECTED", label: "REJECTED" },
          ] 
      },
      {
          key: "serviceType",
          label: "SERVICES",
          type: "select",
          options: [
              { value: "ELECTRICAL", label: "ELECTRICAL" },
              { value: "PLUMBING", label: "PLUMBING" },
              { value: "HVAC", label: "HVAC" },
              { value: "MECHANICAL", label: "MECHANICAL" },
              { value: "GENERAL", label: "GENERAL" },
          ]
      }
  ];

  return (
    <div className="min-h-screen pb-32">
      {/* Sticky Header */}
      <header className="sticky top-0 z-20 px-6 py-4 glass border-b-0 flex items-center justify-between transition-all">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Technicians</h1>
          <p className="text-xs text-muted-foreground font-medium">Manage your workforce</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-muted rounded-xl p-1 shadow-sm border border-border/50">
            <button
              onClick={handleExportPDF}
              disabled={exporting}
              className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-white dark:hover:bg-card hover:shadow-sm text-red-500 text-xs font-bold rounded-lg transition-all disabled:opacity-50"
            >
              {exporting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileText className="w-3.5 h-3.5" />
              )}
              PDF
            </button>
            <div className="w-[1px] bg-border mx-1 my-1" />
            <button
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-white dark:hover:bg-card hover:shadow-sm text-green-600 dark:text-green-500 text-xs font-bold rounded-lg transition-all disabled:opacity-50"
            >
              {exporting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              CSV
            </button>
          </div>
          <ThemeToggle />

        </div>
      </header>

      <main className="px-6 py-6 space-y-6">
        <AsyncBoundary>
          <FilterBar config={filterConfig} />
        </AsyncBoundary>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {(["all", "pending"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 rounded-full font-semibold text-sm whitespace-nowrap transition-all border flex items-center gap-2 ${activeTab === tab
                ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/25"
                : "bg-transparent hover:bg-muted text-muted-foreground border-border"
                }`}
            >
              <span>
                {tab === "all" && "All Staff"}
                {tab === "pending" && "Onboarding"}
              </span>

              {tab === "pending" && technicians.pending.length > 0 && (
                <span className={`px-2 py-0.5 rounded-md text-xs font-bold transition-all ${activeTab === tab
                  ? "bg-white/20 text-white"
                  : "bg-red-500/10 text-red-600 dark:text-red-400"
                  }`}>
                  {technicians.pending.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Grid */}
        <ErrorBoundary>
          {currentList.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground border border-dashed border-border/60 rounded-2xl bg-muted/5">
              <p>No technicians found</p>
            </div>
          ) : (
            (() => {


              const renderTechCard = (tech: any) => (
                <div
                  key={tech.id}
                  className="bg-white/60 dark:bg-slate-950/60 backdrop-blur-2xl border border-white/40 dark:border-white/5 shadow-lg shadow-black/5 p-4 rounded-2xl flex flex-col gap-4 group hover:border-primary/30 transition-all duration-300"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/50 dark:to-blue-900/50 flex items-center justify-center shadow-inner ring-1 ring-border/50 overflow-hidden">
                        {(tech.photo || tech.documents?.photo || tech.details?.documents?.photo) ? (
                            <img 
                                src={tech.photo || tech.documents?.photo || tech.details?.documents?.photo} 
                                alt={tech.name} 
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <User className="text-primary w-6 h-6" />
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-lg leading-tight group-hover:text-primary transition-colors">
                          {tech.name === "New User" && tech.phone ? `New User (${tech.phone})` : tech.name}
                        </p>
                        <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider mt-0.5 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary/50"></span>
                          {tech.skill || "General Technician"}
                        </p>

                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 pt-3 border-t border-border/40">
                      <button
                        onClick={() => handleViewDetails(tech.userId || tech.id)}
                        className="w-full py-2.5 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400 font-semibold text-sm hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all flex items-center justify-center gap-2 border border-blue-200 dark:border-blue-900/30 active:scale-95"
                      >
                        <Eye className="w-4 h-4" strokeWidth={2.5} /> View Details
                      </button>
                      
                      {(activeTab === 'pending' || tech.status === 'PENDING_APPROVAL' || tech.status === 'PENDING_PROFILE' || tech.status === 'Pending') ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApprove(tech.id, tech.name)}
                            className="flex-1 py-2.5 rounded-xl bg-green-500 text-white font-semibold text-sm hover:bg-green-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-500/20 active:scale-95"
                          >
                            <Check className="w-4 h-4" strokeWidth={2.5} /> Approve
                          </button>
                          <button
                            onClick={() => handleReject(tech.id, tech.name)}
                            className="flex-1 py-2.5 rounded-xl bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400 font-semibold text-sm hover:bg-red-100 dark:hover:bg-red-900/30 transition-all flex items-center justify-center gap-2 border border-red-200 dark:border-red-900/30 active:scale-95"
                          >
                            <X className="w-4 h-4" strokeWidth={2.5} /> Reject
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span className="font-mono opacity-70">{tech.phone || tech.id.slice(0, 8)}</span>
                        </div>
                      )}
                    </div>
                </div>
              );

              return (
                <div className="space-y-3 pt-2">
                  {currentList.map(renderTechCard)}
                </div>
              );
            })()
          )}
        </ErrorBoundary>
      </main>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto w-[90vw] rounded-2xl">
              <DialogHeader>
                  <div className="flex justify-between items-center pr-4">
                      <div>
                          <DialogTitle>Registration Details</DialogTitle>
                          <DialogDescription>
                              Review the full information provided by this user.
                          </DialogDescription>
                      </div>
                      {selectedUserDetails?.role === 'technician' && !detailsLoading && (
                          <button
                              onClick={() => {
                                  if (!isEditingProfile) {
                                      setEditFormData({
                                          name: selectedUserDetails.name || '',
                                          phone: selectedUserDetails.phone || '',
                                          experience: selectedUserDetails.details.experience || '',
                                          experienceLevel: selectedUserDetails.details.experienceLevel || '',
                                          primarySkill: selectedUserDetails.details.primarySkill || '',
                                          dailyRate: selectedUserDetails.details.dailyRate || '',
                                      })
                                  }
                                  setIsEditingProfile(!isEditingProfile)
                              }}
                              className="p-2 bg-muted/50 rounded hover:bg-muted text-foreground/80 hover:text-foreground transition"
                              title="Edit Profile"
                          >
                              {isEditingProfile ? <X className="w-4 h-4" /> : <Edit className="w-4 h-4" />}
                          </button>
                      )}
                  </div>
              </DialogHeader>
              {detailsLoading ? (
                  <div className="space-y-4 p-4"><CardSkeleton /><CardSkeleton /></div>
              ) : selectedUserDetails && isEditingProfile ? (
                  <div className="space-y-4 p-1">
                      <div className="grid gap-3">
                          <label className="text-sm font-medium">Name
                              <input value={editFormData.name || ''} onChange={(e) => handleEditChange('name', e.target.value)} className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
                          </label>
                          <label className="text-sm font-medium">Phone
                              <input value={editFormData.phone || ''} onChange={(e) => handleEditChange('phone', e.target.value)} className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
                          </label>
                          <label className="text-sm font-medium">Primary Skill
                              <input value={editFormData.primarySkill || ''} onChange={(e) => handleEditChange('primarySkill', e.target.value)} className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
                          </label>
                          <label className="text-sm font-medium">Experience (Years)
                              <input type="number" value={editFormData.experience || ''} onChange={(e) => handleEditChange('experience', e.target.value)} className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
                          </label>
                          <label className="text-sm font-medium">Experience Level
                              <select value={editFormData.experienceLevel || ''} onChange={(e) => handleEditChange('experienceLevel', e.target.value)} className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                                  <option value="">Select...</option>
                                  <option value="Beginner">Beginner (0-2 Yrs)</option>
                                  <option value="Intermediate">Intermediate (3-5 Yrs)</option>
                                  <option value="Expert">Expert (5+ Yrs)</option>
                              </select>
                          </label>
                          <label className="text-sm font-medium">Daily Rate (₹)
                              <input type="number" value={editFormData.dailyRate || ''} onChange={(e) => handleEditChange('dailyRate', e.target.value)} className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
                          </label>
                      </div>
                      <div className="flex justify-end gap-2 pt-4">
                          <button onClick={() => setIsEditingProfile(false)} className="px-4 py-2 text-sm border rounded-lg hover:bg-muted" disabled={isSavingEdit}>Cancel</button>
                          <button onClick={handleSaveEdit} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2" disabled={isSavingEdit}>
                              {isSavingEdit && <Loader2 className="w-4 h-4 animate-spin" />} Save Changes
                          </button>
                      </div>
                  </div>
              ) : selectedUserDetails ? (
                  <div className="space-y-4">
                      <div className="p-4 bg-muted/50 rounded-xl space-y-2">
                          <p className="text-sm font-semibold">Contact Info</p>
                          <p className="text-sm"><span className="text-muted-foreground mr-2">Name:</span> {selectedUserDetails.name || 'N/A'}</p>
                          <p className="text-sm"><span className="text-muted-foreground mr-2">Phone:</span> {selectedUserDetails.phone}</p>
                          <p className="text-sm"><span className="text-muted-foreground mr-2">Role:</span> <span className="uppercase font-bold">{selectedUserDetails.role}</span></p>
                      </div>
                      
                      {selectedUserDetails.role === 'company' && selectedUserDetails.details && (
                          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                              <div className="p-4 bg-muted/50 rounded-xl space-y-2 border border-border/50">
                                  <p className="text-sm font-semibold pb-1 border-b border-border/50">Company Profile</p>
                                  <p className="text-sm"><span className="text-muted-foreground w-24 inline-block">Company:</span> {selectedUserDetails.details.companyName || 'N/A'}</p>
                                  <p className="text-sm"><span className="text-muted-foreground w-24 inline-block">Industry:</span> {selectedUserDetails.details.industryType || 'N/A'}</p>
                                  <p className="text-sm"><span className="text-muted-foreground w-24 inline-block">Location:</span> {selectedUserDetails.details.address || 'N/A'}</p>
                                  <p className="text-sm"><span className="text-muted-foreground w-24 inline-block">GST IN:</span> <span className="uppercase font-mono text-xs bg-muted px-1 py-0.5 rounded">{selectedUserDetails.details.gstin || 'N/A'}</span></p>
                              </div>
                              <div className="p-4 bg-muted/50 rounded-xl space-y-2 border border-border/50">
                                  <p className="text-sm font-semibold pb-1 border-b border-border/50">Point of Contact</p>
                                  <p className="text-sm"><span className="text-muted-foreground w-24 inline-block">Name:</span> {selectedUserDetails.details.contactPerson || 'N/A'}</p>
                                  <p className="text-sm"><span className="text-muted-foreground w-24 inline-block">Phone:</span> {selectedUserDetails.details.contactPhone || 'N/A'}</p>
                                  <p className="text-sm"><span className="text-muted-foreground w-24 inline-block">Email:</span> {selectedUserDetails.details.contactEmail || 'N/A'}</p>
                              </div>
                          </div>
                      )}

                      {selectedUserDetails.role === 'technician' && selectedUserDetails.details && (
                          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">


                              <div className="p-4 bg-muted/50 rounded-xl space-y-2 border border-border/50">
                                  <p className="text-sm font-semibold pb-1 border-b border-border/50">Professional</p>
                                  <p className="text-sm"><span className="text-muted-foreground w-24 inline-block">Experience:</span> {selectedUserDetails.details.experience || '0'} years</p>
                                  <p className="text-sm"><span className="text-muted-foreground w-24 inline-block">Skill:</span> {selectedUserDetails.details.primarySkill || 'N/A'}</p>
                              </div>
                              <div className="p-4 bg-muted/50 rounded-xl space-y-2 border border-border/50">
                                  <p className="text-sm font-semibold pb-1 border-b border-border/50">Personal</p>
                                  <p className="text-sm"><span className="text-muted-foreground w-24 inline-block">DOB:</span> {selectedUserDetails.details.dob ? new Date(selectedUserDetails.details.dob).toLocaleDateString() : 'N/A'}</p>
                                  <p className="text-sm"><span className="text-muted-foreground w-24 inline-block">Gender:</span> {selectedUserDetails.details.gender || 'N/A'}</p>
                                  <p className="text-sm"><span className="text-muted-foreground w-24 inline-block">Address:</span> {selectedUserDetails.details.address || 'N/A'}</p>
                              </div>
                              {selectedUserDetails.details.bankDetails && (
                                  <div className="p-4 bg-muted/50 rounded-xl space-y-2 border border-border/50 bg-green-500/5 dark:bg-green-500/10">
                                      <p className="text-sm font-semibold text-green-700 dark:text-green-500 pb-1 border-b border-green-500/20">Bank Details</p>
                                      <p className="text-sm"><span className="text-muted-foreground w-24 inline-block">Bank:</span> {selectedUserDetails.details.bankDetails.bankName || 'N/A'}</p>
                                      <p className="text-sm"><span className="text-muted-foreground w-24 inline-block">Account:</span> {selectedUserDetails.details.bankDetails.accountNumber || 'N/A'}</p>
                                      <p className="text-sm"><span className="text-muted-foreground w-24 inline-block">IFSC:</span> <span className="uppercase font-mono text-xs bg-muted px-1 py-0.5 rounded">{selectedUserDetails.details.bankDetails.ifsc || 'N/A'}</span></p>
                                      {selectedUserDetails.details.bankDetails.upi && (
                                          <p className="text-sm"><span className="text-muted-foreground w-24 inline-block">UPI:</span> {selectedUserDetails.details.bankDetails.upi}</p>
                                      )}
                                  </div>
                              )}

                              {selectedUserDetails.details.documents && (
                                  <div className="p-4 bg-muted/50 rounded-xl space-y-2 border border-border/50">
                                      <p className="text-sm font-semibold pb-1 border-b border-border/50">Verification Documents</p>
                                      <div className="grid grid-cols-1 gap-2 pt-1 font-medium">
                                          {selectedUserDetails.details.documents.eAadhaar && (
                                              <a href={selectedUserDetails.details.documents.eAadhaar} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-600 hover:underline flex items-center gap-1">
                                                  <Eye className="w-3 h-3" /> e-Aadhaar
                                              </a>
                                          )}
                                           {selectedUserDetails.details.documents.ePan && (
                                               <a href={selectedUserDetails.details.documents.ePan} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-600 hover:underline flex items-center gap-1">
                                                   <Eye className="w-3 h-3" /> e-PAN
                                               </a>
                                           )}
                                           {selectedUserDetails.details.documents.resume && (
                                               <a href={selectedUserDetails.details.documents.resume} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-600 hover:underline flex items-center gap-1">
                                                   <Eye className="w-3 h-3" /> Resume / CV
                                               </a>
                                           )}
                                           {selectedUserDetails.details.documents.photo && (
                                               <a href={selectedUserDetails.details.documents.photo} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-600 hover:underline flex items-center gap-1">
                                                   <Eye className="w-3 h-3" /> Photograph
                                               </a>
                                           )}
                                       </div>
                                  </div>
                              )}

                              <div className="flex gap-2 pt-4 mt-4 border-t border-border/50">
                                  {selectedUserDetails.status === 'REJECTED' ? (
                                      <button
                                          onClick={() => setConfirmAction({ type: 'restore' })}
                                          className="flex-1 py-2.5 rounded-xl bg-green-50 text-green-600 dark:bg-green-950/30 dark:text-green-400 font-semibold text-sm hover:bg-green-100 dark:hover:bg-green-900/30 transition-all border border-green-200 dark:border-green-900/30 active:scale-95 flex items-center justify-center gap-2"
                                      >
                                          <Check className="w-4 h-4" /> Restore
                                      </button>
                                  ) : (
                                      <button
                                          onClick={() => setConfirmAction({ type: 'ban' })}
                                          className="flex-1 py-2.5 rounded-xl bg-orange-50 text-orange-600 dark:bg-orange-950/30 dark:text-orange-400 font-semibold text-sm hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-all border border-orange-200 dark:border-orange-900/30 active:scale-95 flex items-center justify-center gap-2"
                                      >
                                          <Shield className="w-4 h-4" /> Ban
                                      </button>
                                  )}
                                  <button
                                      onClick={() => setConfirmAction({ type: 'remove' })}
                                      className="flex-1 py-2.5 rounded-xl bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400 font-semibold text-sm hover:bg-red-100 dark:hover:bg-red-900/30 transition-all border border-red-200 dark:border-red-900/30 active:scale-95 flex items-center justify-center gap-2"
                                  >
                                      <X className="w-4 h-4" /> Remove
                                  </button>
                              </div>

                              <div className="pt-4 border-t border-border/50">
                                  <TechnicianWorkCalendar technicianId={selectedUserDetails.details?.id || selectedUserDetails.id} technicianName={selectedUserDetails.name || selectedUserDetails.phone} />
                              </div>
                          </div>
                      )}
                  </div>
              ) : (
                  <div className="py-8 text-center text-muted-foreground text-sm">No details found</div>
              )}
          </DialogContent>
      </Dialog>
      
      <AlertDialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>
                      {confirmAction?.type === 'restore' ? 'Restore Technician?' : 
                       confirmAction?.type === 'ban' ? 'Ban Technician?' : 
                       'Remove Technician?'}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                      {confirmAction?.type === 'restore' ? "Are you sure you want to restore this technician's account?" : 
                       confirmAction?.type === 'ban' ? "Are you sure you want to ban this technician? They will not be able to login." : 
                       "Are you sure you want to permanently remove this technician? This action cannot be undone."}
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                      onClick={(e) => {
                          e.preventDefault();
                          handleConfirmAction();
                      }}
                      disabled={actionLoading}
                      className={
                          confirmAction?.type === 'restore' ? "bg-green-600 hover:bg-green-700 text-white" : 
                          confirmAction?.type === 'ban' ? "bg-orange-600 hover:bg-orange-700 text-white" : 
                          "bg-red-600 hover:bg-red-700 text-white"
                      }
                  >
                      {actionLoading ? "Processing..." : "Yes, Confirm"}
                  </AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>

      <BottomNav active="team" role="admin" />
    </div>
  )
}
