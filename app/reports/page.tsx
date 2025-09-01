'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DatePicker } from "@/components/ui/date-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { FirebaseService } from '@/lib/firebase-service';
import { SESSION_OPTIONS } from '@/lib/types';
import {
  BarChart3,
  Download,
  Calendar,
  FileSpreadsheet
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { format, eachDayOfInterval } from 'date-fns';
import * as XLSX from 'xlsx';

interface DateRange {
  from: Date;
  to: Date;
}

export default function ReportsPage() {
  const { user, loading, isTeacher } = useAuth();
  const { addToast } = useToast();
  const [selectedSection, setSelectedSection] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
  });
  const [loadingReports, setLoadingReports] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [sections, setSections] = useState<string[]>([]);


  // Load available sections on mount
  useEffect(() => {
    const loadSections = async () => {
      if (!user?.uid) return;

      try {
        setLoadingReports(true);
        // Get unique sections from user's sessions
        const sessions = await FirebaseService.getAttendanceSessions({
          teacherId: user.uid
        });

        const uniqueSections = Array.from(new Set(sessions.map(s => s.section)));
        setSections(uniqueSections);
      } catch (error) {
        console.error('Error loading sections:', error);
        addToast({
          title: "Error",
          description: "Failed to load sections",
          variant: "destructive"
        });
      } finally {
        setLoadingReports(false);
      }
    };

    loadSections();
  }, [user?.uid, addToast]);

  // Generate Excel export
  const exportToExcel = async () => {
    if (!user?.uid || !dateRange.from || !dateRange.to) return;

    try {
      setExporting(true);
      const daysInRange = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });

      const sessions = await FirebaseService.getAttendanceSessions({
        teacherId: user.uid,
        section: selectedSection === 'all' ? undefined : selectedSection,
        dateRange: { start: dateRange.from, end: dateRange.to }
      });

      if (sessions.length === 0) {
        addToast({ title: "No Data", description: "No attendance sessions found", variant: "default" });
        return;
      }

      const sectionsToProcess = selectedSection === 'all'
        ? Array.from(new Set(sessions.map(s => s.section)))
        : [selectedSection];

      const workbook = XLSX.utils.book_new();

      for (const section of sectionsToProcess) {
        const sectionSessions = sessions.filter(s => s.section === section);
        const students = await FirebaseService.getStudents(section);

        const sessionsByDate = sectionSessions.reduce((acc, session) => {
          if (!acc[session.date]) acc[session.date] = {};
          acc[session.date][session.session] = session;
          return acc;
        }, {} as Record<string, Record<string, any>>);

        // Build headers with merging info
        const headers = ['USN', 'Name'];
        const subHeaders = ['', ''];
        const merges = [];
        let colIndex = 2;

        for (const day of daysInRange) {
          const dateStr = format(day, 'yyyy-MM-dd');
          const dayFormat = format(day, 'MM/dd');
          const sessionsForDay = sessionsByDate[dateStr] || {};
          const sessionTimes = Object.keys(sessionsForDay).sort();

          if (sessionTimes.length === 0) continue;

          if (sessionTimes.length === 1) {
            headers.push(dayFormat);
            subHeaders.push(sessionTimes[0]);
            colIndex++;
          } else {
            // Merge header for multiple sessions
            const startCol = colIndex;
            const endCol = colIndex + sessionTimes.length - 1;
            merges.push({ s: { r: 0, c: startCol }, e: { r: 0, c: endCol } });

            headers.push(dayFormat);
            sessionTimes.forEach((time, i) => {
              if (i > 0) headers.push('');
              subHeaders.push(time);
            });
            colIndex += sessionTimes.length;
          }
        }

        headers.push('Total', 'Percentage');
        subHeaders.push('', '');

        // Build data with formulas
        const wsData = [headers, subHeaders];

        students.forEach((student, rowIndex) => {
          const row = [student.usn, student.name];
          const dataRow = rowIndex + 3; // Excel row (1-indexed, +2 for headers)

          for (const day of daysInRange) {
            const dateStr = format(day, 'yyyy-MM-dd');
            const sessionsForDay = sessionsByDate[dateStr] || {};
            const sessionTimes = Object.keys(sessionsForDay).sort();

            if (sessionTimes.length === 0) continue;

            sessionTimes.forEach(sessionTime => {
              const session = sessionsForDay[sessionTime];
              const studentRecord = session?.records?.find((r: any) => r.studentUsn === student.usn);
              row.push(studentRecord?.isPresent ? 'P' : 'A');
            });
          }

          // Add formulas for total and percentage
          const attendanceStartCol = String.fromCharCode(67); // C
          const attendanceEndCol = String.fromCharCode(66 + headers.length - 2); // Before Total column
          row.push(
            `=COUNTIF(${attendanceStartCol}${dataRow}:${attendanceEndCol}${dataRow},"P")`,
            `=IF(COUNTA(${attendanceStartCol}${dataRow}:${attendanceEndCol}${dataRow})=0,0,COUNTIF(${attendanceStartCol}${dataRow}:${attendanceEndCol}${dataRow},"P")/COUNTA(${attendanceStartCol}${dataRow}:${attendanceEndCol}${dataRow}))`
          );

          wsData.push(row);
        });

        const ws = XLSX.utils.aoa_to_sheet(wsData);

        // Apply merges
        ws['!merges'] = merges;

        // Apply styles
        const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
        for (let R = 2; R <= range.e.r; R++) {
          for (let C = 2; C <= range.e.c; C++) {
            const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
            if (!ws[cellRef]) continue;

            const isTotal = C >= range.e.c - 1;
            const value = ws[cellRef].v;

            ws[cellRef].s = {
              fill: {
                fgColor: {
                  rgb: isTotal
                    ? (typeof value === 'number' && value >= 0.7 ? '006400' : '8B0000')
                    : (value === 'P' ? '006400' : '8B0000')
                }
              },
              font: { color: { rgb: 'FFFFFF' } },
              numFmt: isTotal && C === range.e.c ? '0%' : undefined
            };
          }
        }

        // Auto-fit columns
        ws['!cols'] = headers.map((_, i) => ({
          wch: i === 0 ? 15 : i === 1 ? 25 : i >= headers.length - 2 ? 12 : 8
        }));

        XLSX.utils.book_append_sheet(workbook, ws, section);
      }

      const fileName = `Attendance_Report_${format(dateRange.from, 'MMM_yyyy')}.xlsx`;
      XLSX.writeFile(workbook, fileName);

      addToast({
        title: "Export Successful",
        description: `Report exported as ${fileName}`,
        variant: "success"
      });

    } catch (error) {
      console.error('Error exporting report:', error);
      addToast({
        title: "Export Failed",
        description: "Failed to export attendance report",
        variant: "destructive"
      });
    } finally {
      setExporting(false);
    }
  };

  if (loading || loadingReports) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-cyber-yellow/30 border-t-cyber-yellow rounded-full animate-spin"></div>
          <div className="absolute inset-0 w-16 h-16 border-4 border-cyber-yellow/20 border-t-transparent rounded-full animate-spin animation-delay-150"></div>
        </div>
      </div>
    );
  }

  if (!user || !isTeacher) {
    return null;
  }

  return (
    <div className="min-h-screen p-2 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6 md:mb-12">
          <div className="flex items-center justify-center mb-3 md:mb-6">
            <div className="w-12 h-12 md:w-20 md:h-20 bg-gradient-to-br from-cyber-yellow to-cyber-yellow-dark rounded-2xl flex items-center justify-center shadow-2xl shadow-cyber-yellow/25">
              <BarChart3 className="w-6 h-6 md:w-10 md:h-10 text-cyber-gray-900" />
            </div>
          </div>

          <h1 className="text-2xl md:text-4xl lg:text-6xl font-bold mb-2 md:mb-4">
            <span className="bg-gradient-to-r from-cyber-gray-900 via-cyber-gray-700 to-cyber-gray-900 bg-clip-text text-transparent">
              Attendance
            </span>
            <br />
            <span className="bg-gradient-to-r from-cyber-yellow to-cyber-yellow-dark bg-clip-text text-transparent">
              Reports
            </span>
          </h1>

          <p className="text-sm md:text-xl text-cyber-gray-600 mb-4 md:mb-8 max-w-2xl mx-auto px-2">
            Comprehensive analytics and insights for your attendance data
          </p>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-6 mb-4 md:mb-8">
          <Card variant="cyber" className="p-3 md:p-6 relative overflow-visible z-10">
            <div className="space-y-2">
              <label className="text-xs md:text-sm font-medium text-cyber-gray-700">Select Date Range</label>
              <div className="relative z-50">
                <DatePicker
                  date={dateRange}
                  onDateChange={(range) => {
                    if (range && 'from' in range && range.from && range.to) {
                      setDateRange({ from: range.from, to: range.to });
                    }
                  }}
                  placeholder="Select date range for report"
                  disabledDates={d => false}
                  mode="range"
                />
              </div>
            </div>
          </Card>

          <Card variant="cyber" className="p-3 md:p-6 relative overflow-visible">
            <div className="space-y-2">
              <label className="text-xs md:text-sm font-medium text-cyber-gray-700">Filter by Section</label>
              <div className="relative z-40">
                <Select value={selectedSection} onValueChange={setSelectedSection}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Sections" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sections</SelectItem>
                    {sections.map(section => (
                      <SelectItem key={section} value={section}>{section}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>

          <Card variant="cyber" className="p-3 md:p-6">
            <div className="space-y-2">
              <label className="text-xs md:text-sm font-medium text-cyber-gray-700">Export Options</label>
              <Button
                onClick={exportToExcel}
                disabled={exporting || sections.length === 0}
                className="w-full text-sm md:text-base bg-gradient-to-r from-cyber-yellow to-cyber-yellow-dark text-cyber-gray-900 hover:shadow-lg"
              >
                {exporting ? (
                  <>
                    <div className="w-3 h-3 md:w-4 md:h-4 border-2 border-cyber-gray-900/30 border-t-cyber-gray-900 rounded-full animate-spin mr-1 md:mr-2" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <FileSpreadsheet className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                    Export Excel
                  </>
                )}
              </Button>
            </div>
          </Card>
        </div>

        <Card variant="cyber" className="p-6 text-center flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-cyber-gray-50 to-cyber-gray-100 border-2 border-dashed border-cyber-yellow/40">
          <div className="flex items-center justify-center mb-2">
            <Calendar className="w-8 h-8 text-cyber-yellow-dark animate-pulse" />
          </div>
          <h2 className="text-lg md:text-2xl font-semibold text-cyber-gray-900 mb-1">
            Work In Progress
          </h2>
          <p className="text-sm md:text-base text-cyber-gray-700 mb-2">
            More analytics and visualizations coming soon.<br />
            Stay tuned for updates!
          </p>
          <span className="inline-block px-3 py-1 rounded-full bg-cyber-yellow/20 text-cyber-yellow-dark text-xs font-medium">
            Last updated: {format(new Date(), 'MMM dd, yyyy')}
          </span>
        </Card>
      </div>
    </div>
  );
}