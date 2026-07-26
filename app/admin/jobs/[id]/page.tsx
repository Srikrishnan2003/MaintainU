import { getJobByIdAction } from "@/actions/lifecycle.action";
import { getMasterTeamAction } from "@/actions/team.action";
import AdminJobDetailClient from "./client";
import { notFound } from "next/navigation";

export default async function AdminJobDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const [{ job }, { members }] = await Promise.all([
        getJobByIdAction(id),
        getMasterTeamAction(id)
    ]);

    if (!job) {
        return notFound();
    }

    // Mapping the action return to what the client expects (though pdfUrl is not actually returned by getJobByIdAction)
    const jobDetail = {
        id: job.id,
        service: job.service,
        status: job.status,
        pdfUrl: null
    };

    const teamMembers = members.map(a => ({
        id: a.id,
        name: a.name || "Unknown",
        phone: a.phone || "",
        skill: a.skill || '',
        rating: a.rating || 0,
        status: a.status || "Unknown",
    }));

    return <AdminJobDetailClient job={jobDetail} teamMembers={teamMembers} />;
}
