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
  Crown,
  FileSpreadsheet,
  GraduationCap,
  Percent,
  RefreshCw,
  Users
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import SectionChart from './SectionChart';

const PieChart = ({ data, title, selectedSessions, onSessionSelect }: {
  data: Array<{ name: string; value: number; color: string; count: number }>,
  title: string,
  selectedSessions: string[],
  onSessionSelect: (session: string) => void
}) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let currentAngle = 0;

  return (
    <Card variant="cyber" className="p-6">
      <h3 className="text-lg font-semibold text-cyber-gray-900 mb-4">{title}</h3>
      <div className="flex items-center justify-center mb-4">
        <svg width="200" height="200" viewBox="0 0 200 200">
          {data.map((item, index) => {
            const percentage = (item.value / total) * 100;
            const angle = (item.value / total) * 360;
            const x1 = 100 + 80 * Math.cos((currentAngle - 90) * Math.PI / 180);
            const y1 = 100 + 80 * Math.sin((currentAngle - 90) * Math.PI / 180);
            const x2 = 100 + 80 * Math.cos((currentAngle + angle - 90) * Math.PI / 180);
            const y2 = 100 + 80 * Math.sin((currentAngle + angle - 90) * Math.PI / 180);
            const largeArc = angle > 180 ? 1 : 0;

            const path = `M 100 100 L ${x1} ${y1} A 80 80 0 ${largeArc} 1 ${x2} ${y2} Z`;
            currentAngle += angle;

            return (
              <path
                key={index}
                d={path}
                fill={item.color}
                className={`cursor-pointer transition-opacity ${selectedSessions.includes(item.name) ? 'opacity-100' : 'opacity-70 hover:opacity-90'
                  }`}
                onClick={() => onSessionSelect(item.name)}
                stroke={selectedSessions.includes(item.name) ? '#1f2937' : 'white'}
                strokeWidth={selectedSessions.includes(item.name) ? 3 : 1}
              />
            );
          })}
        </svg>
      </div>
      <div className="space-y-2">
        {data.map((item, index) => (
          <div
            key={index}
            className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${selectedSessions.includes(item.name) ? 'bg-purple-100' : 'hover:bg-cyber-gray-50'
              }`}
            onClick={() => onSessionSelect(item.name)}
          >
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
              <span className="text-sm font-medium">{item.name}</span>
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold">{Math.round((item.value / total) * 100)}%</div>
              <div className="text-xs text-cyber-gray-500">{item.count} sessions</div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

const StatsCard = ({ title, value, icon: Icon, color, subtitle }: {
  title: string;
  value: string | number;
  icon: any;
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
);

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
  const [adminStats, setAdminStats] = useState<any>(null);
  const [selectedSessions, setSelectedSessions] = useState<string[]>([]);

  // Handle session selection for filtering
  const handleSessionSelect = (session: string) => {
    setSelectedSessions(prev =>
      prev.includes(session)
        ? prev.filter(s => s !== session)
        : [...prev, session]
    );
  };

  // Load admin data
  useEffect(() => {
    const loadAdminData = async () => {
      if (!user?.uid || !isAdmin) return;

      try {
        setLoadingData(true);

        // Get all sessions and students
        const [sessions, students] = await Promise.all([
          FirebaseService.getAdminAttendanceSessions(false),
          FirebaseService.getAdminStudents(false)
        ]);

        // Calculate comprehensive stats
        const uniqueSections = Array.from(new Set(sessions.map(s => s.section))).sort();
        setSections(uniqueSections);

        // Section-wise attendance stats with session breakdown
        const sessionNames = Array.from(new Set(sessions.map(s => s.session))).sort();
        const sessionColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

        const sessionStats = sessionNames.map((session, idx) => ({
          name: session,
          color: sessionColors[idx % sessionColors.length],
          count: sessions.filter(s => s.session === session).length
        }));

        const sectionStats = uniqueSections.map(section => {
          const sectionSessions = sessions.filter(s => s.section === section);
          const sectionStudents = students.filter(s => s.section === section);
          const totalStudents = sectionStudents.length;

          // Calculate session breakdown for this section
          const sessionBreakdown = sessionNames.map(sessionName => {
            const sessionData = sectionSessions.filter(s => s.session === sessionName);
            const totalSessions = sessionData.length;
            const totalPresent = sessionData.reduce((sum, s) => sum + (s.presentCount || 0), 0);
            const totalPossible = totalSessions * totalStudents;

            return {
              session: sessionName,
              count: totalSessions,
              present: totalPresent,
              total: totalPossible,
              attendance: totalPossible > 0 ? Math.round((totalPresent / totalPossible) * 100) : 0
            };
          });

          const totalSessions = sectionSessions.length;
          const totalPossibleAttendance = totalSessions * totalStudents;
          const totalPresent = sectionSessions.reduce((sum, s) => sum + (s.presentCount || 0), 0);

          const attendanceRate = totalPossibleAttendance > 0
            ? Math.round((totalPresent / totalPossibleAttendance) * 100)
            : 0;

          return {
            name: section,
            value: attendanceRate,
            color: attendanceRate >= 75 ? '#22c55e' : attendanceRate >= 60 ? '#f59e0b' : '#ef4444',
            totalSessions,
            totalStudents,
            totalPresent,
            sessions: sessionBreakdown
          };
        });

        // Filter data based on selected sessions
        const filteredSessions = selectedSessions.length > 0
          ? sessions.filter(s => selectedSessions.includes(s.session))
          : sessions;

        const filteredSectionStats = selectedSessions.length > 0
          ? sectionStats.map(section => {
            const filteredSessionBreakdown = section.sessions.filter(s => selectedSessions.includes(s.session));
            const totalFiltered = filteredSessionBreakdown.reduce((sum, s) => sum + s.total, 0);
            const presentFiltered = filteredSessionBreakdown.reduce((sum, s) => sum + s.present, 0);
            const attendanceRate = totalFiltered > 0 ? Math.round((presentFiltered / totalFiltered) * 100) : 0;

            return {
              ...section,
              value: attendanceRate,
              sessions: filteredSessionBreakdown
            };
          })
          : sectionStats;

        // Session-wise pie chart data
        const sessionPieData = sessionStats.map(session => {
          const sessionData = sessions.filter(s => s.session === session.name);
          const totalPresent = sessionData.reduce((sum, s) => sum + (s.presentCount || 0), 0);
          return {
            name: session.name,
            value: totalPresent,
            color: session.color,
            count: sessionData.length
          };
        });

        // Overall stats (filtered)
        const totalSessions = filteredSessions.length;
        const totalStudents = students.length;
        const totalUniqueStudents = new Set(students.map(s => s.usn)).size;
        const averageAttendance = filteredSectionStats.length > 0
          ? Math.round(filteredSectionStats.reduce((sum, s) => sum + s.value, 0) / filteredSectionStats.length)
          : 0;

        // Recent activity
        const recentSessions = filteredSessions
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 20);

        setAdminStats({
          sectionStats: filteredSectionStats,
          sessionStats,
          sessionPieData,
          totalSessions,
          totalStudents,
          totalUniqueStudents,
          averageAttendance,
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
  }, [user?.uid, isAdmin, selectedSessions, addToast]);

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

    try {
      setExporting(true);

      const sessions = await FirebaseService.getAdminAttendanceSessions(false, {
        section: selectedSection === 'all' ? undefined : selectedSection,
        dateRange: { from: dateRange.from, to: dateRange.to }
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
        getStudents: (section: string) => FirebaseService.getAdminStudents(false, section)
      });

      // Create download link
      const url = window.URL.createObjectURL(excelBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Admin_Attendance_Report_${format(dateRange.from, 'MMM_yyyy')}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      addToast({
        title: "Export Successful",
        description: `Admin report exported successfully`,
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
                <Crown className="w-8 h-8 inline mr-3" />
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

        {/* Overview Stats */}
        {adminStats && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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

            {/* Section-wise Analysis */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              <SectionChart
                data={adminStats.sectionStats}
                title="Section-wise Attendance Rate"
                sessionStats={adminStats.sessionStats}
              />

              <PieChart
                data={adminStats.sessionPieData}
                title="Session-wise Distribution"
                selectedSessions={selectedSessions}
                onSessionSelect={handleSessionSelect}
              />
            </div>

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
                {adminStats.recentSessions.map((session: any, index: number) => (
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-cyber-gray-700 mb-2 block">Date Range</label>
                  <DatePicker
                    date={dateRange}
                    onDateChange={(range) => {
                      if (range && 'from' in range && range.from && range.to) {
                        setDateRange({ from: range.from, to: range.to });
                      }
                    }}
                    placeholder="Select date range"
                    mode="range"
                  />
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

                <div className="flex items-end">
                  <Button
                    onClick={handleExportToExcel}
                    disabled={exporting}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white"
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
              </div>
            </Card>
          </>
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