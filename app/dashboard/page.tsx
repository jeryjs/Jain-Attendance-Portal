'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Calendar,
  Users,
  BarChart3,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Target,
  BookOpen,
  Award,
  Activity,
  Plus
} from 'lucide-react';
import { FirebaseService } from '@/lib/firebase-service';
import { format, subDays, startOfWeek, endOfWeek } from 'date-fns';

interface DashboardStats {
  totalSessions: number;
  totalStudents: number;
  averageAttendance: number;
  recentSessions: any[];
  weeklyStats: {
    present: number;
    absent: number;
    total: number;
  };
}

export default function DashboardPage() {
  const { user, loading, isTeacher, isAdmin } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    totalSessions: 0,
    totalStudents: 0,
    averageAttendance: 0,
    recentSessions: [],
    weeklyStats: { present: 0, absent: 0, total: 0 }
  });
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (!loading && (!user || !isTeacher)) {
      router.push('/');
    }
  }, [user, loading, isTeacher, router]);

  useEffect(() => {
    if (user) {
      loadDashboardStats();
    }
  }, [user]);

  const loadDashboardStats = async () => {
    if (!user?.uid) return;

    try {
      setLoadingStats(true);
      const stats = await FirebaseService.getAttendanceStats(undefined, user.uid);
      setStats(stats);
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  if (loading || loadingStats) {
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
        {/* Welcome Header */}
        <div className="text-center mb-6 md:mb-12">
          <div className="flex items-center justify-center mb-3 md:mb-6">
            <div className="relative">
              <div className="w-12 h-12 md:w-20 md:h-20 bg-gradient-to-br from-cyber-yellow to-cyber-yellow-dark rounded-2xl flex items-center justify-center shadow-2xl shadow-cyber-yellow/25 animate-pulse">
                <BookOpen className="w-6 h-6 md:w-10 md:h-10 text-cyber-gray-900" />
              </div>
              <div className="absolute -top-1 -right-1 md:-top-2 md:-right-2 w-4 h-4 md:w-6 md:h-6 bg-cyber-yellow rounded-full flex items-center justify-center animate-bounce">
                <Sparkles className="w-2 h-2 md:w-3 md:h-3 text-cyber-gray-900" />
              </div>
            </div>
          </div>

          <h1 className="text-2xl md:text-4xl lg:text-6xl font-bold mb-2 md:mb-4">
            <span className="bg-gradient-to-r from-cyber-gray-900 via-cyber-gray-700 to-cyber-gray-900 bg-clip-text text-transparent">
              Welcome back,
            </span>
            <br />
            <span className="bg-gradient-to-r from-cyber-yellow to-cyber-yellow-dark bg-clip-text text-transparent">
              {user.displayName?.split(' ')[0] || 'Teacher'}!
            </span>
          </h1>

          <p className="text-sm md:text-xl text-cyber-gray-600 mb-3 md:mb-8 max-w-2xl mx-auto px-2">
            Here's what's happening with your attendance management <strong>today</strong>
          </p>

          <div className="flex flex-wrap justify-center gap-2 md:gap-4 mb-3 md:mb-8">
            <div className="flex items-center space-x-1 md:space-x-2 bg-cyber-gray-50 px-2 md:px-4 py-1 md:py-2 rounded-full">
              <Activity className="w-3 h-3 md:w-4 md:h-4 text-cyber-yellow" />
              <span className="text-xs md:text-sm text-cyber-gray-700">{stats.totalSessions} Sessions</span>
            </div>
            <div className="flex items-center space-x-1 md:space-x-2 bg-cyber-gray-50 px-2 md:px-4 py-1 md:py-2 rounded-full">
              <Users className="w-3 h-3 md:w-4 md:h-4 text-cyber-yellow" />
              <span className="text-xs md:text-sm text-cyber-gray-700">{stats.totalStudents} Students</span>
            </div>
            <div className="flex items-center space-x-1 md:space-x-2 bg-cyber-gray-50 px-2 md:px-4 py-1 md:py-2 rounded-full">
              <TrendingUp className="w-3 h-3 md:w-4 md:h-4 text-cyber-yellow" />
              <span className="text-xs md:text-sm text-cyber-gray-700">{stats.averageAttendance}% Avg</span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-2 md:gap-6 mb-4 md:mb-12">
          <Card variant="cyber" className="text-center group cursor-pointer p-3 md:p-6" onClick={() => router.push('/attendance')}>
            <div className="w-8 h-8 md:w-12 md:h-12 bg-gradient-to-br from-cyber-yellow to-cyber-yellow-dark rounded-xl flex items-center justify-center mx-auto mb-2 md:mb-3 group-hover:scale-110 transition-transform duration-300">
              <Calendar className="w-4 h-4 md:w-6 md:h-6 text-cyber-gray-900" />
            </div>
            <h3 className="text-sm md:text-lg font-bold text-cyber-gray-900 mb-1">Take Attendance</h3>
            <p className="text-xs md:text-sm text-cyber-gray-600">Start a new session</p>
          </Card>

          <Card variant="cyber" className="text-center group cursor-pointer p-3 md:p-6" onClick={() => router.push('/reports')}>
            <div className="w-8 h-8 md:w-12 md:h-12 bg-gradient-to-br from-cyber-yellow to-cyber-yellow-dark rounded-xl flex items-center justify-center mx-auto mb-2 md:mb-3 group-hover:scale-110 transition-transform duration-300">
              <BarChart3 className="w-4 h-4 md:w-6 md:h-6 text-cyber-gray-900" />
            </div>
            <h3 className="text-sm md:text-lg font-bold text-cyber-gray-900 mb-1">View Reports</h3>
            <p className="text-xs md:text-sm text-cyber-gray-600">Analytics & insights</p>
          </Card>

          <Card variant="cyber" className="text-center p-3 md:p-6">
            <div className="w-6 h-6 md:w-10 md:h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center mx-auto mb-1 md:mb-2">
              <Calendar className="w-3 h-3 md:w-5 md:h-5 text-white" />
            </div>
            <div className="text-lg md:text-2xl font-bold text-cyber-gray-900 mb-1">{stats.totalSessions}</div>
            <div className="text-xs text-cyber-gray-600">Total Sessions</div>
          </Card>


          <Card variant="cyber" className="text-center p-3 md:p-6">
            <div className="w-6 h-6 md:w-10 md:h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center mx-auto mb-1 md:mb-2">
              <TrendingUp className="w-3 h-3 md:w-5 md:h-5 text-white" />
            </div>
            <div className="text-lg md:text-2xl font-bold text-cyber-gray-900 mb-1">{stats.averageAttendance}%</div>
            <div className="text-xs text-cyber-gray-600">Avg Attendance</div>
          </Card>
        </div>

        {/* Recent Sessions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-8 mb-4 md:mb-12">
          <Card variant="cyber" className="p-3 md:p-6">
            <h3 className="text-sm md:text-xl font-bold text-cyber-gray-900 mb-3 md:mb-6 flex items-center gap-2">
              <Clock className="w-4 h-4 md:w-5 md:h-5 text-cyber-yellow" />
              Recent Sessions
            </h3>

            {stats.recentSessions.length > 0 ? (
              <div className="space-y-2 md:space-y-4">
                {stats.recentSessions.slice(0, 3).map((session: any) => {
                  const sessionUrl = `/attendance/${encodeURIComponent(session.section)}?date=${session.date}&time=${session.session}`;

                  return (
                    <div
                      key={session.id}
                      className="flex items-center justify-between p-2 md:p-4 bg-cyber-gray-50 rounded-xl hover:bg-cyber-gray-100 cursor-pointer transition-colors"
                      onClick={() => router.push(sessionUrl)}
                    >
                      <div>
                        <p className="font-semibold text-xs md:text-sm text-cyber-gray-900">{session.section}</p>
                        <p className="text-xs text-cyber-gray-600">{format(new Date(session.date), 'MMM dd')}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs md:text-sm font-medium text-cyber-gray-900">{session.session}</p>
                        <p className="text-xs text-cyber-gray-600">{session.totalStudents} students</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-4 md:py-8">
                <Calendar className="w-8 h-8 md:w-12 md:h-12 text-cyber-gray-400 mx-auto mb-2 md:mb-4" />
                <p className="text-xs md:text-sm text-cyber-gray-600">No sessions yet</p>
                <p className="text-xs text-cyber-gray-500">Start your first attendance session!</p>
              </div>
            )}

            <div className="mt-3 md:mt-6">
              <Button variant="outline" className="w-full text-xs md:text-sm" onClick={() => router.push('/reports')}>
                View All Sessions
              </Button>
            </div>
          </Card>

          <Card variant="cyber" className="p-3 md:p-6">
            <h3 className="text-sm md:text-xl font-bold text-cyber-gray-900 mb-3 md:mb-6 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 md:w-5 md:h-5 text-cyber-yellow" />
              Weekly Overview
            </h3>

            <div className="space-y-2 md:space-y-4">
              <div className="flex items-center justify-between p-2 md:p-4 bg-green-50 rounded-xl">
                <div className="flex items-center gap-2 md:gap-3">
                  <CheckCircle className="w-4 h-4 md:w-6 md:h-6 text-green-600" />
                  <span className="font-medium text-xs md:text-sm text-green-800">Present</span>
                </div>
                <span className="text-sm md:text-2xl font-bold text-green-600">{stats.weeklyStats.present}</span>
              </div>

              <div className="flex items-center justify-between p-2 md:p-4 bg-red-50 rounded-xl">
                <div className="flex items-center gap-2 md:gap-3">
                  <AlertCircle className="w-4 h-4 md:w-6 md:h-6 text-red-600" />
                  <span className="font-medium text-xs md:text-sm text-red-800">Absent</span>
                </div>
                <span className="text-sm md:text-2xl font-bold text-red-600">{stats.weeklyStats.absent}</span>
              </div>

              <div className="flex items-center justify-between p-2 md:p-4 bg-cyber-yellow/10 rounded-xl">
                <div className="flex items-center gap-2 md:gap-3">
                  <Target className="w-4 h-4 md:w-6 md:h-6 text-cyber-yellow" />
                  <span className="font-medium text-xs md:text-sm text-cyber-gray-900">Total</span>
                </div>
                <span className="text-sm md:text-2xl font-bold text-cyber-gray-900">{stats.weeklyStats.total}</span>
              </div>
            </div>

            <div className="mt-3 md:mt-6">
              <Button variant="outline" className="w-full text-xs md:text-sm" onClick={() => router.push('/reports')}>
                Detailed Analytics
              </Button>
            </div>
          </Card>
        </div>

        {/* Motivational Section */}
        <Card variant="glass" className="text-center p-4 md:p-6">
          <div className="max-w-2xl mx-auto">
            <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-cyber-yellow to-cyber-yellow-dark rounded-2xl flex items-center justify-center mx-auto mb-3 md:mb-6">
              <Sparkles className="w-6 h-6 md:w-8 md:h-8 text-cyber-gray-900" />
            </div>
            <h3 className="text-lg md:text-2xl font-bold text-cyber-gray-900 mb-2 md:mb-4">
              Keep up the excellent work! 🎉
            </h3>
            <p className="text-sm md:text-base text-cyber-gray-600 mb-3 md:mb-6">
              Your dedication to accurate attendance tracking helps create a better learning environment for all students.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 md:gap-4 justify-center">
              <Button onClick={() => router.push('/attendance')} className="text-sm md:text-base">
                <Plus className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                Start New Session
              </Button>
              <Button variant="outline" onClick={() => router.push('/reports')} className="text-sm md:text-base">
                View Progress
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}