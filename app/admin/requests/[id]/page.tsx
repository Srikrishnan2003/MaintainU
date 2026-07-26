"use client"

import { BottomNav } from "@/components/navigation/bottom-nav"
import { CheckCircle2, Loader2, ArrowLeft, Users, Star, MessageSquare, AlertOctagon, MapPin, Calendar, Clock, Phone, Trash2, Download } from "lucide-react"
import { useEffect, useState, use } from "react"
import { api, Request } from "@/lib/api"
import { useRouter } from "next/navigation"
import { formatTicketId } from "@/lib/utils"
import { toast } from "sonner"
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
import dynamic from "next/dynamic"

const MiniMap = dynamic(() => import('@/components/admin/MiniMap'), { ssr: false })

export default function AdminRequestDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const [request, setRequest] = useState<Request | null>(null)
    const [jobData, setJobData] = useState<any>(null)
    const [teamMembers, setTeamMembers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState(false)
    const [showRejectInput, setShowRejectInput] = useState(false)
    const [rejectReason, setRejectReason] = useState("")

    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [deleteWarning, setDeleteWarning] = useState<any>(null)
    const [deleting, setDeleting] = useState(false)
    const [showResetConfirm, setShowResetConfirm] = useState(false)

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [res, teamRes] = await Promise.all([
                    api.getRequestById(id),
                    api.getMasterTeam(id)
                ])
                if (res.request) {
                    setRequest(res.request)
                    if (res.request.jobId) {
                        const jobRes = await api.getJobById(res.request.jobId)
                        if (jobRes.job) {
                            setJobData(jobRes.job)
                        }
                    }
                }
                if (teamRes.members) {
                    setTeamMembers(teamRes.members)
                }
            } catch (error) {
                console.error("Failed to fetch request", error)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [id])

    const handleReview = async (newStatus: any, reason?: string) => {
        setActionLoading(true)
        try {
            const res = await api.reviewRequest(id, newStatus, reason)
            if (res.success) {
                toast.success(`Request marked as ${newStatus.replace('_', ' ')}`)
                const updated = await api.getRequestById(id)
                if (updated.request) setRequest(updated.request)
            } else {
                toast.error(res.message || "Action failed")
            }
        } catch (e) {
            toast.error("An error occurred")
        } finally {
            setActionLoading(false)
            setShowRejectInput(false)
            setRejectReason("")
        }
    }

    const handleResetAssignment = async () => {
        setShowResetConfirm(false)
        
        setActionLoading(true)
        try {
            const res = await api.resetAssignment(id)
            if (res.success) {
                toast.warning("Assignment reset successfully")
                const updated = await api.getRequestById(id)
                if (updated.request) setRequest(updated.request)
            } else {
                toast.error(res.message || "Action failed")
            }
        } catch (e) {
            toast.error("An error occurred")
        } finally {
            setActionLoading(false)
        }
    }

    const handleFinalizeAcceptance = async () => {
        setActionLoading(true)
        try {
            const res = await api.finalizeJobAcceptance(id)
            if (res.success) {
                toast.success("Team assignment approved successfully")
                const [updatedReq, updatedTeam] = await Promise.all([
                    api.getRequestById(id),
                    api.getMasterTeam(id)
                ])
                if (updatedReq.request) setRequest(updatedReq.request)
                if (updatedTeam.members) setTeamMembers(updatedTeam.members)
            } else {
                toast.error(res.message || "Action failed")
            }
        } catch (e) {
            toast.error("An error occurred")
        } finally {
            setActionLoading(false)
        }
    }

    const handleDeleteClick = async () => {
        setShowDeleteModal(true);
        setDeleteWarning(null);
        try {
            const res = await api.getDeleteRequestWarning(id);
            if (res.success) {
                setDeleteWarning(res);
            } else {
                toast.error("Failed to load warnings");
                setShowDeleteModal(false);
            }
        } catch(e) {
            toast.error("An error occurred");
            setShowDeleteModal(false);
        }
    }

    const handleFinalizeCompletion = async () => {
        setActionLoading(true)
        try {
            const res = await api.finalizeRequest(id)
            if (res.success) {
                toast.success("Request finalized successfully!")
                const updated = await api.getRequestById(id)
                if (updated.request) setRequest(updated.request)
            } else {
                toast.error(res.message || "Failed to finalize request")
            }
        } catch (e) {
            toast.error("An error occurred")
        } finally {
            setActionLoading(false)
        }
    }

    const handleConfirmDelete = async () => {
        if (!deleteWarning) return;
        setDeleting(true);
        
        try {
            if (deleteWarning.exportData) {
                const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(deleteWarning.exportData, null, 2));
                const downloadAnchorNode = document.createElement('a');
                downloadAnchorNode.setAttribute("href", dataStr);
                downloadAnchorNode.setAttribute("download", `request_${id.substring(0, 8)}_financials.json`);
                document.body.appendChild(downloadAnchorNode);
                downloadAnchorNode.click();
                downloadAnchorNode.remove();
            }

            const res = await api.deleteRequestCascading(id);
            if (res.success) {
                toast.success("Request and all data deleted successfully");
                router.push('/admin/requests');
            } else {
                toast.error(res.message || "Failed to delete request");
                setDeleting(false);
            }
        } catch (e) {
            toast.error("An error occurred")
            setShowDeleteModal(false)
        } finally {
            setDeleting(false)
        }
    }

    const exportCroppedSignature = () => {
        if (!jobData?.signatureUrl) return;

        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d", { willReadFrequently: true });
            if (!ctx) return;
            ctx.drawImage(img, 0, 0);

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;
            let hasPixels = false;

            for (let y = 0; y < canvas.height; y++) {
                for (let x = 0; x < canvas.width; x++) {
                    const alpha = data[(y * canvas.width + x) * 4 + 3];
                    if (alpha > 0) {
                        minX = Math.min(minX, x);
                        minY = Math.min(minY, y);
                        maxX = Math.max(maxX, x);
                        maxY = Math.max(maxY, y);
                        hasPixels = true;
                    }
                }
            }

            if (!hasPixels) {
                toast.error("Signature is empty");
                return;
            }
            
            const padding = 10;
            minX = Math.max(0, minX - padding);
            minY = Math.max(0, minY - padding);
            maxX = Math.min(canvas.width, maxX + padding);
            maxY = Math.min(canvas.height, maxY + padding);

            const cropWidth = maxX - minX;
            const cropHeight = maxY - minY;

            const croppedCanvas = document.createElement("canvas");
            croppedCanvas.width = cropWidth;
            croppedCanvas.height = cropHeight;
            const croppedCtx = croppedCanvas.getContext("2d");
            if (!croppedCtx) return;

            croppedCtx.drawImage(
                canvas,
                minX, minY, cropWidth, cropHeight,
                0, 0, cropWidth, cropHeight
            );

            const dataUrl = croppedCanvas.toDataURL("image/png");
            const link = document.createElement("a");
            link.href = dataUrl;
            link.download = `signature_${formatTicketId(id)}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        };
        img.src = jobData.signatureUrl;
    };

    if (loading) {
        return (
            <div className="min-h-screen app-gradient flex flex-col items-center justify-center gap-4">
                <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                <span className="text-sm font-bold text-muted-foreground animate-pulse">Loading request details...</span>
            </div>
        )
    }

    if (!request) {
        return (
            <div className="min-h-screen app-gradient flex flex-col items-center justify-center gap-4">
                <p className="font-bold text-muted-foreground">Request not found</p>
                <button onClick={() => router.back()} className="text-primary text-sm font-bold mt-4">Go Back</button>
            </div>
        )
    }

    return (
        <div className="min-h-screen pb-48 app-gradient px-6 pt-6">
            {/* Header */}
            <header className="flex items-center justify-between mb-8">
                <button onClick={() => router.back()} className="w-10 h-10 glass rounded-xl flex items-center justify-center hover:bg-muted/50 transition-colors shrink-0 ">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="text-right">
                   <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none">Job Request</p>
                   <h1 className="text-sm font-black text-foreground mt-1">{formatTicketId(request.id)}</h1>
                </div>
            </header>

            <div className="flex gap-2 mb-8 justify-center">
                <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest border shadow-sm ${request.status === 'Completed' ? 'bg-green-500/10 text-green-600 border-green-500/20' :
                    request.status === 'In Progress' || request.status === 'In_Progress' ? 'bg-orange-500/10 text-orange-600 border-orange-500/20' :
                        request.status === 'Requested' ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' :
                            request.status === 'Reviewing' ? 'bg-purple-500/10 text-purple-600 border-purple-500/20' :
                    request.status === 'Rejected' ? 'bg-red-500/10 text-red-600 border-red-500/20' :
                        'bg-slate-500/10 text-slate-600 border-slate-500/20'
                    }`}>
                    {request.status.replace('_', ' ')}
                </span>

                {(request.assignmentAttempts ?? 0) > 1 && (
                    <span className="px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest bg-blue-500/10 text-blue-600 border border-blue-500/20 shadow-sm">
                        Attempt #{request.assignmentAttempts}
                    </span>
                )}
                <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest border shadow-sm ${request.priority === 'Emergency' ? 'bg-red-600 text-white border-red-600' :
                    request.priority === 'Urgent' ? 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' :
                        'bg-slate-100 text-slate-600 border-slate-200'
                    }`}>
                    {request.priority}
                </span>
            </div>

            <main className="space-y-6">
                {/* Main Info Card */}
                <section className="glass-card p-6 rounded-[2rem] border-t border-white/20">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-3">Client Company</p>
                    <h2 className="text-2xl font-black text-foreground mb-4 leading-tight">{request.companyName || request.companyId}</h2>

                    <div className="flex items-start gap-3 p-4 bg-muted/30 rounded-2xl border border-border/50">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                            <MapPin className="w-5 h-5 text-primary" />
                        </div>
                        <p className="text-sm font-bold text-foreground/80 leading-snug">{request.companyLocation || "Service Location Provided in Details"}</p>
                    </div>
                </section>

                {/* Grid Details */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="glass-card p-5 rounded-3xl">
                        <Clock className="w-5 h-5 text-primary mb-3" />
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Service</p>
                        <p className="font-bold text-sm text-foreground mt-1">{request.serviceType || "Maintenance"}</p>
                    </div>
                    <div className="glass-card p-5 rounded-3xl">
                        <Calendar className="w-5 h-5 text-primary mb-3" />
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Preferred Date</p>
                        <p className="font-bold text-sm text-foreground mt-1">{request.preferredDate ? String(request.preferredDate) : (request.createdAt ? new Date(String(request.createdAt)).toLocaleDateString() : "TBD")}</p>
                    </div>
                    <div className="glass-card p-5 rounded-3xl">
                        <Clock className="w-5 h-5 text-primary mb-3" />
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Time Slot</p>
                        <p className="font-bold text-sm text-foreground mt-1">{request.timeSlot || request.preferredTimeSlot || "Flexible"}</p>
                    </div>
                </div>

                {/* Description */}
                <section className="glass-card p-6 rounded-[2rem]">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-4">Request Description</p>
                    <p className="text-sm font-medium leading-relaxed text-foreground/70 bg-muted/20 p-4 rounded-2xl border border-border/50">
                        {request.description}
                    </p>
                </section>

                {/* Photos */}
                {request.photos && (request.photos as string[]).filter((url: string) => url?.trim() !== "").length > 0 && (
                    <section className="">
                        <div className="flex items-center gap-2 mb-4 px-1">
                            <span className="w-1 h-4 bg-primary rounded-full" />
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Reference Photos ({ (request.photos as string[]).filter((url: string) => url?.trim() !== "").length })</p>
                        </div>
                        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide px-1 snap-x">
                            {(request.photos as string[]).filter((url: string) => url?.trim() !== "").map((url: string, idx: number) => (
                                <div
                                    key={idx}
                                    className="w-64 aspect-[4/3] rounded-[2rem] overflow-hidden glass border border-border/50 shrink-0 group  transition-colors shadow-lg snap-center"
                                    onClick={() => window.open(url, '_blank')}
                                >
                                    <img src={url} alt={`Photo ${idx + 1}`} className="object-cover w-full h-full transition-transform group-" />
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {request.jobId && ['Arrived', 'In_Progress', 'In Progress', 'In_Zone', 'Work_Started', 'On_Hold', 'Failed'].includes(request.status) && jobData && (
                    <section className="glass-card p-6 rounded-[2rem] border-primary/20 bg-primary/5 mt-6 ">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                                <MapPin className="w-5 h-5 text-primary animate-pulse" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] leading-none mb-1">Live Tracking</p>
                                <h3 className="text-lg font-black text-foreground leading-none">Job Progress</h3>
                            </div>
                        </div>

                        {jobData.activeLocations && jobData.activeLocations.length > 0 && (
                            <div className="mb-8">
                                <p className="text-xs font-bold text-muted-foreground mb-3 uppercase tracking-widest flex items-center gap-2">
                                    <MapPin className="w-3 h-3" /> Current Known Locations ({jobData.activeLocations.length})
                                </p>
                                <MiniMap locations={jobData.activeLocations} />
                            </div>
                        )}

                        {jobData.updates && jobData.updates.length > 0 ? (
                            <div className="space-y-2">
                                {jobData.updates.map((update: any, idx: number) => {
                                    const locMatch = update.message.match(/\[([\d.-]+),\s*([\d.-]+)\]/)
                                    const hasLoc = !!locMatch
                                    const lat = hasLoc ? parseFloat(locMatch[1]) : 0
                                    const lng = hasLoc ? parseFloat(locMatch[2]) : 0
                                    const cleanMessage = hasLoc ? update.message.replace(/Location:\s*\[.*?\]/, '').trim() : update.message

                                    return (
                                        <div key={update.id} className="flex gap-4">
                                            <div className="flex flex-col items-center">
                                                <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
                                                {idx < jobData.updates.length - 1 && (
                                                    <div className="w-px h-full bg-primary/20 my-1" />
                                                )}
                                            </div>
                                            <div className="pb-4 w-full">
                                                <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1 flex items-center gap-2">
                                                    <span>{new Date(update.createdAt).toLocaleString()}</span>
                                                    {update.technicianName && (
                                                        <>
                                                            <span className="w-1 h-1 rounded-full bg-border" />
                                                            <span className="text-primary">{update.technicianName}</span>
                                                        </>
                                                    )}
                                                </p>
                                                <p className="text-sm font-bold text-foreground mb-1">{cleanMessage}</p>
                                                
                                                {hasLoc && (
                                                    <MiniMap lat={lat} lng={lng} />
                                                )}
                                                
                                                {update.photos && update.photos.length > 0 && (
                                                    <div className="flex gap-2 mt-2 overflow-x-auto pb-2 scrollbar-hide">
                                                        {update.photos.map((photo: string, pIdx: number) => (
                                                            <div key={pIdx} onClick={() => window.open(photo, '_blank')} className="cursor-pointer shrink-0">
                                                                <img src={photo} alt="Update" className="w-20 h-20 object-cover rounded-[1rem] border border-border shadow-sm  transition-transform" />
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-6">
                                <p className="text-sm font-bold text-primary/70 mb-1">Active Session Ongoing</p>
                                <p className="text-xs font-bold text-muted-foreground">Waiting for technician updates or photos...</p>
                            </div>
                        )}
                    </section>
                )}

                {/* Work Completed Content */}
                {['Work_Completed', 'Completed', 'Invoiced', 'Paid'].includes(request.status) && (
                    <section className="mt-8 flex flex-col gap-6">
                        {jobData?.signatureUrl && (
                            <div className="bg-white p-4 rounded-2xl border shadow-sm relative group">
                                <div className="flex items-center justify-between mb-3">
                                    <p className="text-xs font-black uppercase text-muted-foreground tracking-widest">Supervisor Signature</p>
                                    <button 
                                        onClick={exportCroppedSignature}
                                        className="text-primary hover:bg-primary/10 p-2 rounded-lg transition-colors flex items-center gap-1 text-xs font-bold"
                                        title="Download Cropped Signature"
                                    >
                                        <Download className="w-4 h-4" /> Export
                                    </button>
                                </div>
                                <img src={jobData.signatureUrl} alt="Signature" className="w-full h-auto max-h-[150px] object-contain rounded-xl border border-dashed border-gray-200 bg-gray-50/50" />
                            </div>
                        )}

                    </section>
                )}

                {/* Delete Section */}
                <section className="pt-8 pb-4 flex justify-center">
                    <button onClick={handleDeleteClick} className="flex items-center gap-2 text-red-500 font-bold hover:bg-red-50 px-6 py-3 rounded-xl transition-colors border border-transparent hover:border-red-200">
                        <Trash2 className="w-5 h-5" />
                        Delete Request Permanently
                    </button>
                </section>
            </main>

            {/* Sticky Action Footer */}
            <footer className="fixed bottom-[80px] left-0 right-0 p-6 glass border-t-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50 shadow-lg">
                {request.status === 'Requested' && (
                    <button
                        onClick={() => handleReview('Reviewing')}
                        disabled={actionLoading}
                        className="w-full py-4.5 bg-purple-600 text-white rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-2xl shadow-purple-600/30 hover:bg-purple-700  transition-colors flex items-center justify-center gap-3">
                        {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <MessageSquare className="w-5 h-5" />}
                        {actionLoading ? "Processing..." : "Start Review"}
                    </button>
                )}
                {request.status === 'Reviewing' && (
                    <div className="flex flex-col gap-3">
                        {showRejectInput ? (
                            <div className="flex flex-col gap-3 ">
                                <input 
                                    type="text" 
                                    placeholder="Reason for rejection (required)..." 
                                    value={rejectReason}
                                    onChange={(e) => setRejectReason(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border border-red-200 bg-red-50/50 focus:outline-none focus:ring-2 focus:ring-red-500/20 text-sm text-red-900 placeholder:text-red-900/50"
                                    autoFocus
                                />
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setShowRejectInput(false)}
                                        disabled={actionLoading}
                                        className="py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-widest text-muted-foreground hover:bg-muted transition-colors">
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (!rejectReason.trim()) {
                                                toast.error("Please provide a reason");
                                                return;
                                            }
                                            handleReview('Rejected', rejectReason.trim());
                                        }}
                                        disabled={actionLoading}
                                        className="flex-1 py-3 bg-red-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-red-600/20 hover:bg-red-700  transition-colors flex items-center justify-center gap-2">
                                        {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm Rejection"}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowRejectInput(true)}
                                    disabled={actionLoading}
                                    className="flex-1 py-4.5 border border-red-200 bg-red-50 text-red-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-100 transition-colors flex items-center justify-center gap-2">
                                    Reject
                                </button>
                                <button
                                    onClick={() => handleReview('Pending_Assign')}
                                    disabled={actionLoading}
                                    className="flex-[2] py-4.5 bg-green-600 text-white rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-2xl shadow-green-600/30 hover:bg-green-700  transition-colors flex items-center justify-center gap-3">
                                    {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                                     {actionLoading ? "Processing..." : "Approve & Ready"}
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {request.status === 'Declined' && (
                    <div className="bg-orange-50 border border-orange-200 p-5 rounded-2xl flex items-start gap-4 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
                            <AlertOctagon className="w-6 h-6 text-orange-600" />
                        </div>
                        <div className="flex-1">
                            <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest leading-none mb-2">Assignment Declined</p>
                            <p className="text-sm font-bold text-orange-900 mb-1">
                                {request.technicianName || "A technician"} declined this job.
                            </p>
                            {request.declineReason && (
                                <p className="text-xs text-orange-800/70 italic font-medium">
                                    " {request.declineReason} "
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {request.status === 'Assigned' && (
                    <div className="flex flex-col gap-4">
                        {request.responseDeadline && new Date(request.responseDeadline) < new Date() && (
                            <div className="bg-red-50 border border-red-200 p-4 rounded-2xl flex items-center gap-3 animate-pulse">
                                <AlertOctagon className="w-5 h-5 text-red-600" />
                                <div className="flex-1">
                                    <p className="text-[10px] font-black text-red-600 uppercase tracking-widest leading-none mb-1">Response Overdue</p>
                                    <p className="text-xs font-bold text-red-900/70">Technician has not responded within the expected time.</p>
                                </div>
                            </div>
                        )}
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowResetConfirm(true)}
                                disabled={actionLoading}
                                className="flex-1 py-4.5 border border-orange-200 bg-orange-50 text-orange-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-orange-100 transition-colors flex items-center justify-center gap-2">
                                <Users className="w-4 h-4" /> Reset
                            </button>
                            <button
                                onClick={handleFinalizeAcceptance}
                                disabled={actionLoading || teamMembers.some(m => m.status === 'Invited' || m.status === 'Pending')}
                                className={`flex-[2] py-4.5 rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-2xl transition-colors flex items-center justify-center gap-2 ${
                                    teamMembers.some(m => m.status === 'Invited' || m.status === 'Pending')
                                        ? 'bg-muted text-muted-foreground cursor-not-allowed opacity-50 shadow-none border border-border'
                                        : 'bg-green-600 text-white shadow-green-600/30 hover:bg-green-700 '
                                }`}>
                                {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (!teamMembers.some(m => m.status === 'Invited' || m.status === 'Pending') && <CheckCircle2 className="w-5 h-5" />)}
                                {actionLoading ? "Processing..." : (teamMembers.some(m => m.status === 'Invited' || m.status === 'Pending') ? "Waiting on Techs..." : "Approve & Confirm")}
                            </button>
                        </div>
                    </div>
                )}

                {['Assigned', 'Accepted', 'Team_Confirmed', 'Dispatched', 'On_The_Way', 'Arrived', 'In_Progress', 'Work_Started', 'In_Zone', 'Exited_Zone'].includes(request.status) && (
                    <div className="flex mt-3">
                        <button
                            onClick={() => router.push(`/admin/jobs/${request.id}/assign`)}
                            disabled={actionLoading}
                            className="w-full py-4.5 border border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 rounded-2xl font-black text-sm uppercase tracking-[0.2em] transition-colors flex items-center justify-center gap-3">
                            <Users className="w-5 h-5" />
                            Edit Team & Lead
                        </button>
                    </div>
                )}

                {(request.status === 'Pending_Assign' || request.status === 'Declined' || request.status === 'Failed') && (
                    <button
                        onClick={() => router.push(`/admin/jobs/${request.id}/assign`)}
                        disabled={actionLoading}
                        className="w-full py-4.5 bg-primary text-primary-foreground rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-2xl shadow-primary/30 hover:shadow-primary/40  transition-colors flex items-center justify-center gap-3">
                        <Users className="w-5 h-5" />
                        {request.status === 'Pending_Assign' ? 'Assign Team' : 'Re-Assign Team'}
                    </button>
                )}

                {request.status === 'Rejected' && (
                    <div className="w-full py-4.5 bg-red-50 text-red-600 border border-red-200 rounded-2xl font-black text-sm uppercase tracking-[0.2em] flex items-center justify-center gap-2">
                        <AlertOctagon className="w-5 h-5" />
                        Request Rejected
                    </div>
                )}
                
                {request.status === 'Work_Completed' && (
                    <button
                        onClick={handleFinalizeCompletion}
                        disabled={actionLoading}
                        className="w-full py-4.5 bg-green-600 text-white rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-green-600/20 hover:shadow-green-600/40  transition-colors flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed">
                        {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                        {actionLoading ? "Processing..." : "Confirm & Complete"}
                    </button>
                )}

                {(!['Requested', 'Reviewing', 'Rejected', 'Pending_Assign', 'Declined', 'Failed', 'Assigned', 'Work_Completed'].includes(request.status)) && (
                   <div className="w-full py-4.5 bg-muted/50 text-muted-foreground border border-border/60 rounded-2xl font-black text-sm uppercase tracking-[0.2em] flex items-center justify-center gap-2">
                        <CheckCircle2 className="w-5 h-5 opacity-50" />
                        {request.status.replace('_', ' ')}
                    </div>
                )}
            </footer>

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-card w-full max-w-sm rounded-[2rem] border shadow-2xl p-6 relative overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 h-1.5 bg-red-500" />
                        
                        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
                            <AlertOctagon className="w-6 h-6 text-red-600" />
                        </div>
                        
                        <h3 className="text-xl font-black mb-2">Delete Request?</h3>
                        <p className="text-sm text-muted-foreground mb-4">This action cannot be undone. All associated data will be permanently destroyed.</p>

                        {!deleteWarning ? (
                            <div className="py-8 flex flex-col items-center justify-center gap-3 bg-muted/30 rounded-xl">
                                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                                <p className="text-xs font-bold text-muted-foreground">Scanning database...</p>
                            </div>
                        ) : (
                            <div className="bg-red-50/50 border border-red-100 rounded-xl p-4 mb-4">
                                <p className="text-xs font-black text-red-800 uppercase tracking-widest mb-3">Data to be destroyed:</p>
                                <ul className="space-y-1.5 text-sm font-medium text-red-900/80 mb-4">
                                    <li>• Base Request Record</li>
                                    {deleteWarning.counts.jobs > 0 && <li>• {deleteWarning.counts.jobs} Job Record(s)</li>}
                                    {deleteWarning.counts.masterTeams > 0 && <li>• {deleteWarning.counts.masterTeams} Master Team(s)</li>}
                                    {deleteWarning.counts.masterTeamMembers > 0 && <li>• {deleteWarning.counts.masterTeamMembers} Team Member(s)</li>}
                                    {deleteWarning.counts.attendance > 0 && <li>• {deleteWarning.counts.attendance} Attendance Log(s)</li>}
                                    {deleteWarning.counts.jobUpdates > 0 && <li>• {deleteWarning.counts.jobUpdates} Job Update(s)</li>}
                                    {deleteWarning.counts.jobStatusHistory > 0 && <li>• {deleteWarning.counts.jobStatusHistory} History Log(s)</li>}
                                </ul>

                                {deleteWarning.exportData && (
                                    <div className="bg-yellow-100 border border-yellow-200 rounded-lg p-3 text-yellow-900">
                                        <p className="text-xs font-bold">⚠️ Financial records found ({deleteWarning.counts.invoices} Invoice(s), {deleteWarning.counts.payments} Payment(s)). They will be automatically downloaded before deletion.</p>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex gap-3 mt-6">
                            <button 
                                onClick={() => setShowDeleteModal(false)}
                                disabled={deleting}
                                className="flex-1 py-3.5 rounded-xl font-bold text-sm bg-muted text-foreground hover:bg-muted/80 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleConfirmDelete}
                                disabled={!deleteWarning || deleting}
                                className="flex-[1.5] py-3.5 rounded-xl font-black text-sm bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                {deleting ? "Deleting..." : "Delete Everything"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <BottomNav active="jobs" role="admin" />
            <AlertDialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Reset Assignment?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to reset this assignment? The current technician will be removed and the job will return to Pending Assignment.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleResetAssignment}
                            disabled={actionLoading}
                            className="bg-orange-600 hover:bg-orange-700 text-white"
                        >
                            {actionLoading ? "Resetting..." : "Yes, Reset"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
