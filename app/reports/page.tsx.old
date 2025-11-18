'use client';

import FeedbackCard from '@/components/FeedbackCard';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DatePicker, DateRange } from "@/components/ui/date-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { FirebaseService } from '@/lib/firebase-service';
import { AttendanceSession, Student } from '@/lib/types';
import { exportToExcel } from '@/lib/utils';
import { eachWeekOfInterval, endOfWeek, format, isWithinInterval } from 'date-fns';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Calendar,
  ChevronDown,
  ChevronUp,
  Clock,
  Crown,
  FileSpreadsheet,
  Minus,
  Percent,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  User,
  Users
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface StudentAttendance {
  student: Student;
  totalSessions: number;
  presentCount: number;
  absentCount: number;
  attendanceRate: number;
}

interface SectionInsights {
  section: string;
  studentsNeedingAttention: StudentAttendance[];
  totalSessions: number;
  totalStudents: number;
  avgAttendance: number;
  expanded: boolean;
  showingAll: boolean;
}

interface WeeklyAttendanceData {
  weekLabel: string;
  weekStart: Date;
  avgAttendance: number;
  totalSessions: number;
  totalPresent: number;
  totalStudents: number;
}

interface OverallStats {
  totalSessions: number;
  totalStudents: number;
  avgAttendance: number;
  lowestAttendanceSection: string | null;
  highestAttendanceSection: string | null;
}

export default function ReportsPage() {
  const { user, loading, isTeacher, isAdmin } = useAuth();
  const { addToast } = useToast();
  const router = useRouter();
  const [selectedSection, setSelectedSection] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date()
  });
  const [loadingData, setLoadingData] = useState(false);
  const [weeklyData, setWeeklyData] = useState<WeeklyAttendanceData[]>([]);
  const [exporting, setExporting] = useState(false);
  const [sections, setSections] = useState<string[]>([]);
  const [sectionInsights, setSectionInsights] = useState<SectionInsights[]>([]);
  const [overallStats, setOverallStats] = useState<OverallStats | null>(null);
  const [allSessions, setAllSessions] = useState<AttendanceSession[]>([]);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  const defaultToAdminView = (typeof window !== 'undefined') && localStorage.getItem('defaultToAdminView') === 'true';

  useEffect(() => {
    if (defaultToAdminView && isAdmin) {
      router.push('/reports/admin');
    }
  }, [defaultToAdminView, isAdmin, router]);

  // Main data loading effect
  useEffect(() => {
    const loadData = async () => {
      if (!user?.uid || !dateRange.from || !dateRange.to) return;
      // user.uid = "PMY061vYmogZ2bKKB72TQUwQMa33"  // testing with vishal sir's acc

      try {
        setLoadingData(true);

        // Fetch all sessions for the date range
        const sessions = await FirebaseService.getAttendanceSessions({
          teacherId: user.uid,
          dateRange: { start: dateRange.from, end: dateRange.to }
        }, 100);

        setAllSessions(sessions);
        setLastFetched(new Date());

        if (sessions.length === 0) {
          setSections([]);
          setSectionInsights([]);
          setWeeklyData([]);
          setOverallStats(null);
          return;
        }

        // Get unique sections
        const uniqueSections = Array.from(new Set(sessions.map(s => s.section))).sort();
        setSections(uniqueSections);

        // Filter sessions by selected section
        const filteredSessions = selectedSection === 'all'
          ? sessions
          : sessions.filter(s => s.section === selectedSection);

        // Calculate overall stats
        const totalPresent = filteredSessions.reduce((sum, s) => sum + s.presentCount, 0);
        const totalPossible = filteredSessions.reduce((sum, s) => sum + s.totalStudents, 0);
        const avgAtt = totalPossible > 0 ? (totalPresent / totalPossible) * 100 : 0;

        // Section-wise averages for comparison
        const sectionAvgs = uniqueSections.map(section => {
          const sectionSessions = sessions.filter(s => s.section === section);
          const present = sectionSessions.reduce((sum, s) => sum + s.presentCount, 0);
          const possible = sectionSessions.reduce((sum, s) => sum + s.totalStudents, 0);
          return { section, avg: possible > 0 ? (present / possible) * 100 : 0 };
        });

        const sortedByAvg = [...sectionAvgs].sort((a, b) => a.avg - b.avg);

        setOverallStats({
          totalSessions: filteredSessions.length,
          totalStudents: totalPossible / Math.max(filteredSessions.length, 1),
          avgAttendance: avgAtt,
          lowestAttendanceSection: sortedByAvg[0]?.section || null,
          highestAttendanceSection: sortedByAvg[sortedByAvg.length - 1]?.section || null
        });

        // Calculate weekly attendance data
        if (dateRange.from && dateRange.to) {
          const weeks = eachWeekOfInterval(
            { start: dateRange.from, end: dateRange.to },
            { weekStartsOn: 0 }
          );

          const weeklyAttendance: WeeklyAttendanceData[] = weeks.map(weekStart => {
            const weekEnd = endOfWeek(weekStart, { weekStartsOn: 0 });
            const weekSessions = filteredSessions.filter(s => {
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
          }).filter(w => w.totalSessions > 0);

          setWeeklyData(weeklyAttendance);
        }

        // Calculate section insights with student details
        const sessionsBySection = filteredSessions.reduce((acc, session) => {
          if (!acc[session.section]) acc[session.section] = [];
          acc[session.section].push(session);
          return acc;
        }, {} as Record<string, AttendanceSession[]>);

        const insights: SectionInsights[] = [];

        for (const [section, sectionSessions] of Object.entries(sessionsBySection)) {
          const students = await FirebaseService.getStudents(section);

          const studentAttendanceMap = new Map<string, StudentAttendance>();

          for (const student of students) {
            let presentCount = 0;
            const totalSessions = sectionSessions.length;

            for (const session of sectionSessions) {
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

          const studentsNeedingAttention = Array.from(studentAttendanceMap.values())
            .filter(sa => sa.attendanceRate < 75 && sa.totalSessions > 0)
            .sort((a, b) => a.attendanceRate - b.attendanceRate);

          const totalPresent = sectionSessions.reduce((sum, s) => sum + s.presentCount, 0);
          const totalPossible = sectionSessions.reduce((sum, s) => sum + s.totalStudents, 0);
          const avgAtt = totalPossible > 0 ? (totalPresent / totalPossible) * 100 : 0;

          insights.push({
            section,
            studentsNeedingAttention,
            totalSessions: sectionSessions.length,
            totalStudents: students.length,
            avgAttendance: avgAtt,
            expanded: false,
            showingAll: false
          });
        }

        // Sort by number of students needing attention
        insights.sort((a, b) => b.studentsNeedingAttention.length - a.studentsNeedingAttention.length);

        setSectionInsights(insights);

      } catch (error) {
        console.error('Error loading data:', error);
        addToast({
          title: "Error",
          description: "Failed to load attendance data",
          variant: "destructive"
        });
      } finally {
        setLoadingData(false);
      }
    };

    loadData();
  }, [user?.uid, dateRange, selectedSection, addToast]);

  const toggleSectionExpanded = (section: string) => {
    setSectionInsights(prev =>
      prev.map(insight =>
        insight.section === section
          ? { ...insight, expanded: !insight.expanded }
          : insight
      )
    );
  };

  const toggleShowAllStudents = (section: string) => {
    setSectionInsights(prev =>
      prev.map(insight =>
        insight.section === section
          ? { ...insight, showingAll: !insight.showingAll }
          : insight
      )
    );
  };

  const handleRefresh = async () => {
    if (!user?.uid) return;
    setLoadingData(true);
    try {
      // Force refresh by passing true
      await FirebaseService.getAttendanceSessions({
        teacherId: user.uid,
        dateRange: { start: dateRange.from!, end: dateRange.to! }
      });
      // Trigger reload
      // window.location.reload();
    } catch (error) {
      console.error('Error refreshing:', error);
      addToast({
        title: "Error",
        description: "Failed to refresh data",
        variant: "destructive"
      });
    } finally {
      setLoadingData(false);
    }
  };

  const handleExportToExcel = async () => {
    if (!user?.uid || !dateRange.from || !dateRange.to) return;

    try {
      setExporting(true);

      const sessions = selectedSection === 'all'
        ? allSessions
        : allSessions.filter(s => s.section === selectedSection);

      if (sessions.length === 0) {
        addToast({ title: "No Data", description: "No attendance sessions found", variant: "default" });
        return;
      }

      const excelBlob = await exportToExcel({
        userId: user.uid,
        dateRange,
        selectedSection,
        sessions,
        getStudents: FirebaseService.getStudents
      });

      // Create download link
      const url = window.URL.createObjectURL(excelBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Attendance_Report_${format(dateRange.from, 'MMM_dd')}_to_${format(dateRange.to, 'MMM_dd_yyyy')}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      addToast({
        title: "Export Successful",
        description: `Report exported successfully`,
        variant: "success"
      });

    } catch (error) {
      console.error('Error exporting report:', error);
      addToast({
        title: "Export Failed",
        description: "Failed to export attendance report",
        variant: "destructive"
      });
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
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
        {/* Admin Access Header */}
        {isAdmin && (
          <Card variant="cyber" className="p-4 mb-6 bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Crown className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-purple-900">Head to Admin View</h3>
                  <p className="text-sm text-purple-600">
                    Access comprehensive analytics and system-wide reports
                  </p>
                </div>
              </div>

              <Button
                onClick={() => {
                  localStorage.setItem('defaultToAdminView', 'true');
                  router.push('/reports/admin');
                }}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                <Crown className="w-4 h-4 mr-2" />
                Admin Dashboard
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </Card>
        )}

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-cyber-gray-900 mb-2">
              My Attendance Reports
            </h1>
            <p className="text-cyber-gray-600">
              Analytics and insights for your sessions
            </p>
          </div>

          {lastFetched && (
            <div className="flex items-center gap-3">
              <div className="text-right text-sm">
                <p className="text-cyber-gray-600">Last updated</p>
                <p className="font-medium text-cyber-gray-800">
                  {format(lastFetched, 'MMM dd, HH:mm')}
                </p>
              </div>
              <Button
                onClick={handleRefresh}
                disabled={loadingData}
                variant="outline"
                size="sm"
                className="border-purple-300 text-purple-700 hover:bg-purple-50"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loadingData ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card variant="cyber" className="p-4 overflow-visible z-20">
            <label className="text-sm font-medium text-cyber-gray-700 mb-2 block">Date Range</label>
            <DatePicker
              date={dateRange}
              onDateChange={(range) => {
                if (range && 'from' in range) {
                  setDateRange(range as DateRange);
                }
              }}
              placeholder="Select date range"
              mode="range"
            />
          </Card>

          <Card variant="cyber" className="p-4 overflow-visible z-10">
            <label className="text-sm font-medium text-cyber-gray-700 mb-2 block">Section</label>
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
          </Card>

          <Card variant="cyber" className="p-4">
            <label className="text-sm font-medium text-cyber-gray-700 mb-2 block">Export</label>
            <Button
              onClick={handleExportToExcel}
              disabled={exporting || allSessions.length === 0}
              className="w-full bg-gradient-to-r from-cyber-yellow to-cyber-yellow-dark text-cyber-gray-900"
            >
              {exporting ? (
                <>
                  <div className="w-4 h-4 border-2 border-cyber-gray-900/30 border-t-cyber-gray-900 rounded-full animate-spin mr-2" />
                  Exporting...
                </>
              ) : (
                <>
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Export to Excel
                </>
              )}
            </Button>
          </Card>
        </div>

        {loadingData ? (
          <Card variant="cyber" className="p-12 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-cyber-yellow/30 border-t-cyber-yellow rounded-full animate-spin" />
              <p className="text-cyber-gray-600">Loading attendance data...</p>
            </div>
          </Card>
        ) : !overallStats ? (
          <Card variant="cyber" className="p-12 text-center">
            <Calendar className="w-12 h-12 text-cyber-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-cyber-gray-900 mb-2">
              No Data Found
            </h3>
            <p className="text-cyber-gray-600">
              No attendance sessions found for the selected date range
            </p>
          </Card>
        ) : (
          <>
            {/* Overall Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card variant="cyber" className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Clock className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-cyber-gray-600">Total Sessions</p>
                    <p className="text-2xl font-bold text-cyber-gray-900">{overallStats.totalSessions}</p>
                  </div>
                </div>
              </Card>

              <Card variant="cyber" className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Users className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-cyber-gray-600">Avg Students</p>
                    <p className="text-2xl font-bold text-cyber-gray-900">{Math.round(overallStats.totalStudents)}</p>
                  </div>
                </div>
              </Card>

              <Card variant="cyber" className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${overallStats.avgAttendance >= 75 ? 'bg-green-100' : 'bg-orange-100'
                    }`}>
                    <Percent className={`w-5 h-5 ${overallStats.avgAttendance >= 75 ? 'text-green-600' : 'text-orange-600'
                      }`} />
                  </div>
                  <div>
                    <p className="text-sm text-cyber-gray-600">Avg Attendance</p>
                    <p className={`text-2xl font-bold ${overallStats.avgAttendance >= 75 ? 'text-green-600' : 'text-orange-600'
                      }`}>
                      {overallStats.avgAttendance.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </Card>

              <Card variant="cyber" className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-cyber-gray-600">Sections</p>
                    <p className="text-2xl font-bold text-cyber-gray-900">{sections.length}</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Weekly Attendance Trend */}
            {weeklyData.length > 0 && (
              <Card variant="cyber" className="p-6 mb-6">
                <h3 className="text-lg font-semibold text-cyber-gray-900 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-cyber-yellow" />
                  Weekly Attendance Trend
                </h3>
                <div className="space-y-3">
                  {weeklyData.map((week, index) => {
                    const prevWeek = weeklyData[index - 1];
                    const trend = prevWeek ? week.avgAttendance - prevWeek.avgAttendance : 0;
                    const barWidth = week.avgAttendance;

                    return (
                      <div key={week.weekLabel} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-cyber-gray-700">{week.weekLabel}</span>
                          <div className="flex items-center gap-4">
                            <span className="text-cyber-gray-600">
                              {week.totalSessions} session{week.totalSessions !== 1 ? 's' : ''}
                            </span>
                            <div className="flex items-center gap-1">
                              <span className="font-semibold text-cyber-gray-900">
                                {week.avgAttendance.toFixed(1)}%
                              </span>
                              {trend > 0 ? (
                                <TrendingUp className="w-4 h-4 text-green-600" />
                              ) : trend < 0 ? (
                                <TrendingDown className="w-4 h-4 text-red-600" />
                              ) : index > 0 ? (
                                <Minus className="w-4 h-4 text-cyber-gray-400" />
                              ) : null}
                            </div>
                          </div>
                        </div>
                        <div className="relative h-6 bg-cyber-gray-100 rounded-lg overflow-hidden">
                          <div
                            className={`absolute inset-y-0 left-0 transition-all rounded-lg ${week.avgAttendance >= 75
                                ? 'bg-gradient-to-r from-green-500 to-green-600'
                                : week.avgAttendance >= 50
                                  ? 'bg-gradient-to-r from-yellow-500 to-yellow-600'
                                  : 'bg-gradient-to-r from-red-500 to-red-600'
                              }`}
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {/* Section Insights */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
                <h2 className="text-xl font-bold text-cyber-gray-900">Students Needing Attention</h2>
                <span className="text-sm text-cyber-gray-600">(Below 75% attendance)</span>
              </div>

              {sectionInsights.length === 0 || sectionInsights.every(i => i.studentsNeedingAttention.length === 0) ? (
                <Card variant="cyber" className="p-12 text-center">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <TrendingUp className="w-6 h-6 text-green-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-cyber-gray-900 mb-2">
                    Excellent Performance!
                  </h3>
                  <p className="text-cyber-gray-600">
                    All students are maintaining attendance above 75%
                  </p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {sectionInsights.filter(i => i.studentsNeedingAttention.length > 0).map((insight) => {
                    const displayLimit = insight.showingAll ? insight.studentsNeedingAttention.length : 10;
                    const displayedStudents = insight.studentsNeedingAttention.slice(0, displayLimit);
                    const hasMore = insight.studentsNeedingAttention.length > displayLimit;

                    return (
                      <Card key={insight.section} variant="cyber" className="overflow-hidden">
                        <button
                          onClick={() => toggleSectionExpanded(insight.section)}
                          className="w-full p-4 flex items-center justify-between hover:bg-cyber-gray-50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-orange-100 to-red-100 rounded-lg flex items-center justify-center">
                              <AlertTriangle className="w-5 h-5 text-orange-600" />
                            </div>
                            <div className="text-left">
                              <h3 className="font-semibold text-cyber-gray-900">
                                {insight.section}
                              </h3>
                              <div className="flex items-center gap-4 text-sm text-cyber-gray-600">
                                <span>{insight.studentsNeedingAttention.length} student{insight.studentsNeedingAttention.length !== 1 ? 's' : ''}</span>
                                <span>•</span>
                                <span>{insight.totalSessions} session{insight.totalSessions !== 1 ? 's' : ''}</span>
                                <span>•</span>
                                <span className={insight.avgAttendance >= 75 ? 'text-green-600 font-medium' : 'text-orange-600 font-medium'}>
                                  {insight.avgAttendance.toFixed(1)}% avg
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium px-3 py-1 rounded-full bg-orange-100 text-orange-700">
                              {insight.studentsNeedingAttention.length}
                            </span>
                            {insight.expanded ? (
                              <ChevronUp className="w-5 h-5 text-cyber-gray-600" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-cyber-gray-600" />
                            )}
                          </div>
                        </button>

                        {insight.expanded && (
                          <div className="border-t border-cyber-gray-200">
                            <div className="p-4 bg-cyber-gray-50">
                              <div className="grid gap-3">
                                {displayedStudents.map((studentAttendance) => (
                                  <Link
                                    key={studentAttendance.student.usn}
                                    href={`/students/${studentAttendance.student.id}`}
                                    className="bg-white rounded-lg p-4 shadow-sm border border-cyber-gray-200 hover:border-cyber-yellow hover:shadow-md transition-all"
                                  >
                                    <div className="flex items-center justify-between gap-4 mb-3">
                                      <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <div className="w-10 h-10 bg-gradient-to-br from-cyber-gray-100 to-cyber-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                                          <User className="w-5 h-5 text-cyber-gray-600" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <h4 className="font-semibold text-cyber-gray-900 truncate">
                                            {studentAttendance.student.name}
                                          </h4>
                                          <p className="text-sm text-cyber-gray-600">
                                            {studentAttendance.student.usn}
                                          </p>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-4 flex-shrink-0">
                                        <div className="text-right">
                                          <div className="text-sm text-cyber-gray-600">
                                            {studentAttendance.presentCount}/{studentAttendance.totalSessions}
                                          </div>
                                          <div className="text-xs text-cyber-gray-500">
                                            present
                                          </div>
                                        </div>

                                        <div className={`px-3 py-1 rounded-full text-sm font-semibold ${studentAttendance.attendanceRate < 50
                                            ? 'bg-red-100 text-red-700'
                                            : studentAttendance.attendanceRate < 65
                                              ? 'bg-orange-100 text-orange-700'
                                              : 'bg-yellow-100 text-yellow-700'
                                          }`}>
                                          {studentAttendance.attendanceRate.toFixed(1)}%
                                        </div>
                                      </div>
                                    </div>

                                    <div className="w-full bg-cyber-gray-200 rounded-full h-2 overflow-hidden">
                                      <div
                                        className={`h-full transition-all ${studentAttendance.attendanceRate < 50
                                            ? 'bg-gradient-to-r from-red-500 to-red-600'
                                            : studentAttendance.attendanceRate < 65
                                              ? 'bg-gradient-to-r from-orange-500 to-orange-600'
                                              : 'bg-gradient-to-r from-yellow-500 to-yellow-600'
                                          }`}
                                        style={{ width: `${studentAttendance.attendanceRate}%` }}
                                      />
                                    </div>
                                  </Link>
                                ))}
                              </div>

                              {hasMore && (
                                <div className="mt-4">
                                  <Button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleShowAllStudents(insight.section);
                                    }}
                                    variant="outline"
                                    className="w-full border-cyber-yellow text-cyber-gray-900"
                                  >
                                    {insight.showingAll ? (
                                      <>
                                        <ChevronUp className="w-4 h-4 mr-2" />
                                        Show Less
                                      </>
                                    ) : (
                                      <>
                                        <ChevronDown className="w-4 h-4 mr-2" />
                                        Show All {insight.studentsNeedingAttention.length} Students
                                      </>
                                    )}
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        <div className='mt-8'>
          <FeedbackCard isAdminView={false} />
        </div>
      </div>
    </div>
  );
}
