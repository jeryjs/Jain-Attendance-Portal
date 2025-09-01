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
  | '12.50-13.50'
  | '12.50-14.50'
  | '13.50-14.50'
  | '13.50-15.50'
  | '14.50-15.50';

export const SESSION_OPTIONS: { key: SessionOption; value: string }[] = [
  { key: '8.45-9.45', value: '8:45 AM to 9:45 AM' },
  { key: '9.45-10.45', value: '9:45 AM to 10:45 AM' },
  { key: '8.45-10.45', value: '8:45 AM to 10:45 AM (2hrs)' },
  { key: '11-12', value: '11:00 AM to 12:00 PM' },
  { key: '12.50-13.50', value: '12:50 PM to 1:50 PM' },
  { key: '12.50-14.50', value: '12:50 PM to 2:50 PM (2hrs)' },
  { key: '13.50-14.50', value: '1:50 PM to 2:50 PM' },
  { key: '13.50-15.50', value: '1:50 PM to 3:50 PM (2hrs)' },
  { key: '14.50-15.50', value: '2:50 PM to 3:50 PM' },
];

export const SECTION_MAPPINGS: { [key: string]: string } = {
  ANE: 'Aeronautical Engineering',
  ASE: 'Aerospace Engineering',
  CE: 'Civil Engineering',
  EEE: 'Electrical and Electronics Engineering',
  ECE: 'Electronics & Communication Engineering',
  ME: 'Mechanical Engineering',
  SE: 'Computer Engineering - Software Engineering',
  AIDD: 'AI-Driven DevOps',
  AIDE: 'Artificial Intelligence and Data Engineering',
  AIML: 'Artificial Intelligence and Machine Learning',
  BCT: 'Blockchain Technology in association',
  CTIS: 'Cloud Technology and Information Security',
  CTMA: 'Mobile Applications and Cloud Technology',
  CPS: 'Cyber Physical Systems',
  'GEN-AI': 'GenAI (with IBM)',
  'CSE-PWC': 'CSE (with PwC)',
  CSBS: 'Computer Science and Business Systems',
  CSE: 'Computer Science and Engineering',
  AI: 'Artificial Intelligence',
  CyS: 'Cybersecurity',
  DS: 'Data Science in association',
  IOT: 'Internet of Things in association',
  ISE: 'Information Science and Engineering'
};