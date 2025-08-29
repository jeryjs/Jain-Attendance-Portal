export interface Program {
  id: string;
  name: string;
  sections: string[];
}

export interface Student {
  name: string;
  usn: string;
  section: string;
}

export interface AttendanceSession {
  id: string;
  section: string;
  date: string;
  session: string;
  teacherId: string;
  teacherEmail: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AttendanceRecord {
  sessionId: string;
  studentUsn: string;
  isPresent: boolean;
  markedAt: Date;
  markedBy: string;
}

export interface User {
  uid: string;
  email: string;
  displayName: string;
  picture: string;
  role: 'student' | 'teacher' | 'admin';
  customClaims?: {
    role: string;
  };
}

export type SessionOption =
  | '8.45-9.45'
  | '9.45-10.45'
  | '8.45-10.45'
  | '11-12'
  | '12-13'
  | '11-13'
  | '14-14.50'
  | '14.50-15.30'
  | '14-15.40';

export const SESSION_OPTIONS: { key: SessionOption; value: string }[] = [
  { key: '8.45-9.45', value: '8:45 AM to 9:45 AM' },
  { key: '9.45-10.45', value: '9:45 AM to 10:45 AM' },
  { key: '8.45-10.45', value: '8:45 AM to 10:45 AM (2hrs)' },
  { key: '11-12', value: '11:00 AM to 12:00 PM' },
  { key: '12-13', value: '12:00 PM to 1:00 PM' },
  { key: '11-13', value: '11:00 AM to 1:00 PM (2hrs)' },
  { key: '14-14.50', value: '2:00 PM to 2:50 PM' },
  { key: '14.50-15.30', value: '2:50 PM to 3:30 PM' },
  { key: '14-15.40', value: '2:00 PM to 3:40 PM (2hrs)' }
];