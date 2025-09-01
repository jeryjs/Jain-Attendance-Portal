import { DateRange } from "@/components/ui/date-picker";
import { type ClassValue, clsx } from "clsx";
import { eachDayOfInterval, format } from 'date-fns';
import { twMerge } from "tailwind-merge";
import * as XLSX from 'xlsx';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

interface ExportOptions {
  userId: string;
  dateRange: DateRange;
  selectedSection: string;
  sessions: any[];
  getStudents: (section: string) => Promise<any[]>;
}

export async function exportToExcel({
  userId,
  dateRange,
  selectedSection,
  sessions,
  getStudents
}: ExportOptions): Promise<Blob> {
  if (!dateRange.from || !dateRange.to) {
    throw new Error('Date range is not properly defined');
  }
  const daysInRange = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });

  const sectionsToProcess = selectedSection === 'all'
    ? Array.from(new Set(sessions.map(s => s.section)))
    : [selectedSection];

  const workbook = XLSX.utils.book_new();

  for (const section of sectionsToProcess) {
    const sectionSessions = sessions.filter(s => s.section === section);
    const students = await getStudents(section);

    const sessionsByDate = sectionSessions.reduce((acc, session) => {
      if (!acc[session.date]) acc[session.date] = {};
      acc[session.date][session.session] = session;
      return acc;
    }, {} as Record<string, Record<string, any>>);

    // Build headers with merging info
    const headers = ['USN', 'Name'];
    const subHeaders = ['', ''];
    const merges: XLSX.Range[] = [];
    let colIndex = 2;

    // Track attendance columns for formula calculation
    const attendanceColumns: number[] = [];

    for (const day of daysInRange) {
      const dateStr = format(day, 'yyyy-MM-dd');
      const dayFormat = format(day, 'MM/dd');
      const sessionsForDay = sessionsByDate[dateStr] || {};
      const sessionTimes = Object.keys(sessionsForDay).sort();

      if (sessionTimes.length === 0) continue;

      if (sessionTimes.length === 1) {
        headers.push(dayFormat);
        subHeaders.push(sessionTimes[0]);
        attendanceColumns.push(colIndex);
        colIndex++;
      } else {
        // Merge header for multiple sessions
        const startCol = colIndex;
        const endCol = colIndex + sessionTimes.length - 1;
        merges.push({ 
          s: { r: 0, c: startCol }, 
          e: { r: 0, c: endCol } 
        });

        headers.push(dayFormat);
        sessionTimes.forEach((time, i) => {
          if (i > 0) headers.push('');
          subHeaders.push(time);
          attendanceColumns.push(colIndex);
          colIndex++;
        });
      }
    }

    headers.push('Total', 'Percentage');
    subHeaders.push('', '');
    const totalColIndex = colIndex;
    const percentageColIndex = colIndex + 1;

    // Build data with formulas
    const wsData: any[][] = [headers, subHeaders];

    students.forEach((student, rowIndex) => {
      const row: any[] = [student.usn, student.name];
      const dataRow = rowIndex + 3; // Excel row (1-indexed, +2 for headers)

      // Add attendance data
      for (const day of daysInRange) {
        const dateStr = format(day, 'yyyy-MM-dd');
        const sessionsForDay = sessionsByDate[dateStr] || {};
        const sessionTimes = Object.keys(sessionsForDay).sort();

        if (sessionTimes.length === 0) continue;

        sessionTimes.forEach(sessionTime => {
          const session = sessionsForDay[sessionTime];
          const isPresent = session.presentStudents?.includes(student.usn);
          row.push(isPresent ? 'P' : 'A');
        });
      }

      // Add formula cells for total and percentage
      if (attendanceColumns.length > 0) {
        const firstAttendanceCol = XLSX.utils.encode_col(attendanceColumns[0]);
        const lastAttendanceCol = XLSX.utils.encode_col(attendanceColumns[attendanceColumns.length - 1]);
        
        // Create cells with formulas (no leading =)
        row.push(
          { 
            t: 'n', 
            f: `COUNTIF(${firstAttendanceCol}${dataRow}:${lastAttendanceCol}${dataRow},"P")` 
          },
          { 
            t: 'n', 
            f: `IF(COUNTA(${firstAttendanceCol}${dataRow}:${lastAttendanceCol}${dataRow})=0,0,COUNTIF(${firstAttendanceCol}${dataRow}:${lastAttendanceCol}${dataRow},"P")/COUNTA(${firstAttendanceCol}${dataRow}:${lastAttendanceCol}${dataRow}))` 
          }
        );
      } else {
        row.push(0, 0);
      }

      wsData.push(row);
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Apply merges
    if (merges.length > 0) {
      ws['!merges'] = merges;
    }

    // Apply styles using proper XLSX styling format
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    
    // Apply styles to data rows
    for (let R = 2; R <= range.e.r; R++) { // Start from row 3 (data rows)
      for (let C = 0; C <= range.e.c; C++) { // All columns
        const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
        if (!ws[cellRef]) continue;

        const value = ws[cellRef].v;
        
        // Style attendance columns
        if (attendanceColumns.includes(C)) {
          ws[cellRef].s = {
            fill: { 
              patternType: 'solid', 
              fgColor: { rgb: value === 'P' ? '006400' : '8B0000' } 
            },
            font: { color: { rgb: 'FFFFFF' }, bold: true },
            alignment: { horizontal: 'center', vertical: 'center' }
          };
        }
        
        // Style Total column
        else if (C === totalColIndex) {
          ws[cellRef].s = {
            fill: { patternType: 'solid', fgColor: { rgb: '006400' } },
            font: { color: { rgb: 'FFFFFF' }, bold: true },
            alignment: { horizontal: 'center', vertical: 'center' }
          };
        }
        
        // Style Percentage column with conditional formatting
        else if (C === percentageColIndex) {
          // For formula cells, we need to calculate the expected percentage for styling
          const studentRowIndex = R - 2; // Convert to 0-based student index
          const student = students[studentRowIndex];
          let calculatedPercentage = 0;
          
          if (student) {
            let totalPresent = 0;
            let totalSessions = 0;
            
            // Calculate actual attendance for this student
            for (const day of daysInRange) {
              const dateStr = format(day, 'yyyy-MM-dd');
              const sessionsForDay = sessionsByDate[dateStr] || {};
              const sessionTimes = Object.keys(sessionsForDay).sort();
              
              if (sessionTimes.length === 0) continue;
              
              sessionTimes.forEach(sessionTime => {
                const session = sessionsForDay[sessionTime];
                const isPresent = session.presentStudents?.includes(student.usn);
                if (isPresent) totalPresent++;
                totalSessions++;
              });
            }
            
            calculatedPercentage = totalSessions > 0 ? totalPresent / totalSessions : 0;
          }
          
          ws[cellRef].s = {
            fill: { 
              patternType: 'solid', 
              fgColor: { rgb: calculatedPercentage >= 0.7 ? '006400' : '8B0000' } 
            },
            font: { color: { rgb: 'FFFFFF' }, bold: true },
            numFmt: '0.00%',
            alignment: { horizontal: 'center', vertical: 'center' }
          };
        }
      }
    }

    // Style header rows properly
    for (let C = 0; C <= range.e.c; C++) {
      // First header row
      const headerCell1 = XLSX.utils.encode_cell({ r: 0, c: C });
      if (ws[headerCell1]) {
        ws[headerCell1].s = {
          fill: { patternType: 'solid', fgColor: { rgb: 'D3D3D3' } },
          font: { bold: true, color: { rgb: '000000' } },
          alignment: { horizontal: 'center', vertical: 'center' },
          border: {
            top: { style: 'thin', color: { rgb: '000000' } },
            bottom: { style: 'thin', color: { rgb: '000000' } },
            left: { style: 'thin', color: { rgb: '000000' } },
            right: { style: 'thin', color: { rgb: '000000' } }
          }
        };
      }

      // Second header row (sub-headers)
      const headerCell2 = XLSX.utils.encode_cell({ r: 1, c: C });
      if (ws[headerCell2]) {
        ws[headerCell2].s = {
          fill: { patternType: 'solid', fgColor: { rgb: 'E8E8E8' } },
          font: { bold: true, color: { rgb: '000000' } },
          alignment: { horizontal: 'center', vertical: 'center' },
          border: {
            top: { style: 'thin', color: { rgb: '000000' } },
            bottom: { style: 'thin', color: { rgb: '000000' } },
            left: { style: 'thin', color: { rgb: '000000' } },
            right: { style: 'thin', color: { rgb: '000000' } }
          }
        };
      }
    }

    // Set column widths
    ws['!cols'] = headers.map((_, i) => ({
      wch: i === 0 ? 15 : i === 1 ? 25 : i >= headers.length - 2 ? 12 : 8
    }));

    // Set row heights
    ws['!rows'] = wsData.map(() => ({ hpt: 20 }));

    XLSX.utils.book_append_sheet(workbook, ws, section);
  }

  // Write workbook with cellStyles enabled
  const excelBuffer = XLSX.write(workbook, { 
    bookType: 'xlsx', 
    type: 'array',
    cellStyles: true,
    bookSST: false
  });
  
  return new Blob([excelBuffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
}