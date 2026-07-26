import Link from "next/link"
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
  return { title: "MaintainU" }
}

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>
}) {
  const params = await searchParams
  const role =
    params.role === "company" || params.role === "technician"
      ? params.role
      : null

  const appClass =
    role === "company"
      ? "app-company"
      : role === "technician"
      ? "app-technician"
      : ""

  const pageTitle =
    role === "company"
      ? "MaintainU Portal"
      : role === "technician"
      ? "MaintainU Field"
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
          <h1 className="text-4xl font-bold tracking-tight text-foreground">{pageTitle}</h1>
          <p className="text-muted-foreground text-lg">Your maintenance partner</p>
        </div>

        {/* Role Selection */}
        <div className="space-y-4">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider text-center mb-4">
            {role ? "Get Started" : "Choose your portal"}
          </p>

          {/* Company Role Card */}
          {(!role || role === "company") && (
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
              <div className="grid grid-cols-2 gap-2 pt-1 relative z-10">
                <Link
                  href="/company/login"
                  style={{ color: "var(--color-accent)" }}
                  className="py-2.5 px-3 rounded-xl bg-primary/10 hover:bg-primary hover:text-white font-bold text-sm transition-all text-center flex items-center justify-center"
                >
                  Sign In
                </Link>
                <Link
                  href="/register/company"
                  className="py-2.5 px-3 rounded-xl border border-border hover:border-primary/50 hover:bg-muted/50 font-bold text-sm transition-all text-center flex items-center justify-center text-foreground"
                >
                  Register
                </Link>
              </div>
            </div>
          )}

          {/* Technician Role Card */}
          {(!role || role === "technician") && (
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
              <div className="grid grid-cols-2 gap-2 pt-1 relative z-10">
                <Link
                  href="/technician/login"
                  style={{ color: "var(--color-accent)" }}
                  className="py-2.5 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-600 hover:text-white font-bold text-sm transition-all text-center flex items-center justify-center"
                >
                  Sign In
                </Link>
                <Link
                  href="/register/technician"
                  className="py-2.5 px-3 rounded-xl border border-border hover:border-emerald-500/50 hover:bg-muted/50 font-bold text-sm transition-all text-center flex items-center justify-center text-foreground"
                >
                  Register
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Footer / Admin Link */}
        {!role && (
          <div className="pt-4 border-t border-border/50 flex flex-col items-center justify-center gap-3 text-center">
            <Link
              href="/admin-login"
              className="text-xs text-muted-foreground hover:text-foreground font-semibold flex items-center gap-1.5 transition-colors"
            >
              <ShieldCheck className="w-4 h-4 text-primary" />
              Admin Access
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
