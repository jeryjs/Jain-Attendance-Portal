'use client';

import FeedbackCard from '@/components/FeedbackCard';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DatePicker, DateRange } from "@/components/ui/date-picker";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { FirebaseService } from '@/lib/firebase-service';
import { AttendanceSession } from '@/lib/types';
import { exportToExcel, getProgramName } from '@/lib/utils';
import { format } from 'date-fns';
import {
  ArrowRight,
  BarChart3,
  Calendar,
  Clock,
  Crown,
  FileSpreadsheet,
  Loader2,
  Percent,
  User,
  Users
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

// Modular Components
import AttendanceHeatmap from './components/AttendanceHeatmap';
import SectionComparisonChart from './components/SectionComparisonChart';
import SessionTypeChart from './components/SessionTypeChart';
import ShimmerCard, { ShimmerStat } from './components/ShimmerCard';
import TopBottomPerformers from './components/TopBottomPerformers';
import WeeklyTrendChart from './components/WeeklyTrendChart';

// Analytics Utilities
import {
  calculateOverallStats,
  calculateSectionData,
  calculateWeeklyData,
  getTopBottomPerformers,
  type OverallStats,
  type SectionData,
  type StudentAttendance
} from './utils/analyticsCalculations';

export default function ReportsPage() {
  const { user, loading, isTeacher, isAdmin } = useAuth();
  const { addToast } = useToast();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date()
  });
  const [loadingData, setLoadingData] = useState(false);
  const [loadingCharts, setLoadingCharts] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [sections, setSections] = useState<string[]>([]);
  const [sectionDataCache, setSectionDataCache] = useState<Map<string, SectionData>>(new Map());
  const [overallStats, setOverallStats] = useState<OverallStats | null>(null);
  const [allSessions, setAllSessions] = useState<AttendanceSession[]>([]);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  // Student list with infinite scroll
  const [displayedStudents, setDisplayedStudents] = useState<StudentAttendance[]>([]);
  const [studentPage, setStudentPage] = useState(1);
  const [hasMoreStudents, setHasMoreStudents] = useState(false);
  const observerTarget = useRef<HTMLDivElement>(null);

  const STUDENTS_PER_PAGE = 20;

  const defaultToAdminView = (typeof window !== 'undefined') && localStorage.getItem('defaultToAdminView') === 'true';

  useEffect(() => {
    if (defaultToAdminView && isAdmin) {
      router.push('/reports/admin');
    }
  }, [defaultToAdminView, isAdmin, router]);

  // Load sessions data
  useEffect(() => {
    const loadSessions = async () => {
      if (!user?.uid || !dateRange.from || !dateRange.to) return;
      // user.uid = "PMY061vYmogZ2bKKB72TQUwQMa33"  // testing with vishal sir's acc
      try {
        setLoadingData(true);

        const sessions = await FirebaseService.getAttendanceSessions({
          teacherId: user.uid,
          dateRange: { start: dateRange.from, end: dateRange.to }
        }, 300);

        setAllSessions(sessions);
        setLastFetched(new Date());

        if (sessions.length === 0) {
          setSections([]);
          setSectionDataCache(new Map());
          setOverallStats(null);
          return;
        }

        const uniqueSections = Array.from(new Set(sessions.map(s => s.section))).sort();
        setSections(uniqueSections);

        // Calculate overall stats
        const overallData = await calculateSectionData(sessions, FirebaseService.getStudents);
        const stats = calculateOverallStats(sessions, overallData);
        setOverallStats(stats);

        // Cache section data
        const cache = new Map<string, SectionData>();
        for (const section of overallData) {
          cache.set(section.section, section);
        }
        setSectionDataCache(cache);

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

    loadSessions();
  }, [user?.uid, dateRange, addToast]);

  // Load students for active tab with pagination
  useEffect(() => {
    const loadStudents = async () => {
      if (activeTab === 'all') {
        // Show all students from all sections
        const allStudents: StudentAttendance[] = [];
        for (const sectionData of Array.from(sectionDataCache.values())) {
          const sectionSessions = allSessions.filter(s => s.section === sectionData.section);
          const students = await FirebaseService.getStudents(sectionData.section);

          for (const student of students) {
            let presentCount = 0;
            const totalSessions = sectionSessions.length;

            for (const session of sectionSessions) {
              if (session.presentStudents?.includes(student.usn)) {
                presentCount++;
              }
            }

            const attendanceRate = totalSessions > 0 ? (presentCount / totalSessions) * 100 : 0;
            allStudents.push({
              student: { ...student, section: sectionData.section },
              totalSessions,
              presentCount,
              absentCount: totalSessions - presentCount,
              attendanceRate
            });
          }
        }

        // Sort by attendance rate ascending
        allStudents.sort((a, b) => a.attendanceRate - b.attendanceRate);
        setDisplayedStudents(allStudents.slice(0, STUDENTS_PER_PAGE));
        setHasMoreStudents(allStudents.length > STUDENTS_PER_PAGE);
        setStudentPage(1);

        // Store all for infinite scroll
        if (typeof window !== 'undefined') {
          (window as any).__allStudents = allStudents;
        }
      } else {
        // Show students from selected section
        const sectionData = sectionDataCache.get(activeTab);
        if (sectionData) {
          const students = [...sectionData.studentsNeedingAttention];

          // Also load students with good attendance
          const sectionSessions = allSessions.filter(s => s.section === activeTab);
          const allSectionStudents = await FirebaseService.getStudents(activeTab);

          for (const student of allSectionStudents) {
            if (!students.find(s => s.student.usn === student.usn)) {
              let presentCount = 0;
              const totalSessions = sectionSessions.length;

              for (const session of sectionSessions) {
                if (session.presentStudents?.includes(student.usn)) {
                  presentCount++;
                }
              }

              const attendanceRate = totalSessions > 0 ? (presentCount / totalSessions) * 100 : 0;
              students.push({
                student,
                totalSessions,
                presentCount,
                absentCount: totalSessions - presentCount,
                attendanceRate
              });
            }
          }

          students.sort((a, b) => a.attendanceRate - b.attendanceRate);
          setDisplayedStudents(students.slice(0, STUDENTS_PER_PAGE));
          setHasMoreStudents(students.length > STUDENTS_PER_PAGE);
          setStudentPage(1);

          if (typeof window !== 'undefined') {
            (window as any).__allStudents = students;
          }
        }
      }
    };

    if (allSessions.length > 0 && sectionDataCache.size > 0) {
      loadStudents();
    }
  }, [activeTab, allSessions, sectionDataCache]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreStudents) {
          loadMoreStudents();
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMoreStudents, studentPage]);

  const loadMoreStudents = useCallback(() => {
    if (typeof window !== 'undefined') {
      const allStudents = (window as any).__allStudents || [];
      const nextPage = studentPage + 1;
      const startIdx = 0;
      const endIdx = nextPage * STUDENTS_PER_PAGE;

      setDisplayedStudents(allStudents.slice(startIdx, endIdx));
      setHasMoreStudents(endIdx < allStudents.length);
      setStudentPage(nextPage);
    }
  }, [studentPage]);

  const handleRefresh = async () => {
    if (!user?.uid) return;
    setLoadingData(true);
    try {
      await FirebaseService.getAttendanceSessions({
        teacherId: user.uid,
        dateRange: { start: dateRange.from!, end: dateRange.to! }
      }, 300);
      addToast({ title: "Refreshed", description: "You are viewing the latest data!", variant: "default" })
    } catch (error) {
      console.error('Error refreshing:', error);
      addToast({ title: "Error", description: "Failed to refresh data", variant: "destructive" });
    } finally {
      setLoadingData(false);
    }
  };

  const handleExportToExcel = async () => {
    if (!user?.uid || !dateRange.from || !dateRange.to) return;

    try {
      setExporting(true);

      const sessions = activeTab === 'all'
        ? allSessions
        : allSessions.filter(s => s.section === activeTab);

      if (sessions.length === 0) {
        addToast({ title: "No Data", description: "No attendance sessions found", variant: "default" });
        return;
      }

      const excelBlob = await exportToExcel({
        userId: user.uid,
        dateRange,
        selectedSection: activeTab,
        sessions,
        getStudents: FirebaseService.getStudents
      });

      const url = window.URL.createObjectURL(excelBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Attendance_Report_${activeTab}_${format(dateRange.from, 'MMM_dd')}_to_${format(dateRange.to, 'MMM_dd_yyyy')}.xlsx`;
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

  // Derived data for charts
  const filteredSessions = activeTab === 'all'
    ? allSessions
    : allSessions.filter(s => s.section === activeTab);

  const weeklyData = dateRange.from && dateRange.to && filteredSessions.length > 0
    ? calculateWeeklyData(filteredSessions, { from: dateRange.from, to: dateRange.to })
    : [];

  const sectionComparisonData = Array.from(sectionDataCache.values()).map(s => ({
    section: s.section,
    avgAttendance: s.avgAttendance,
    totalSessions: s.totalSessions,
    totalStudents: s.totalStudents
  }));

  const { topPerformers, bottomPerformers } = sectionDataCache.size > 0
    ? getTopBottomPerformers(Array.from(sectionDataCache.values()), 5, 5)
    : { topPerformers: [], bottomPerformers: [] };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white to-cyber-gray-50">
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
    <div className="min-h-screen bg-gradient-to-br from-white via-cyber-gray-50 to-white p-2 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Admin Access Banner */}
        {isAdmin && (
          <Card variant="cyber" className="p-4 mb-6 bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Crown className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-purple-900">Administrator Access</h3>
                  <p className="text-sm text-purple-600">
                    View system-wide analytics and comprehensive reports
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
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-cyber-gray-900 to-cyber-gray-700 bg-clip-text text-transparent mb-2">
              Attendance Analytics
            </h1>
            <p className="text-cyber-gray-600">
              Analytics and insights for your teaching sessions
            </p>
          </div>

          {/* {lastFetched && (
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
                className="border-cyber-yellow text-cyber-gray-900 hover:bg-cyber-yellow/10"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loadingData ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          )} */}
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
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

          <Card variant="cyber" className="p-4">
            <label className="text-sm font-medium text-cyber-gray-700 mb-2 block">Export</label>
            <Button
              onClick={handleExportToExcel}
              disabled={exporting || allSessions.length === 0}
              className="w-full bg-gradient-to-r from-cyber-yellow to-cyber-yellow-dark text-cyber-gray-900 hover:shadow-lg"
            >
              {exporting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
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
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              {[...Array(4)].map((_, i) => <ShimmerStat key={i} />)}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {[...Array(4)].map((_, i) => <ShimmerCard key={i} />)}
            </div>
          </>
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
              <Card variant="cyber" className="p-4 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
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

              <Card variant="cyber" className="p-4 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
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

              <Card variant="cyber" className="p-4 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
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

              <Card variant="cyber" className="p-4 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
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

            {/* Section Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
              <TabsList className="sticky top-0 z-10 h-max w-full justify-start overflow-x-auto bg-gradient-to-r from-cyber-yellow/40 via-white to-cyber-yellow/40 border-2 border-cyber-yellow-dark shadow-lg p-2 rounded-xl mb-8 flex gap-2">
                <TabsTrigger
                  value="all"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyber-yellow data-[state=active]:to-cyber-yellow-dark data-[state=active]:text-cyber-gray-900 data-[state=active]:shadow-lg data-[state=active]:scale-105 font-bold px-6 py-2 rounded-lg transition-all duration-300 border-2 border-transparent data-[state=active]:border-cyber-yellow-dark"
                >
                  <span className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    <span className="block sm:hidden">All</span>
                    <span className="hidden sm:block">All Sections</span>
                  </span>
                </TabsTrigger>
                {sections.map(section => (
                  <TabsTrigger
                    key={section}
                    value={section}
                    className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyber-yellow data-[state=active]:to-cyber-yellow-dark data-[state=active]:text-cyber-gray-900 data-[state=active]:shadow-lg data-[state=active]:scale-105 font-bold px-6 py-2 rounded-lg transition-all duration-300 border-2 border-transparent data-[state=active]:border-cyber-yellow-dark"
                  >
                    <span className="flex items-center gap-2">
                      <BarChart3 className="w-5 h-5" />
                      <span className="block sm:hidden">{section}</span>
                      <span className="hidden sm:block">{getProgramName(section)}</span>
                    </span>
                  </TabsTrigger>
                ))}
              </TabsList>

              {/* Tab Content - All Sections */}
              <TabsContent value="all" className="mt-0 animate-in fade-in-50 duration-300">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  {loadingCharts ? (
                    <>
                      <ShimmerCard />
                      <ShimmerCard />
                    </>
                  ) : (
                    <>
                      <WeeklyTrendChart data={weeklyData} />
                      <SessionTypeChart sessions={filteredSessions} />
                    </>
                  )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  {loadingCharts ? (
                    <>
                      <ShimmerCard />
                      <ShimmerCard />
                    </>
                  ) : (
                    <>
                      <SectionComparisonChart data={sectionComparisonData} />
                      {dateRange.from && dateRange.to && (
                        <AttendanceHeatmap
                          sessions={filteredSessions}
                          dateRange={{ from: dateRange.from, to: dateRange.to }}
                        />
                      )}
                    </>
                  )}
                </div>

                {(topPerformers.length > 0 || bottomPerformers.length > 0) && (
                  <div className="mb-6">
                    <TopBottomPerformers
                      topPerformers={topPerformers}
                      bottomPerformers={bottomPerformers}
                    />
                  </div>
                )}
              </TabsContent>

              {/* Tab Content - Individual Sections */}
              {sections.map(section => (
                <TabsContent key={section} value={section} className="mt-0 animate-in fade-in-50 duration-300">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    <WeeklyTrendChart data={weeklyData} />
                    <SessionTypeChart sessions={filteredSessions} />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    {dateRange.from && dateRange.to && (
                      <AttendanceHeatmap
                        sessions={filteredSessions}
                        dateRange={{ from: dateRange.from, to: dateRange.to }}
                      />
                    )}
                  </div>
                </TabsContent>
              ))}

              {/* Students List with Infinite Scroll */}
              <TabsContent key={activeTab} value={activeTab} className="mt-0 animate-in fade-in-50 duration-300">
                <Card variant="cyber" className="p-6 mb-6">
                  <h2 className="text-xl font-bold text-cyber-gray-900 mb-4">
                    All Students - Sorted by Attendance
                  </h2>

                  <div className="space-y-3 max-h-[800px] overflow-y-auto">
                    {displayedStudents.map((studentAttendance) => (
                      <Link
                        key={studentAttendance.student.usn}
                        href={`/students/${studentAttendance.student.id}`}
                        className="block bg-white rounded-lg p-4 shadow-sm border border-cyber-gray-200 hover:border-cyber-yellow hover:shadow-md transition-all"
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
                                {studentAttendance.student.usn} • {studentAttendance.student.section}
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

                            <div className={`px-3 py-1 rounded-full text-sm font-semibold ${studentAttendance.attendanceRate >= 90
                              ? 'bg-green-100 text-green-700'
                              : studentAttendance.attendanceRate >= 75
                                ? 'bg-blue-100 text-blue-700'
                                : studentAttendance.attendanceRate >= 50
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : studentAttendance.attendanceRate >= 30
                                    ? 'bg-orange-100 text-orange-700'
                                    : 'bg-red-100 text-red-700'
                              }`}>
                              {studentAttendance.attendanceRate.toFixed(1)}%
                            </div>
                          </div>
                        </div>

                        <div className="w-full bg-cyber-gray-200 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full transition-all ${studentAttendance.attendanceRate >= 90
                              ? 'bg-gradient-to-r from-green-500 to-green-600'
                              : studentAttendance.attendanceRate >= 75
                                ? 'bg-gradient-to-r from-blue-500 to-blue-600'
                                : studentAttendance.attendanceRate >= 50
                                  ? 'bg-gradient-to-r from-yellow-500 to-yellow-600'
                                  : studentAttendance.attendanceRate >= 30
                                    ? 'bg-gradient-to-r from-orange-500 to-orange-600'
                                    : 'bg-gradient-to-r from-red-500 to-red-600'
                              }`}
                            style={{ width: `${studentAttendance.attendanceRate}%` }}
                          />
                        </div>
                      </Link>
                    ))}

                    {/* Infinite scroll trigger */}
                    {hasMoreStudents && (
                      <div ref={observerTarget} className="flex justify-center p-4">
                        <Loader2 className="w-6 h-6 animate-spin text-cyber-yellow" />
                      </div>
                    )}

                    {!hasMoreStudents && displayedStudents.length > 0 && (
                      <div className="text-center p-4 text-cyber-gray-600 text-sm">
                        Showing all {displayedStudents.length} students
                      </div>
                    )}
                  </div>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}

        <div className='mt-8'>
          <FeedbackCard isAdminView={false} />
        </div>
      </div>
    </div>
  );
}
