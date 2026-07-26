// State Machine Transitions
export const VALID_TRANSITIONS: Record<string, string[]> = {
    "Requested": ["Reviewing", "Cancelled"],
    "Reviewing": ["Rejected", "Pending_Assign", "Cancelled"],
    "Rejected": [],
    "Pending_Assign": ["Assigned", "Cancelled"],
    "Assigned": ["Accepted", "Declined", "Cancelled"],
    "Declined": ["Pending_Assign", "Assigned", "Cancelled"],
    "Accepted": ["Arrived", "In_Progress", "Pending_Assign", "Cancelled"],
    "Arrived": ["In_Zone", "Work_Started", "In_Progress", "Cancelled"],
    "In_Zone": ["Exited_Zone", "Cancelled"],
    "Exited_Zone": ["Work_Started", "Work_Completed", "Completed", "Cancelled"],
    "Team_Confirmed": ["In_Progress", "Pending_Assign", "Cancelled"],
    "In_Progress": ["In_Zone", "On_Hold", "Failed", "Work_Completed", "Completed", "Cancelled"],
    "On_Hold": ["In_Progress", "Failed", "Cancelled"],
    "Failed": ["Pending_Assign", "Assigned", "Cancelled"],
    "Completed": [],
    "Cancelled": []
};

export function validateJobTransition(current: string | null, next: string): boolean {
    if (!current) return true; // Initial state allow
    const allowed = VALID_TRANSITIONS[current];
    return allowed ? allowed.includes(next) : false;
}
