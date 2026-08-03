"use client"

import { useState, useEffect } from "react"
import { BottomNav } from "@/components/navigation/bottom-nav"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { Search, User, Check, X, ShieldAlert, RotateCcw, Building2, Wrench, Filter, Trash2, Eye } from "lucide-react"
import { api, User as UserType } from "@/lib/api"
import { deleteUserAction } from "@/actions/admin.action"
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
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription
} from "@/components/ui/dialog"
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion"

export default function UserManagementPage() {
    const [activeTab, setActiveTab] = useState<"all" | "pending" | "active" | "banned" | "rejected">("pending")
    const [roleFilter, setRoleFilter] = useState<"all" | "company" | "technician">("all")
    const [loading, setLoading] = useState(true)
    const [users, setUsers] = useState<{
        all: UserType[],
        pending: UserType[],
        active: UserType[],
        banned: UserType[],
        rejected: UserType[]
    }>({
        all: [],
        pending: [],
        active: [],
        banned: [],
        rejected: []
    })
    const [search, setSearch] = useState("")
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [userToDelete, setUserToDelete] = useState<string | null>(null)

    const [detailsOpen, setDetailsOpen] = useState(false)
    const [selectedUserDetails, setSelectedUserDetails] = useState<any>(null)
    const [detailsLoading, setDetailsLoading] = useState(false)

    const handleViewDetails = async (userId: string) => {
        setDetailsOpen(true)
        setDetailsLoading(true)
        setSelectedUserDetails(null)
        try {
            const res = await api.getUserDetails(userId)
            if (res.success) {
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

    const handleDeleteConfirm = async () => {
        if (!userToDelete) return
        try {
            await deleteUserAction(userToDelete)
            toast.success("User deleted successfully")
            fetchUsers()
        } catch {
            toast.error("Failed to delete user")
        } finally {
            setDeleteDialogOpen(false)
            setUserToDelete(null)
        }
    }

    const fetchUsers = async () => {
        try {
            setLoading(true)
            const res = await api.getUsers()
            if (res.users) {
                const all = res.users
                const pending = all.filter((u: any) => u.status === 'PENDING_APPROVAL' || u.status === 'PENDING_PROFILE')
                const active = all.filter((u: any) => u.status === 'ACTIVE')
                const banned = all.filter((u: any) => u.status === 'REJECTED')
                const rejected = all.filter((u: any) => u.status === 'REJECTED')

                setUsers({ all, pending, active, banned, rejected })
            }
        } catch (e) {
            toast.error("Failed to load users")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchUsers()
    }, [])

    const handleStatusUpdate = async (userId: string, status: "PENDING_PROFILE" | "PENDING_APPROVAL" | "ACTIVE" | "REJECTED") => {
        try {
            await api.updateUserStatus(userId, status)
            let statusMessage = "updated"
            if (status === "ACTIVE") statusMessage = "approved and activated"
            if (status === "REJECTED") statusMessage = "rejected and banned"
            if (status === "PENDING_APPROVAL") statusMessage = "moved to pending approval"
            if (status === "PENDING_PROFILE") statusMessage = "reset to pending profile"
            
            toast.success(`User account successfully ${statusMessage}`)
            fetchUsers()
        } catch {
            toast.error("Failed to update status")
        }
    }

    const handleRoleToggle = async (user: UserType) => {
        const newRole = user.role === 'company' ? 'technician' : 'company'
        try {
            await api.updateUserStatus(user.id, user.status, newRole)
            toast.success(`Role switched to ${newRole}`)
            fetchUsers()
        } catch {
            toast.error("Failed to switch role")
        }
    }

    const filteredList = users[activeTab].filter(u => {
        const matchesSearch = u.name?.toLowerCase().includes(search.toLowerCase()) ||
            u.phone.includes(search) ||
            u.role.toLowerCase().includes(search.toLowerCase())

        const matchesRole = roleFilter === 'all' || u.role === roleFilter

        return matchesSearch && matchesRole
    })

    const tabs: Array<"all" | "pending" | "active" | "banned" | "rejected"> = ["all", "pending", "active", "banned", "rejected"]
    const roles: Array<"all" | "company" | "technician"> = ["all", "company", "technician"]

    const groupedUsers = {
        admin: filteredList.filter(u => u.role === 'admin'),
        company: filteredList.filter(u => u.role === 'company'),
        technician: filteredList.filter(u => u.role === 'technician'),
        other: filteredList.filter(u => !['admin', 'company', 'technician'].includes(u.role))
    }

    const renderUserCard = (user: UserType) => (
        <div
            key={user.id}
            className="glass-card p-4 rounded-2xl flex flex-col gap-4 group hover:border-primary/30 transition-all duration-300"
        >
            <div className="flex items-start justify-between">
                {/* User Info */}
                <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner ring-1 ring-border/50 ${user.role === 'company'
                        ? 'bg-blue-50 dark:bg-blue-900/20'
                        : user.role === 'technician'
                            ? 'bg-purple-50 dark:bg-purple-900/20'
                            : 'bg-slate-50 dark:bg-slate-900/20'
                        }`}>
                        {user.role === 'company' && <Building2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />}
                        {user.role === 'technician' && <Wrench className="w-6 h-6 text-purple-600 dark:text-purple-400" />}
                        {user.role === 'admin' && <ShieldAlert className="w-6 h-6 text-slate-600 dark:text-slate-400" />}
                        {!['company', 'technician', 'admin'].includes(user.role) && <User className="w-6 h-6 text-muted-foreground" />}
                    </div>
                    <div>
                        <p className="font-bold text-lg leading-tight group-hover:text-primary transition-colors">
                            {user.name || "New User"}
                        </p>
                        <p className="text-xs text-muted-foreground font-mono mt-0.5">
                            {user.phone}
                        </p>
                        <div className="flex gap-2 mt-2">

                            {/* Clickable Badge for Pending Users */}
                            <button
                                disabled={user.status !== 'PENDING_APPROVAL' && user.status !== 'PENDING_PROFILE'}
                                onClick={() => handleRoleToggle(user)}
                                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded flex items-center gap-1 transition-all ${(user.status === 'PENDING_APPROVAL' || user.status === 'PENDING_PROFILE') ? 'cursor-pointer hover:ring-1 hover:ring-current active:scale-95' : 'cursor-default'
                                    } ${user.role === 'company' ? 'bg-blue-500/10 text-blue-600' :
                                        user.role === 'technician' ? 'bg-purple-500/10 text-purple-600' :
                                            'bg-slate-500/10 text-slate-600'
                                    }`}>
                                {user.role}
                                {(user.status === 'PENDING_APPROVAL' || user.status === 'PENDING_PROFILE') && <RotateCcw className="w-3 h-3 ml-1 opacity-50" />}
                            </button>

                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${user.status === 'ACTIVE' ? 'bg-green-500/10 text-green-600' :
                                (user.status === 'PENDING_APPROVAL' || user.status === 'PENDING_PROFILE') ? 'bg-orange-500/10 text-orange-600' :
                                    user.status === 'REJECTED' ? 'bg-red-500/10 text-red-600' :
                                        'bg-slate-500/10 text-muted-foreground'
                                }`}>
                                {user.status}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-3 border-t border-border/40">
                <button
                    onClick={() => handleViewDetails(user.id)}
                    className="flex-1 py-2.5 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400 font-semibold text-sm hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all flex items-center justify-center gap-2 border border-blue-200 dark:border-blue-900/30 active:scale-95"
                >
                    <Eye className="w-4 h-4" strokeWidth={2.5} /> View Details
                </button>
                {user.role === 'admin' ? (
                    <div className="flex-1 py-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-700 dark:text-purple-300 font-semibold text-xs flex items-center justify-center gap-2">
                        <ShieldAlert className="w-4 h-4" /> Protected Admin Account
                    </div>
                ) : (
                    <>
                        {(user.status === 'PENDING_APPROVAL' || user.status === 'PENDING_PROFILE') && (
                            <>
                                <button
                                    onClick={() => handleStatusUpdate(user.id, "ACTIVE")}
                                    className="flex-1 py-2.5 rounded-xl bg-green-500 text-white font-semibold text-sm hover:bg-green-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-500/20 active:scale-95"
                                >
                                    <Check className="w-4 h-4" strokeWidth={2.5} /> Approve
                                </button>
                                <button
                                    onClick={() => handleStatusUpdate(user.id, "REJECTED")}
                                    className="flex-1 py-2.5 rounded-xl bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400 font-semibold text-sm hover:bg-red-100 dark:hover:bg-red-900/30 transition-all flex items-center justify-center gap-2 border border-red-200 dark:border-red-900/30 active:scale-95"
                                >
                                    <X className="w-4 h-4" strokeWidth={2.5} /> Reject
                                </button>
                            </>
                        )}

                        {user.status === 'REJECTED' && (
                            <button
                                onClick={() => handleStatusUpdate(user.id, "ACTIVE")}
                                className="flex-1 py-2.5 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                            >
                                <RotateCcw className="w-4 h-4" /> Re-admit / Approve
                            </button>
                        )}

                        {user.status === 'ACTIVE' && (
                            <button
                                onClick={() => handleStatusUpdate(user.id, "REJECTED")}
                                className="flex-1 py-2.5 rounded-xl bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400 font-semibold text-sm hover:bg-red-100 dark:hover:bg-red-900/30 transition-all flex items-center justify-center gap-2 border border-red-200 dark:border-red-900/30 active:scale-95"
                            >
                                Ban User
                            </button>
                        )}

                        {user.status === 'REJECTED' && (
                            <button
                                onClick={() => handleStatusUpdate(user.id, "ACTIVE")}
                                className="flex-1 py-2.5 rounded-xl bg-white dark:bg-card border border-border text-foreground font-semibold text-sm hover:bg-muted transition-all flex items-center justify-center gap-2"
                            >
                                Unban
                            </button>
                        )}

                        {/* Delete Button (Available for all non-active or explicit cleanup) */}
                        <button
                            onClick={() => {
                                setUserToDelete(user.id)
                                setDeleteDialogOpen(true)
                            }}
                            className="w-10 flex items-center justify-center rounded-xl bg-muted/50 text-muted-foreground hover:bg-red-500/10 hover:text-red-600 transition-colors"
                            title="Delete User"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </>
                )}
            </div>
        </div>
    )

    return (
        <div className="min-h-screen pb-32">
            {/* Header */}
            <header className="sticky top-0 z-20 px-6 py-4 glass border-b-0 flex items-center justify-between transition-all">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
                    <p className="text-xs text-muted-foreground font-medium">Verify & Manage Users</p>
                </div>
                <div className="flex items-center gap-3">
                    <ThemeToggle />
                    <div className="h-10 px-3 flex items-center justify-center bg-primary/10 text-primary rounded-xl font-bold text-xs shadow-sm ring-1 ring-primary/10">
                        {users.active.length} Active
                    </div>
                </div>
            </header>

            <main className="px-6 py-6 space-y-6">
                {/* Search */}
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="text-muted-foreground w-5 h-5" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search users by name, phone, or role..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-card/50 glass focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all shadow-sm"
                    />
                </div>

                {/* Role Filter Tabs (Primary) */}
                <div className="bg-muted/30 p-1.5 rounded-2xl flex gap-1">
                    {roles.map((r) => (
                        <button
                            key={r}
                            onClick={() => setRoleFilter(r)}
                            className={`flex-1 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${roleFilter === r
                                ? "bg-white dark:bg-card shadow-sm text-primary ring-1 ring-border/50"
                                : "text-muted-foreground hover:text-foreground hover:bg-white/30 dark:hover:bg-card/30"
                                }`}
                        >
                            {r === 'all' && <Filter className="w-3.5 h-3.5" />}
                            {r === 'company' && <Building2 className="w-3.5 h-3.5" />}
                            {r === 'technician' && <Wrench className="w-3.5 h-3.5" />}
                            {r}
                        </button>
                    ))}
                </div>

                {/* Status Tabs (Secondary) */}
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    {tabs.map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-5 py-2.5 rounded-full font-semibold text-sm whitespace-nowrap transition-all border flex items-center gap-2 ${activeTab === tab
                                ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/25"
                                : "bg-transparent hover:bg-muted text-muted-foreground border-border"
                                }`}
                        >
                            <span className="capitalize">
                                {tab}
                            </span>

                            {tab === "pending" && users[tab].length > 0 && (
                                <span className={`px-2 py-0.5 rounded-md text-xs font-bold transition-all ${activeTab === tab
                                    ? "bg-white/20 text-white"
                                    : "bg-red-500/10 text-red-600 dark:text-red-400"
                                    }`}>
                                    {users[tab].length}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* List */}
                <div className="space-y-3">
                    {filteredList.length === 0 ? (
                        <div className="text-center py-16 text-muted-foreground border border-dashed border-border/60 rounded-3xl bg-muted/5 flex flex-col items-center gap-4">
                            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                                <Search className="w-8 h-8 opacity-20" />
                            </div>
                            <div>
                                <p className="font-semibold text-lg">No users found</p>
                                <p className="text-xs opacity-60">Try adjusting your filters</p>
                            </div>
                        </div>
                    ) : (
                        <Accordion type="multiple" defaultValue={["admin", "company", "technician", "other"]} className="w-full">
                            {groupedUsers.admin.length > 0 && (
                                <AccordionItem value="admin" className="border-none bg-muted/5 rounded-2xl mb-4 px-4 shadow-sm border border-border/50">
                                    <AccordionTrigger className="hover:no-underline py-4">
                                        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                            <ShieldAlert className="w-4 h-4" /> Administrators ({groupedUsers.admin.length})
                                        </h2>
                                    </AccordionTrigger>
                                    <AccordionContent>
                                        <div className="space-y-3 pt-2">
                                            {groupedUsers.admin.map(renderUserCard)}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            )}

                            {groupedUsers.company.length > 0 && (
                                <AccordionItem value="company" className="border-none bg-muted/5 rounded-2xl mb-4 px-4 shadow-sm border border-border/50">
                                    <AccordionTrigger className="hover:no-underline py-4">
                                        <h2 className="text-sm font-bold text-blue-500 uppercase tracking-widest flex items-center gap-2">
                                            <Building2 className="w-4 h-4" /> Companies ({groupedUsers.company.length})
                                        </h2>
                                    </AccordionTrigger>
                                    <AccordionContent>
                                        <div className="space-y-3 pt-2">
                                            {groupedUsers.company.map(renderUserCard)}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            )}

                            {groupedUsers.technician.length > 0 && (
                                <AccordionItem value="technician" className="border-none bg-muted/5 rounded-2xl mb-4 px-4 shadow-sm border border-border/50">
                                    <AccordionTrigger className="hover:no-underline py-4">
                                        <h2 className="text-sm font-bold text-purple-500 uppercase tracking-widest flex items-center gap-2">
                                            <Wrench className="w-4 h-4" /> Technicians ({groupedUsers.technician.length})
                                        </h2>
                                    </AccordionTrigger>
                                    <AccordionContent>
                                        <div className="space-y-3 pt-2">
                                            {groupedUsers.technician.map(renderUserCard)}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            )}

                            {groupedUsers.other.length > 0 && (
                                <AccordionItem value="other" className="border-none bg-muted/5 rounded-2xl mb-4 px-4 shadow-sm border border-border/50">
                                    <AccordionTrigger className="hover:no-underline py-4">
                                        <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                            <User className="w-4 h-4" /> Unassigned Role ({groupedUsers.other.length})
                                        </h2>
                                    </AccordionTrigger>
                                    <AccordionContent>
                                        <div className="space-y-3 pt-2">
                                            {groupedUsers.other.map(renderUserCard)}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            )}
                        </Accordion>
                    )}
                </div>
            </main>

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the user account and remove their data from our servers.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setDeleteDialogOpen(false)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-600 hover:bg-red-700">
                            Delete User
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
                <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto w-[90vw] rounded-2xl">
                    <DialogHeader>
                        <DialogTitle>Registration Details</DialogTitle>
                        <DialogDescription>
                            Review the full information provided by this user.
                        </DialogDescription>
                    </DialogHeader>
                    {detailsLoading ? (
                        <div className="py-8 flex justify-center"><div className="w-8 h-8 rounded-full border-t-2 border-primary animate-spin" /></div>
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
                                        <p className="text-sm"><span className="text-muted-foreground w-24 inline-block">Phone:</span> {selectedUserDetails.details.spokespersonPhone || 'N/A'}</p>
                                        <p className="text-sm"><span className="text-muted-foreground w-24 inline-block">Email:</span> {selectedUserDetails.details.email || 'N/A'}</p>
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
                                        <div className="p-4 bg-muted/50 rounded-xl space-y-2 border border-border/50 group">
                                            <p className="text-sm font-semibold pb-1 border-b border-border/50">Verification Documents</p>
                                            <div className="grid grid-cols-1 gap-2 pt-1">
                                                {selectedUserDetails.details.documents.eAadhaar && (
                                                    <a href={selectedUserDetails.details.documents.eAadhaar} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-600 hover:underline flex items-center gap-1">
                                                        <Eye className="w-3 h-3" /> e-Aadhaar
                                                    </a>
                                                )}
                                                {selectedUserDetails.details.documents.ePan && (
                                                    <a href={selectedUserDetails.details.documents.ePan} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-600 hover:underline flex items-center gap-1 font-bold">
                                                        <Eye className="w-3 h-3" /> e-PAN Verified
                                                    </a>
                                                )}
                                                {selectedUserDetails.details.documents.resume && (
                                                    <a href={selectedUserDetails.details.documents.resume} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-600 hover:underline flex items-center gap-1 font-bold">
                                                        <Eye className="w-3 h-3" /> Resume / CV Attached
                                                    </a>
                                                )}
                                                {selectedUserDetails.details.documents.profilePhoto && (
                                                    <a href={selectedUserDetails.details.documents.profilePhoto} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-600 hover:underline flex items-center gap-1 font-bold">
                                                        <Eye className="w-3 h-3" /> Profile Photograph
                                                    </a>
                                                )}

                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                            
                            {(selectedUserDetails.status === 'PENDING_APPROVAL' || selectedUserDetails.status === 'PENDING_PROFILE') && selectedUserDetails.role !== 'admin' && (
                                <div className="flex gap-2 pt-4 border-t border-border/50 mt-4">
                                    <button
                                        onClick={() => { handleStatusUpdate(selectedUserDetails.id, "ACTIVE"); setDetailsOpen(false); }}
                                        className="flex-1 py-3.5 rounded-xl bg-green-500 text-white font-bold text-sm hover:bg-green-600 transition-all shadow-lg shadow-green-500/20 active:scale-95 flex items-center justify-center gap-2"
                                    >
                                        <Check className="w-4 h-4" strokeWidth={3} /> Approve
                                    </button>
                                    <button
                                        onClick={() => { handleStatusUpdate(selectedUserDetails.id, "REJECTED"); setDetailsOpen(false); }}
                                        className="flex-1 py-3.5 rounded-xl bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400 font-bold text-sm hover:bg-red-100 dark:hover:bg-red-900/30 transition-all border border-red-200 dark:border-red-900/30 active:scale-95 flex items-center justify-center gap-2"
                                    >
                                        <X className="w-4 h-4" strokeWidth={3} /> Reject
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="py-8 text-center text-muted-foreground text-sm">No details found</div>
                    )}
                </DialogContent>
            </Dialog>

            <BottomNav active="onboarding" role="admin" />
        </div >
    )
}
