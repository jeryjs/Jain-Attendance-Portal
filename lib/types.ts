import { BarChart3, Calendar, Home, Users } from "lucide-react";
import { getReportsRoute } from "./utils";

export interface Program {
  id: string;
  name: string;
  sections: string[];
}

export interface Student {
  id: string;
  name: string;
  usn: string;
  section: string;
  createdAt: Date; // Firestore internal document creation date
}

export interface AttendanceSession {
  id: string;
  absentCount: number;
  createdAt: Date & { toDate: () => Date };
  date: string;
  editHistory: { details: string, email: string, timestamp: Date }[];
  presentCount: number;
  presentStudents: string[];
  section: string;
  session: SessionOption;
  teacherEmail: string;
  teacherId: string;
  totalStudents: number;
  updatedAt: Date & { toDate: () => Date };
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
  BCT: 'Blockchain Technology',
  CTIS: 'Cloud Technology and Information Security',
  CTMA: 'Mobile Applications and Cloud Technology',
  CPS: 'Cyber Physical Systems',
  'GEN-AI': 'GenAI (with IBM)',
  'CSE-PWC': 'CSE (with PwC)',
  CSBS: 'Computer Science and Business Systems',
  CSE: 'Computer Science and Engineering',
  AI: 'Artificial Intelligence',
  CyS: 'Cybersecurity',
  DS: 'Data Science',
  IOT: 'Internet of Things',
  ISE: 'Information Science and Engineering'
};

export const SECTIONS: string[] = ['AI', 'AIDD', 'AIDE A', 'AIDE B', 'AIML A', 'AIML B', 'AIML C', 'AIML D', 'AIML E', 'ANE', 'ASE', 'BCT', 'CE', 'CPS', 'CSBS', 'CSE A', 'CSE B', 'CSE PWC A', 'CSE PWC B', 'CTIS', 'CTMA', 'CYBER SECURITY', 'DS', 'ECE', 'EEE', 'GEN AI A', 'GEN AI B', 'IOT', 'ISE', 'ME', 'SE'];

interface NavItem {
  label: string;
  href: string | (() => string);
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
}
export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: Home },
  { label: 'Attendance', href: '/attendance', icon: Calendar },
  { label: 'Reports', href: () => getReportsRoute(), icon: BarChart3 },
  { label: 'Students', href: '/students/admin', icon: Users, adminOnly: true },
  // { label: 'Settings', href: '/settings', icon: Settings, adminOnly: true },
];