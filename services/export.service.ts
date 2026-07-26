function camelToTitle(camel: string): string {
    const result = camel.replace(/([A-Z])/g, " $1");
    return result.charAt(0).toUpperCase() + result.slice(1);
}

function formatValue(key: string, val: unknown): string {
    if (val === null || val === undefined) return "";
    
    // Check if it's a date field
    const dateKeys = ["joineddate", "createdat", "date", "generatedat"];
    if (val instanceof Date || (typeof val === "string" && dateKeys.includes(key.toLowerCase()))) {
        const d = new Date(val);
        if (!isNaN(d.getTime())) {
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = d.getFullYear();
            return `${day}/${month}/${year}`;
        }
    }
    
    // Currency / plain numbers (Excel handles formatting)
    if (typeof val === "number") {
        return String(val);
    }
    
    // Fallback: convert to string, escape quotes/commas for CSV
    return String(val);
}

function rowToCSVLine(row: Record<string, unknown>, keys: string[]): string {
    return keys.map(key => {
        const val = formatValue(key, row[key]);
        // Escape quotes
        const escaped = val.replace(/"/g, '""');
        // If it contains comma, quotes, or newlines, wrap in quotes
        if (escaped.includes(',') || escaped.includes('"') || escaped.includes('\n') || escaped.includes('\r')) {
            return `"${escaped}"`;
        }
        return escaped;
    }).join(",");
}

// Used by exportToCSV and exportToExcel
export function exportToCSV(data: Record<string, unknown>[], filename: string): void {
    if (!data.length) return;
    const keys = Object.keys(data[0]);
    const headerRow = keys.map(camelToTitle).join(",");
    const bodyRows = data.map(row => rowToCSVLine(row, keys));
    const csvContent = [headerRow, ...bodyRows].join("\r\n");
    
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename.endsWith(".csv") ? filename : `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

export function exportToExcel(data: Record<string, unknown>[], filename: string): void {
    exportToCSV(data, filename.endsWith(".xlsx") ? filename.replace(/\.xlsx$/, ".csv") : filename);
}
