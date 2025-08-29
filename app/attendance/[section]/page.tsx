'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
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
  User,
  Edit,
  Plus,
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import { format } from 'date-fns';
import { FirebaseService } from '@/lib/firebase-service';
import { Student, SessionOption, SESSION_OPTIONS } from '@/lib/types';

export default function SectionAttendancePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading, isTeacher } = useAuth();
  const { addToast } = useToast();
  const section = decodeURIComponent(params.section as string);

  // URL parameters
  const urlDate = searchParams.get('date');
  const urlTime = searchParams.get('time');
  const isEditMode = searchParams.get('edit') === 'true';

  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Record<string, boolean>>({});
  const [selectedDate, setSelectedDate] = useState<Date>(urlDate ? new Date(urlDate) : new Date());
  const [selectedSession, setSelectedSession] = useState<SessionOption>(urlTime as SessionOption || '8.45-9.45');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loadingStudents, setLoadingData] = useState(true);
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [existingSession, setExistingSession] = useState<any>(null);
  const [originalAttendance, setOriginalAttendance] = useState<Record<string, boolean>>({});
  const [sectionSessions, setSectionSessions] = useState<any[]>([]);

  // Date validation - restrict to reasonable range
  const isValidDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const twoWeeksAgo = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000);
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    return date >= twoWeeksAgo && date <= tomorrow;
  };

  // Check if session params are valid
  const isValidSession = urlDate && urlTime &&
    SESSION_OPTIONS.some(opt => opt.key === urlTime) &&
    isValidDate(urlDate);
  const sessionKey = `${section}_${urlDate}_${urlTime}`;
  const isViewOnly = !(isValidSession && (!existingSession || isEditMode));

  useEffect(() => {
    if (!loading && (!user || !isTeacher)) {
      router.push('/');
    }
  }, [user, loading, isTeacher, router]);

  useEffect(() => {
    loadData();
  }, [user, section, urlDate, urlTime]);

  const loadData = async () => {
    try {
      setLoadingData(true);
      const studentsData = await FirebaseService.getStudents(section);
      setStudents(studentsData);

      // Initialize attendance state
      const initialAttendance: Record<string, boolean> = {};
      studentsData.forEach(student => {
        initialAttendance[student.usn] = false;
      });
      setAttendance(initialAttendance);

      // Load existing sessions for this section
      await loadSectionSessions();

      // If valid session, load existing session data
      if (isValidSession) {
        // Get the specific session document directly
        const sessionDoc = await FirebaseService.getSessionById(sessionKey);

        if (sessionDoc) {
          setExistingSession(sessionDoc);

          // Restore attendance from presentStudents array
          const restoredAttendance: Record<string, boolean> = {};
          studentsData.forEach(student => {
            restoredAttendance[student.usn] = sessionDoc.presentStudents?.includes(student.usn) || false;
          });
          setAttendance(restoredAttendance);
          setOriginalAttendance({ ...restoredAttendance });

          if (existingSession) {
            addToast({
              title: "Session Attendance Already Taken",
              description: "Attendance has already been recorded for this session.",
              variant: "default"
            });
          }
        }
      }
      setLoadingData(false);
    } catch (error) {
      console.error('Error loading data:', error);
      addToast({
        title: "Data Load Failed",
        description: "Could not load data. Please try again later.",
        variant: "destructive"
      });
    } finally {
      setLoadingData(false);
    }
  }

  const loadSectionSessions = async () => {
    try {
      const sessions = await FirebaseService.getAttendanceSessions({
        section,
        teacherId: user?.uid
      });
      setSectionSessions(sessions);
    } catch (error) {
      console.error('Error loading section sessions:', error);
    }
  };

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

  // Navigation warning for unsaved changes
  useEffect(() => {
    const hasUnsavedChanges = () => {
      if (!isValidSession || !originalAttendance) return false;

      return Object.keys(attendance).some(usn => {
        const current = attendance[usn] || false;
        const original = originalAttendance[usn] || false;
        return current !== original;
      });
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges()) {
        e.preventDefault();
        e.returnValue = 'You have unsaved attendance changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    const handlePopState = (e: PopStateEvent) => {
      if (hasUnsavedChanges()) {
        const confirmed = window.confirm(
          'You have unsaved attendance changes. Are you sure you want to leave without saving?'
        );
        if (!confirmed) {
          // Push the current state back to prevent navigation
          window.history.pushState(null, '', window.location.href);
          e.preventDefault();
          return;
        }
      }
    };

    // Add event listeners
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);

    // Push initial state to enable popstate detection
    if (hasUnsavedChanges()) {
      window.history.pushState(null, '', window.location.href);
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [attendance, originalAttendance, isValidSession]);

  const toggleAttendance = (usn: string) => {
    if (!isValidSession || (existingSession && !isEditMode)) return;

    setAttendance(prev => ({
      ...prev,
      [usn]: !prev[usn]
    }));
  };

  const markAllPresent = () => {
    if (!isValidSession || (existingSession && !isEditMode)) return;

    const currentPresent = Object.values(attendance).filter(Boolean).length;
    const total = students.length;

    if (currentPresent > 0 && currentPresent < total) {
      const confirmed = window.confirm(
        `${currentPresent} students are currently marked present. Mark all ${total} students as present?`
      );
      if (!confirmed) return;
    }

    const newAttendance: Record<string, boolean> = {};
    students.forEach(student => {
      newAttendance[student.usn] = true;
    });
    setAttendance(newAttendance);
  };

  const markAllAbsent = () => {
    if (!isValidSession || (existingSession && !isEditMode)) return;

    const currentAbsent = Object.values(attendance).filter(present => !present).length;
    const total = students.length;

    if (currentAbsent > 0 && currentAbsent < total) {
      const confirmed = window.confirm(
        `${currentAbsent} students are currently marked absent. Mark all ${total} students as absent?`
      );
      if (!confirmed) return;
    }

    const newAttendance: Record<string, boolean> = {};
    students.forEach(student => {
      newAttendance[student.usn] = false;
    });
    setAttendance(newAttendance);
  };

  const handleStartSession = async () => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const timeStr = selectedSession;
    router.push(`/attendance/${encodeURIComponent(section)}?date=${dateStr}&time=${timeStr}`);
    setIsDialogOpen(false);
  };

  const handleSaveAttendance = async () => {
    if (!isValidSession) return;

    try {
      setSavingAttendance(true);

      const attendanceRecords = Object.entries(attendance).map(([usn, isPresent]) => ({
        studentUsn: usn,
        isPresent,
      }));

      // Generate edit summary if this is an existing session
      let newEditHistory: Array<{ timestamp: Date; email: string; details: string }> = [];

      if (existingSession && isEditMode) {
        // Calculate changes from original to current state
        const changes = students.reduce((acc, student) => {
          const original = originalAttendance[student.usn] || false;
          const current = attendance[student.usn] || false;

          if (original !== current) {
            if (current) acc.markedPresent++;
            else acc.markedAbsent++;
          }
          return acc;
        }, { markedPresent: 0, markedAbsent: 0 });

        // Only add edit entry if there are actual changes
        if (changes.markedPresent > 0 || changes.markedAbsent > 0) {
          let details = '';
          if (changes.markedPresent > 0 && changes.markedAbsent > 0) {
            details = `+${changes.markedPresent} & -${changes.markedAbsent} students`;
          } else if (changes.markedPresent > 0) {
            details = `+${changes.markedPresent} students marked present`;
          } else {
            details = `-${changes.markedAbsent} students marked absent`;
          }

          // Preserve existing edit history and add new entry
          const existingEditHistory = existingSession.editHistory || [];
          newEditHistory = [...existingEditHistory, {
            timestamp: new Date(),
            email: user?.email || '',
            details
          }];
        } else {
          // No changes, keep existing history
          newEditHistory = existingSession.editHistory || [];
        }
      }

      // Use the new simplified save method
      await FirebaseService.saveOrUpdateSession({
        section,
        date: urlDate!,
        session: urlTime!,
        teacherId: user?.uid || '',
        teacherEmail: user?.email || '',
        totalStudents: students.length,
        records: attendanceRecords,
        editHistory: newEditHistory
      });

      addToast({
        title: existingSession ? "Updated!" : "Saved!",
        description: existingSession ? "Session has been updated successfully!" : "Attendance saved successfully!",
        variant: "success"
      });

      if (isEditMode) router.replace(`/attendance/${encodeURIComponent(section)}?date=${urlDate}&time=${urlTime}`);
      else router.refresh();  // avoid calling location.reload as i wanna retain the cache
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

  const getAttendanceStats = () => {
    const present = Object.values(attendance).filter(Boolean).length;
    const total = students.length;
    const absent = total - present;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
    return { present, absent, total, percentage };
  };

  const hasUnsavedChanges = () => {
    if (!isValidSession || !originalAttendance) return false;

    return Object.keys(attendance).some(usn => {
      const current = attendance[usn] || false;
      const original = originalAttendance[usn] || false;
      return current !== original;
    });
  };

  const handleBackNavigation = () => {
    if (hasUnsavedChanges()) {
      const confirmed = window.confirm(
        'You have unsaved attendance changes. Are you sure you want to leave without saving?'
      );
      if (!confirmed) return;
    }
    router.push('/attendance');
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
    <div className="min-h-screen p-2 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-4 md:mb-8">
          <div className="flex items-center justify-between mb-3 md:mb-6">
            <Button
              variant="ghost"
              onClick={handleBackNavigation}
              className=""
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Programs
            </Button>
          </div>

          <div className="text-center mb-4 md:mb-8">
            <div className="flex items-center justify-center mb-2 md:mb-4">
              <div className="relative">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-cyber-yellow to-cyber-yellow-dark rounded-2xl flex items-center justify-center shadow-2xl shadow-cyber-yellow/25 animate-pulse">
                  <UserCheck className="w-6 h-6 md:w-8 md:h-8 text-cyber-gray-900" />
                </div>
                <div className="absolute -top-1 -right-1 md:-top-2 md:-right-2 w-4 h-4 md:w-6 md:h-6 bg-cyber-yellow rounded-full flex items-center justify-center animate-bounce">
                  <Sparkles className="w-2 h-2 md:w-3 md:h-3 text-cyber-gray-900" />
                </div>
              </div>
            </div>

            <h1 className="text-2xl md:text-3xl lg:text-5xl font-bold mb-2 md:mb-4">
              <span className="bg-gradient-to-r from-cyber-gray-900 to-cyber-gray-700 bg-clip-text text-transparent">
                Section {section}
              </span>
            </h1>

            <p className="text-sm md:text-xl text-cyber-gray-600 mb-3 md:mb-6">
              {students.length} students • {isValidSession ? (existingSession ? (isEditMode ? 'Editing Session' : 'Viewing Session') : 'New Session') : 'Configure Session'}
            </p>
          </div>
        </div>

        {/* Session Info & Stats */}
        {isValidSession && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-6 mb-4 md:mb-8">
            <Card variant="cyber" className="text-center p-3 md:p-6">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-cyber-yellow to-cyber-yellow-dark rounded-lg flex items-center justify-center mx-auto mb-1 md:mb-2">
                <CalendarIcon className="w-4 h-4 md:w-5 md:h-5 text-cyber-gray-900" />
              </div>
              <div className="text-sm md:text-lg font-bold text-cyber-gray-900">{format(selectedDate, 'MMM dd')}</div>
              <div className="text-xs text-cyber-gray-600">Session Date</div>
            </Card>

            <Card variant="cyber" className="text-center p-3 md:p-6">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-cyber-yellow to-cyber-yellow-dark rounded-lg flex items-center justify-center mx-auto mb-1 md:mb-2">
                <Clock className="w-4 h-4 md:w-5 md:h-5 text-cyber-gray-900" />
              </div>
              <div className="text-sm md:text-lg font-bold text-cyber-gray-900">{selectedSession}</div>
              <div className="text-xs text-cyber-gray-600">Session Time</div>
            </Card>

            <Card variant="cyber" className="text-center p-3 md:p-6">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center mx-auto mb-1 md:mb-2">
                <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-white" />
              </div>
              <div className="text-sm md:text-lg font-bold text-green-600">{stats.present}</div>
              <div className="text-xs text-cyber-gray-600">Present</div>
            </Card>

            <Card variant="cyber" className="text-center p-3 md:p-6">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center mx-auto mb-1 md:mb-2">
                <XCircle className="w-4 h-4 md:w-5 md:h-5 text-white" />
              </div>
              <div className="text-sm md:text-lg font-bold text-red-600">{stats.absent}</div>
              <div className="text-xs text-cyber-gray-600">Absent</div>
            </Card>
          </div>
        )}

        {/* Attendance Views */}
        {isValidSession && (
          <Tabs defaultValue="table" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4 md:mb-8">
              <TabsTrigger value="table" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm">
                <List className="w-3 h-3 md:w-4 md:h-4" />
                Table View
              </TabsTrigger>
              <TabsTrigger value="bricks" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm">
                <Grid3X3 className="w-3 h-3 md:w-4 md:h-4" />
                Brick View
              </TabsTrigger>
            </TabsList>

            {/* Table View */}
            <TabsContent value="table" className="space-y-3 md:space-y-6">
              <Card variant="cyber">
                <div className="flex items-center justify-between mb-3 md:mb-6 p-3 md:p-6">
                  <h3 className="text-lg md:text-xl font-bold text-cyber-gray-900">Student List</h3>
                  {!isViewOnly && <div className="flex gap-2 md:gap-3">
                    <Button variant="outline" size="sm" onClick={markAllPresent} className="text-xs md:text-sm">
                      Mark All Present
                    </Button>
                    <Button variant="outline" size="sm" onClick={markAllAbsent} className="text-xs md:text-sm">
                      Mark All Absent
                    </Button>
                  </div>}
                </div>

                {/* Search Bar */}
                <div className="mb-3 md:mb-6 px-3 md:px-6">
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

                <div className="space-y-2 md:space-y-3 md:px-6 pb-3 md:pb-6">
                  {filteredStudents.map((student, index) => (
                    <div
                      key={student.usn}
                      className={`flex items-center justify-between p-3 md:p-4 rounded-xl border-2 transition-all duration-300 cursor-pointer group ${attendance[student.usn]
                        ? 'border-green-200 bg-green-50 hover:bg-green-100'
                        : 'border-red-200 bg-red-50 hover:bg-red-100'
                        }`}
                      onClick={() => toggleAttendance(student.usn)}
                    >
                      <div className="flex items-center gap-2 md:gap-4">
                        <div className="flex items-center justify-center w-6 h-6 md:w-8 md:h-8 rounded-full bg-cyber-gray-200 text-cyber-gray-700 font-semibold text-xs md:text-sm">
                          {index + 1}
                        </div>
                        {attendance[student.usn] ? (
                          <CheckCircle className="w-5 h-5 md:w-6 md:h-6 text-green-600 animate-in zoom-in duration-200" />
                        ) : (
                          <XCircle className="w-5 h-5 md:w-6 md:h-6 text-red-600 animate-in zoom-in duration-200" />
                        )}
                        <div>
                          <p className="font-semibold text-cyber-gray-900 text-sm md:text-base">{student.name}</p>
                          <p className="text-xs md:text-sm text-cyber-gray-600">{student.usn}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-xs md:text-sm font-semibold ${attendance[student.usn] ? 'text-green-600' : 'text-red-600'
                          }`}>
                          {attendance[student.usn] ? 'Present' : 'Absent'}
                        </div>
                        {!isViewOnly && (<div className="text-xs text-cyber-gray-500 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          Click to toggle
                        </div>)}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </TabsContent>

            {/* Brick View */}
            <TabsContent value="bricks" className="space-y-3 md:space-y-6">
              <Card variant="cyber">
                <div className="text-center mb-3 md:mb-6 p-3 md:p-6">
                  <h3 className="text-lg md:text-xl font-bold text-cyber-gray-900 mb-1 md:mb-2">Quick Attendance Grid</h3>
                  <p className="text-xs md:text-sm text-cyber-gray-600">Click bricks to toggle attendance. Shows name and USN.</p>
                </div>

                <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-2 md:gap-4 md:p-6">
                  {filteredStudents.map((student) => (
                    <div
                      key={student.usn}
                      className={`relative p-2 md:p-4 rounded-xl border-2 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 transform hover:scale-105 group ${attendance[student.usn]
                        ? 'border-green-300 bg-green-100 hover:bg-green-200'
                        : 'border-red-300 bg-red-100 hover:bg-red-200'
                        }`}
                      onClick={() => toggleAttendance(student.usn)}
                    >
                      <div className="text-center">
                        <p className="font-semibold text-cyber-gray-900 text-xs md:text-sm mb-1">{student.name}</p>
                        <p className="text-xs text-cyber-gray-600 mb-1 md:mb-2">{student.usn}</p>
                      </div>
                      <div className={`absolute -top-1 -right-1 w-3 h-3 md:w-4 md:h-4 rounded-full animate-pulse ${attendance[student.usn] ? 'bg-green-500' : 'bg-red-500'}`}>
                        {attendance[student.usn] ? (
                          <Check className="w-3 h-3 md:w-4 md:h-4 text-white" />
                        ) : (
                          <X className="w-3 h-3 md:w-4 md:h-4 text-white" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        {/* Save Attendance Button */}
        {isValidSession && (!existingSession || isEditMode) && (
          <div className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-50">
            <Button
              size="lg"
              glow
              onClick={handleSaveAttendance}
              disabled={savingAttendance}
              className="px-4 md:px-8 py-2 md:py-4 shadow-2xl bg-gradient-to-r from-cyber-yellow to-cyber-yellow-dark text-cyber-gray-900 font-bold hover:shadow-cyber-yellow/25 text-sm md:text-base"
            >
              {savingAttendance ? (
                <>
                  <div className="w-4 h-4 md:w-5 md:h-5 border-2 border-cyber-gray-900/30 border-t-cyber-gray-900 rounded-full animate-spin mr-1 md:mr-2" />
                  {existingSession ? 'Updating...' : 'Saving...'}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 md:w-5 md:h-5 mr-1 md:mr-2" />
                  <span className="hidden sm:inline">{existingSession ? 'Update' : 'Save'} Attendance ({stats.present}/{stats.total})</span>
                  <span className="sm:hidden">{existingSession ? 'Update' : 'Save'}</span>
                </>
              )}
            </Button>
          </div>
        )}

        {/* Edit FAB for existing sessions */}
        {isValidSession && existingSession && !isEditMode && (
          <div className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-50">
            <Button
              size="lg"
              glow
              onClick={() => router.push(`/attendance/${encodeURIComponent(section)}?date=${urlDate}&time=${urlTime}&edit=true`)}
              className="px-4 md:px-6 py-2 md:py-4 shadow-2xl bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold hover:shadow-blue-500/25 rounded-full text-sm md:text-base"
            >
              <Edit className="w-4 h-4 md:w-5 md:h-5 mr-1 md:mr-2" />
              Edit
            </Button>
          </div>
        )}

        {/* Empty State */}
        {!isValidSession && !loadingStudents && (
          <div className="space-y-4 md:space-y-6">
            {/* Start New Session Card */}
            <Card variant="cyber" className="text-center py-8 md:py-12">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-cyber-yellow to-cyber-yellow-dark rounded-2xl flex items-center justify-center mx-auto mb-4 md:mb-6">
                <Target className="w-8 h-8 md:w-10 md:h-10 text-cyber-gray-900" />
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-cyber-gray-900 mb-3 md:mb-4">Ready to Start</h3>
              <p className="text-sm md:text-base text-cyber-gray-600 mb-4 md:mb-6 max-w-md mx-auto px-2">
                Configure your attendance session by selecting a date and time slot to begin taking attendance for Section {section}.
              </p>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="lg" glow className="px-6 md:px-8 py-2 md:py-4 text-sm md:text-base">
                    <CalendarIcon className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                    Start Attendance Session
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md mx-4">
                  <DialogHeader>
                    <DialogTitle className="text-lg md:text-xl">Configure Attendance Session</DialogTitle>
                    <DialogDescription className="text-sm md:text-base">
                      Select date and session time to begin taking attendance.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3 md:space-y-4">
                    <div>
                      <label className="text-sm font-medium text-cyber-gray-700">Date</label>
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => date && setSelectedDate(date)}
                        disabled={(date) => {
                          const today = new Date();
                          const twoWeeksAgo = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000);
                          const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
                          return date < twoWeeksAgo || date > tomorrow;
                        }}
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
            </Card>

            {/* Previous Sessions */}
            {sectionSessions.length > 0 && (
              <Card variant="cyber">
                <div className="p-4 md:p-6">
                  <h3 className="text-lg md:text-xl font-bold text-cyber-gray-900 mb-3 md:mb-4 flex items-center gap-2">
                    <Clock className="w-4 h-4 md:w-5 md:h-5 text-cyber-yellow" />
                    Previous Sessions ({sectionSessions.length})
                  </h3>
                  <div className="space-y-2 md:space-y-3">
                    {sectionSessions.slice(0, 5).map((session: any) => {
                      const sessionDate = format(session.createdAt?.toDate() || new Date(), 'yyyy-MM-dd');
                      const sessionTime = session.session;
                      const sessionUrl = `/attendance/${encodeURIComponent(section)}?date=${sessionDate}&time=${sessionTime}`;

                      return (
                        <div
                          key={session.id}
                          className="flex items-center justify-between p-3 md:p-4 bg-cyber-gray-50 rounded-xl hover:bg-cyber-gray-100 cursor-pointer transition-colors group"
                          onClick={() => {
                            if (hasUnsavedChanges()) {
                              const confirmed = window.confirm(
                                'You have unsaved attendance changes. Are you sure you want to navigate to another session without saving?'
                              );
                              if (!confirmed) return;
                            }
                            router.push(sessionUrl);
                          }}
                        >
                          <div className="flex items-center gap-3 md:gap-4">
                            <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-cyber-yellow to-cyber-yellow-dark rounded-lg flex items-center justify-center">
                              <CalendarIcon className="w-4 h-4 md:w-5 md:h-5 text-cyber-gray-900" />
                            </div>
                            <div>
                              <p className="font-semibold text-cyber-gray-900 text-sm md:text-base">
                                {format(session.createdAt?.toDate() || new Date(), 'MMM dd, yyyy')}
                              </p>
                              <p className="text-xs md:text-sm text-cyber-gray-600">{session.session}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center gap-2 md:gap-4">
                              <div className="text-center">
                                <p className="text-sm md:text-lg font-bold text-green-600">{session.presentCount || 0}</p>
                                <p className="text-xs text-cyber-gray-600">Present</p>
                              </div>
                              <div className="text-center">
                                <p className="text-sm md:text-lg font-bold text-red-600">{session.absentCount || 0}</p>
                                <p className="text-xs text-cyber-gray-600">Absent</p>
                              </div>
                              <div className="text-center">
                                <p className="text-sm md:text-lg font-bold text-cyber-gray-900">
                                  {session.totalStudents > 0 ? Math.round(((session.presentCount || 0) / session.totalStudents) * 100) : 0}%
                                </p>
                                <p className="text-xs text-cyber-gray-600">Attendance</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {sectionSessions.length > 5 && (
                    <div className="mt-3 md:mt-4 text-center">
                      <Button
                        variant="outline"
                        onClick={() => router.push('/reports')}
                        className="w-full text-sm md:text-base"
                      >
                        View All Sessions ({sectionSessions.length})
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Stats Footer */}
            <div className="flex items-center justify-center space-x-3 md:space-x-4 text-xs md:text-sm text-cyber-gray-500">
              <div className="flex items-center space-x-1">
                <Users className="w-3 h-3 md:w-4 md:h-4" />
                <span>{students.length} students loaded</span>
              </div>
              <div className="flex items-center space-x-1">
                <CalendarIcon className="w-3 h-3 md:w-4 md:h-4" />
                <span>Session ready</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}