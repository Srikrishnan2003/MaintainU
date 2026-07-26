"use client"

import Link from "next/link"
import { BiHomeAlt, BiClipboard, BiBell, BiUser, BiCalendar, BiBriefcaseAlt, BiCog, BiMoney, BiGroup, BiGridAlt, BiReceipt } from "react-icons/bi"
import { QuickActionsDrawer } from "@/components/admin/quick-actions-drawer"
import { useSSE } from "@/hooks/use-sse"
import { useState, useEffect } from "react"

type NavRole = "company" | "technician" | "admin"

interface BottomNavProps {
  active: string
  role: NavRole
}

const navItems = {
  company: [
    { id: "home", label: "Home", icon: BiHomeAlt, href: "/company/dashboard" },
    { id: "requests", label: "Requests", icon: BiClipboard, href: "/company/requests" },
    { id: "alerts", label: "Alerts", icon: BiBell, href: "/company/notifications" },
    { id: "profile", label: "Profile", icon: BiUser, href: "/company/profile" },
  ],
  technician: [
    { id: "home", label: "Home", icon: BiHomeAlt, href: "/technician/dashboard" },
    { id: "jobs", label: "Jobs", icon: BiBriefcaseAlt, href: "/technician/jobs" },
    { id: "attendance", label: "Attendance", icon: BiCalendar, href: "/technician/attendance" },
    { id: "profile", label: "Profile", icon: BiUser, href: "/technician/profile" },
  ],
  admin: [
    { id: "home", label: "Dashboard", icon: BiHomeAlt, href: "/admin/dashboard" },
    { id: "jobs", label: "Jobs", icon: BiClipboard, href: "/admin/requests" },
    { id: "team", label: "Team", icon: BiGroup, href: "/admin/technicians" },
    { id: "calendar", label: "Calendar", icon: BiCalendar, href: "/admin/calendar" },
    { id: "settings", label: "Settings", icon: BiCog, href: "/admin/settings" },
  ],
}

export function BottomNav({ active, role }: BottomNavProps) {
  const items = navItems[role]
  const [unreadCount, setUnreadCount] = useState(0)
  const { notifications } = useSSE(true)

  useEffect(() => {
    if (notifications) {
      setUnreadCount(prev => prev + 1)
    }
  }, [notifications])

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-[80px] bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border-t border-white/20 dark:border-white/5 flex items-center justify-around pb-5 pt-2 z-50 transition-all shadow-[0_-5px_20px_rgba(0,0,0,0.05)]">
      {items.map((item) => {
        const isActive = active === item.id



        return (
          <Link
            key={item.id}
            href={item.href}
            className={`flex flex-col items-center justify-center p-2 rounded-2xl transition-all duration-500 relative group`}
          >
            {isActive && (
              <div className="absolute inset-x-0 -top-2 h-1 bg-[var(--color-accent)] rounded-full mx-4 shadow-[0_0_10px_var(--color-accent)]" />
            )}

            <div className={`relative p-2 rounded-xl transition-all duration-300 ${isActive ? "text-[var(--color-accent)] -translate-y-1" : "text-slate-400 dark:text-[#475569] group-hover:text-[var(--color-accent)]/70"}`}>
              <item.icon className="w-6 h-6" />
              {item.id === 'alerts' && unreadCount > 0 && (
                <span className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white ring-2 ring-white dark:ring-slate-900">{unreadCount > 99 ? '99+' : unreadCount}</span>
              )}
            </div>
            <span className={`text-[10px] font-bold tracking-wide mt-0.5 transition-all duration-300 ${isActive ? "text-[var(--color-accent)] opacity-100" : "text-slate-400 dark:text-[#475569] opacity-70 scale-90"}`}>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
