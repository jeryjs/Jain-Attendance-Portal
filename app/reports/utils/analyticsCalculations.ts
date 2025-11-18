import { AttendanceSession, Student } from '@/lib/types';
import { startOfWeek, endOfWeek, eachWeekOfInterval, isWithinInterval, format } from 'date-fns';

export interface StudentAttendance {
  student: Student;
  totalSessions: number;
  presentCount: number;
  absentCount: number;
  attendanceRate: number;
}

export interface WeeklyDataPoint {
  weekLabel: string;
  weekStart: Date;
  avgAttendance: number;
  totalSessions: number;
  totalPresent: number;
  totalStudents: number;
}

export interface SectionData {
  section: string;
  avgAttendance: number;
  totalSessions: number;
  totalStudents: number;
  studentsNeedingAttention: StudentAttendance[];
}

export interface OverallStats {
  totalSessions: number;
  totalStudents: number;
  avgAttendance: number;
  lowestAttendanceSection: string | null;
  highestAttendanceSection: string | null;
}

/**
 * Calculate overall statistics from sessions
 */
export function calculateOverallStats(
  sessions: AttendanceSession[],
  sectionData: SectionData[]
): OverallStats {
  const totalPresent = sessions.reduce((sum, s) => sum + s.presentCount, 0);
  const totalPossible = sessions.reduce((sum, s) => sum + s.totalStudents, 0);
  const avgAtt = totalPossible > 0 ? (totalPresent / totalPossible) * 100 : 0;

  const sortedByAvg = [...sectionData].sort((a, b) => a.avgAttendance - b.avgAttendance);

  return {
    totalSessions: sessions.length,
    totalStudents: totalPossible / Math.max(sessions.length, 1),
    avgAttendance: avgAtt,
    lowestAttendanceSection: sortedByAvg[0]?.section || null,
    highestAttendanceSection: sortedByAvg[sortedByAvg.length - 1]?.section || null
  };
}

/**
 * Calculate weekly attendance trends
 */
export function calculateWeeklyData(
  sessions: AttendanceSession[],
  dateRange: { from: Date; to: Date }
): WeeklyDataPoint[] {
  const weeks = eachWeekOfInterval(
    { start: dateRange.from, end: dateRange.to },
    { weekStartsOn: 0 }
  );

  return weeks
    .map(weekStart => {
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 0 });
      const weekSessions = sessions.filter(s => {
        const sessionDate = new Date(s.date);
        return isWithinInterval(sessionDate, { start: weekStart, end: weekEnd });
      });

      const totalPresent = weekSessions.reduce((sum, s) => sum + s.presentCount, 0);
      const totalPossible = weekSessions.reduce((sum, s) => sum + s.totalStudents, 0);
      const avgAtt = totalPossible > 0 ? (totalPresent / totalPossible) * 100 : 0;

      return {
        weekLabel: format(weekStart, 'MMM dd'),
        weekStart,
        avgAttendance: avgAtt,
        totalSessions: weekSessions.length,
        totalPresent,
        totalStudents: totalPossible
      };
    })
    .filter(w => w.totalSessions > 0);
}

/**
 * Calculate student attendance for a section
 */
export async function calculateStudentAttendance(
  section: string,
  sessions: AttendanceSession[],
  getStudents: (section: string) => Promise<Student[]>
): Promise<StudentAttendance[]> {
  const students = await getStudents(section);
  const studentAttendanceMap = new Map<string, StudentAttendance>();

  for (const student of students) {
    let presentCount = 0;
    const totalSessions = sessions.length;

    for (const session of sessions) {
      if (session.presentStudents?.includes(student.usn)) {
        presentCount++;
      }
    }

    const absentCount = totalSessions - presentCount;
    const attendanceRate = totalSessions > 0 ? (presentCount / totalSessions) * 100 : 0;

    studentAttendanceMap.set(student.usn, {
      student,
      totalSessions,
      presentCount,
      absentCount,
      attendanceRate
    });
  }

  return Array.from(studentAttendanceMap.values());
}

/**
 * Calculate section-wise data
 */
export async function calculateSectionData(
  sessions: AttendanceSession[],
  getStudents: (section: string) => Promise<Student[]>
): Promise<SectionData[]> {
  const sessionsBySection = sessions.reduce((acc, session) => {
    if (!acc[session.section]) acc[session.section] = [];
    acc[session.section].push(session);
    return acc;
  }, {} as Record<string, AttendanceSession[]>);

  const sectionDataPromises = Object.entries(sessionsBySection).map(async ([section, sectionSessions]) => {
    const studentAttendance = await calculateStudentAttendance(section, sectionSessions, getStudents);

    const studentsNeedingAttention = studentAttendance
      .filter(sa => sa.attendanceRate < 75 && sa.totalSessions > 0)
      .sort((a, b) => a.attendanceRate - b.attendanceRate);

    const totalPresent = sectionSessions.reduce((sum, s) => sum + s.presentCount, 0);
    const totalPossible = sectionSessions.reduce((sum, s) => sum + s.totalStudents, 0);
    const avgAtt = totalPossible > 0 ? (totalPresent / totalPossible) * 100 : 0;

    return {
      section,
      avgAttendance: avgAtt,
      totalSessions: sectionSessions.length,
      totalStudents: studentAttendance.length,
      studentsNeedingAttention
    };
  });

  const sectionData = await Promise.all(sectionDataPromises);
  return sectionData.sort((a, b) => b.studentsNeedingAttention.length - a.studentsNeedingAttention.length);
}

/**
 * Get top and bottom performers across all sections
 */
export function getTopBottomPerformers(
  sectionData: SectionData[],
  topCount: number = 5,
  bottomCount: number = 5
) {
  const allStudents = sectionData.flatMap(s => s.studentsNeedingAttention.map(sa => ({
    ...sa,
    student: { ...sa.student, section: s.section }
  })));

  // Add students with good attendance too
  const allStudentsWithGood = sectionData.flatMap(s => 
    s.studentsNeedingAttention.length > 0 
      ? s.studentsNeedingAttention.map(sa => ({ ...sa, student: { ...sa.student, section: s.section }}))
      : []
  );

  const sortedByAttendance = [...allStudents].sort((a, b) => b.attendanceRate - a.attendanceRate);

  return {
    topPerformers: sortedByAttendance.slice(0, topCount).filter(s => s.attendanceRate >= 75),
    bottomPerformers: sortedByAttendance.slice(-bottomCount).reverse()
  };
}
