import { DateRange } from "@/components/ui/date-picker";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import XLSX from "xlsx-js-style";
import { eachDayOfInterval, format } from "date-fns";
import { SESSION_OPTIONS } from "./types";

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
    throw new Error("Date range is not properly defined");
  }

  const daysInRange = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
  const sectionsToProcess =
    selectedSection === "all"
      ? Array.from(new Set(sessions.map(s => s.section)))
      : [selectedSection];

  const workbook = XLSX.utils.book_new();
  const sessionOrder = SESSION_OPTIONS.map(option => option.key.toString());

  // Define style constants for reusability
  const header1Style = {
    fill: { patternType: "solid", fgColor: { rgb: "D3D3D3" } },
    font: { bold: true, color: { rgb: "000000" } },
    alignment: { horizontal: "center", vertical: "center" },
    border: {
      top: { style: "thin", color: { rgb: "000000" } },
      bottom: { style: "thin", color: { rgb: "000000" } },
      left: { style: "thin", color: { rgb: "000000" } },
      right: { style: "thin", color: { rgb: "000000" } }
    }
  };

  const header2Style = {
    fill: { patternType: "solid", fgColor: { rgb: "E8E8E8" } },
    font: { bold: true, color: { rgb: "000000" } },
    alignment: { horizontal: "center", vertical: "center" },
    border: {
      top: { style: "thin", color: { rgb: "000000" } },
      bottom: { style: "thin", color: { rgb: "000000" } },
      left: { style: "thin", color: { rgb: "000000" } },
      right: { style: "thin", color: { rgb: "000000" } }
    }
  };

  const defaultDataStyle = {
    alignment: { horizontal: "center", vertical: "center" },
    border: {
      top: { style: "thin", color: { rgb: "000000" } },
      bottom: { style: "thin", color: { rgb: "000000" } },
      left: { style: "thin", color: { rgb: "000000" } },
      right: { style: "thin", color: { rgb: "000000" } }
    }
  };

  const attendancePresentStyle = {
    fill: { patternType: "solid", fgColor: { rgb: "D4F4DD" } },
    font: { color: { rgb: "2D5016" }, bold: true },
    alignment: { horizontal: "center", vertical: "center" },
    border: {
      top: { style: "thin", color: { rgb: "000000" } },
      bottom: { style: "thin", color: { rgb: "000000" } },
      left: { style: "thin", color: { rgb: "000000" } },
      right: { style: "thin", color: { rgb: "000000" } }
    }
  };

  const attendanceAbsentStyle = {
    fill: { patternType: "solid", fgColor: { rgb: "F8D7DA" } },
    font: { color: { rgb: "721C24" }, bold: true },
    alignment: { horizontal: "center", vertical: "center" },
    border: {
      top: { style: "thin", color: { rgb: "000000" } },
      bottom: { style: "thin", color: { rgb: "000000" } },
      left: { style: "thin", color: { rgb: "000000" } },
      right: { style: "thin", color: { rgb: "000000" } }
    }
  };

  const totalStyle = {
    fill: { patternType: "solid", fgColor: { rgb: "CCE5FF" } },
    font: { color: { rgb: "003D82" }, bold: true },
    alignment: { horizontal: "center", vertical: "center" },
    border: {
      top: { style: "thin", color: { rgb: "000000" } },
      bottom: { style: "thin", color: { rgb: "000000" } },
      left: { style: "thin", color: { rgb: "000000" } },
      right: { style: "thin", color: { rgb: "000000" } }
    }
  };

  const percentageGoodStyle = {
    fill: { patternType: "solid", fgColor: { rgb: "D4F4DD" } },
    font: { color: { rgb: "2D5016" }, bold: true },
    alignment: { horizontal: "center", vertical: "center" },
    numFmt: "0.00%",
    border: {
      top: { style: "thin", color: { rgb: "000000" } },
      bottom: { style: "thin", color: { rgb: "000000" } },
      left: { style: "thin", color: { rgb: "000000" } },
      right: { style: "thin", color: { rgb: "000000" } }
    }
  };

  const percentageBadStyle = {
    fill: { patternType: "solid", fgColor: { rgb: "F8D7DA" } },
    font: { color: { rgb: "721C24" }, bold: true },
    alignment: { horizontal: "center", vertical: "center" },
    numFmt: "0.00%",
    border: {
      top: { style: "thin", color: { rgb: "000000" } },
      bottom: { style: "thin", color: { rgb: "000000" } },
      left: { style: "thin", color: { rgb: "000000" } },
      right: { style: "thin", color: { rgb: "000000" } }
    }
  };

  // Unified function for applying cell styles
  function applyCellStyle(
    cell: XLSX.CellObject,
    row: number,
    col: number,
    attendanceColumns: number[],
    totalColIndex: number,
    percentageColIndex: number
  ) {
    if (row === 0) {
      cell.s = header1Style;
    } else if (row === 1) {
      cell.s = header2Style;
    } else {
      // Data rows
      if (attendanceColumns.includes(col)) {
        cell.s = cell.v === "P" ? attendancePresentStyle : attendanceAbsentStyle;
      } else if (col === totalColIndex) {
        cell.s = totalStyle;
      } else if (col === percentageColIndex) {
        // Note: For formulas, cell.v may not be set; consider using conditional formatting in Excel for dynamic styling
        const value = (cell.v as number) ?? 0;
        cell.s = value >= 0.7 ? percentageGoodStyle : percentageBadStyle;
      } else {
        cell.s = defaultDataStyle;
      }
    }
  }

  for (const section of sectionsToProcess) {
    const sectionSessions = sessions.filter(s => s.section === section);
    const students = await getStudents(section);

    const sessionsByDate = sectionSessions.reduce((acc, session) => {
      if (!acc[session.date]) acc[session.date] = {};
      acc[session.date][session.session] = session;
      return acc;
    }, {} as Record<string, Record<string, any>>);

    const headers = ["USN", "Name"];
    const subHeaders = ["", ""];
    const merges: XLSX.Range[] = [];
    let colIndex = 2;
    const attendanceColumns: number[] = [];

    for (const day of daysInRange) {
      const dateStr = format(day, "yyyy-MM-dd");
      const dayFormat = format(day, "MM/dd");
      const sessionsForDay = sessionsByDate[dateStr] || {};

      const sessionTimes = Object.keys(sessionsForDay).sort(
        (a, b) => sessionOrder.indexOf(a) - sessionOrder.indexOf(b)
      );

      if (sessionTimes.length === 0) continue;

      if (sessionTimes.length === 1) {
        headers.push(dayFormat);
        subHeaders.push(sessionTimes[0]);
        attendanceColumns.push(colIndex++);
      } else {
        const startCol = colIndex;
        const endCol = colIndex + sessionTimes.length - 1;
        merges.push({ s: { r: 0, c: startCol }, e: { r: 0, c: endCol } });

        headers.push(dayFormat);
        sessionTimes.forEach((time, i) => {
          if (i > 0) headers.push("");
          subHeaders.push(time);
          attendanceColumns.push(colIndex++);
        });
      }
    }

    headers.push("Total", "Percentage");
    subHeaders.push("", "");
    const totalColIndex = colIndex;
    const percentageColIndex = colIndex + 1;

    const wsData: any[][] = [headers, subHeaders];

    students.forEach((student, rowIndex) => {
      const row: any[] = [student.usn, student.name];
      const dataRow = rowIndex + 3;

      for (const day of daysInRange) {
        const dateStr = format(day, "yyyy-MM-dd");
        const sessionsForDay = sessionsByDate[dateStr] || {};

        const sessionTimes = Object.keys(sessionsForDay).sort(
          (a, b) => sessionOrder.indexOf(a) - sessionOrder.indexOf(b)
        );

        if (sessionTimes.length === 0) continue;

        sessionTimes.forEach(sessionTime => {
          const session = sessionsForDay[sessionTime];
          const isPresent = session.presentStudents?.includes(student.usn);
          row.push(isPresent ? "P" : "A");
        });
      }

      if (attendanceColumns.length > 0) {
        const firstCol = XLSX.utils.encode_col(attendanceColumns[0]);
        const lastCol = XLSX.utils.encode_col(attendanceColumns[attendanceColumns.length - 1]);

        row.push(
          {
            t: "n",
            f: `COUNTIF(${firstCol}${dataRow}:${lastCol}${dataRow},"P")`,
            s: totalStyle // Pre-apply style, but will be overridden by unified function
          },
          {
            t: "n",
            f: `IF(COUNTA(${firstCol}${dataRow}:${lastCol}${dataRow})=0,0,COUNTIF(${firstCol}${dataRow}:${lastCol}${dataRow},"P")/COUNTA(${firstCol}${dataRow}:${lastCol}${dataRow}))`,
            s: percentageGoodStyle // Pre-apply, but will be overridden
          }
        );
      } else {
        row.push(0, { t: "n", v: 0, s: percentageBadStyle });
      }

      wsData.push(row);
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    if (merges.length > 0) ws["!merges"] = merges;

    const range = XLSX.utils.decode_range(ws["!ref"] || "A1");

    // Apply styles using the unified function
    for (let R = 0; R <= range.e.r; R++) {
      for (let C = 0; C <= range.e.c; C++) {
        const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = ws[cellRef];
        if (!cell) continue;
        applyCellStyle(cell, R, C, attendanceColumns, totalColIndex, percentageColIndex);
      }
    }

    ws["!cols"] = headers.map((_, i) => ({
      wch: i === 0 ? 15 : i === 1 ? 25 : i >= headers.length - 2 ? 12 : 8
    }));
    ws["!rows"] = wsData.map(() => ({ hpt: 20 }));

    XLSX.utils.book_append_sheet(workbook, ws, section);
  }

  const excelBuffer = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array"
  });

  return new Blob([excelBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  });
}
