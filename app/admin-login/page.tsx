import { bootstrapAdminAction } from "@/actions/admin-setup.action"
import { AdminLoginForm } from "./AdminLoginForm"
import { ThemeToggle } from "@/components/ui/theme-toggle"

export default async function AdminLoginPage() {
    // Bootstrap admin on first visit — idempotent, safe to call every time
    await bootstrapAdminAction()

    return (
        <div className="app-admin min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-950 dark:to-slate-900 relative">
            <div className="absolute top-6 right-6">
                <ThemeToggle />
            </div>
            <AdminLoginForm />
        </div>
    )
}
