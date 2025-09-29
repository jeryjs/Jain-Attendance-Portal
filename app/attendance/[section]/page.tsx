'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { FirebaseService } from '@/lib/firebase-service';
import { AttendanceSession, SESSION_OPTIONS, SessionOption, Student } from '@/lib/types';
import { format } from 'date-fns';
import {
  ArrowLeft,
  BarChart3,
  Calendar as CalendarIcon,
  Edit,
  Save,
  UserCheck,
  Users
} from 'lucide-react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import AttendanceView from './AttendanceView';
import ConfigureSessionDialog from './ConfigureSessionDialog';
import PreviousSessions from './PreviousSessions';
import FeedbackCard from '@/components/FeedbackCard';

export default function SectionAttendancePage() {
  // Router & context
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading, isTeacher, setRecentSections } = useAuth();
  const { addToast } = useToast();
  const section = decodeURIComponent(params.section as string);

  // URL params & derived flags
  const urlDate = searchParams.get('date');
  const urlTime = searchParams.get('time');
  const isEditMode = searchParams.get('edit') === 'true';
  const isAdminView = searchParams.get('admin') === 'true' && user?.role === 'admin';

  // State
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Record<string, boolean>>({});
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loadingStudents, setLoadingData] = useState(true);
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [existingSession, setExistingSession] = useState<AttendanceSession | null>(null); // current session data
  const [originalAttendance, setOriginalAttendance] = useState<Record<string, boolean>>({}); // for change detection

  // Dialog initial values (synced with URL)
  const [selectedDate, setSelectedDate] = useState<Date>(urlDate ? new Date(urlDate) : new Date());
  const [selectedSession, setSelectedSession] = useState<SessionOption>((urlTime as SessionOption) || '8.45-9.45');

  // Sync selectedDate and selectedSession with URL params
  useEffect(() => {
    setSelectedDate(urlDate ? new Date(urlDate) : new Date());
    setSelectedSession((urlTime as SessionOption) || '8.45-9.45');
  }, [urlDate, urlTime]);

  // Date validation - restrict to reasonable range
  const isValidDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const initialDate = new Date('2025-08-25'); // portal launch date
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    return date >= initialDate && date <= tomorrow;
  };

  // Check if session params are valid
  const isValidSession = urlDate && urlTime && SESSION_OPTIONS.some(opt => opt.key === urlTime) && isValidDate(urlDate);
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
    if (loading) return;

    try {
      setLoadingData(true);
      const studentsData = await FirebaseService.getStudents(section);
      setStudents(studentsData);

      // reset unnecessary states
      setExistingSession(null);
      setOriginalAttendance({});

      // Initialize attendance state
      const initialAttendance: Record<string, boolean> = {};
      studentsData.forEach(student => {
        initialAttendance[student.usn] = false;
      });
      setAttendance(initialAttendance);



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

          // if (existingSession) {
          //   addToast({
          //     title: "Session Attendance Already Taken",
          //     description: "Attendance has already been recorded for this session.",
          //     variant: "default"
          //   });
          // }
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



  // Navigation warning for unsaved changes
  useEffect(() => {
    const hasUnsaved =
      isValidSession &&
      originalAttendance &&
      Object.keys(attendance).some(
        usn => (attendance[usn] ?? false) !== (originalAttendance[usn] ?? false)
      );
    const warn = 'You have unsaved attendance changes. Are you sure you want to leave without saving?';

    const confirmOrStay = () => hasUnsaved && !window.confirm(warn);

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (confirmOrStay()) {
        e.preventDefault();
        e.returnValue = warn;
        return warn;
      }
    };

    const handlePopState = (e: PopStateEvent) => {
      if (confirmOrStay()) {
        window.history.pushState(null, '', window.location.href);
        e.preventDefault?.();
      }
    };

    // Next.js router event (if available)
    // @ts-ignore
    const handleRouteChangeStart = () => {
      if (confirmOrStay()) {
        // @ts-ignore
        router.events?.emit('routeChangeError');
        throw 'Route change aborted due to unsaved changes';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);
    // @ts-ignore
    router.events?.on?.('routeChangeStart', handleRouteChangeStart);

    if (hasUnsaved) window.history.pushState(null, '', window.location.href);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
      // @ts-ignore
      router.events?.off?.('routeChangeStart', handleRouteChangeStart);
    };
  }, [attendance, originalAttendance, isValidSession, router]);

  const handleSessionConfirm = async (selectedDate: Date, selectedSession: SessionOption) => {
    // If update configuration
    if (isValidSession && existingSession) {
      setSelectedDate(selectedDate);
      setSelectedSession(selectedSession);
      return;
    };
    // Check for unsaved changes before proceeding
    if (hasUnsavedChanges()) {
      const confirmed = window.confirm(
        'You have unsaved attendance changes. Starting a new session will lose these changes. Are you sure you want to continue?'
      );
      if (!confirmed) return;
    }

    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const timeStr = selectedSession;
    router.push(`/attendance/${encodeURIComponent(section)}?date=${dateStr}&time=${timeStr}`);
  };

  const handleSaveAttendance = async () => {
    if (!isValidSession) return;

    try {
      setSavingAttendance(true);

      const attendanceRecords = Object.entries(attendance).map(([usn, isPresent]) => ({
        studentUsn: usn,
        isPresent,
      }));

      // Check if user changed date/time during edit mode - if so, trigger migration
      const currentDateStr = format(selectedDate, 'yyyy-MM-dd');
      const currentTimeStr = selectedSession;
      const hasDateTimeChanged = isEditMode && (currentDateStr !== urlDate || currentTimeStr !== urlTime);

      if (hasDateTimeChanged) {
        // User changed date/time during edit - trigger migration instead of regular save
        const newSessionKey = `${section}_${currentDateStr}_${currentTimeStr}`;

        try {
          // Check if target session already exists
          const targetSession = await FirebaseService.getSessionById(newSessionKey);
          if (targetSession) {
            addToast({
              title: "Session Already Exists",
              description: `A session already exists for ${currentDateStr} at ${currentTimeStr}. Cannot move current session there.`,
              variant: "destructive"
            });
            return;
          }

          // Migrate the session
          await FirebaseService.migrateSession(sessionKey, {
            section,
            date: currentDateStr,
            session: currentTimeStr,
            teacherId: user?.uid || '',
            teacherEmail: user?.email || '',
            totalStudents: students.length,
            records: attendanceRecords,
            editHistory: existingSession?.editHistory || []
          });

          addToast({
            title: "Session Updated",
            description: `Session successfully moved to ${currentDateStr} at ${currentTimeStr}`,
            variant: "success"
          });

          // Navigate to the new session
          router.replace(`/attendance/${encodeURIComponent(section)}?date=${currentDateStr}&time=${currentTimeStr}`);
          return;
        } catch (error) {
          console.error('Error migrating session during save:', error);
          addToast({
            title: "Migration Failed",
            description: error instanceof Error ? error.message : "Failed to update session date/time",
            variant: "destructive"
          });
          return;
        }
      }

      // Regular save logic (no date/time change)
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

      // save this section to local storage for quick access next time
      setRecentSections(prev => [section, ...prev.filter(s => s !== section)].slice(0, 9));

      if (isEditMode) router.replace(`/attendance/${encodeURIComponent(section)}?date=${urlDate}&time=${urlTime}`);
      else {
        // router.refresh();  // avoid calling location.reload as i wanna retain the cache

        // For new sessions, reload the data to update the UI state properly
        await loadData(); // This will fetch the newly created session and update existingSession state

        // Update the original attendance to reflect the saved state
        setOriginalAttendance({ ...attendance });
      }
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
    if (isValidSession) router.push(`/attendance/${encodeURIComponent(section)}`);
    else router.push('/attendance');
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
              Back to {isValidSession ? section : 'Attendance'}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/reports?section=' + encodeURIComponent(section))}
              className="flex items-center gap-2"
            >
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Go to Analysis</span>
            </Button>
          </div>

          <Card variant="cyber" className="text-center py-8 md:py-12">
            <div className="text-center mb-4 md:mb-8">
              <div className="flex items-center justify-center mb-2 md:mb-4">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-cyber-yellow to-cyber-yellow-dark rounded-2xl flex items-center justify-center shadow-2xl shadow-cyber-yellow/25">
                  <UserCheck className="w-6 h-6 md:w-8 md:h-8 text-cyber-gray-900" />
                </div>
              </div>

              <h1 className="text-2xl md:text-3xl lg:text-5xl font-bold mb-2 md:mb-4">
                <span className="bg-gradient-to-r from-cyber-gray-900 to-cyber-gray-700 bg-clip-text text-transparent">
                  Section - {section}
                </span>
              </h1>

              <p className="text-sm md:text-xl text-cyber-gray-600 mb-3 md:mb-6">
                {students.length} students • {isValidSession ? (existingSession ? (isEditMode ? 'Editing Session' : 'Viewing Session') : 'New Session') : 'Configure Session'}
              </p>
            </div>

            {/* Start New Session Card */}
            {!isValidSession && <Button
              size="lg"
              glow
              className="px-6 md:px-8 py-2 md:py-4 text-sm md:text-base"
              onClick={() => setIsDialogOpen(true)}
            >
              <CalendarIcon className="w-4 h-4 md:w-5 md:h-5 mr-2" />
              Start Attendance Session
            </Button>}
          </Card>
        </div>

        {/* Attendance Status, Session Info & Stats, and Attendance Views */}
        {isValidSession && <AttendanceView
          existingSession={existingSession}
          isValidSession={!!isValidSession}
          selectedDate={selectedDate}
          selectedSession={selectedSession}
          stats={stats}
          isViewOnly={isViewOnly}
          setIsDialogOpen={setIsDialogOpen}
          students={students}
          attendance={attendance}
          setAttendance={setAttendance}
          isEditMode={isEditMode}
        />}

        {/* Empty State */}
        {!isValidSession && !loadingStudents && (
          <div className="space-y-4 md:space-y-6">
            {/* Previous Sessions */}
            <PreviousSessions
              section={section}
              isAdminView={isAdminView}
              userId={user?.uid}
            />

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

        {/* Configure Session Dialog */}
        <ConfigureSessionDialog
          isOpen={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          initialDate={selectedDate}
          initialSession={selectedSession}
          isNewSession={!isValidSession || !existingSession}
          onConfirm={handleSessionConfirm}
        />
        {/* Feedback */}
        <div className="mt-6">
          <FeedbackCard isAdminView={isAdminView} />
        </div>
      </div>
    </div>
  );
}