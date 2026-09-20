import { getSession } from "@/services/auth.service";
import { redirect } from "next/navigation";
import { ErrorBoundary } from "@/components/error-boundary";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "MaintainU Portal",
    manifest: "/manifest-portal.json",
};

export default async function CompanyLayout({ children }: { children: React.ReactNode }) {
    const session = await getSession();

    if (!session || session.role !== "company") {
        redirect("/");
    }

    return (
        <div className="app-company">
            <ErrorBoundary>
                {children}
            </ErrorBoundary>
        </div>
    );
}
