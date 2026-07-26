"use client"

import { BottomNav } from "@/components/navigation/bottom-nav"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { LogOut, User, Bell, Shield, HelpCircle, Info, Loader2, Lock } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"
import { toast } from "sonner"

export default function AdminSettingsPage() {
    const router = useRouter()
    const [selectedItem, setSelectedItem] = useState<{label: string, desc: string, icon: any, details: string} | null>(null)

    // Password change form state
    const [currentPassword, setCurrentPassword] = useState("")
    const [newPassword, setNewPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [isChangingPassword, setIsChangingPassword] = useState(false)

    const handleLogout = async () => {
        await api.logout()
        router.push("/login")
        toast.success("Logged out successfully")
    }

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!currentPassword || !newPassword || !confirmPassword) return

        setIsChangingPassword(true)
        try {
            const res = await api.changeAdminPassword(currentPassword, newPassword, confirmPassword)
            if (res.success) {
                toast.success("Password updated successfully")
                setSelectedItem(null)
                setCurrentPassword("")
                setNewPassword("")
                setConfirmPassword("")
            } else {
                if (res.fieldErrors) {
                    const firstError = Object.values(res.fieldErrors).flat()[0]
                    toast.error(firstError || res.error || "Validation failed")
                } else {
                    toast.error(res.error || "Failed to update password")
                }
            }
        } catch {
            toast.error("An unexpected error occurred")
        } finally {
            setIsChangingPassword(false)
        }
    }

    const menuItems = [
        { 
            icon: User, 
            label: "Account Profile", 
            desc: "Manage your account details",
            details: "The Account Profile section will allow you to update your personal details, change your profile picture, and manage your administrative contact information across the platform."
        },
        { 
            icon: Bell, 
            label: "Notifications", 
            desc: "Configure alert preferences",
            details: "Configure how and when you receive alerts. You will be able to toggle push notifications, email summaries, and SMS alerts for critical system events like new job requests or technician check-ins."
        },
        { 
            icon: Shield, 
            label: "Security", 
            desc: "Password and 2FA settings",
            details: "Update your administrative account password below."
        },
        { 
            icon: HelpCircle, 
            label: "Help & Support", 
            desc: "Contact support team",
            details: "Access our knowledge base, read FAQs, or open a direct support ticket with our engineering team for any platform-related issues."
        },
    ]

    return (
        <div className="min-h-screen pb-32">
            {/* Header */}
            <header className="sticky top-0 z-20 px-6 py-4 glass border-b-0 flex items-center justify-between transition-colors">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold border border-primary/20">
                        A
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight">Settings</h1>
                        <p className="text-xs text-muted-foreground font-medium">Admin User</p>
                    </div>
                </div>
                <ThemeToggle />
            </header>

            <main className="px-6 py-6 space-y-4">
                <div className="glass-card p-2 rounded-2xl">
                    {menuItems.map((item, idx) => (
                        <button
                            key={idx}
                            onClick={() => {
                                setSelectedItem(item)
                                setCurrentPassword("")
                                setNewPassword("")
                                setConfirmPassword("")
                            }}
                            className="w-full flex items-center gap-4 p-4 hover:bg-muted/50 rounded-xl transition-colors group text-left active:scale-[0.98]"
                        >
                            <div className="w-10 h-10 rounded-full bg-muted group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                                <item.icon className="w-5 h-5 text-muted-foreground group-hover:text-primary" />
                            </div>
                            <div className="flex-1">
                                <p className="font-semibold text-sm">{item.label}</p>
                                <p className="text-xs text-muted-foreground">{item.desc}</p>
                            </div>
                        </button>
                    ))}
                </div>

                <button
                    onClick={handleLogout}
                    className="w-full p-4 rounded-2xl glass-card flex items-center justify-center gap-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 hover:border-red-200 transition-colors font-semibold"
                >
                    <LogOut className="w-5 h-5" />
                    Log Out
                </button>
            </main>

            <BottomNav active="settings" role="admin" />

            <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
                <DialogContent className="sm:max-w-md border-primary/20 glass-card">
                    <DialogHeader className="gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-2 ring-1 ring-primary/20">
                            {selectedItem && <selectedItem.icon className="w-6 h-6 text-primary" />}
                        </div>
                        <DialogTitle className="text-xl font-black text-center">{selectedItem?.label}</DialogTitle>
                        <DialogDescription className="text-center font-medium leading-relaxed">
                            {selectedItem?.details}
                        </DialogDescription>
                    </DialogHeader>
                    
                    {selectedItem?.label === "Security" ? (
                        <form onSubmit={handlePasswordChange} className="space-y-4 mt-2">
                            <div className="space-y-3">
                                <div className="relative">
                                    <Lock className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                    <input
                                        type="password"
                                        placeholder="Current Password"
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        className="w-full bg-background border border-border rounded-xl p-3 pl-10 text-sm focus:outline-none focus:border-primary"
                                        required
                                    />
                                </div>
                                <div className="relative">
                                    <Lock className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                    <input
                                        type="password"
                                        placeholder="New Password (min 8 chars, 1 uppercase, 1 number, 1 special)"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="w-full bg-background border border-border rounded-xl p-3 pl-10 text-sm focus:outline-none focus:border-primary"
                                        required
                                    />
                                </div>
                                <div className="relative">
                                    <Lock className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                    <input
                                        type="password"
                                        placeholder="Confirm New Password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full bg-background border border-border rounded-xl p-3 pl-10 text-sm focus:outline-none focus:border-primary"
                                        required
                                    />
                                </div>
                            </div>
                            <Button
                                type="submit"
                                disabled={isChangingPassword || !currentPassword || !newPassword || !confirmPassword}
                                className="w-full font-bold rounded-xl h-12"
                            >
                                {isChangingPassword ? <Loader2 className="w-5 h-5 animate-spin" /> : "Update Password"}
                            </Button>
                        </form>
                    ) : (
                        <div className="flex flex-col items-center justify-center p-6 bg-primary/5 rounded-2xl mt-2 border border-primary/10">
                            <Info className="w-8 h-8 text-primary mb-3 opacity-80" />
                            <p className="text-sm font-bold text-primary tracking-widest uppercase">Coming Soon</p>
                            <p className="text-xs text-muted-foreground mt-2 text-center">This feature is currently in development and will be available in the next update.</p>
                        </div>
                    )}

                    {selectedItem?.label !== "Security" && (
                        <DialogFooter className="sm:justify-center mt-4">
                            <DialogClose asChild>
                                <Button type="button" variant="secondary" className="w-full sm:w-auto font-bold rounded-xl active:scale-95 transition-transform">
                                    Got it
                                </Button>
                            </DialogClose>
                        </DialogFooter>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
