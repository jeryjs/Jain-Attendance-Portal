import { AttendanceSession } from "@/lib/types";

export interface SessionStat {
  name: string;
  color: string;
  // Add other properties if needed
}

export interface SectionSession {
  session: string;
  count: number;
  present: number;
  total: number;
  attendance: number;
}

export interface SectionStat {
  name: string;
  value: number;
  color: string;
  totalSessions: number;
  totalStudents: number;
  totalPresent: number;
  sessions: SectionSession[];
}

export interface SessionPieData {
  name: string;
  value: number;
  color: string;
  count: number;
}

export interface AdminStats {
  sectionStats: SectionStat[];
  sessionStats: SessionStat[];
  sessionPieData: SessionPieData[];
  totalSessions: number;
  totalStudents: number;
  totalUniqueStudents: number;
  averageAttendance: number;
  recentSessions: AttendanceSession[];
  uniqueSections: number;
}

export interface SectionData {
  name: string;
  value: number;
  color: string;
  sessions: SectionSession[];
}

export interface ParsedSessionTime {
  start: number;
  end: number;
  session: string;
}