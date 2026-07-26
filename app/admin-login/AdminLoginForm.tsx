"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ShieldCheck, Loader2, Lock, User, Eye, EyeOff } from "lucide-react"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { Logo } from "@/components/ui/logo"

export function AdminLoginForm() {
    const router = useRouter()
    const [adminId, setAdminId] = useState("")
    const [password, setPassword] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!adminId || !password) return

        setIsLoading(true)
        try {
            const res = await api.adminLogin(adminId, password)

            if (res.success) {
                toast.success("Secure Access Granted")
                router.push("/admin/dashboard")
            } else {
                toast.error(res.message || "Access Denied")
                setPassword("")
            }
        } catch {
            toast.error("Authentication Error")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="w-full max-w-md space-y-8 glass p-8 rounded-3xl shadow-xl">
            {/* Header */}
            <div className="space-y-3 text-center">
                <Logo size="xl" className="mx-auto mb-6" />
                <h1 className="text-4xl font-bold tracking-tight text-foreground">MaintainU</h1>
                <p className="text-muted-foreground text-lg">Your maintenance partner</p>
            </div>

            <div className="space-y-6">
                <div className="text-center">
                    <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Admin Credentials</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-4">
                        {/* Admin ID Input */}
                        <div className="w-full rounded-2xl bg-white dark:bg-card border border-border focus-within:border-primary/50 focus-within:shadow-lg transition-all group relative overflow-hidden">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
                                <User className="w-6 h-6" />
                            </div>
                            <input
                                type="text"
                                placeholder="Administration ID"
                                value={adminId}
                                onChange={(e) => setAdminId(e.target.value)}
                                className="w-full bg-transparent p-4 pl-14 h-14 text-base focus:outline-none placeholder:text-muted-foreground/60"
                            />
                        </div>

                        {/* Password Input */}
                        <div className="w-full rounded-2xl bg-white dark:bg-card border border-border focus-within:border-primary/50 focus-within:shadow-lg transition-all group relative overflow-hidden">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
                                <Lock className="w-6 h-6" />
                            </div>
                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder="Secure Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-transparent p-4 pl-14 pr-14 h-14 text-base focus:outline-none placeholder:text-muted-foreground/60"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                            >
                                {showPassword ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading || !adminId || !password}
                        className="w-full p-4 rounded-2xl bg-gradient-to-r from-primary to-blue-600 text-white hover:shadow-lg hover:scale-[1.02] transition-all font-bold text-lg disabled:opacity-50 flex items-center justify-center mt-2"
                    >
                        {isLoading ? <Loader2 className="animate-spin w-6 h-6" /> : "Authenticate"}
                    </button>
                </form>
            </div>
        </div>
    )
}
