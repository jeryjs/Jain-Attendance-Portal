'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  Clock,
  Users,
  CheckCircle,
  XCircle,
  Grid3X3,
  List,
  Search,
  Check,
  X,
  Sparkles,
  Target,
  BookOpen,
  UserCheck,
  Save,
  AlertCircle,
  User
} from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import { format } from 'date-fns';
import { FirebaseService } from '@/lib/firebase-service';
import { Student, SessionOption, SESSION_OPTIONS } from '@/lib/types';

export default function SectionAttendancePage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading, isTeacher } = useAuth();
  const { addToast } = useToast();
  const section = params.section as string;

  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Record<string, boolean>>({});
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedSession, setSelectedSession] = useState<SessionOption>('8.45-9.45');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);

  useEffect(() => {
    if (!loading && (!user || !isTeacher)) {
      router.push('/');
    }
  }, [user, loading, isTeacher, router]);

  useEffect(() => {
    if (user && section) {
      loadStudents();
    }
  }, [user, section]);

  useEffect(() => {
    // Filter students based on search query
    if (searchQuery.length >= 1) {
      const filtered = students.filter(student =>
        student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.usn.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredStudents(filtered);
    } else {
      setFilteredStudents(students);
    }
  }, [searchQuery, students]);

  const loadStudents = async () => {
    try {
      setLoadingStudents(true);
      const studentsData = await FirebaseService.getStudents(section);

      setStudents(studentsData);

      // Initialize attendance state
      const initialAttendance: Record<string, boolean> = {};
      studentsData.forEach(student => {
        initialAttendance[student.usn] = false;
      });
      setAttendance(initialAttendance);
    } catch (error) {
      console.error('Error loading students:', error);
    } finally {
      setLoadingStudents(false);
    }
  };

  const toggleAttendance = (usn: string) => {
    if (!sessionStarted) return;

    setAttendance(prev => ({
      ...prev,
      [usn]: !prev[usn]
    }));
  };

  const markAllPresent = () => {
    if (!sessionStarted) return;

    const newAttendance: Record<string, boolean> = {};
    students.forEach(student => {
      newAttendance[student.usn] = true;
    });
    setAttendance(newAttendance);
  };

  const markAllAbsent = () => {
    if (!sessionStarted) return;

    const newAttendance: Record<string, boolean> = {};
    students.forEach(student => {
      newAttendance[student.usn] = false;
    });
    setAttendance(newAttendance);
  };

  const handleStartSession = async () => {
    try {
      setSavingAttendance(true);

      // Create attendance session using FirebaseService
      const sessionData = {
        section,
        date: format(selectedDate, 'yyyy-MM-dd'),
        session: selectedSession,
        teacherId: user?.uid || '',
        teacherEmail: user?.email || '',
        totalStudents: students.length,
      };

      const sessionId = await FirebaseService.saveAttendanceBatch({
        sessionId: '', // Will be generated
        records: [], // Empty for now, will be saved when attendance is marked
        sessionData
      });

      setSessionId(sessionId);
      setSessionStarted(true);
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error creating session:', error);
    } finally {
      setSavingAttendance(false);
    }
  };

  const handleSaveAttendance = async () => {
    if (!sessionId || !sessionStarted) return;

    try {
      setSavingAttendance(true);

      // Prepare attendance records
      const attendanceRecords = Object.entries(attendance).map(([usn, isPresent]) => ({
        studentUsn: usn,
        isPresent,
      }));

      // Use FirebaseService to save attendance
      await FirebaseService.saveAttendanceBatch({
        sessionId,
        records: attendanceRecords,
        sessionData: {
          section,
          date: format(selectedDate, 'yyyy-MM-dd'),
          session: selectedSession,
          teacherId: user?.uid || '',
          teacherEmail: user?.email || '',
          totalStudents: students.length,
        }
      });

      // Show success message and redirect
      addToast({
        title: "Success!",
        description: "Attendance saved successfully!",
        variant: "success"
      });
      router.push('/attendance');
    } catch (error) {
      console.error('Error saving attendance:', error);
      addToast({
        title: "Error",
        description: "Error saving attendance. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSavingAttendance(false);
    }
  };

  const handleQuickMark = (usn: string) => {
    if (!sessionStarted) return;

    toggleAttendance(usn);
    setSearchQuery('');
  };

  const getAttendanceStats = () => {
    const present = Object.values(attendance).filter(Boolean).length;
    const total = students.length;
    const absent = total - present;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
    return { present, absent, total, percentage };
  };

  if (loading || loadingStudents) {
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

  const stats = getAttendanceStats();

  return (
    <div className="min-h-screen p-4 md:p-6 lg:pb-24">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => router.push('/attendance')}
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Programs
          </Button>

          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-cyber-yellow to-cyber-yellow-dark rounded-2xl flex items-center justify-center shadow-2xl shadow-cyber-yellow/25 animate-pulse">
                  <UserCheck className="w-8 h-8 text-cyber-gray-900" />
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-cyber-yellow rounded-full flex items-center justify-center animate-bounce">
                  <Sparkles className="w-3 h-3 text-cyber-gray-900" />
                </div>
              </div>
            </div>

            <h1 className="text-3xl md:text-5xl font-bold mb-4">
              <span className="bg-gradient-to-r from-cyber-gray-900 to-cyber-gray-700 bg-clip-text text-transparent">
                Section {section}
              </span>
            </h1>

            <p className="text-xl text-cyber-gray-600 mb-6">
              {students.length} students • {sessionStarted ? 'Session Active' : 'Ready to Start'}
            </p>

            {!sessionStarted && (
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="lg" glow className="px-8 py-4">
                    <CalendarIcon className="w-5 h-5 mr-2" />
                    Start Attendance Session
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Configure Attendance Session</DialogTitle>
                    <DialogDescription>
                      Select date and session time to begin taking attendance.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-cyber-gray-700">Date</label>
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => date && setSelectedDate(date)}
                        disabled={(date) => date > new Date() || date < new Date('2025-08-28')}
                        className="rounded-md border border-cyber-gray-200"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-cyber-gray-700">Session Time</label>
                      <Select value={selectedSession} onValueChange={(value: SessionOption) => setSelectedSession(value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SESSION_OPTIONS.map((option) => (
                            <SelectItem key={option.key} value={option.key}>
                              {option.value}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={handleStartSession}
                        className="flex-1"
                        disabled={savingAttendance}
                      >
                        {savingAttendance ? 'Starting...' : 'Start Session'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* Session Info & Stats */}
        {sessionStarted && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card variant="cyber" className="text-center">
              <div className="w-10 h-10 bg-gradient-to-br from-cyber-yellow to-cyber-yellow-dark rounded-lg flex items-center justify-center mx-auto mb-2">
                <CalendarIcon className="w-5 h-5 text-cyber-gray-900" />
              </div>
              <div className="text-lg font-bold text-cyber-gray-900">{format(selectedDate, 'MMM dd')}</div>
              <div className="text-xs text-cyber-gray-600">Session Date</div>
            </Card>

            <Card variant="cyber" className="text-center">
              <div className="w-10 h-10 bg-gradient-to-br from-cyber-yellow to-cyber-yellow-dark rounded-lg flex items-center justify-center mx-auto mb-2">
                <Clock className="w-5 h-5 text-cyber-gray-900" />
              </div>
              <div className="text-lg font-bold text-cyber-gray-900">{selectedSession}</div>
              <div className="text-xs text-cyber-gray-600">Session Time</div>
            </Card>

            <Card variant="cyber" className="text-center">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center mx-auto mb-2">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
              <div className="text-lg font-bold text-green-600">{stats.present}</div>
              <div className="text-xs text-cyber-gray-600">Present</div>
            </Card>

            <Card variant="cyber" className="text-center">
              <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center mx-auto mb-2">
                <XCircle className="w-5 h-5 text-white" />
              </div>
              <div className="text-lg font-bold text-red-600">{stats.absent}</div>
              <div className="text-xs text-cyber-gray-600">Absent</div>
            </Card>
          </div>
        )}

        {/* Attendance Views */}
        {sessionStarted && (
          <Tabs defaultValue="table" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="table" className="flex items-center gap-2">
                <List className="w-4 h-4" />
                Table View
              </TabsTrigger>
              <TabsTrigger value="bricks" className="flex items-center gap-2">
                <Grid3X3 className="w-4 h-4" />
                Brick View
              </TabsTrigger>
            </TabsList>

            {/* Table View */}
            <TabsContent value="table" className="space-y-6">
              <Card variant="cyber">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-cyber-gray-900">Student List</h3>
                  <div className="flex gap-3">
                    <Button variant="outline" size="sm" onClick={markAllPresent}>
                      Mark All Present
                    </Button>
                    <Button variant="outline" size="sm" onClick={markAllAbsent}>
                      Mark All Absent
                    </Button>
                  </div>
                </div>

                {/* Search Bar */}
                <div className="mb-6">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cyber-gray-400 w-4 h-4" />
                    <Input
                      type="text"
                      placeholder="Search by name or USN..."
                      value={searchQuery}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  {filteredStudents.map((student, index) => (
                    <div
                      key={student.usn}
                      className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all duration-300 cursor-pointer group ${
                        attendance[student.usn]
                          ? 'border-green-200 bg-green-50 hover:bg-green-100'
                          : 'border-red-200 bg-red-50 hover:bg-red-100'
                      }`}
                      onClick={() => toggleAttendance(student.usn)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-cyber-gray-200 text-cyber-gray-700 font-semibold text-sm">
                          {index + 1}
                        </div>
                        {attendance[student.usn] ? (
                          <CheckCircle className="w-6 h-6 text-green-600 animate-in zoom-in duration-200" />
                        ) : (
                          <XCircle className="w-6 h-6 text-red-600 animate-in zoom-in duration-200" />
                        )}
                        <div>
                          <p className="font-semibold text-cyber-gray-900">{student.name}</p>
                          <p className="text-sm text-cyber-gray-600">{student.usn}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-sm font-semibold ${
                          attendance[student.usn] ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {attendance[student.usn] ? 'Present' : 'Absent'}
                        </div>
                        <div className="text-xs text-cyber-gray-500">
                          Click to toggle
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </TabsContent>

            {/* Brick View */}
            <TabsContent value="bricks" className="space-y-6">
              <Card variant="cyber">
                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold text-cyber-gray-900 mb-2">Quick Attendance Grid</h3>
                  <p className="text-cyber-gray-600">Click bricks to toggle attendance. Shows name and USN.</p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {filteredStudents.map((student) => (
                    <div
                      key={student.usn}
                      className={`p-4 rounded-xl border-2 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 transform hover:scale-105 group ${
                        attendance[student.usn]
                          ? 'border-green-300 bg-green-100 hover:bg-green-200'
                          : 'border-red-300 bg-red-100 hover:bg-red-200'
                      }`}
                      onClick={() => toggleAttendance(student.usn)}
                    >
                      <div className="text-center">
                        <p className="font-semibold text-cyber-gray-900 text-sm mb-1">{student.name}</p>
                        <p className="text-xs text-cyber-gray-600 mb-2">{student.usn}</p>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                          attendance[student.usn] ? 'bg-green-500' : 'bg-red-500'
                        }`}>
                          {attendance[student.usn] ? (
                            <Check className="w-4 h-4 text-white" />
                          ) : (
                            <X className="w-4 h-4 text-white" />
                          )}
                        </div>
                      </div>
                      {attendance[student.usn] && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        {/* Save Attendance Button */}
        {sessionStarted && (
          <div className="fixed bottom-6 right-6 z-50">
            <Button
              size="lg"
              glow
              onClick={handleSaveAttendance}
              disabled={savingAttendance}
              className="px-8 py-4 shadow-2xl bg-gradient-to-r from-cyber-yellow to-cyber-yellow-dark text-cyber-gray-900 font-bold hover:shadow-cyber-yellow/25"
            >
              {savingAttendance ? (
                <>
                  <div className="w-5 h-5 border-2 border-cyber-gray-900/30 border-t-cyber-gray-900 rounded-full animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5 mr-2" />
                  Save Attendance ({stats.present}/{stats.total})
                </>
              )}
            </Button>
          </div>
        )}

        {/* Empty State */}
        {!sessionStarted && !loadingStudents && (
          <Card variant="cyber" className="text-center py-16">
            <div className="w-20 h-20 bg-gradient-to-br from-cyber-yellow to-cyber-yellow-dark rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Target className="w-10 h-10 text-cyber-gray-900" />
            </div>
            <h3 className="text-2xl font-bold text-cyber-gray-900 mb-4">Ready to Start</h3>
            <p className="text-cyber-gray-600 mb-6 max-w-md mx-auto">
              Configure your attendance session by selecting a date and time slot to begin taking attendance for Section {section}.
            </p>
            <div className="flex items-center justify-center space-x-4 text-sm text-cyber-gray-500">
              <div className="flex items-center space-x-1">
                <Users className="w-4 h-4" />
                <span>{students.length} students loaded</span>
              </div>
              <div className="flex items-center space-x-1">
                <CalendarIcon className="w-4 h-4" />
                <span>Session ready</span>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}