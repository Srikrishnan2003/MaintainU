"use client"

import { useState, useRef, useMemo } from "react"
import { User, FileText, IdCard, Check, Loader2 } from "lucide-react"
import { useUploadThing } from "@/lib/uploadthing"

export type DocId = "photo" | "resume" | "aadharFront" | "aadharBack" | "panCard"

export interface DocConfig {
  id: DocId
  title: string
  type: "image" | "pdf"
  maxSizeMB: number
  icon: any
  group: "general" | "identity"
}

export const DOCUMENTS_CONFIG: DocConfig[] = [
  { id: "photo", title: "Profile photo", type: "image", maxSizeMB: 2, icon: User, group: "general" },
  { id: "resume", title: "Resume / CV", type: "pdf", maxSizeMB: 4, icon: FileText, group: "general" },
  { id: "aadharFront", title: "Aadhaar (front)", type: "image", maxSizeMB: 2, icon: IdCard, group: "identity" },
  { id: "aadharBack", title: "Aadhaar (back)", type: "image", maxSizeMB: 2, icon: IdCard, group: "identity" },
  { id: "panCard", title: "PAN card", type: "image", maxSizeMB: 2, icon: IdCard, group: "identity" },
]

type DocState = 
  | { status: "empty" }
  | { status: "uploading" }
  | { status: "uploaded", url: string, filename: string }
  | { status: "error", message: string }

interface Props {
  initialData: Record<string, string>
  onBack: () => void
  onSubmit: (data: Record<string, string>) => void
  isSubmitting?: boolean
}

export function DocumentationUpload({ initialData, onBack, onSubmit, isSubmitting }: Props) {
  // Initialize state from existing data if possible
  const [docStates, setDocStates] = useState<Record<DocId, DocState>>(() => {
    const initialState: Record<string, DocState> = {}
    DOCUMENTS_CONFIG.forEach(doc => {
      if (initialData[doc.id]) {
        initialState[doc.id] = { status: "uploaded", url: initialData[doc.id], filename: "Uploaded document" }
      } else {
        initialState[doc.id] = { status: "empty" }
      }
    })
    return initialState as Record<DocId, DocState>
  })

  const { startUpload } = useUploadThing("technicianDocs")
  
  // Track which document is currently being selected via the hidden input
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [activeDocId, setActiveDocId] = useState<DocId | null>(null)

  const handleTriggerUpload = (docId: DocId) => {
    setActiveDocId(docId)
    if (fileInputRef.current) {
      fileInputRef.current.accept = DOCUMENTS_CONFIG.find(d => d.id === docId)?.type === "pdf" ? "application/pdf" : "image/*"
      fileInputRef.current.value = "" // reset
      fileInputRef.current.click()
    }
  }

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    const docId = activeDocId
    if (!file || !docId) return

    const config = DOCUMENTS_CONFIG.find(d => d.id === docId)
    if (!config) return

    // Validate type
    if (config.type === "image" && !file.type.startsWith("image/")) {
      setDocStates(prev => ({ ...prev, [docId]: { status: "error", message: "Must be an image" } }))
      return
    }
    if (config.type === "pdf" && file.type !== "application/pdf") {
      setDocStates(prev => ({ ...prev, [docId]: { status: "error", message: "Must be a PDF" } }))
      return
    }

    // Validate size
    if (file.size > config.maxSizeMB * 1024 * 1024) {
      setDocStates(prev => ({ ...prev, [docId]: { status: "error", message: `File exceeds ${config.maxSizeMB}MB limit` } }))
      return
    }

    setDocStates(prev => ({ ...prev, [docId]: { status: "uploading" } }))

    try {
      const res = await startUpload([file])
      if (res && res[0]) {
        setDocStates(prev => ({ ...prev, [docId]: { status: "uploaded", url: res[0].url, filename: file.name } }))
      } else {
        throw new Error("Upload failed")
      }
    } catch (err: any) {
      setDocStates(prev => ({ ...prev, [docId]: { status: "error", message: err.message || "Failed to upload file" } }))
    }
  }

  const allUploaded = DOCUMENTS_CONFIG.every(doc => docStates[doc.id].status === "uploaded")

  const handleSubmit = () => {
    if (!allUploaded) return
    const finalData: Record<string, string> = {}
    Object.entries(docStates).forEach(([id, state]) => {
      if (state.status === "uploaded") finalData[id] = state.url
    })
    onSubmit(finalData)
  }

  const renderDocRow = (doc: DocConfig) => {
    const state = docStates[doc.id]
    const Icon = doc.icon

    return (
      <div key={doc.id} className="flex flex-col gap-1">
        <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card">
          <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5" />
          </div>
          
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <span className="text-sm font-medium text-foreground truncate">{doc.title}</span>
            {state.status === "uploaded" ? (
              <span className="text-xs text-green-600 font-medium truncate">{state.filename}</span>
            ) : (
              <span className="text-xs text-muted-foreground truncate">
                {doc.type === "image" ? "Image" : "PDF only"} • Max {doc.maxSizeMB}MB
              </span>
            )}
          </div>

          <div className="shrink-0">
            {state.status === "uploading" ? (
              <div className="px-4 py-1.5 rounded-lg bg-muted flex items-center justify-center h-8">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            ) : state.status === "uploaded" ? (
              <button 
                onClick={() => handleTriggerUpload(doc.id)}
                className="px-3 h-8 rounded-lg border border-border hover:bg-muted text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Check className="w-3.5 h-3.5 text-green-600" />
                Change
              </button>
            ) : (
              <button 
                onClick={() => handleTriggerUpload(doc.id)}
                className="px-4 h-8 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold transition-colors"
              >
                Add
              </button>
            )}
          </div>
        </div>
        {state.status === "error" && (
          <span className="text-xs text-red-500 font-medium px-2">{state.message}</span>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300 w-full max-w-[420px] mx-auto">
      <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileSelected} />

      <div className="space-y-3">
        {DOCUMENTS_CONFIG.filter(d => d.group === "general").map(renderDocRow)}
      </div>

      <div className="space-y-3">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1 pt-2">Identity documents</h3>
        {DOCUMENTS_CONFIG.filter(d => d.group === "identity").map(renderDocRow)}
      </div>

      <div className="flex gap-3 pt-4">
        <button 
          onClick={onBack} 
          disabled={isSubmitting}
          className="flex-1 py-3.5 rounded-xl border border-border font-bold text-sm hover:bg-muted transition-colors disabled:opacity-50"
        >
          Back
        </button>
        <button 
          onClick={handleSubmit} 
          disabled={!allUploaded || isSubmitting}
          className="flex-[2] py-3.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm transition-all shadow-sm hover:bg-primary/90 disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
        >
          {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
          Review
        </button>
      </div>
    </div>
  )
}
