import { AttendanceSession } from '@/lib/types';
import { ParsedSessionTime, SectionStat, SessionPieData, SessionStat } from './types';

export const parseSessionTime = (session: string): ParsedSessionTime => {
  const [start, end] = session.split('-');
  return {
    start: parseFloat(start.replace('.', ':')),
    end: parseFloat(end.replace('.', ':')),
    session
  };
};

export const sortSessionsByTime = (sessions: SessionStat[]): SessionStat[] => {
  return [...sessions].sort((a, b) => {
    const aTime = parseSessionTime(a.name);
    const bTime = parseSessionTime(b.name);
    return aTime.start - bTime.start;
  });
};

export const calculateSessionStats = (sessions: AttendanceSession[]): SessionStat[] => {
  const sessionNames = Array.from(new Set(sessions.map(s => s.session)));
  const sessionColors = [
    // Group 1
    '#FF8F00', // darkest amber
    '#FFB300', // bright amber
    '#FFD54F', // light amber
    // Group 2
    '#26A69A', // teal
    '#4DD0E1', // light teal
    // Group 3
    '#7E57C2', // purple
    '#8E24AA', // deep violet
    '#B39DDB'  // very light purple
  ];

  return sessionNames.map((session, idx) => ({
    name: session,
    color: sessionColors[idx % sessionColors.length],
    count: sessions.filter(s => s.session === session).length
  }));
};

export const calculateSectionStats = (
  sessions: AttendanceSession[],
  students: any[],
  sessionNames: string[]
): SectionStat[] => {
  const uniqueSections = Array.from(new Set(sessions.map(s => s.section))).sort();

  return uniqueSections.map(section => {
    const sectionSessions = sessions.filter(s => s.section === section);
    const sectionStudents = students.filter((s: any) => s.section === section);
    const totalStudents = sectionStudents.length;

    const sessionBreakdown = sessionNames.map(sessionName => {
      const sessionData = sectionSessions.filter(s => s.session === sessionName);
      const totalSessions = sessionData.length;
      const totalPresent = sessionData.reduce((sum, s) => sum + (s.presentCount || 0), 0);
      const totalPossible = totalSessions * totalStudents;

      return {
        session: sessionName,
        count: totalSessions,
        present: totalPresent,
        total: totalPossible,
        attendance: totalPossible > 0 ? Math.round((totalPresent / totalPossible) * 100) : 0
      };
    });

    const totalSessions = sectionSessions.length;
    const totalPossibleAttendance = totalSessions * totalStudents;
    const totalPresent = sectionSessions.reduce((sum, s) => sum + (s.presentCount || 0), 0);

    const attendanceRate = totalPossibleAttendance > 0
      ? Math.round((totalPresent / totalPossibleAttendance) * 100)
      : 0;

    return {
      name: section,
      value: attendanceRate,
      color: attendanceRate >= 75 ? '#22c55e' : attendanceRate >= 60 ? '#f59e0b' : '#ef4444',
      totalSessions,
      totalStudents,
      totalPresent,
      sessions: sessionBreakdown
    };
  });
};

export const filterSectionStats = (
  sectionStats: SectionStat[],
  selectedSessions: string[]
): SectionStat[] => {
  if (selectedSessions.length === 0) return sectionStats;

  return sectionStats.map(section => {
    const filteredSessionBreakdown = section.sessions.filter(s => selectedSessions.includes(s.session));
    const totalFiltered = filteredSessionBreakdown.reduce((sum, s) => sum + s.total, 0);
    const presentFiltered = filteredSessionBreakdown.reduce((sum, s) => sum + s.present, 0);
    const attendanceRate = totalFiltered > 0 ? Math.round((presentFiltered / totalFiltered) * 100) : 0;

    return {
      ...section,
      value: attendanceRate,
      sessions: filteredSessionBreakdown
    };
  });
};

export const calculateSessionPieData = (
  sessions: AttendanceSession[],
  sessionStats: SessionStat[]
): SessionPieData[] => {
  return sessionStats.map(session => {
    const sessionData = sessions.filter(s => s.session === session.name);
    const totalPresent = sessionData.reduce((sum, s) => sum + (s.presentCount || 0), 0);
    return {
      name: session.name,
      value: totalPresent,
      color: session.color,
      count: sessionData.length
    };
  });
};

export const calculateOverallStats = (
  sessions: AttendanceSession[],
  students: any[],
  sectionStats: SectionStat[]
) => {
  const totalSessions = sessions.length;
  const totalStudents = students.length;
  const totalUniqueStudents = new Set(students.map((s: any) => s.usn)).size;
  const averageAttendance = sectionStats.length > 0
    ? Math.round(sectionStats.reduce((sum, s) => sum + s.value, 0) / sectionStats.length)
    : 0;

  return {
    totalSessions,
    totalStudents,
    totalUniqueStudents,
    averageAttendance
  };
};

export const getRecentSessions = (sessions: AttendanceSession[]): AttendanceSession[] => {
  return sessions
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 20);
};