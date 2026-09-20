"use client"

import { useState } from "react"
import { Loader2, Plus, X, CheckCircle, Image as ImageIcon, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { UploadDropzone } from "@/lib/uploadthing"
import { postJobUpdateAction } from "@/actions/technician.action"
import { z } from "zod"
import { useRouter } from "next/navigation"

const jobUpdateSchema = z.object({
  message: z.string().min(1, "Message is required"),
  photos: z.array(z.string().url()).max(5, "Maximum 5 photos allowed")
})

export function JobUpdateForm({ jobId }: { jobId: string }) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [photos, setPhotos] = useState<string[]>([])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
        jobUpdateSchema.parse({ message, photos })
    } catch (err: any) {
        toast.error(err.errors?.[0]?.message || "Validation failed")
        return
    }

    setLoading(true)
    try {
      const res = await postJobUpdateAction(jobId, message, photos)
      if (res.success) {
        toast.success("Job update posted")
        setMessage("")
        setPhotos([])
        setIsOpen(false)
        router.refresh()
      } else {
        if (res.fieldErrors) {
            toast.error(`Validation Error: ${Object.values(res.fieldErrors).flat().join(", ")}`)
        } else {
            toast.error("Failed to post update")
        }
      }
    } catch (e) {
      toast.error("An error occurred")
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="w-full py-4 glass-card border border-primary/20 hover:border-primary/50 text-primary font-black text-sm uppercase tracking-widest rounded-[2rem] flex items-center justify-center gap-2 transition-all active:scale-95"
      >
        <Plus className="w-5 h-5" />
        Add Status Update
      </button>
    )
  }

  return (
    <div className="glass-card p-5 rounded-[2rem] border border-primary/30 animate-in fade-in slide-in-from-top-4 relative overflow-hidden">
        <button 
            onClick={() => setIsOpen(false)}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
        >
            <X className="w-4 h-4" />
        </button>
        
        <h3 className="text-sm font-black uppercase tracking-widest mb-4">Post Update</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <textarea
                    placeholder="Describe the current status or any issues..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full min-h-[100px] p-4 rounded-2xl bg-card/50 border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm resize-none"
                    required
                />
            </div>

            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Attach Photos (Max 5)</label>
                </div>

                <div className="bg-card/30 border border-border border-dashed rounded-xl p-3 flex justify-center">
                    <UploadDropzone
                        endpoint="jobPhoto"
                        input={{}}
                        onClientUploadComplete={(res) => {
                            if (res && res.length > 0) {
                                const newPhotos = res.map(file => file.url)
                                if (photos.length + newPhotos.length > 5) {
                                    toast.error("Maximum 5 photos allowed")
                                    return
                                }
                                setPhotos(prev => [...prev, ...newPhotos])
                                toast.success("Photo uploaded")
                            }
                        }}
                        onUploadError={(error: Error) => {
                            toast.error(`Upload failed: ${error.message}`)
                        }}
                        className="ut-button:bg-primary ut-button:ut-readying:bg-primary/50 border-none bg-transparent m-0 p-4"
                    />
                </div>

                {photos.length > 0 && (
                    <div className="grid grid-cols-5 gap-2 mt-2">
                        {photos.map((url, idx) => (
                            <div key={idx} className="relative aspect-square rounded-lg overflow-hidden group border border-border">
                                <img src={url} alt={`Upload ${idx + 1}`} className="w-full h-full object-cover" />
                                <button
                                    type="button"
                                    onClick={() => setPhotos(prev => prev.filter((_, i) => i !== idx))}
                                    className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all"
                                >
                                    <Trash2 className="w-4 h-4 text-white" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="pt-2">
                <button
                    type="submit"
                    disabled={loading || !message.trim()}
                    className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-primary/20 hover:shadow-primary/30 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                    {loading ? "Posting..." : "Submit Update"}
                </button>
            </div>
        </form>
    </div>
  )
}
