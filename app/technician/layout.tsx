import { getSession } from "@/services/auth.service";
import { redirect } from "next/navigation";
import { ErrorBoundary } from "@/components/error-boundary";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "MaintainU Field",
    manifest: "/manifest-field.json",
};

export default async function TechnicianLayout({ children }: { children: React.ReactNode }) {
    const session = await getSession();

    if (!session || session.role !== "technician") {
        redirect("/");
    }

    return (
        <div className="app-technician">
            <ErrorBoundary>
                {children}
            </ErrorBoundary>
        </div>
    );
}
