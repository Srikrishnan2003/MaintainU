import Link from "next/link"
import { redirect } from "next/navigation"
import { Briefcase, Wrench, ShieldCheck } from "lucide-react"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { Logo } from "@/components/ui/logo"

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>
}) {
  const params = await searchParams
  if (params.role === "company") return { title: "MaintainU Portal" }
  if (params.role === "technician") return { title: "MaintainU Field" }
  if (params.role === "admin") return { title: "MaintainU Admin" }
  return { title: "MaintainU" }
}

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>
}) {
  const params = await searchParams
  if (params.role !== "company" && params.role !== "technician" && params.role !== "admin") {
    redirect("/onboarding?role=company")
  }
  const role = params.role

  const appClass =
    role === "company"
      ? "app-company"
      : role === "technician"
      ? "app-technician"
      : role === "admin"
      ? "app-admin"
      : ""

  const pageTitle =
    role === "company"
      ? "MaintainU Portal"
      : role === "technician"
      ? "MaintainU Field"
      : role === "admin"
      ? "MaintainU Admin"
      : "MaintainU"

  return (
    <div className={`${appClass} min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-950 dark:to-slate-900 relative`}>
      <div className="absolute top-6 right-6">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md space-y-8 glass p-8 rounded-3xl shadow-xl">
        {/* Header */}
        <div className="space-y-3 text-center">
          <Logo size="xl" className="mx-auto mb-6" />
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">{pageTitle}</h1>
          <p className="text-muted-foreground text-base sm:text-lg">Your maintenance partner</p>
        </div>

        {/* Role Selection */}
        <div className="space-y-4">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider text-center mb-4">
            Get Started
          </p>

          {/* Company Role Card */}
          {role === "company" && (
            <div className="p-5 rounded-2xl bg-white dark:bg-card border border-border hover:border-primary/50 hover:shadow-lg transition-all group relative overflow-hidden space-y-4">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              <div className="flex items-center gap-4 relative">
                <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-primary group-hover:scale-110 transition-transform shrink-0">
                  <Briefcase className="w-6 h-6" />
                </div>
                <div className="text-left flex-1">
                  <h2 className="text-lg font-bold">Company Portal</h2>
                  <p className="text-sm text-muted-foreground">Request & manage maintenance</p>
                </div>
              </div>
              <div className="flex flex-col min-[400px]:flex-row gap-2 pt-1 relative z-10">
                <Link
                  href="/company/login"
                  style={{ color: "var(--color-accent)" }}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-primary/10 hover:bg-primary hover:text-white font-bold text-sm transition-all text-center flex items-center justify-center"
                >
                  Sign In
                </Link>
                <Link
                  href="/signup?role=company"
                  className="flex-1 py-2.5 px-3 rounded-xl border border-border hover:border-primary/50 hover:bg-muted/50 font-bold text-sm transition-all text-center flex items-center justify-center text-foreground"
                >
                  Register
                </Link>
              </div>
            </div>
          )}

          {/* Technician Role Card */}
          {role === "technician" && (
            <div className="p-5 rounded-2xl bg-white dark:bg-card border border-border hover:border-emerald-500/50 hover:shadow-lg transition-all group relative overflow-hidden space-y-4">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              <div className="flex items-center gap-4 relative">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform shrink-0">
                  <Wrench className="w-6 h-6" />
                </div>
                <div className="text-left flex-1">
                  <h2 className="text-lg font-bold">Technician Field</h2>
                  <p className="text-sm text-muted-foreground">Accept & complete work orders</p>
                </div>
              </div>
              <div className="flex flex-col min-[400px]:flex-row gap-2 pt-1 relative z-10">
                <Link
                  href="/technician/login"
                  style={{ color: "var(--color-accent)" }}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-600 hover:text-white font-bold text-sm transition-all text-center flex items-center justify-center"
                >
                  Sign In
                </Link>
                <Link
                  href="/signup?role=technician"
                  className="flex-1 py-2.5 px-3 rounded-xl border border-border hover:border-emerald-500/50 hover:bg-muted/50 font-bold text-sm transition-all text-center flex items-center justify-center text-foreground"
                >
                  Register
                </Link>
              </div>
            </div>
          )}

          {/* Admin Role Card */}
          {role === "admin" && (
            <div className="p-5 rounded-2xl bg-white dark:bg-card border border-border hover:border-purple-500/50 hover:shadow-lg transition-all group relative overflow-hidden space-y-4">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              <div className="flex items-center gap-4 relative">
                <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform shrink-0">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div className="text-left flex-1">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold">Admin Portal</h2>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300">
                      Staff Only
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">System oversight & management</p>
                </div>
              </div>
              <div className="pt-1 relative z-10">
                <Link
                  href="/admin-login"
                  style={{ color: "var(--color-accent)" }}
                  className="w-full py-2.5 px-4 rounded-xl bg-purple-500/10 hover:bg-purple-600 hover:text-white font-bold text-sm transition-all text-center flex items-center justify-center gap-2"
                >
                  Log In to Admin
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
