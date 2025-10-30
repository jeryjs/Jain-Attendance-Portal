'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DatePicker, DateRange } from "@/components/ui/date-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { FirebaseService } from '@/lib/firebase-service';
import { exportToExcel } from '@/lib/utils';
import { format } from 'date-fns';
import {
  BarChart3,
  Calendar,
  FileSpreadsheet,
  Crown,
  ArrowRight,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  User,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import FeedbackCard from '@/components/FeedbackCard';
import { AttendanceSession, Student } from '@/lib/types';

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
  expanded: boolean;
}

interface WeeklyData {
  week: string;
  sessions: number;
  avgAttendance: number;
}

export default function ReportsPage() {
  const { user, loading, isTeacher, isAdmin } = useAuth();
  const { addToast } = useToast();
  const router = useRouter();
  const [selectedSection, setSelectedSection] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
  });
  const [loadingReports, setLoadingReports] = useState(false);
  const [showAllSections, setShowAllSections] = useState(false);
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([]);
  const [exporting, setExporting] = useState(false);
  const [sections, setSections] = useState<string[]>([]);
  const [sectionInsights, setSectionInsights] = useState<SectionInsights[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(false);

  const defaultToAdminView = (typeof window !== 'undefined') && localStorage.getItem('defaultToAdminView') === 'true';

  useEffect(() => {
    if (defaultToAdminView) {
      router.push('/reports/admin');
    }
  }, [defaultToAdminView, router]);

  // Load available sections on mount
  useEffect(() => {
    const loadSections = async () => {
      if (!user?.uid) return;
      // user.uid = "PMY061vYmogZ2bKKB72TQUwQMa33"  // testing with vishal sir's acc

      try {
        setLoadingReports(true);
        // Get unique sections from user's sessions
        const sessions = await FirebaseService.getAttendanceSessions({
          teacherId: user.uid
        });

        const uniqueSections = Array.from(new Set(sessions.map(s => s.section)));
        setSections(uniqueSections);
      } catch (error) {
        console.error('Error loading sections:', error);
        addToast({
          title: "Error",
          description: "Failed to load sections",
          variant: "destructive"
        });
      } finally {
        setLoadingReports(false);
      }
    };

    loadSections();
  }, [user?.uid, addToast]);

  // Load student insights when filters change
  useEffect(() => {
    const loadInsights = async () => {
      if (!user?.uid || !dateRange.from || !dateRange.to) return;

      try {
        setLoadingInsights(true);

        // Get sessions for date range and teacher
        const sessions = await FirebaseService.getAttendanceSessions({
          teacherId: user.uid,
          dateRange: { start: dateRange.from, end: dateRange.to }
        });

        if (sessions.length === 0) {
          setSectionInsights([]);
          setWeeklyData([]);
          return;
        }

        // Group sessions by section
        const sessionsBySection = sessions.reduce((acc, session) => {
          if (!acc[session.section]) acc[session.section] = [];
          acc[session.section].push(session);
          return acc;
        }, {} as Record<string, AttendanceSession[]>);

        // Calculate insights for each section
        const insights: SectionInsights[] = [];

        for (const [section, sectionSessions] of Object.entries(sessionsBySection)) {
          // Skip if filtering by specific section and this isn't it
          if (selectedSection !== 'all' && section !== selectedSection) continue;

          // Get all students in this section
          const students = await FirebaseService.getStudents(section);
          
          // Calculate attendance for each student
          const studentAttendanceMap = new Map<string, StudentAttendance>();

          for (const student of students) {
            let presentCount = 0;
            let totalSessions = 0;

            for (const session of sectionSessions) {
              totalSessions++;
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

          // Filter students needing attention (< 75% attendance)
          const studentsNeedingAttention = Array.from(studentAttendanceMap.values())
            .filter(sa => sa.attendanceRate < 75 && sa.totalSessions > 0)
            .sort((a, b) => a.attendanceRate - b.attendanceRate);

          if (studentsNeedingAttention.length > 0) {
            insights.push({
              section,
              studentsNeedingAttention,
              totalSessions: sectionSessions.length,
              expanded: false
            });
          }
        }

        setSectionInsights(insights);

        // Calculate weekly data for chart
        const weeklyMap = new Map<string, { sessions: number; totalAttendance: number }>();
        
        sessions.forEach(session => {
          const date = new Date(session.date);
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
          const weekKey = format(weekStart, 'MMM dd');
          
          if (!weeklyMap.has(weekKey)) {
            weeklyMap.set(weekKey, { sessions: 0, totalAttendance: 0 });
          }
          
          const weekData = weeklyMap.get(weekKey)!;
          weekData.sessions++;
          const attendance = session.totalStudents > 0 
            ? (session.presentCount / session.totalStudents) * 100 
            : 0;
          weekData.totalAttendance += attendance;
        });

        const weekly: WeeklyData[] = Array.from(weeklyMap.entries()).map(([week, data]) => ({
          week,
          sessions: data.sessions,
          avgAttendance: data.totalAttendance / data.sessions
        }));

        setWeeklyData(weekly);

      } catch (error) {
        console.error('Error loading insights:', error);
        addToast({
          title: "Error",
          description: "Failed to load student insights",
          variant: "destructive"
        });
      } finally {
        setLoadingInsights(false);
      }
    };

    loadInsights();
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

  // Generate Excel export
  const handleExportToExcel = async () => {
    if (!user?.uid || !dateRange.from || !dateRange.to) return;

    try {
      setExporting(true);

      const sessions = await FirebaseService.getAttendanceSessions({
        teacherId: user.uid,
        section: selectedSection === 'all' ? undefined : selectedSection,
        dateRange: { start: dateRange.from, end: dateRange.to }
      });

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
      link.download = `Attendance_Report_${format(dateRange.from, 'MMM_yyyy')}.xlsx`;
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
                Admin View
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </Card>
        )}

        {/* Header */}
        <div className="text-center mb-6 md:mb-12">
          <div className="flex items-center justify-center mb-3 md:mb-6">
            <div className="w-12 h-12 md:w-20 md:h-20 bg-gradient-to-br from-cyber-yellow to-cyber-yellow-dark rounded-2xl flex items-center justify-center shadow-2xl shadow-cyber-yellow/25">
              <BarChart3 className="w-6 h-6 md:w-10 md:h-10 text-cyber-gray-900" />
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
          <Card variant="cyber" className="p-3 md:p-6 relative overflow-visible z-10">
            <div className="space-y-2">
              <label className="text-xs md:text-sm font-medium text-cyber-gray-700">Select Date Range</label>
              <div className="relative z-50">
                <DatePicker
                  date={dateRange}
                  onDateChange={(range) => {
                    if (range && 'from' in range && range.from && range.to) {
                      setDateRange({ from: range.from, to: range.to });
                    }
                  }}
                  placeholder="Select date range for report"
                  disabledDates={d => false}
                  mode="range"
                />
              </div>
            </div>
          </Card>

          <Card variant="cyber" className="p-3 md:p-6 relative overflow-visible">
            <div className="space-y-2">
              <label className="text-xs md:text-sm font-medium text-cyber-gray-700">Filter by Section</label>
              <div className="relative z-40">
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
            </div>
          </Card>

          <Card variant="cyber" className="p-3 md:p-6">
            <div className="space-y-2">
              <label className="text-xs md:text-sm font-medium text-cyber-gray-700">Export Options</label>
              <Button
                onClick={handleExportToExcel}
                disabled={exporting || sections.length === 0}
                className="w-full text-sm md:text-base bg-gradient-to-r from-cyber-yellow to-cyber-yellow-dark text-cyber-gray-900 hover:shadow-lg"
              >
                {exporting ? (
                  <>
                    <div className="w-3 h-3 md:w-4 md:h-4 border-2 border-cyber-gray-900/30 border-t-cyber-gray-900 rounded-full animate-spin mr-1 md:mr-2" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <FileSpreadsheet className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                    Export Excel
                  </>
                )}
              </Button>
            </div>
          </Card>
        </div>

        {/* Weekly Analysis Chart */}
        {weeklyData.length > 0 && (
          <Card variant="cyber" className="p-6 mb-6">
            <h3 className="text-lg font-semibold text-cyber-gray-900 mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-cyber-yellow" />
              Weekly Session Analysis
            </h3>
            <div className="space-y-3">
              {weeklyData.map((week, index) => {
                const maxSessions = Math.max(...weeklyData.map(w => w.sessions));
                const barWidth = (week.sessions / maxSessions) * 100;
                const prevWeek = weeklyData[index - 1];
                const trend = prevWeek 
                  ? week.avgAttendance - prevWeek.avgAttendance 
                  : 0;

                return (
                  <div key={week.week} className="space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="min-w-0 flex-shrink-0 w-20">
                        <span className="text-sm font-medium text-cyber-gray-700">
                          {week.week}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="relative h-8 bg-cyber-gray-100 rounded-lg overflow-hidden">
                          <div
                            className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyber-yellow to-cyber-yellow-dark transition-all"
                            style={{ width: `${barWidth}%` }}
                          />
                          <div className="absolute inset-0 flex items-center justify-between px-3">
                            <span className="text-sm font-semibold text-cyber-gray-900">
                              {week.sessions} session{week.sessions !== 1 ? 's' : ''}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-cyber-gray-700">
                                {week.avgAttendance.toFixed(1)}% avg
                              </span>
                              {trend > 0 ? (
                                <TrendingUp className="w-4 h-4 text-green-600" />
                              ) : trend < 0 ? (
                                <TrendingDown className="w-4 h-4 text-red-600" />
                              ) : (
                                <Minus className="w-4 h-4 text-cyber-gray-400" />
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Students Needing Attention */}
        {loadingInsights ? (
          <Card variant="cyber" className="p-12 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-cyber-yellow/30 border-t-cyber-yellow rounded-full animate-spin" />
              <p className="text-cyber-gray-600">Loading student insights...</p>
            </div>
          </Card>
        ) : sectionInsights.length === 0 ? (
          <Card variant="cyber" className="p-12 text-center">
            <AlertTriangle className="w-12 h-12 text-cyber-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-cyber-gray-900 mb-2">
              No Students Need Attention
            </h3>
            <p className="text-cyber-gray-600">
              All students are maintaining attendance above 75%
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
                <h2 className="text-xl font-bold text-cyber-gray-900">Students Needing Attention</h2>
                <span className="text-sm text-cyber-gray-600">
                  (Below 75% attendance)
                </span>
              </div>
            </div>

            {/* Grid Layout with Preview */}
            <div className="relative">
              <div className={`grid grid-cols-1 lg:grid-cols-2 gap-4 transition-all ${
                !showAllSections ? 'max-h-[600px] overflow-hidden' : ''
              }`}>
                {sectionInsights.map((insight, idx) => (
                  <Card 
                    key={insight.section} 
                    variant="cyber" 
                    className={`overflow-hidden transition-opacity ${
                      !showAllSections && idx >= 3 ? 'opacity-50' : ''
                    }`}
                  >
                    {/* Section Header */}
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
                          <p className="text-sm text-cyber-gray-600">
                            {insight.studentsNeedingAttention.length} student{insight.studentsNeedingAttention.length !== 1 ? 's' : ''} • {insight.totalSessions} session{insight.totalSessions !== 1 ? 's' : ''}
                          </p>
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

                    {/* Student List */}
                    {insight.expanded && (
                      <div className="border-t border-cyber-gray-200">
                        <div className="p-4 bg-cyber-gray-50 max-h-[400px] overflow-y-auto">
                          <div className="grid gap-3">
                            {insight.studentsNeedingAttention.slice(0, 20).map((studentAttendance) => (
                              <Link
                                key={studentAttendance.student.usn}
                                href={`/students/${studentAttendance.student.usn}`}
                                className="bg-white rounded-lg p-4 shadow-sm border border-cyber-gray-200 hover:border-cyber-yellow hover:shadow-md transition-all cursor-pointer"
                              >
                                <div className="flex items-center justify-between gap-4">
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
                                        classes attended
                                      </div>
                                    </div>
                                    
                                    <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
                                      studentAttendance.attendanceRate < 50
                                        ? 'bg-red-100 text-red-700'
                                        : studentAttendance.attendanceRate < 65
                                        ? 'bg-orange-100 text-orange-700'
                                        : 'bg-yellow-100 text-yellow-700'
                                    }`}>
                                      {studentAttendance.attendanceRate.toFixed(1)}%
                                    </div>
                                  </div>
                                </div>

                                {/* Progress bar */}
                                <div className="mt-3">
                                  <div className="w-full bg-cyber-gray-200 rounded-full h-2 overflow-hidden">
                                    <div
                                      className={`h-full transition-all ${
                                        studentAttendance.attendanceRate < 50
                                          ? 'bg-gradient-to-r from-red-500 to-red-600'
                                          : studentAttendance.attendanceRate < 65
                                          ? 'bg-gradient-to-r from-orange-500 to-orange-600'
                                          : 'bg-gradient-to-r from-yellow-500 to-yellow-600'
                                      }`}
                                      style={{ width: `${studentAttendance.attendanceRate}%` }}
                                    />
                                  </div>
                                </div>
                              </Link>
                            ))}
                          </div>

                          {insight.studentsNeedingAttention.length > 20 && (
                            <div className="mt-4 p-3 bg-cyber-yellow/10 rounded-lg text-center">
                              <p className="text-sm text-cyber-gray-700">
                                Showing top 20 students. {insight.studentsNeedingAttention.length - 20} more students need attention.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </Card>
                ))}
              </div>

              {/* Fade Overlay and Expand Button */}
              {!showAllSections && sectionInsights.length > 3 && (
                <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white via-white/80 to-transparent flex items-end justify-center pb-4">
                  <Button
                    onClick={() => setShowAllSections(true)}
                    className="bg-gradient-to-r from-cyber-yellow to-cyber-yellow-dark text-cyber-gray-900 hover:shadow-lg"
                  >
                    <ChevronDown className="w-4 h-4 mr-2" />
                    Show All {sectionInsights.length} Sections
                  </Button>
                </div>
              )}
            </div>

            {showAllSections && sectionInsights.length > 3 && (
              <div className="flex justify-center mt-4">
                <Button
                  onClick={() => setShowAllSections(false)}
                  variant="outline"
                  className="border-cyber-yellow text-cyber-gray-900"
                >
                  <ChevronUp className="w-4 h-4 mr-2" />
                  Show Less
                </Button>
              </div>
            )}
          </div>
        )}

        <Card variant="glass" className="mt-8 p-6 text-center flex flex-col items-center justify-center gap-3 bg-gradient-to-br border-2 border-dashed border-cyber-yellow/40">
          <div className="flex items-center justify-center mb-2">
            <Calendar className="w-8 h-8 text-cyber-yellow-dark animate-pulse" />
          </div>
          <h2 className="text-lg md:text-2xl font-semibold text-cyber-gray-900 mb-1">
            Work In Progress
          </h2>
          <p className="text-sm md:text-base text-cyber-gray-700 mb-2">
            More analytics and visualizations coming soon.<br />
            Stay tuned for updates!
          </p>
          <span className="inline-block px-3 py-1 rounded-full bg-cyber-yellow/20 text-cyber-yellow-dark text-xs font-medium">
            Last updated: Oct 29, 2025
          </span>
        </Card>

        <div className='mt-6'>
          <FeedbackCard isAdminView={isAdmin} />
        </div>
      </div>
    </div>
  );
}