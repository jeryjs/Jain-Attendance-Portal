'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from "@/components/ui/date-picker";
import {
  BarChart3,
  Calendar as CalendarIcon,
  Download,
  Filter,
  TrendingUp,
  Users,
  Clock,
  Target,
  Sparkles,
  FileText,
  PieChart,
  Activity
} from 'lucide-react';
import { FirebaseService } from '@/lib/firebase-service';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';

interface ReportData {
  sessions: any[];
  attendanceStats: {
    totalPresent: number;
    totalAbsent: number;
    averageAttendance: number;
  };
  sectionStats: Record<string, {
    present: number;
    absent: number;
    total: number;
    percentage: number;
  }>;
}

export default function ReportsPage() {
  const { user, loading, isTeacher, isAdmin } = useAuth();
  const router = useRouter();
  const [reportData, setReportData] = useState<ReportData>({
    sessions: [],
    attendanceStats: { totalPresent: 0, totalAbsent: 0, averageAttendance: 0 },
    sectionStats: {}
  });
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [selectedSection, setSelectedSection] = useState<string>('all');
  const [loadingReports, setLoadingReports] = useState(true);
  const [sections, setSections] = useState<string[]>([]);

  useEffect(() => {
    if (!loading && (!user || !isTeacher)) {
      router.push('/');
    }
  }, [user, loading, isTeacher, router]);

  useEffect(() => {
    if (user) {
      loadReportData();
    }
  }, [user, selectedMonth, selectedSection]);

  const loadReportData = async () => {
    if (!user?.uid) return;

    try {
      setLoadingReports(true);

      // Get all sessions for this teacher (using optimized FirebaseService)
      const sessions = await FirebaseService.getAttendanceSessions({
        teacherId: user.uid
      });

      // Filter by selected month if specified
      let filteredSessions = sessions;
      if (selectedMonth) {
        const monthStart = startOfMonth(selectedMonth);
        const monthEnd = endOfMonth(selectedMonth);

        filteredSessions = sessions.filter(session => {
          const sessionDate = session.createdAt?.toDate();
          return sessionDate && sessionDate >= monthStart && sessionDate <= monthEnd;
        });
      }

      // Filter by section if specified
      if (selectedSection !== 'all') {
        filteredSessions = filteredSessions.filter(session => session.section === selectedSection);
      }

      // Calculate attendance stats from session documents (no separate queries needed!)
      const attendanceStats = {
        totalPresent: 0,
        totalAbsent: 0,
        averageAttendance: 0
      };

      // Calculate section-wise stats from embedded data
      const sectionStats: Record<string, { present: number; absent: number; total: number; percentage: number }> = {};

      filteredSessions.forEach(session => {
        const present = session.presentCount || 0;
        const absent = session.absentCount || 0;
        const total = session.totalStudents || 0;

        attendanceStats.totalPresent += present;
        attendanceStats.totalAbsent += absent;

        if (!sectionStats[session.section]) {
          sectionStats[session.section] = { present: 0, absent: 0, total: 0, percentage: 0 };
        }

        sectionStats[session.section].present += present;
        sectionStats[session.section].absent += absent;
        sectionStats[session.section].total += total;
      });

      // Calculate percentages
      Object.keys(sectionStats).forEach(section => {
        const stats = sectionStats[section];
        stats.percentage = stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0;
      });

      attendanceStats.averageAttendance = filteredSessions.length > 0 ?
        Math.round((attendanceStats.totalPresent / (attendanceStats.totalPresent + attendanceStats.totalAbsent)) * 100) : 0;

      // Get unique sections
      const uniqueSections = [...new Set(sessions.map(s => s.section))].filter(Boolean) as string[];

      setSections(uniqueSections);
      setReportData({
        sessions: filteredSessions,
        attendanceStats,
        sectionStats
      });
    } catch (error) {
      console.error('Error loading report data:', error);
    } finally {
      setLoadingReports(false);
    }
  };

  const exportReport = () => {
    // Simple CSV export
    const csvData = [
      ['Section', 'Date', 'Session', 'Present', 'Absent', 'Total', 'Percentage'],
      ...reportData.sessions.map(session => [
        session.section,
        format(session.createdAt.toDate(), 'yyyy-MM-dd'),
        session.session,
        session.presentCount || 0,
        session.absentCount || 0,
        session.totalStudents || 0,
        session.totalStudents > 0 ? Math.round(((session.presentCount || 0) / session.totalStudents) * 100) : 0
      ])
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-report-${format(selectedMonth, 'yyyy-MM')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
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
            <div className="relative">
              <div className="w-12 h-12 md:w-20 md:h-20 bg-gradient-to-br from-cyber-yellow to-cyber-yellow-dark rounded-2xl flex items-center justify-center shadow-2xl shadow-cyber-yellow/25 animate-pulse">
                <BarChart3 className="w-6 h-6 md:w-10 md:h-10 text-cyber-gray-900" />
              </div>
              <div className="absolute -top-1 -right-1 md:-top-2 md:-right-2 w-4 h-4 md:w-6 md:h-6 bg-cyber-yellow rounded-full flex items-center justify-center animate-bounce">
                <Sparkles className="w-2 h-2 md:w-3 md:h-3 text-cyber-gray-900" />
              </div>
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
          <Card variant="cyber" className="p-3 md:p-6">
            <div className="space-y-2">
              <label className="text-xs md:text-sm font-medium text-cyber-gray-700">Select Month</label>
              <DatePicker
                date={selectedMonth}
                onDateChange={(date) => date && setSelectedMonth(date as Date)}
                placeholder="Select month for report"
              />
            </div>
          </Card>

          <Card variant="cyber" className="p-3 md:p-6">
            <div className="space-y-2">
              <label className="text-xs md:text-sm font-medium text-cyber-gray-700">Filter by Section</label>
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
          </Card>

          <Card variant="cyber" className="p-3 md:p-6">
            <div className="space-y-2">
              <label className="text-xs md:text-sm font-medium text-cyber-gray-700">Export Options</label>
              <Button onClick={exportReport} className="w-full text-sm md:text-base">
                <Download className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                Export CSV
              </Button>
            </div>
          </Card>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-2 md:gap-6 mb-4 md:mb-12">
          <Card variant="cyber" className="text-center p-3 md:p-6">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center mx-auto mb-1 md:mb-2">
              <CalendarIcon className="w-4 h-4 md:w-5 md:h-5 text-white" />
            </div>
            <div className="text-lg md:text-2xl font-bold text-cyber-gray-900 mb-1">{reportData.sessions.length}</div>
            <div className="text-xs text-cyber-gray-600">Total Sessions</div>
          </Card>

          <Card variant="cyber" className="text-center p-3 md:p-6">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center mx-auto mb-1 md:mb-2">
              <Users className="w-4 h-4 md:w-5 md:h-5 text-white" />
            </div>
            <div className="text-lg md:text-2xl font-bold text-cyber-gray-900 mb-1">{reportData.attendanceStats.totalPresent}</div>
            <div className="text-xs text-cyber-gray-600">Total Present</div>
          </Card>

          <Card variant="cyber" className="text-center p-3 md:p-6">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center mx-auto mb-1 md:mb-2">
              <Activity className="w-4 h-4 md:w-5 md:h-5 text-white" />
            </div>
            <div className="text-lg md:text-2xl font-bold text-cyber-gray-900 mb-1">{reportData.attendanceStats.totalAbsent}</div>
            <div className="text-xs text-cyber-gray-600">Total Absent</div>
          </Card>

          <Card variant="cyber" className="text-center p-3 md:p-6">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-cyber-yellow to-cyber-yellow-dark rounded-lg flex items-center justify-center mx-auto mb-1 md:mb-2">
              <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-cyber-gray-900" />
            </div>
            <div className="text-lg md:text-2xl font-bold text-cyber-gray-900 mb-1">{reportData.attendanceStats.averageAttendance}%</div>
            <div className="text-xs text-cyber-gray-600">Avg Attendance</div>
          </Card>
        </div>

        {/* Section Performance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-8 mb-4 md:mb-12">
          <Card variant="cyber" className="p-3 md:p-6">
            <h3 className="text-lg md:text-xl font-bold text-cyber-gray-900 mb-3 md:mb-6 flex items-center gap-2">
              <PieChart className="w-4 h-4 md:w-5 md:h-5 text-cyber-yellow" />
              Section Performance
            </h3>

            <div className="space-y-3 md:space-y-4">
              {Object.entries(reportData.sectionStats).map(([section, stats]) => (
                <div key={section} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-cyber-gray-900 text-sm md:text-base">{section}</span>
                    <span className="text-xs md:text-sm font-medium text-cyber-gray-600">{stats.percentage}%</span>
                  </div>
                  <div className="w-full bg-cyber-gray-200 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-cyber-yellow to-cyber-yellow-dark h-2 rounded-full transition-all duration-500"
                      style={{ width: `${stats.percentage}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-cyber-gray-500">
                    <span>Present: {stats.present}</span>
                    <span>Absent: {stats.absent}</span>
                    <span>Total: {stats.total}</span>
                  </div>
                </div>
              ))}

              {Object.keys(reportData.sectionStats).length === 0 && (
                <div className="text-center py-4 md:py-8">
                  <BarChart3 className="w-8 h-8 md:w-12 md:h-12 text-cyber-gray-400 mx-auto mb-2 md:mb-4" />
                  <p className="text-xs md:text-sm text-cyber-gray-600">No data available</p>
                  <p className="text-xs text-cyber-gray-500">Try selecting a different month</p>
                </div>
              )}
            </div>
          </Card>

          <Card variant="cyber" className="p-3 md:p-6">
            <h3 className="text-lg md:text-xl font-bold text-cyber-gray-900 mb-3 md:mb-6 flex items-center gap-2">
              <FileText className="w-4 h-4 md:w-5 md:h-5 text-cyber-yellow" />
              Recent Sessions
            </h3>

            <div className="space-y-2 md:space-y-4">
              {reportData.sessions.slice(0, 5).map((session: any) => {
                const sessionDate = format(session.createdAt.toDate(), 'yyyy-MM-dd');
                const sessionUrl = `/attendance/${encodeURIComponent(session.section)}?date=${sessionDate}&time=${session.session}`;
                
                return (
                  <div 
                    key={session.id} 
                    className="flex items-center justify-between p-2 md:p-4 bg-cyber-gray-50 rounded-xl hover:bg-cyber-gray-100 cursor-pointer transition-colors"
                    onClick={() => router.push(sessionUrl)}
                  >
                    <div>
                      <p className="font-semibold text-cyber-gray-900 text-sm md:text-base">{session.section}</p>
                      <p className="text-xs md:text-sm text-cyber-gray-600">
                        {format(session.createdAt.toDate(), 'MMM dd, yyyy')} • {session.session}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs md:text-sm font-medium text-cyber-gray-900">
                        {session.presentCount || 0}/{session.totalStudents || 0}
                      </p>
                      <p className="text-xs text-cyber-gray-600">
                        {session.totalStudents > 0 ? Math.round(((session.presentCount || 0) / session.totalStudents) * 100) : 0}% attendance
                      </p>
                    </div>
                  </div>
                );
              })}

              {reportData.sessions.length === 0 && (
                <div className="text-center py-4 md:py-8">
                  <CalendarIcon className="w-8 h-8 md:w-12 md:h-12 text-cyber-gray-400 mx-auto mb-2 md:mb-4" />
                  <p className="text-xs md:text-sm text-cyber-gray-600">No sessions found</p>
                  <p className="text-xs text-cyber-gray-500">No attendance sessions for the selected period</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Insights */}
        <Card variant="glass" className="text-center p-4 md:p-6">
          <div className="max-w-2xl mx-auto">
            <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-cyber-yellow to-cyber-yellow-dark rounded-2xl flex items-center justify-center mx-auto mb-3 md:mb-6">
              <Target className="w-6 h-6 md:w-8 md:h-8 text-cyber-gray-900" />
            </div>
            <h3 className="text-lg md:text-2xl font-bold text-cyber-gray-900 mb-2 md:mb-4">
              Data-Driven Insights 📊
            </h3>
            <p className="text-sm md:text-base text-cyber-gray-600 mb-3 md:mb-6">
              Use these reports to identify attendance patterns, track student engagement, and make informed decisions about your teaching approach.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 md:gap-4 justify-center">
              <Button onClick={() => router.push('/attendance')} className="text-sm md:text-base">
                Take New Session
              </Button>
              <Button variant="outline" onClick={() => router.push('/dashboard')} className="text-sm md:text-base">
                Back to Dashboard
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}