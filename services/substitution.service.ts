export interface TechnicianData {
    status: string;
    skills: string[];
}

export interface SubstitutionImpact {
    originalNewStatus: string;
    replacementNewStatus: string;
    updateReplacementAttendance: boolean;
}

/**
 * Validates if the substitution is valid based on status.
 * Skill matching is best effort and logs a warning if they differ.
 */
export function validateSubstitution(
    original: TechnicianData,
    replacement: TechnicianData
): { valid: boolean; warnings: string[] } {
    const warnings: string[] = [];

    if (replacement.status !== "ACTIVE") {
        return { valid: false, warnings: ["Replacement technician is not ACTIVE."] };
    }

    const originalSkills = new Set(original.skills || []);
    const replacementSkills = new Set(replacement.skills || []);
    let missingSkills = false;

    for (const skill of originalSkills) {
        if (!replacementSkills.has(skill)) {
            missingSkills = true;
            break;
        }
    }

    if (missingSkills) {
        warnings.push("Replacement technician does not have all the skills of the original technician.");
    }

    return { valid: true, warnings };
}

/**
 * Calculates what changes (attendance, salary transfer flag) based on the substitution decision and salaryTransferred.
 */
export function calculateSubstitutionImpact(
    adminDecision: "Approved" | "Rejected" | "Pending",
    salaryTransferred: boolean
): SubstitutionImpact {
    if (adminDecision !== "Approved") {
        return {
            originalNewStatus: "Substitute_Requested", // No immediate change on pending or rejected
            replacementNewStatus: "",
            updateReplacementAttendance: false
        };
    }

    return {
        originalNewStatus: "Absent",
        replacementNewStatus: "Present",
        updateReplacementAttendance: salaryTransferred // Only update replacement if salary is transferred
    };
}
