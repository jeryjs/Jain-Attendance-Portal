'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { FirebaseService } from '@/lib/firebase-service';
import { AttendanceSession } from '@/lib/types';
import { ArrowLeft, Calendar, CheckCircle, XCircle, User, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';

interface StudentData {
  usn: string;
  name: string;
  section: string;
  phone?: string;
}

interface AttendanceRecord extends AttendanceSession {
  isPresent: boolean;
} 

export default function StudentDetailPage({ params }: { params: { usn: string } }) {
  const { user, loading, isTeacher, isAdmin } = useAuth();
  const { addToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isAdminView = searchParams.get('admin') === 'true';
  const [student, setStudent] = useState<StudentData | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [stats, setStats] = useState({ total: 0, present: 0, absent: 0, rate: 0 });

  useEffect(() => {
    const loadStudentData = async () => {
      if (!user?.uid) return;

      try {
        setLoadingData(true);

        // Get sessions based on view mode
        const sessions = isAdminView && isAdmin
          ? await FirebaseService.getAdminAttendanceSessions() // Get all sessions for admin
          : await FirebaseService.getAttendanceSessions({ teacherId: user.uid });

        if (sessions.length === 0) {
          addToast({
            title: "No Data",
            description: "No attendance sessions found",
            variant: "default"
          });
          router.push('/reports');
          return;
        }

        // Find which section this student belongs to
        let studentData: StudentData | null = null;
        const records: AttendanceRecord[] = [];

        // Fetch students based on view mode
        if (isAdminView && isAdmin) {
          // Admin: fetch ALL students once
          const allStudents = await FirebaseService.getAdminStudents();
          studentData = allStudents.find(s => s.id === params.usn) || null;
        } else {
          // Non-admin: fetch per section until found
          const allSections = Array.from(new Set(sessions.map(s => s.section)));
          for (const section of allSections) {
            const students = await FirebaseService.getStudents(section);
            const found = students.find(s => s.id === params.usn);
            if (found) {
              studentData = found;
              break;
            }
          }
        }

        // If student found, collect all their attendance records
        if (studentData) {
          for (const session of sessions) {
            if (session.section === studentData.section) {
              records.push({
                ...session,
                isPresent: session.presentStudents?.includes(params.usn) || false,
              });
            }
          }
        }

        if (!studentData) {
          addToast({
            title: "Student Not Found",
            description: "This student is not in any of your sections",
            variant: "destructive"
          });
          router.push('/reports');
          return;
        }

        setStudent(studentData);
        
        // Sort records by date (newest first)
        records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setAttendanceRecords(records);

        // Calculate stats
        const presentCount = records.filter(r => r.isPresent).length;
        const absentCount = records.length - presentCount;
        const rate = records.length > 0 ? (presentCount / records.length) * 100 : 0;

        setStats({
          total: records.length,
          present: presentCount,
          absent: absentCount,
          rate
        });

      } catch (error) {
        console.error('Error loading student data:', error);
        addToast({
          title: "Error",
          description: "Failed to load student data",
          variant: "destructive"
        });
      } finally {
        setLoadingData(false);
      }
    };

    loadStudentData();
  }, [user?.uid, params.usn, addToast, router, isAdminView, isAdmin]);

  if (loading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-cyber-yellow/30 border-t-cyber-yellow rounded-full animate-spin"></div>
          <div className="absolute inset-0 w-16 h-16 border-4 border-cyber-yellow/20 border-t-transparent rounded-full animate-spin animation-delay-150"></div>
        </div>
      </div>
    );
  }

  if (!user || (!isTeacher && !isAdmin) || !student) {
    return null;
  }

  return (
    <div className="min-h-screen p-2 md:p-6">
      <div className="max-w-5xl mx-auto">
        {/* Back Button */}
        <Link href={isAdminView ? "/students/admin" : "/reports"}>
          <Button variant="outline" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {isAdminView ? 'Back to Student Management' : 'Back to Reports'}
          </Button>
        </Link>

        {/* Student Header */}
        <Card variant="cyber" className="p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-cyber-yellow to-cyber-yellow-dark rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-cyber-gray-900" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-cyber-gray-900">{student.name}</h1>
              <p className="text-cyber-gray-600">{student.usn} • {student.section}</p>
            </div>
          </div>
        </Card>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card variant="cyber" className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-cyber-gray-600">Total Sessions</p>
                <p className="text-2xl font-bold text-cyber-gray-900">{stats.total}</p>
              </div>
            </div>
          </Card>

          <Card variant="cyber" className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-cyber-gray-600">Present</p>
                <p className="text-2xl font-bold text-green-600">{stats.present}</p>
              </div>
            </div>
          </Card>

          <Card variant="cyber" className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-cyber-gray-600">Absent</p>
                <p className="text-2xl font-bold text-red-600">{stats.absent}</p>
              </div>
            </div>
          </Card>

          <Card variant="cyber" className="p-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                stats.rate >= 75 ? 'bg-green-100' : stats.rate >= 50 ? 'bg-yellow-100' : 'bg-red-100'
              }`}>
                {stats.rate >= 75 ? (
                  <TrendingUp className="w-5 h-5 text-green-600" />
                ) : stats.rate >= 50 ? (
                  <Minus className="w-5 h-5 text-yellow-600" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-red-600" />
                )}
              </div>
              <div>
                <p className="text-sm text-cyber-gray-600">Attendance</p>
                <p className={`text-2xl font-bold ${
                  stats.rate >= 75 ? 'text-green-600' : stats.rate >= 50 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {stats.rate.toFixed(1)}%
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Data Scope Alert */}
        {!isAdminView && (
          <Card variant="cyber" className="p-4 mb-6 border-l-4 bg-purple-50/20">
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 bg-cyber-yellow rounded-full flex items-center justify-center mt-0.5 flex-shrink-0">
                <span className="text-xs font-bold">i</span>
              </div>
              <div>
                <p className="text-sm font-medium">Limited View</p>
                <p className="text-sm">
                  This attendance record displays data only from sessions you have conducted. For a complete attendance history across all instructors, contact the administration.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Attendance Records */}
        <Card variant="cyber" className="p-6">
          <h2 className="text-lg font-semibold text-cyber-gray-900 mb-4">Attendance History</h2>
          
          {attendanceRecords.length === 0 ? (
            <p className="text-center text-cyber-gray-600 py-8">No attendance records found</p>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {attendanceRecords.map((record, idx) => (
                <Link
                  key={`${record.date}-${record.session}`}
                  href={record.id ? `/attendance/${record.section}?date=${record.date}&time=${record.session}` : '#'}
                  className={`block p-4 rounded-lg border transition-all cursor-pointer ${
                    record.isPresent
                      ? 'bg-green-50 border-green-200 hover:border-green-300 hover:shadow-md'
                      : 'bg-red-50 border-red-200 hover:border-red-300 hover:shadow-md'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        record.isPresent ? 'bg-green-100' : 'bg-red-100'
                      }`}>
                        {record.isPresent ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-cyber-gray-900">
                          {format(new Date(record.date), 'MMM dd, yyyy')}
                        </p>
                        <p className="text-sm text-cyber-gray-600">
                          {record.session} • {record.teacherEmail.split('@')[0]}
                        </p>
                      </div>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                      record.isPresent
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {record.isPresent ? 'Present' : 'Absent'}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
