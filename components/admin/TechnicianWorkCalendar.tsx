"use client"

import { useState, useEffect } from "react"
import { api } from "@/lib/api"
import { Calendar as CalendarIcon, Download, ChevronLeft, ChevronRight, MapPin, Briefcase } from "lucide-react"
import { toast } from "sonner"
import { utils as xlsxUtils, writeFile as writeXlsxFile } from "xlsx"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

interface WorkCalendarData {
    id: string;
    status: string | null;
    checkInTime: string;
    checkOutTime: string;
    date: string | null;
    companyName: string | null;
    serviceType: string | null;
    jobId: string | null;
}

export function TechnicianWorkCalendar({ technicianId, technicianName }: { technicianId: string, technicianName: string }) {
    const [month, setMonth] = useState(new Date().getMonth() + 1)
    const [year, setYear] = useState(new Date().getFullYear())
    const [data, setData] = useState<WorkCalendarData[]>([])
    const [loading, setLoading] = useState(false)
    const [exporting, setExporting] = useState(false)

    useEffect(() => {
        if (technicianId) {
            fetchData()
        }
    }, [technicianId, month, year])

    const fetchData = async () => {
        setLoading(true)
        try {
            const res = await api.getTechnicianWorkCalendar(technicianId, month, year)
            if (res.success && res.data) {
                setData(res.data)
            } else {
                setData([])
                toast.error(res.message || "Failed to fetch work calendar")
            }
        } catch (e) {
            setData([])
            toast.error("An error occurred")
        } finally {
            setLoading(false)
        }
    }

    const handlePrevMonth = () => {
        let m = month - 1;
        let y = year;
        if (m < 1) {
            m = 12;
            y--;
        }
        setMonth(m)
        setYear(y)
    }

    const handleNextMonth = () => {
        let m = month + 1;
        let y = year;
        if (m > 12) {
            m = 1;
            y++;
        }
        setMonth(m)
        setYear(y)
    }

    const exportToExcel = () => {
        setExporting(true)
        try {
            const exportData = data.map(d => ({
                Date: d.date ? new Date(d.date).toLocaleDateString() : 'N/A',
                Company: d.companyName || 'Unknown',
                Service: d.serviceType || 'Unknown',
                'Check In': d.checkInTime,
                'Check Out': d.checkOutTime,
                Status: d.status || 'Unknown'
            }))

            const ws = xlsxUtils.json_to_sheet(exportData)
            const wb = xlsxUtils.book_new()
            xlsxUtils.book_append_sheet(wb, ws, "Work Calendar")
            writeXlsxFile(wb, `${technicianName.replace(/\s+/g, '_')}_Work_Calendar_${month}_${year}.xlsx`)
            toast.success("Excel exported successfully")
        } catch (error) {
            toast.error("Failed to export Excel")
            console.error(error)
        } finally {
            setExporting(false)
        }
    }

    const exportToPDF = () => {
        setExporting(true)
        try {
            const doc = new jsPDF()
            
            // --- HEADER ---
            // Brand Logo / Title
            doc.setFillColor(15, 23, 42) // Slate-900 color
            doc.rect(0, 0, 210, 35, 'F')
            
            doc.setTextColor(255, 255, 255)
            doc.setFontSize(22)
            doc.setFont("helvetica", "bold")
            doc.text("MAINTAIN-U", 14, 23)

            // Document Title
            doc.setFontSize(10)
            doc.setFont("helvetica", "normal")
            doc.setTextColor(200, 200, 200)
            doc.text("WORK CALENDAR REPORT", 14, 30)

            // --- REPORT INFO ---
            doc.setTextColor(50, 50, 50)
            doc.setFontSize(14)
            doc.setFont("helvetica", "bold")
            doc.text(`Technician: ${technicianName}`, 14, 50)
            
            doc.setFontSize(11)
            doc.setFont("helvetica", "normal")
            doc.setTextColor(100, 100, 100)
            const monthYear = new Date(year, month - 1).toLocaleString('default', { month: 'long', year: 'numeric' })
            doc.text(`Period: ${monthYear}`, 14, 57)
            
            const totalWorkDays = data.filter(d => d.status?.toUpperCase() === 'PRESENT').length
            doc.text(`Total Days Present: ${totalWorkDays}`, 14, 63)
            doc.text(`Total Assignments: ${data.length}`, 14, 69)

            // --- TABLE ---
            const tableColumn = ["Date", "Company", "Service", "Check In", "Check Out", "Status"]
            const tableRows = data.map(d => [
                d.date ? new Date(d.date).toLocaleDateString() : 'N/A',
                d.companyName || 'Unknown',
                d.serviceType || 'Unknown',
                d.checkInTime,
                d.checkOutTime,
                d.status || 'Unknown'
            ])

            autoTable(doc, {
                startY: 78,
                head: [tableColumn],
                body: tableRows,
                theme: 'grid',
                styles: {
                    font: 'helvetica',
                    fontSize: 9,
                    cellPadding: 5,
                },
                headStyles: {
                    fillColor: [15, 23, 42], // Slate-900
                    textColor: 255,
                    fontStyle: 'bold',
                    halign: 'center'
                },
                columnStyles: {
                    0: { cellWidth: 25 },
                    1: { cellWidth: 'auto' },
                    2: { cellWidth: 25 },
                    3: { cellWidth: 25, halign: 'center' },
                    4: { cellWidth: 25, halign: 'center' },
                    5: { cellWidth: 25, halign: 'center', fontStyle: 'bold' }
                },
                alternateRowStyles: {
                    fillColor: [248, 250, 252] // Slate-50
                },
                // Hook to format Status column colors
                didParseCell: function (data) {
                    if (data.section === 'body' && data.column.index === 5) {
                        const status = data.cell.raw as string;
                        if (status.toUpperCase() === 'PRESENT') {
                            data.cell.styles.textColor = [22, 163, 74]; // Green-600
                        } else if (status.toUpperCase() === 'ABSENT') {
                            data.cell.styles.textColor = [220, 38, 38]; // Red-600
                        }
                    }
                },
                margin: { top: 75, left: 14, right: 14 },
                didDrawPage: function (data) {
                    // Footer
                    const str = "Page " + doc.getCurrentPageInfo().pageNumber;
                    doc.setFontSize(8);
                    doc.setTextColor(150, 150, 150);
                    const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
                    doc.text(str, data.settings.margin.left, pageHeight - 10);
                    
                    const generatedStr = `Generated on ${new Date().toLocaleString()}`;
                    const textWidth = doc.getStringUnitWidth(generatedStr) * doc.getFontSize() / doc.internal.scaleFactor;
                    doc.text(generatedStr, doc.internal.pageSize.width - data.settings.margin.right - textWidth, pageHeight - 10);
                }
            })

            doc.save(`${technicianName.replace(/\s+/g, '_')}_Work_Calendar_${month}_${year}.pdf`)
            toast.success("PDF exported successfully")
        } catch (error) {
            toast.error("Failed to export PDF")
            console.error(error)
        } finally {
            setExporting(false)
        }
    }

    return (
        <div className="p-4 bg-muted/50 rounded-xl space-y-4 border border-border/50">
            <div className="flex items-center justify-between pb-2 border-b border-border/50">
                <p className="text-sm font-semibold flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-primary" />
                    Work Calendar
                </p>
                <div className="flex items-center gap-2">
                    <button onClick={exportToPDF} disabled={exporting || data.length === 0} className="px-2 py-1 text-xs bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400 font-bold rounded flex items-center gap-1 disabled:opacity-50">
                        <Download className="w-3 h-3" /> PDF
                    </button>
                    <button onClick={exportToExcel} disabled={exporting || data.length === 0} className="px-2 py-1 text-xs bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400 font-bold rounded flex items-center gap-1 disabled:opacity-50">
                        <Download className="w-3 h-3" /> Excel
                    </button>
                </div>
            </div>

            <div className="flex items-center justify-between">
                <button onClick={handlePrevMonth} className="p-1 hover:bg-muted rounded-md transition"><ChevronLeft className="w-4 h-4" /></button>
                <span className="text-sm font-bold">{new Date(year, month - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
                <button onClick={handleNextMonth} className="p-1 hover:bg-muted rounded-md transition"><ChevronRight className="w-4 h-4" /></button>
            </div>

            {loading ? (
                <div className="py-8 text-center text-muted-foreground text-xs font-bold animate-pulse">Loading calendar...</div>
            ) : data.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground text-xs font-bold">No work records for this month.</div>
            ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
                    {data.map(d => (
                        <div key={d.id} className="bg-background border border-border/50 p-3 rounded-lg shadow-sm">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-black">{d.date ? new Date(d.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) : 'N/A'}</span>
                                <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded tracking-wider ${d.status === 'Present' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-muted text-muted-foreground'}`}>{d.status || 'UNKNOWN'}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                                <Briefcase className="w-3 h-3" />
                                <span className="font-semibold text-foreground truncate max-w-[200px]">{d.companyName || 'Unknown Company'}</span>
                                {d.serviceType && <span className="opacity-70 truncate">- {d.serviceType}</span>}
                            </div>
                            <div className="flex items-center gap-3 text-[10px] font-mono opacity-80">
                                <div><span className="text-muted-foreground font-sans">IN:</span> {d.checkInTime}</div>
                                <div><span className="text-muted-foreground font-sans">OUT:</span> {d.checkOutTime}</div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
