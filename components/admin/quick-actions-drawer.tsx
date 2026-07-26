"use client"

import { useRouter } from "next/navigation"
import { Briefcase, Users, UserPlus, Map, Calendar, DollarSign, LayoutGrid, Settings } from "lucide-react"
import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
} from "@/components/ui/drawer"
import { cn } from "@/lib/utils"

const quickActions = [
    { icon: Briefcase, label: "View Requests", path: "/admin/requests", color: "text-purple-500" },
    { icon: Users, label: "Technicians", path: "/admin/technicians", color: "text-indigo-500" },
    { icon: UserPlus, label: "User Management", path: "/admin/onboarding", color: "text-blue-500" },
    { icon: Calendar, label: "Job Calendar", path: "/admin/calendar", color: "text-red-500" },
    { icon: Settings, label: "Settings", path: "/admin/settings", color: "text-slate-500" },
]

interface QuickActionsDrawerProps {
    children: React.ReactNode
    isOpen?: boolean
    onOpenChange?: (open: boolean) => void
}

export function QuickActionsDrawer({ children, isOpen, onOpenChange }: QuickActionsDrawerProps) {
    const router = useRouter()

    const handleNavigation = (path: string) => {
        router.push(path)
        onOpenChange?.(false)
    }

    return (
        <Drawer open={isOpen} onOpenChange={onOpenChange}>
            <DrawerTrigger asChild>
                {children}
            </DrawerTrigger>
            <DrawerContent className="pb-8">
                <DrawerHeader>
                    <DrawerTitle className="text-center text-lg font-bold">Quick Actions</DrawerTitle>
                </DrawerHeader>
                <div className="p-4 pt-0">
                    <div className="grid grid-cols-3 gap-3">
                        {quickActions.map((action, idx) => (
                            <button
                                key={idx}
                                onClick={() => handleNavigation(action.path)}
                                className="group p-3 rounded-xl glass-card border border-white/20 hover:border-primary/30 hover:shadow-lg transition-all flex flex-col items-center justify-center gap-2 active:scale-95"
                            >
                                <div className={cn(
                                    "p-3 rounded-full bg-muted group-hover:bg-white dark:group-hover:bg-card shadow-inner group-hover:shadow-sm transition-all",
                                    action.color
                                )}>
                                    <action.icon className="w-6 h-6" strokeWidth={1.5} />
                                </div>
                                <span className="text-[10px] font-semibold text-center text-foreground group-hover:text-primary transition-colors leading-tight">
                                    {action.label}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            </DrawerContent>
        </Drawer>
    )
}
