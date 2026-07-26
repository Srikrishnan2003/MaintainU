export interface SalaryConfig {
    dailyRate: number;
    absenceDeduction: number;
}

export interface AttendanceRecord {
    status: string | null;
}

export interface SalaryBreakdown {
    id: string; // technicianId
    name: string; // technicianName
    netDays: number;
    net: number;
    rate: number;
    deductions: number;
}

/**
 * Pure function to calculate a technician's salary based on attendance records.
 * Does not make database calls.
 */
export function calculateTechnicianSalary(
    technicianId: string,
    technicianName: string,
    attendanceRecords: AttendanceRecord[],
    config: SalaryConfig
): SalaryBreakdown {
    const netDays = attendanceRecords.filter(r => r.status === "Present").length;
    const absentDays = attendanceRecords.filter(r => r.status === "Absent").length;
    
    const basePay = netDays * config.dailyRate;
    const deductions = absentDays * config.absenceDeduction;
    const net = basePay - deductions;

    return {
        id: technicianId,
        name: technicianName,
        netDays,
        net,
        rate: config.dailyRate,
        deductions
    };
}
