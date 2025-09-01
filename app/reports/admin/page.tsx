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
  Activity,
  ArrowLeft,
  Clock,
  FileSpreadsheet,
  GraduationCap,
  Percent,
  RefreshCw,
  Users,
  type LucideIcon
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, memo } from 'react';
import PieChart from './PieChart';
import SectionChart from './SectionChart';
import { AdminStats } from './types';
import {
  calculateOverallStats,
  calculateSectionStats,
  calculateSessionPieData,
  calculateSessionStats,
  filterSectionStats,
  getRecentSessions,
  parseSessionTime
} from './utils';

const StatsCard = memo(({ title, value, icon: Icon, color, subtitle }: {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color: string;
  subtitle?: string;
}) => (
  <Card variant="cyber" className="p-6">
    <div className="flex items-center gap-4">
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-cyber-gray-600">{title}</p>
        <p className="text-2xl font-bold text-cyber-gray-900">{value}</p>
        {subtitle && <p className="text-xs text-cyber-gray-500">{subtitle}</p>}
      </div>
    </div>
  </Card>
));

export default function AdminReportsPage() {
  const { user, loading, isAdmin } = useAuth();
  const { addToast } = useToast();
  const router = useRouter();
  const [selectedSection, setSelectedSection] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
  });
  const [loadingData, setLoadingData] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [refetching, setRefetching] = useState(false);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const [sections, setSections] = useState<string[]>([]);
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
  const [selectedSessions, setSelectedSessions] = useState<string[]>([]);

  // Handle session selection for filtering
  const handleSessionSelect = (session: string) => {
    setSelectedSessions(prev =>
      prev.includes(session)
        ? prev.filter(s => s !== session)
        : [...prev, session]
    );
  };

  // alert that desktop view is recommended
  useEffect(() => {
    if (window != undefined && window.innerWidth < 768) {
      alert("For the best experience, please use the desktop view to access the admin dashboard. This page is not supported on mobile devices.");
    }
  }, []);

  // Load admin data
  useEffect(() => {
    const loadAdminData = async () => {
      if (!user?.uid || !isAdmin) return;

      try {
        setLoadingData(true);

        // Get all sessions and students
        const [sessions, students] = await Promise.all([
          FirebaseService.getAdminAttendanceSessions(false, {
            dateRange: dateRange.from && dateRange.to ? dateRange : undefined
          }).then(res => res.toSorted((a, b) => parseSessionTime(a.session).start - parseSessionTime(b.session).start)),
          FirebaseService.getAdminStudents(false)
        ]);

        // Calculate comprehensive stats
        const uniqueSections = Array.from(new Set(sessions.map(s => s.section))).sort();
        setSections(uniqueSections);

        const sessionNames = Array.from(new Set(sessions.map(s => s.session))).sort();
        const sessionStats = calculateSessionStats(sessions);
        const sectionStats = calculateSectionStats(sessions, students, sessionNames);

        // Filter data based on selected sessions
        const filteredSessions = selectedSessions.length > 0
          ? sessions.filter(s => selectedSessions.includes(s.session))
          : sessions;

        const filteredSectionStats = filterSectionStats(sectionStats, selectedSessions);
        const sessionPieData = calculateSessionPieData(sessions, sessionStats);
        const overallStats = calculateOverallStats(filteredSessions, students, filteredSectionStats);
        const recentSessions = getRecentSessions(filteredSessions);

        setAdminStats({
          sectionStats: filteredSectionStats,
          sessionStats,
          sessionPieData,
          ...overallStats,
          recentSessions,
          uniqueSections: uniqueSections.length
        });

        setLastFetched(JSON.parse(localStorage.getItem('adminAttendanceSessionsCache') || '').timestamp || new Date());

      } catch (error) {
        console.error('Error loading admin data:', error);
        addToast({
          title: "Error",
          description: "Failed to load admin data",
          variant: "destructive"
        });
      } finally {
        setLoadingData(false);
      }
    };

    loadAdminData();
  }, [user?.uid, isAdmin, selectedSessions, dateRange]);

  // Force refetch data
  const handleRefetch = async () => {
    if (!isAdmin || !user?.uid) return;

    try {
      setRefetching(true);

      // Force refetch both students and sessions
      await Promise.all([
        FirebaseService.getAdminStudents(true),
        FirebaseService.getAdminAttendanceSessions(true)
      ]);

      // Reload all data
      window.location.reload();

    } catch (error) {
      console.error('Error refetching data:', error);
      addToast({
        title: "Refetch Failed",
        description: "Failed to refresh data from database",
        variant: "destructive"
      });
    } finally {
      setRefetching(false);
    }
  };

  // Export admin data
  const handleExportToExcel = async () => {
    if (!user?.uid || !dateRange.from || !dateRange.to) return;
    setExporting(true);
    try {
      const sessions = await FirebaseService.getAdminAttendanceSessions(false, {
        section: selectedSection === 'all' ? undefined : selectedSection,
        dateRange
      });
      if (!sessions.length) {
        addToast({ title: "No Data", description: "No attendance sessions found", variant: "default" });
        return;
      }
      const excelBlob = await exportToExcel({
        userId: user.uid,
        dateRange,
        selectedSection,
        sessions,
        getStudents: (section: string) => FirebaseService.getAdminStudents(false, section)
      });
      const url = URL.createObjectURL(excelBlob);
      const link = Object.assign(document.createElement('a'), {
        href: url,
        download: `Admin_Attendance_Report_${format(dateRange.from, 'MMM_yyyy')}.xlsx`
      });
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      addToast({ title: "Export Successful", description: "Admin report exported successfully", variant: "success" });
    } catch (error) {
      console.error('Error exporting report:', error);
      addToast({ title: "Export Failed", description: "Failed to export attendance report", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  if (loading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-purple-300 border-t-purple-600 rounded-full animate-spin"></div>
          <div className="absolute inset-0 w-16 h-16 border-4 border-purple-200 border-t-transparent rounded-full animate-spin animation-delay-150"></div>
        </div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    router.push('/reports');
    return null;
  }

  return (
    <div className="min-h-screen p-2 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => {
                localStorage.setItem('defaultToAdminView', 'false');
                router.push('/reports')
              }}
              variant="outline"
              size="sm"
              className="border-purple-300 text-purple-700 hover:bg-purple-50"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Reports
            </Button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-purple-900">
                Admin Dashboard
              </h1>
              <p className="text-purple-600">First Years Attendance Analytics</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {lastFetched && (
              <div className="text-right text-sm">
                <p className="text-purple-600">Last updated</p>
                <p className="font-medium text-purple-800">
                  {format(lastFetched, 'MMM dd, HH:mm')}
                </p>
              </div>
            )}
            <Button
              onClick={handleRefetch}
              disabled={refetching}
              variant="outline"
              size="sm"
              className="border-purple-300 text-purple-700 hover:bg-purple-50"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refetching ? 'animate-spin' : ''}`} />
              {refetching ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
        </div>

        {adminStats && (
          <div className="space-y-6">
            {/* Overview Stats */}
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatsCard
                title="Total Students"
                value={adminStats.totalStudents}
                icon={Users}
                color="bg-blue-500"
                subtitle="First year students"
              />
              <StatsCard
                title="Active Sections"
                value={adminStats.uniqueSections}
                icon={GraduationCap}
                color="bg-green-500"
                subtitle="All departments"
              />
              <StatsCard
                title="Total Sessions"
                value={adminStats.totalSessions}
                icon={Clock}
                color="bg-orange-500"
                subtitle="Attendance records"
              />
              <StatsCard
                title="Avg Attendance"
                value={`${adminStats.averageAttendance}%`}
                icon={Percent}
                color="bg-purple-500"
                subtitle="Across all sections"
              />
            </div>

            {/* Date Range Filter */}
            <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
              <Card variant="cyber" className="p-6 grid overflow-visible z-[1]">
                <h3 className="text-lg font-semibold text-cyber-gray-900 mb-4">Filter by Date Range</h3>
                <DatePicker
                  date={dateRange}
                  onDateChange={(range) => {
                    if (range && 'from' in range && range.from && range.to) {
                      setDateRange({ from: range.from, to: range.to });
                    }
                  }}
                  disabledDates={date => date < new Date(2025, 7, 25) || date > new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)}
                  placeholder="Select date range"
                  mode="range"
                  className='z-40'
                />
                <h3 className="text-lg font-semibold text-cyber-gray-900 mt-6 mb-4">Filter Sections</h3>
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

              {/* Session-wise Pie Chart */}
              <Card variant="cyber" className="p-6">
                <h3 className="text-lg font-semibold text-cyber-gray-900 mb-4">Session-wise Distribution</h3>
                <PieChart
                  data={adminStats.sessionPieData}
                  selectedSessions={selectedSessions}
                  onSessionSelect={handleSessionSelect}
                />
              </Card>
            </div>

            {/* Section-wise Analysis - Full Width */}
            <SectionChart
              data={adminStats.sectionStats}
              title="Section-wise Attendance Rate"
              sessionStats={adminStats.sessionStats}
              onSectionSelect={(section) => router.push(`/attendance/${section}?admin=true`)}
            />

            {/* Recent Activity - Full Width */}
            <Card variant="cyber" className="p-6 mb-8">
              <h3 className="text-lg font-semibold text-cyber-gray-900 mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Recent Activity
                {selectedSessions.length > 0 && (
                  <span className="text-sm bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                    Filtered: {selectedSessions.join(', ')}
                  </span>
                )}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {adminStats.recentSessions.map((session, index: number) => (
                  <div key={index} className="p-3 bg-cyber-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium text-cyber-gray-900">{session.section}</p>
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                        {session.session}
                      </span>
                    </div>
                    <p className="text-sm text-cyber-gray-600 mb-2">
                      {format(new Date(session.date), 'MMM dd, yyyy')}
                    </p>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-cyber-gray-900">
                        {session.presentCount}/{session.totalStudents}
                      </span>
                      <span className={`text-sm font-semibold ${Math.round((session.presentCount / session.totalStudents) * 100) >= 75
                        ? 'text-green-600'
                        : 'text-orange-600'
                        }`}>
                        {Math.round((session.presentCount / session.totalStudents) * 100)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Export Section */}
            <Card variant="cyber" className="p-6">
              <h3 className="text-lg font-semibold text-cyber-gray-900 mb-4">Export Data</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-cyber-gray-700 mb-2 block">Current Date Range</label>
                  <div className="p-3 bg-cyber-gray-50 rounded-lg">
                    {dateRange.from && dateRange.to ? (
                      <p className="text-sm text-cyber-gray-900">
                        {format(dateRange.from, 'MMM dd, yyyy')} - {format(dateRange.to, 'MMM dd, yyyy')}
                      </p>
                    ) : (
                      <p className="text-sm text-cyber-gray-500">No date range selected</p>
                    )}
                  </div>
                </div>

                <div>
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
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <Button
                  onClick={handleExportToExcel}
                  disabled={exporting}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  {exporting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <FileSpreadsheet className="w-4 h-4 mr-2" />
                      Export Excel
                    </>
                  )}
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* WIP - Fancy notice */}
        <Card variant="cyber" className="p-6 mt-8 border-2 border-dashed border-orange-300 bg-orange-50/50">
          <div className="text-center">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Activity className="w-8 h-8 text-orange-600" />
            </div>
            <h3 className="text-lg font-semibold text-orange-900 mb-2">Page Under Development</h3>
            <p className="text-orange-700">
              This admin dashboard is still being actively developed. More features and improvements coming soon.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}