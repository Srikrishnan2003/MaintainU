"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { api } from "@/lib/api"
import { useSSE } from "@/hooks/use-sse"

export function ApprovalPoller({ phone, role }: { phone: string, role: string }) {
    const router = useRouter()

    const { accountApproved, fallbackMode } = useSSE(true)

    // Handle SSE Approval
    useEffect(() => {
        if (accountApproved) {
            if (role === "company") {
                router.push(`/register/company?phone=${phone}`)
            } else {
                router.push(`/register/technician?phone=${phone}`)
            }
        }
    }, [accountApproved, router, role, phone])

    // Fallback Polling
    useEffect(() => {
        if (!fallbackMode) return;
        const interval = setInterval(async () => {
            try {
                const res = await api.refreshSession()
                if (res.success && res.status === 'ACTIVE') {
                    if (role === "company") {
                        router.push(`/register/company?phone=${phone}`)
                    } else {
                        router.push(`/register/technician?phone=${phone}`)
                    }
                }
            } catch (e) {
                // ignore
            }
        }, 30000)
        return () => clearInterval(interval)
    }, [fallbackMode, router, phone, role])

    return null
}
