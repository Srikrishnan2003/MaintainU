"use client"

import { BottomNav } from "@/components/navigation/bottom-nav"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { useTheme } from "next-themes"
import { BiArrowBack, BiMoon, BiSun, BiGlobe, BiChevronRight, BiCheck } from "react-icons/bi"
import { Loader2 } from "lucide-react"

export default function TechnicianSettings() {
    const router = useRouter()
    const { theme, setTheme } = useTheme()
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="min-h-screen pb-24 bg-background">
            {/* Header */}
            <div className="px-6 pt-6 pb-6 border-b border-white/5 bg-background/80 backdrop-blur-xl sticky top-0 z-10 flex items-center gap-4">
                <button
                    onClick={() => router.back()}
                    className="p-2 -ml-2 hover:bg-white/5 rounded-full transition-colors active:scale-95"
                >
                    <BiArrowBack className="w-6 h-6" />
                </button>
                <h1 className="text-2xl font-bold tracking-tight">App Settings</h1>
            </div>

            <div className="p-6 space-y-8">

                {/* Appearance Section */}
                <section className="space-y-4">
                    <h2 className="text-sm uppercase tracking-widest font-bold text-muted-foreground ml-1">Appearance</h2>
                    <div className="glass-card p-2 rounded-3xl">
                        <div className="grid grid-cols-2 gap-2 p-2">
                            <button
                                onClick={() => setTheme("light")}
                                className={`flex flex-col items-center justify-center p-4 rounded-2xl transition-all duration-300 border-2 ${theme === 'light' ? 'bg-blue-50/50 border-blue-500 text-blue-600' : 'bg-transparent border-transparent hover:bg-slate-50 dark:hover:bg-white/5'
                                    }`}
                            >
                                <BiSun className="w-8 h-8 mb-2" />
                                <span className="font-bold text-sm">Light Mode</span>
                            </button>
                            <button
                                onClick={() => setTheme("dark")}
                                className={`flex flex-col items-center justify-center p-4 rounded-2xl transition-all duration-300 border-2 ${theme === 'dark' ? 'bg-slate-800/50 border-blue-500 text-blue-400' : 'bg-transparent border-transparent hover:bg-slate-50 dark:hover:bg-white/5'
                                    }`}
                            >
                                <BiMoon className="w-8 h-8 mb-2" />
                                <span className="font-bold text-sm">Dark Mode</span>
                            </button>
                        </div>
                    </div>
                </section>



            </div>

            <BottomNav active="profile" role="technician" />
        </div>
    )
}
