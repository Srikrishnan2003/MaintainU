"use client"

import { BottomNav } from "@/components/navigation/bottom-nav"
import { BiUser, BiCog, BiLogOut, BiChevronRight, BiBuilding, BiPhone, BiEnvelope, BiCreditCard, BiShield, BiEdit } from "react-icons/bi"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useEffect, useState } from "react"
import { getCompanyProfileAction, updateCompanyProfileAction } from "@/actions/company.action"
import { api } from "@/lib/api"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"

let cachedProfile: any = null;

export default function CompanyProfile() {
    const router = useRouter()

    const [profile, setProfile] = useState<any>(cachedProfile)
    const [loading, setLoading] = useState(!cachedProfile)
    const [isEditing, setIsEditing] = useState(false)
    const [editingData, setEditingData] = useState<any>({})
    const [updating, setUpdating] = useState(false)

    const fetchProfile = async () => {
        try {
            const res = await getCompanyProfileAction()
            if (res.success) {
                cachedProfile = res.data;
                setProfile(res.data)
                setEditingData({
                    companyName: res.data?.companyName,
                    industryType: res.data?.industryType,
                    email: res.data?.email,
                    address: res.data?.address,
                    contactPerson: res.data?.contactPerson,
                    gstin: res.data?.gstin,
                    spokespersonPhone: res.data?.spokespersonPhone,
                })
            } else {
                toast.error("Failed to load profile")
            }
        } catch (e) {
            toast.error("An error occurred")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchProfile()
    }, [])

    const handleLogout = async () => {
        await api.logout()
        router.push("/login")
    }

    const menuItems = [
        { icon: BiBuilding, label: "Company Details", value: profile?.companyName || "Loading..." },
        { icon: BiPhone, label: "Contact Phone", value: profile?.phone || "Loading..." },
        { icon: BiEnvelope, label: "Email Address", value: profile?.email || "admin@company.com" },
        { icon: BiUser, label: "Contact Person", value: profile?.contactPerson || "Not Set" },
        { icon: BiShield, label: "GST Number", value: profile?.gstin || "Not Provided" },
    ]

    const handleUpdateProfile = async () => {
        setUpdating(true)
        try {
            const res = await updateCompanyProfileAction(editingData)
            if (res.success) {
                toast.success("Profile updated")
                setIsEditing(false)
                fetchProfile()
            } else {
                if (res.fieldErrors) {
                    toast.error(`Validation Error: ${Object.values(res.fieldErrors).flat().join(", ")}`)
                } else {
                    toast.error(res.message || "Update failed")
                }
            }
        } catch (e) {
            toast.error("Failed to update profile")
        } finally {
            setUpdating(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background pb-32">
            {/* Extended Header / Cover */}
            <div className="relative pt-10 pb-20 px-6 bg-gradient-to-br from-primary/20 via-primary/5 to-background border-b border-border/50 rounded-b-[3rem]">
                <div className="mx-auto w-full max-w-md flex flex-col items-center text-center">
                    <div className="relative mb-4">
                        <div className="w-28 h-28 rounded-full bg-white dark:bg-slate-800 shadow-2xl flex items-center justify-center ring-4 ring-white/50 dark:ring-white/10 p-1">
                            <BiBuilding className="w-12 h-12 text-primary" />
                        </div>
                        <button
                            onClick={() => setIsEditing(true)}
                            className="absolute -top-1 -right-1 p-2 bg-primary text-white rounded-full shadow-lg hover:scale-110 transition-transform"
                        >
                            <BiEdit className="w-4 h-4" />
                        </button>
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight mb-1">{profile?.companyName || "Company Profile"}</h1>
                    <p className="text-sm text-muted-foreground font-medium bg-background/50 backdrop-blur px-3 py-1 rounded-full border border-border/50">
                        #COMP-{profile?.userId?.substring(0, 4) || "000"} • {profile?.industry || "General"}
                    </p>
                </div>
            </div>

            {/* Menu Options */}
            <main className="px-6 -mt-10 space-y-5 mx-auto max-w-md relative z-10">
                {/* Info Card */}
                <section className="glass-card rounded-3xl p-2 shadow-xl shadow-black/5 dark:shadow-black/20">
                    {menuItems.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between p-4 border-b border-border/40 last:border-0 hover:bg-muted/30 transition-colors rounded-2xl group cursor-default">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-primary/10 rounded-2xl text-primary group-hover:scale-110 transition-transform">
                                    <item.icon className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-0.5">{item.label}</p>
                                    <p className="text-sm font-semibold">{item.value}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </section>

                {/* Settings & Actions */}
                <section className="glass-card rounded-3xl p-2">
                    <button
                        onClick={() => router.push("/company/settings")}
                        className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors rounded-2xl group"
                    >
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-slate-500/10 rounded-2xl text-slate-500 group-hover:text-foreground transition-colors">
                                <BiCog className="w-5 h-5" />
                            </div>
                            <span className="font-semibold text-sm">App Settings</span>
                        </div>
                        <BiChevronRight className="w-5 h-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                    </button>
                    <button 
                        onClick={() => toast.info("Privacy and Security policies will be updated soon!")}
                        className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors rounded-2xl group"
                    >
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-slate-500/10 rounded-2xl text-slate-500 group-hover:text-foreground transition-colors">
                                <BiShield className="w-5 h-5" />
                            </div>
                            <span className="font-semibold text-sm">Privacy & Security</span>
                        </div>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mr-2 bg-primary/10 text-primary px-2 py-1 rounded-full">Soon</span>
                    </button>
                </section>

                {/* Logout */}
                <button
                    onClick={handleLogout}
                    className="w-full glass-card p-4 rounded-3xl flex items-center justify-center gap-2 text-red-500 hover:bg-red-500/5 hover:border-red-500/20 transition-all font-bold tracking-wide"
                >
                    <BiLogOut className="w-5 h-5" />
                    Log Out
                </button>

                <p className="text-center text-[10px] text-muted-foreground pt-2 pb-6">Version 1.0.0 • MaintainU</p>
            </main>

            <BottomNav active="profile" role="company" />

            <Dialog open={isEditing} onOpenChange={setIsEditing}>
                <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-md rounded-3xl p-6 overflow-hidden">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold">Edit Profile</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="companyName">Company Name</Label>
                            <Input
                                id="companyName"
                                value={editingData.companyName || ""}
                                onChange={(e) => setEditingData({ ...editingData, companyName: e.target.value })}
                                placeholder="Enter company name"
                                className="rounded-xl"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="industry">Industry</Label>
                            <Input
                                id="industry"
                                value={editingData.industryType || ""}
                                onChange={(e) => setEditingData({ ...editingData, industryType: e.target.value })}
                                placeholder="E.g. Manufacturing"
                                className="rounded-xl"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email Address</Label>
                            <Input
                                id="email"
                                type="email"
                                value={editingData.email || ""}
                                onChange={(e) => setEditingData({ ...editingData, email: e.target.value })}
                                placeholder="admin@company.com"
                                className="rounded-xl"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="contactPerson">Contact Person</Label>
                            <Input
                                id="contactPerson"
                                value={editingData.contactPerson || ""}
                                onChange={(e) => setEditingData({ ...editingData, contactPerson: e.target.value })}
                                placeholder="Contact person name"
                                className="rounded-xl"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="address">Address</Label>
                            <Input
                                id="address"
                                value={editingData.address || ""}
                                onChange={(e) => setEditingData({ ...editingData, address: e.target.value })}
                                placeholder="Company address"
                                className="rounded-xl"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="gstin">GST Number</Label>
                            <Input
                                id="gstin"
                                value={editingData.gstin || ""}
                                onChange={(e) => setEditingData({ ...editingData, gstin: e.target.value })}
                                placeholder="GST Number"
                                className="rounded-xl uppercase shadow-sm"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="spokespersonPhone">Contact Phone</Label>
                            <Input
                                id="spokespersonPhone"
                                value={editingData.spokespersonPhone || ""}
                                onChange={(e) => setEditingData({ ...editingData, spokespersonPhone: e.target.value })}
                                placeholder="Secondary contact phone"
                                className="rounded-xl shadow-sm"
                            />
                        </div>
                    </div>
                    <DialogFooter className="flex-row gap-2">
                        <button
                            onClick={() => setIsEditing(false)}
                            className="flex-1 py-3 px-4 rounded-xl border border-border font-semibold text-sm hover:bg-muted transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleUpdateProfile}
                            disabled={updating}
                            className="flex-1 py-3 px-4 rounded-xl bg-primary text-white font-semibold text-sm hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {updating ? <div className="w-4 h-4 border-2 border-white/30 border-t-white animate-spin rounded-full" /> : "Save Changes"}
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
