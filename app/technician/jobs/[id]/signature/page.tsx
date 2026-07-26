"use client"

import type React from "react"

import { useRef, useState, use, useEffect } from "react"
import { useRouter } from "next/navigation"
import { api, Job } from "@/lib/api"
import { toast } from "sonner"
import { Loader2, ArrowLeft, Signature, CheckSquare, X, Send } from "lucide-react"

export default function SignaturePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [job, setJob] = useState<Job | null>(null)
  const [supervisorName, setSupervisorName] = useState("")
  const [supervisorDesignation, setSupervisorDesignation] = useState("")
  const [isDrawing, setIsDrawing] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [fetchingJob, setFetchingJob] = useState(true)

  useEffect(() => {
    const fetchJob = async () => {
      try {
        const res = await api.getJobById(id)
        if (res.job) setJob(res.job as Job)
      } catch (e) {
        toast.error("Failed to load job details")
      } finally {
        setFetchingJob(false)
      }
    }
    fetchJob()
  }, [id])

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    let clientX, clientY

    if ("touches" in e) {
      clientX = e.touches[0].clientX
      clientY = e.touches[0].clientY
    } else {
      clientX = e.clientX
      clientY = e.clientY
    }

    // Map client coordinates to canvas internal resolution
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    }
  }

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const { x, y } = getCoordinates(e)
    setIsDrawing(true)
    ctx.beginPath()
    ctx.moveTo(x, y)

    // Set styles here to ensure they apply
    ctx.lineWidth = 3
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    ctx.strokeStyle = "#000000" // Default to black for signatures

    // Attempt to use primary color if available in theme
    const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary')
    if (primaryColor) ctx.strokeStyle = `rgb(${primaryColor.trim()})`

    if ("touches" in e) e.preventDefault()
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const { x, y } = getCoordinates(e)
    ctx.lineTo(x, y)
    ctx.stroke()

    if ("touches" in e) e.preventDefault()
  }

  const endDrawing = () => {
    setIsDrawing(false)
  }

  const clearSignature = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const canvas = canvasRef.current
      const signature = canvas ? canvas.toDataURL() : ""

      const res = await api.completeJob(id, signature)
      
      if (res && res.success === false) {
        toast.error(res.message || "Failed to complete job");
        return;
      }

      toast.success("Job completed successfully!")

      // Navigate to completion success or back to dashboard
      router.push("/technician/dashboard")
    } catch (e) {
      toast.error("Failed to submit job completion")
    } finally {
      setLoading(false)
    }
  }

  if (fetchingJob) return (
    <div className="min-h-screen app-gradient flex items-center justify-center gap-3">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
      <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Loading...</span>
    </div>
  )

  return (
    <div className="min-h-screen pb-32 app-gradient">
      {/* Header */}
      <header className="sticky top-0 z-30 px-6 py-6 glass border-b-0 mb-6 flex items-center justify-between shadow-sm">
        <button onClick={() => router.back()} className="w-10 h-10 glass rounded-xl flex items-center justify-center hover:bg-muted/50 transition-all active:scale-90">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="text-right">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none">Completion</p>
          <h1 className="text-sm font-black text-foreground mt-1">Sign-off</h1>
        </div>
      </header>

      <main className="px-6 space-y-8">
        <div className="text-center">
          <h2 className="text-2xl font-black text-foreground tracking-tight">Job Complete</h2>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">Client Authorization Required</p>
        </div>

        {/* Work Summary */}
        <div className="glass-card p-6 rounded-[2rem] border-t border-white/20">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <CheckSquare className="w-6 h-6" />
            </div>
            <div>
              <p className="font-black text-lg leading-tight">{String(job?.company || "ABC Industries")}</p>
              <p className="text-[10px] font-black text-muted-foreground uppercase mt-1 tracking-tight">{String(job?.service || "Electrical Maintenance")}</p>
            </div>
          </div>
          <div className="p-4 bg-muted/30 rounded-2xl border border-border/50">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Status</p>
            <p className="text-sm font-bold text-foreground">Verified by Technician • {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
        </div>

        {/* Supervisor Info */}
        <div className="space-y-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Supervisor's Full Name"
              value={supervisorName}
              onChange={(e) => setSupervisorName(e.target.value)}
              className="w-full px-6 py-4 rounded-2xl glass border border-white/10 text-foreground font-bold placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
            />
          </div>
          <div className="relative">
            <input
              type="text"
              placeholder="Authorized Designation"
              value={supervisorDesignation}
              onChange={(e) => setSupervisorDesignation(e.target.value)}
              className="w-full px-6 py-4 rounded-2xl glass border border-white/10 text-foreground font-bold placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
            />
          </div>
        </div>

        {/* Signature Canvas */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Affix Signature</p>
            <button
              onClick={clearSignature}
              className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-1 hover:underline"
            >
              <X className="w-3 h-3" /> Clear Pad
            </button>
          </div>

          <div className="relative glass-card p-1 rounded-3xl overflow-hidden border border-white/20 shadow-inner">
            <canvas
              ref={canvasRef}
              width={800} // Higher internal resolution
              height={400}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={endDrawing}
              onMouseLeave={endDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={endDrawing}
              className="w-full aspect-[2/1] bg-white dark:bg-slate-900/50 rounded-2xl cursor-crosshair"
            />
            <div className="absolute inset-0 pointer-events-none border-4 border-primary/5 rounded-2xl" />
          </div>
        </div>

        {/* Confirmation Checkbox */}
        <label className={`flex items-start gap-4 p-5 rounded-3xl group cursor-pointer border-2 transition-all duration-300 ${confirmed ? 'glass border-primary' : 'glass-card border-transparent'}`}>
          <div className={`mt-0.5 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${confirmed ? 'bg-primary border-primary' : 'border-muted-foreground/30'}`}>
            {confirmed && <Signature className="w-3.5 h-3.5 text-white" />}
          </div>
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="hidden"
          />
          <div>
            <span className="text-sm font-bold text-foreground leading-snug block">I confirm verification</span>
            <span className="text-[10px] font-bold text-muted-foreground leading-tight block mt-1">I authorize that the listed works were performed satisfactorily.</span>
          </div>
        </label>

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={!supervisorName || !supervisorDesignation || !confirmed || loading}
          className="w-full py-5 px-6 rounded-2xl bg-primary text-primary-foreground font-black text-sm uppercase tracking-[0.2em] shadow-2xl shadow-primary/30 active:scale-95 disabled:opacity-40 disabled:grayscale transition-all flex items-center justify-center gap-3 animate-in fade-in"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          {loading ? "Processing..." : "Submit Completion"}
        </button>
      </main>
    </div>
  )
}
