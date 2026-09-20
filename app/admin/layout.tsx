import { getSession } from "@/services/auth.service";
import { redirect } from "next/navigation";
import { ErrorBoundary } from "@/components/error-boundary";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "MaintainU Admin",
    manifest: "/manifest-admin.json",
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    const session = await getSession();

    if (!session || session.role !== "admin") {
        redirect("/");
    }

    return (
        <div className="app-admin">
            <ErrorBoundary>
                {children}
            </ErrorBoundary>
        </div>
    );
}
