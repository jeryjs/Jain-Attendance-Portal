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
    <div className="min-h-screen p-4 md:p-6 lg:pb-24">
      <div className="max-w-7xl mx-auto">
        {/* Welcome Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <div className="relative">
              <div className="w-20 h-20 bg-gradient-to-br from-cyber-yellow to-cyber-yellow-dark rounded-2xl flex items-center justify-center shadow-2xl shadow-cyber-yellow/25 animate-pulse">
                <BookOpen className="w-10 h-10 text-cyber-gray-900" />
              </div>
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-cyber-yellow rounded-full flex items-center justify-center animate-bounce">
                <Sparkles className="w-3 h-3 text-cyber-gray-900" />
              </div>
            </div>
          </div>

          <h1 className="text-4xl md:text-6xl font-bold mb-4">
            <span className="bg-gradient-to-r from-cyber-gray-900 via-cyber-gray-700 to-cyber-gray-900 bg-clip-text text-transparent">
              Welcome back,
            </span>
            <br />
            <span className="bg-gradient-to-r from-cyber-yellow to-cyber-yellow-dark bg-clip-text text-transparent">
              {user.displayName?.split(' ')[0] || 'Teacher'}!
            </span>
          </h1>

          <p className="text-xl text-cyber-gray-600 mb-8 max-w-2xl mx-auto">
            Here's what's happening with your attendance management today
          </p>

          <div className="flex flex-wrap justify-center gap-4 mb-8">
            <div className="flex items-center space-x-2 bg-cyber-gray-50 px-4 py-2 rounded-full">
              <Activity className="w-4 h-4 text-cyber-yellow" />
              <span className="text-sm text-cyber-gray-700">{stats.totalSessions} Sessions</span>
            </div>
            <div className="flex items-center space-x-2 bg-cyber-gray-50 px-4 py-2 rounded-full">
              <Users className="w-4 h-4 text-cyber-yellow" />
              <span className="text-sm text-cyber-gray-700">{stats.totalStudents} Students</span>
            </div>
            <div className="flex items-center space-x-2 bg-cyber-gray-50 px-4 py-2 rounded-full">
              <TrendingUp className="w-4 h-4 text-cyber-yellow" />
              <span className="text-sm text-cyber-gray-700">{stats.averageAttendance}% Avg</span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <Card variant="cyber" className="text-center group cursor-pointer" onClick={() => router.push('/attendance')}>
            <div className="w-12 h-12 bg-gradient-to-br from-cyber-yellow to-cyber-yellow-dark rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform duration-300">
              <Calendar className="w-6 h-6 text-cyber-gray-900" />
            </div>
            <h3 className="text-lg font-bold text-cyber-gray-900 mb-1">Take Attendance</h3>
            <p className="text-sm text-cyber-gray-600">Start a new session</p>
          </Card>

          <Card variant="cyber" className="text-center group cursor-pointer" onClick={() => router.push('/reports')}>
            <div className="w-12 h-12 bg-gradient-to-br from-cyber-yellow to-cyber-yellow-dark rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform duration-300">
              <BarChart3 className="w-6 h-6 text-cyber-gray-900" />
            </div>
            <h3 className="text-lg font-bold text-cyber-gray-900 mb-1">View Reports</h3>
            <p className="text-sm text-cyber-gray-600">Analytics & insights</p>
          </Card>

          <Card variant="cyber" className="text-center group cursor-pointer" onClick={() => router.push('/attendance')}>
            <div className="w-12 h-12 bg-gradient-to-br from-cyber-yellow to-cyber-yellow-dark rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform duration-300">
              <Clock className="w-6 h-6 text-cyber-gray-900" />
            </div>
            <h3 className="text-lg font-bold text-cyber-gray-900 mb-1">Continue Session</h3>
            <p className="text-sm text-cyber-gray-600">Resume pending work</p>
          </Card>

          <Card variant="cyber" className="text-center group cursor-pointer" onClick={() => router.push('/reports')}>
            <div className="w-12 h-12 bg-gradient-to-br from-cyber-yellow to-cyber-yellow-dark rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform duration-300">
              <Award className="w-6 h-6 text-cyber-gray-900" />
            </div>
            <h3 className="text-lg font-bold text-cyber-gray-900 mb-1">Performance</h3>
            <p className="text-sm text-cyber-gray-600">Track your metrics</p>
          </Card>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <Card variant="cyber" className="text-center">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center mx-auto mb-2">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div className="text-2xl font-bold text-cyber-gray-900 mb-1">{stats.totalSessions}</div>
            <div className="text-xs text-cyber-gray-600">Total Sessions</div>
          </Card>

          <Card variant="cyber" className="text-center">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center mx-auto mb-2">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div className="text-2xl font-bold text-cyber-gray-900 mb-1">{stats.totalStudents}</div>
            <div className="text-xs text-cyber-gray-600">Total Students</div>
          </Card>

          <Card variant="cyber" className="text-center">
            <div className="w-10 h-10 bg-gradient-to-br from-cyber-yellow to-cyber-yellow-dark rounded-lg flex items-center justify-center mx-auto mb-2">
              <TrendingUp className="w-5 h-5 text-cyber-gray-900" />
            </div>
            <div className="text-2xl font-bold text-cyber-gray-900 mb-1">{stats.averageAttendance}%</div>
            <div className="text-xs text-cyber-gray-600">Avg Attendance</div>
          </Card>

          <Card variant="cyber" className="text-center">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center mx-auto mb-2">
              <Target className="w-5 h-5 text-white" />
            </div>
            <div className="text-2xl font-bold text-cyber-gray-900 mb-1">{stats.weeklyStats.total}</div>
            <div className="text-xs text-cyber-gray-600">This Week</div>
          </Card>
        </div>

        {/* Recent Sessions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          <Card variant="cyber">
            <h3 className="text-xl font-bold text-cyber-gray-900 mb-6 flex items-center gap-2">
              <Clock className="w-5 h-5 text-cyber-yellow" />
              Recent Sessions
            </h3>

            {stats.recentSessions.length > 0 ? (
              <div className="space-y-4">
                {stats.recentSessions.slice(0, 3).map((session: any) => (
                  <div key={session.id} className="flex items-center justify-between p-4 bg-cyber-gray-50 rounded-xl">
                    <div>
                      <p className="font-semibold text-cyber-gray-900">{session.section}</p>
                      <p className="text-sm text-cyber-gray-600">{format(session.createdAt.toDate(), 'MMM dd, yyyy')}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-cyber-gray-900">{session.session}</p>
                      <p className="text-xs text-cyber-gray-600">{session.totalStudents} students</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-cyber-gray-400 mx-auto mb-4" />
                <p className="text-cyber-gray-600">No sessions yet</p>
                <p className="text-sm text-cyber-gray-500">Start your first attendance session!</p>
              </div>
            )}

            <div className="mt-6">
              <Button variant="outline" className="w-full" onClick={() => router.push('/reports')}>
                View All Sessions
              </Button>
            </div>
          </Card>

          <Card variant="cyber">
            <h3 className="text-xl font-bold text-cyber-gray-900 mb-6 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-cyber-yellow" />
              Weekly Overview
            </h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  <span className="font-medium text-green-800">Present</span>
                </div>
                <span className="text-2xl font-bold text-green-600">{stats.weeklyStats.present}</span>
              </div>

              <div className="flex items-center justify-between p-4 bg-red-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                  <span className="font-medium text-red-800">Absent</span>
                </div>
                <span className="text-2xl font-bold text-red-600">{stats.weeklyStats.absent}</span>
              </div>

              <div className="flex items-center justify-between p-4 bg-cyber-yellow/10 rounded-xl">
                <div className="flex items-center gap-3">
                  <Target className="w-6 h-6 text-cyber-yellow" />
                  <span className="font-medium text-cyber-gray-900">Total</span>
                </div>
                <span className="text-2xl font-bold text-cyber-gray-900">{stats.weeklyStats.total}</span>
              </div>
            </div>

            <div className="mt-6">
              <Button variant="outline" className="w-full" onClick={() => router.push('/reports')}>
                Detailed Analytics
              </Button>
            </div>
          </Card>
        </div>

        {/* Motivational Section */}
        <Card variant="glass" className="text-center">
          <div className="max-w-2xl mx-auto">
            <div className="w-16 h-16 bg-gradient-to-br from-cyber-yellow to-cyber-yellow-dark rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Sparkles className="w-8 h-8 text-cyber-gray-900" />
            </div>
            <h3 className="text-2xl font-bold text-cyber-gray-900 mb-4">
              Keep up the excellent work! 🎉
            </h3>
            <p className="text-cyber-gray-600 mb-6">
              Your dedication to accurate attendance tracking helps create a better learning environment for all students.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button onClick={() => router.push('/attendance')}>
                <Plus className="w-4 h-4 mr-2" />
                Start New Session
              </Button>
              <Button variant="outline" onClick={() => router.push('/reports')}>
                View Progress
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}