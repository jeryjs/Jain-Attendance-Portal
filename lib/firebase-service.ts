import { DateRange } from '@/components/ui/date-picker';
import { db } from '@/lib/firebase';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  startAfter,
  Timestamp,
  updateDoc,
  where,
  writeBatch
} from 'firebase/firestore';
import { AttendanceSession, Student } from './types';

// Cache for student data
const studentsCache = new Map<string, { data: any[], timestamp: number }>();
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

// Cache for attendance sessions
const sessionsCache = new Map<string, { data: any, timestamp: number }>();
const MAX_CACHE_SIZE = 100; // Prevent memory bloat

export class FirebaseService {
  // Get students with caching
  static async getStudents(section: string) {
    const cacheKey = `students_${section}`;
    const now = Date.now();

    // Check cache first
    const cached = studentsCache.get(cacheKey);
    if (cached && (now - cached.timestamp) < CACHE_DURATION) {
      return cached.data;
    }

    try {
      const studentsRef = collection(db, 'students');
      const q = query(studentsRef, where('section', '==', section));
      const querySnapshot = await getDocs(q);

      const studentsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
        usn: doc.data().usn,
        section: doc.data().section
      }));

      // Sort students by USN
      studentsData.sort((a, b) => a.usn.localeCompare(b.usn));

      // Cache the result
      studentsCache.set(cacheKey, {
        data: studentsData,
        timestamp: now
      });

      return studentsData;
    } catch (error) {
      console.error('Error fetching students:', error);
      throw new Error(`Failed to load students for section ${section}. Please check your connection and try again.`);
    }
  }

  // Batch save attendance records (optimized: store only present students in session)
  static async saveAttendanceBatch(attendanceData: {
    sessionId: string;
    records: Array<{
      studentUsn: string;
      isPresent: boolean;
    }>;
    sessionData: {
      section: string;
      date: string;
      session: string;
      teacherId: string;
      teacherEmail: string;
      totalStudents: number;
    };
  }) {
    const batch = writeBatch(db);

    try {
      // Filter only present students
      const presentStudents = attendanceData.records
        .filter(record => record.isPresent)
        .map(record => record.studentUsn);

      // Calculate counts
      const presentCount = presentStudents.length;
      const absentCount = attendanceData.records.length - presentCount;

      // Create session document with embedded attendance data
      const sessionRef = doc(collection(db, 'attendance_sessions'));
      batch.set(sessionRef, {
        ...attendanceData.sessionData,
        presentStudents, // Array of USNs who are present
        presentCount,
        absentCount,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      await batch.commit();

      // Clear relevant caches
      sessionsCache.clear();
      studentsCache.clear();

      return sessionRef.id;
    } catch (error) {
      console.error('Error saving attendance batch:', error);
      throw new Error('Failed to save attendance data. Please check your connection and try again.');
    }
  }

  // Update existing attendance session
  static async updateAttendanceSession(sessionId: string, updateData: {
    records: Array<{ studentUsn: string; isPresent: boolean }>;
    sessionData: any;
    editHistory?: Array<{ timestamp: Date; email: string; details: string }>;
  }) {
    try {
      const sessionRef = doc(db, 'attendance_sessions', sessionId);

      // Filter only present students
      const presentStudents = updateData.records
        .filter(record => record.isPresent)
        .map(record => record.studentUsn);

      const presentCount = presentStudents.length;
      const absentCount = updateData.records.length - presentCount;

      await updateDoc(sessionRef, {
        presentStudents,
        presentCount,
        absentCount,
        updatedAt: Timestamp.now(),
        editHistory: updateData.editHistory || []
      });

      // Clear relevant caches
      sessionsCache.clear();

      return sessionId;
    } catch (error) {
      console.error('Error updating attendance session:', error);
      throw new Error('Failed to update attendance data. Please check your connection and try again.');
    }
  }
  // Get attendance sessions with caching
  static async getAttendanceSessions(filters?: {
    section?: string;
    teacherId?: string;
    dateRange?: { start: Date; end: Date };
  }, count: number = 30) {
    const cacheKey = `sessions_${JSON.stringify(filters)}_${count}`;
    const now = Date.now();

    // Check cache first
    const cached = sessionsCache.get(cacheKey);
    if (cached && (now - cached.timestamp) < CACHE_DURATION) {
      return Array.isArray(cached.data) ? cached.data as AttendanceSession[] : cached.data.sessions as AttendanceSession[];
    }

    try {
      let q = query(collection(db, 'attendance_sessions'), limit(count), orderBy('date', 'desc'));

      if (filters?.section) {
        q = query(q, where('section', '==', filters.section));
      }

      if (filters?.teacherId) {
        q = query(q, where('teacherId', '==', filters.teacherId));
      }

      const querySnapshot = await getDocs(q);
      const sessions = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AttendanceSession[];

      // Cache the result
      sessionsCache.set(cacheKey, {
        data: sessions,
        timestamp: now
      });

      return sessions;
    } catch (error) {
      console.error('Error fetching attendance sessions:', error);
      throw error;
    }
  }

  // Get attendance sessions with Firestore pagination
  static async getAttendanceSessionsPaginated(options: {
    section?: string;
    teacherId?: string;
    filters?: Array<{
      field: 'date' | 'attendance' | 'session';
      operator: 'eq' | 'gte' | 'lte';
      value: string | number;
    }>;
    limit: number;
    startAfter?: any;
  }) {
    // Create cache key
    const cacheKey = `sessions_paginated_${JSON.stringify({
      section: options.section,
      teacherId: options.teacherId,
      filters: options.filters,
      limit: options.limit,
      startAfter: options.startAfter?.id || 'first'
    })}`;

    // Check cache first
    const now = Date.now();
    const cached = sessionsCache.get(cacheKey);
    if (cached && (now - cached.timestamp) < CACHE_DURATION) {
      return cached.data;
    }

    try {
      let q = query(collection(db, 'attendance_sessions'));

      // Apply basic filters
      if (options.section) {
        q = query(q, where('section', '==', options.section));
      }
      if (options.teacherId) {
        q = query(q, where('teacherId', '==', options.teacherId));
      }

      // Apply custom filters
      if (options.filters) {
        for (const filter of options.filters) {
          switch (filter.field) {
            case 'date':
              if (filter.operator === 'eq') {
                q = query(q, where('date', '==', filter.value));
              } else if (filter.operator === 'gte') {
                q = query(q, where('date', '>=', filter.value));
              } else if (filter.operator === 'lte') {
                q = query(q, where('date', '<=', filter.value));
              }
              break;
            case 'session':
              if (filter.operator === 'eq') {
                q = query(q, where('session', '==', filter.value));
              }
              break;
            // Note: attendance rate filtering is done post-fetch due to Firestore limitations
          }
        }
      }

      // Order by date descending
      q = query(q, orderBy('date', 'desc'));

      // Add pagination
      if (options.startAfter) {
        q = query(q, startAfter(options.startAfter));
      }
      q = query(q, limit(options.limit));

      const querySnapshot = await getDocs(q);
      let sessions = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AttendanceSession[];

      // Apply attendance rate filters (post-fetch)
      if (options.filters && options.filters.length > 0) {
        sessions = sessions.filter(session => {
          for (const filter of options.filters!) {
            if (filter.field === 'attendance') {
              const rate = session.totalStudents > 0 
                ? Math.round(((session.presentCount || 0) / session.totalStudents) * 100)
                : 0;
              
              const numValue = typeof filter.value === 'string' ? parseInt(filter.value) : filter.value;
              
              switch (filter.operator) {
                case 'eq':
                  if (rate !== numValue) return false;
                  break;
                case 'gte':
                  if (rate < numValue) return false;
                  break;
                case 'lte':
                  if (rate > numValue) return false;
                  break;
              }
            }
          }
          return true;
        });
      }

      // Get total count (for display purposes) - smart caching using existing sessions cache
      let totalCount: number;
      
      // Find any cached key with matching section/teacherId (regardless of filters)
      let validCachedCount: number | null = null;
      for (const [key, cached] of sessionsCache.entries()) {
        if (key.startsWith('sessions_paginated_') && (now - cached.timestamp) < CACHE_DURATION) {
          try {
            const parsed = JSON.parse(key.replace('sessions_paginated_', ''));
            if (parsed.section === options.section && parsed.teacherId === options.teacherId) {
              validCachedCount = cached.data.total;
              break; // Use the first valid cached count we find
            }
          } catch {
            continue;
          }
        }
      }
      
      if (validCachedCount !== null) {
        totalCount = validCachedCount;
      } else {
        // No valid cache, fetch count from server
        const totalQuery = query(collection(db, 'attendance_sessions'));
        let totalCountQuery = totalQuery;
        if (options.section) {
          totalCountQuery = query(totalCountQuery, where('section', '==', options.section));
        }
        if (options.teacherId) {
          totalCountQuery = query(totalCountQuery, where('teacherId', '==', options.teacherId));
        }
        
        const totalCountSnapshot = await getCountFromServer(totalCountQuery);
        totalCount = totalCountSnapshot.data().count;
      }

      const result = {
        sessions,
        hasMore: sessions.length === options.limit,
        lastDoc: querySnapshot.docs[querySnapshot.docs.length - 1],
        total: totalCount
      };

      // Cache the result for all pages with size management
      if (sessionsCache.size >= MAX_CACHE_SIZE) {
        // Remove oldest entries when cache gets too large
        const oldestKey = sessionsCache.keys().next().value;
        if (oldestKey) {
          sessionsCache.delete(oldestKey);
        }
      }
      
      sessionsCache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });

      return result;
    } catch (error) {
      console.error('Error fetching paginated attendance sessions:', error);
      throw error;
    }
  }

  // Get attendance statistics with optimized queries
  static async getAttendanceStats(section?: string, teacherId?: string) {
    try {
      const sessions = await this.getAttendanceSessions({ section, teacherId });

      if (sessions.length === 0) {
        return {
          totalSessions: 0,
          totalStudents: 0,
          averageAttendance: 0,
          recentSessions: [],
          weeklyStats: { present: 0, absent: 0, total: 0 }
        };
      }

      // Calculate stats from session documents (presentStudents array)
      const totalSessions = sessions.length;
      const totalStudents = Math.max(...sessions.map(s => s.totalStudents || 0));
      const totalPresent = sessions.reduce((sum, s) => sum + (s.presentCount || 0), 0);
      const totalAbsent = sessions.reduce((sum, s) => sum + (s.absentCount || 0), 0);
      const averageAttendance = totalSessions > 0 ?
        Math.round(((totalPresent / (totalPresent + totalAbsent)) * 100)) : 0;

      // Get recent sessions
      const recentSessions = sessions
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5);

      // Calculate weekly stats (last 7 days)
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const weeklySessions = sessions.filter(s =>
        new Date(s.date) >= weekAgo
      );

      const weeklyStats = {
        present: weeklySessions.reduce((sum, s) => sum + (s.presentCount || 0), 0),
        absent: weeklySessions.reduce((sum, s) => sum + (s.absentCount || 0), 0),
        total: weeklySessions.reduce((sum, s) => sum + (s.totalStudents || 0), 0)
      };

      return {
        totalSessions,
        totalStudents,
        averageAttendance,
        recentSessions,
        weeklyStats
      };
    } catch (error) {
      console.error('Error calculating attendance stats:', error);
      throw error;
    }
  }

  // Save or update attendance session with consistent ID
  static async saveOrUpdateSession(sessionData: {
    section: string;
    date: string;
    session: string;
    teacherId: string;
    teacherEmail: string;
    totalStudents: number;
    records: Array<{ studentUsn: string; isPresent: boolean }>;
    editHistory?: Array<{ timestamp: Date; email: string; details: string }>;
  }) {
    try {
      // Use consistent ID format: section_date_time
      const sessionId = `${sessionData.section}_${sessionData.date}_${sessionData.session}`;
      const sessionRef = doc(db, 'attendance_sessions', sessionId);

      // Filter only present students
      const presentStudents = sessionData.records
        .filter(record => record.isPresent)
        .map(record => record.studentUsn);

      const presentCount = presentStudents.length;
      const absentCount = sessionData.records.length - presentCount;

      // Check if session exists
      const sessionSnap = await getDoc(sessionRef);
      const isNew = !sessionSnap.exists();

      const sessionDoc = {
        section: sessionData.section,
        date: sessionData.date,
        session: sessionData.session,
        teacherId: sessionData.teacherId,
        teacherEmail: sessionData.teacherEmail,
        totalStudents: sessionData.totalStudents,
        presentStudents,
        presentCount,
        absentCount,
        editHistory: sessionData.editHistory || [],
        createdAt: isNew ? Timestamp.now() : sessionSnap.data()?.createdAt,
        updatedAt: Timestamp.now()
      };

      await setDoc(sessionRef, sessionDoc);

      // Clear relevant caches
      sessionsCache.clear();

      return sessionId;
    } catch (error) {
      console.error('Error saving/updating session:', error);
      throw new Error('Failed to save session data. Please check your connection and try again.');
    }
  }

  // Get session by ID directly
  static async getSessionById(sessionId: string) {
    try {
      const sessionRef = doc(db, 'attendance_sessions', sessionId);
      const sessionSnap = await getDoc(sessionRef);

      if (sessionSnap.exists()) {
        const data = sessionSnap.data();
        return {
          id: sessionSnap.id,
          ...data,
          presentStudents: data.presentStudents || [],
          createdAt: data.createdAt,
          updatedAt: data.updatedAt
        } as AttendanceSession;
      }
      return null;
    } catch (error) {
      console.error('Error getting session by ID:', error);
      throw new Error('Failed to get session data. Please check your connection and try again.');
    }
  }

  // Migrate session data from old session to new session (for date/time corrections)
  static async migrateSession(oldSessionId: string, newSessionData: {
    section: string;
    date: string;
    session: string;
    teacherId: string;
    teacherEmail: string;
    totalStudents: number;
    records: Array<{ studentUsn: string; isPresent: boolean }>;
    editHistory?: Array<{ timestamp: Date; email: string; details: string }>;
  }) {
    try {
      const newSessionId = `${newSessionData.section}_${newSessionData.date}_${newSessionData.session}`;
      
      // Check if target session already exists
      const newSessionRef = doc(db, 'attendance_sessions', newSessionId);
      const newSessionSnap = await getDoc(newSessionRef);
      
      if (newSessionSnap.exists()) {
        throw new Error(`A session already exists for ${newSessionData.date} at ${newSessionData.session}. Cannot migrate to existing session.`);
      }
      
      // Get the old session data
      const oldSessionRef = doc(db, 'attendance_sessions', oldSessionId);
      const oldSessionSnap = await getDoc(oldSessionRef);
      
      if (!oldSessionSnap.exists()) {
        throw new Error('Original session not found. Cannot migrate.');
      }
      
      const oldSessionData = oldSessionSnap.data();
      
      // Filter only present students from new records
      const presentStudents = newSessionData.records
        .filter(record => record.isPresent)
        .map(record => record.studentUsn);
      
      const presentCount = presentStudents.length;
      const absentCount = newSessionData.records.length - presentCount;
      
      // Add migration entry to edit history
      const migrationHistory = [
        ...(newSessionData.editHistory || []),
        {
          timestamp: new Date(),
          email: newSessionData.teacherEmail,
          details: `Session migrated from ${oldSessionId.split('_').slice(1).join(' at ')} to ${newSessionData.date} at ${newSessionData.session}`
        }
      ];
      
      // Create new session with migrated data
      const newSessionDoc = {
        section: newSessionData.section,
        date: newSessionData.date,
        session: newSessionData.session,
        teacherId: newSessionData.teacherId,
        teacherEmail: newSessionData.teacherEmail,
        totalStudents: newSessionData.totalStudents,
        presentStudents,
        presentCount,
        absentCount,
        editHistory: migrationHistory,
        createdAt: oldSessionData.createdAt, // Preserve original creation time
        updatedAt: Timestamp.now()
      };
      
      // Use batch to ensure atomicity
      const batch = writeBatch(db);
      
      // Create new session
      batch.set(newSessionRef, newSessionDoc);
      
      // Delete old session
      batch.delete(oldSessionRef);
      
      await batch.commit();
      
      // Clear relevant caches
      sessionsCache.clear();
      
      return newSessionId;
    } catch (error) {
      console.error('Error migrating session:', error);
      throw error;
    }
  }

  // Clear all caches (useful after logout or data changes)
  static clearCache() {
    studentsCache.clear();
    sessionsCache.clear();
  }

  static async getAdminStudents(refetch = false, section?: string): Promise<Student[]> {
    const CACHE_KEY = 'adminStudentsCache';
    const CACHE_DURATION = 2 * 24 * 60 * 60 * 1000; // 48 hours

    let students: Student[] = [];
    const now = Date.now();

    // Read cache object from localStorage
    const cacheObj = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
    const cachedTimestamp = cacheObj.timestamp;
    const isCacheValid = cachedTimestamp && (now - cachedTimestamp) < CACHE_DURATION;

    if (!isCacheValid || refetch) {
      console.log('Fetching students from Firestore...');
      students = await getDocs(query(collection(db, 'students'), orderBy('usn'))).then(snapshot =>
        snapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name,
          usn: doc.data().usn,
          section: doc.data().section,
          createdAt: (doc as any)._document.createTime.timestamp.toDate() as Date // Firestore internal field
        }))
      ) as Student[];
      localStorage.setItem(CACHE_KEY, JSON.stringify({ students, timestamp: now }));
    } else {
      // TODO: Remove this check after 48 hrs (to phase out old cache format)
      if ((cacheObj?.students || [])[0]?.createdAt) {
        students = cacheObj.students || [];
      } else {
        return this.getAdminStudents(true, section);
      }
    }

    // Apply section filter if provided
    if (section) {
      students = students.filter((s: any) => s.section === section);
    }
    return students;
  }

  static async getAdminAttendanceSessions(refetch = false, filters?: {
    section?: string;
    teacherId?: string;
    dateRange?: DateRange;
  }) {
    const CACHE_KEY = 'adminAttendanceSessionsCache';
    const CACHE_DURATION = 2 * 24 * 60 * 60 * 1000; // 48 hours

    let sessions: AttendanceSession[] = [];
    const now = Date.now();

    // Read cache object from localStorage
    const cacheObj = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
    const cachedTimestamp = cacheObj.timestamp;
    const isCacheValid = cachedTimestamp && (now - cachedTimestamp) < CACHE_DURATION;

    if (!isCacheValid || refetch) {
      console.log('Fetching attendance sessions from Firestore...');
      sessions = await getDocs(query(collection(db, 'attendance_sessions'), orderBy('date'))).then(snapshot =>
        snapshot.docs.map(doc => ({ id: doc.id, ...doc.data()}))
      ) as AttendanceSession[];
      localStorage.setItem(CACHE_KEY, JSON.stringify({ sessions, timestamp: now }));
    } else {
      sessions = cacheObj.sessions || [];
    }

    // Apply filters if provided
    if (filters) {
      if (filters.section) sessions = sessions.filter((s: any) => s.section === filters.section);
      if (filters.teacherId) sessions = sessions.filter((s: any) => s.teacherId === filters.teacherId);
      if (filters.dateRange?.from || filters.dateRange?.to) {
        sessions = sessions.filter((s: any) => {
          const sessionDate = new Date(s.date);
          const fromDate = filters.dateRange?.from;
          const toDate = filters.dateRange?.to;

          // Normalize dates to start/end of day for inclusive comparison
          const sessionDateOnly = new Date(sessionDate.getFullYear(), sessionDate.getMonth(), sessionDate.getDate());
          const fromDateOnly = fromDate ? new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate()) : null;
          const toDateOnly = toDate ? new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate()) : null;

          // If only one date is selected, treat it as a single day
          if (fromDateOnly && !toDateOnly) {
            return sessionDateOnly.getTime() === fromDateOnly.getTime();
          }
          if (!fromDateOnly && toDateOnly) {
            return sessionDateOnly.getTime() === toDateOnly.getTime();
          }

          // Both dates selected - inclusive range
          if (fromDateOnly && toDateOnly) {
            return sessionDateOnly >= fromDateOnly && sessionDateOnly <= toDateOnly;
          }

          return true;
        });
      }
    }
    return sessions;
  }

  static async addStudent(studentData: Omit<Student, 'id' | 'createdAt'>) {
    try {
      const docRef = await addDoc(collection(db, 'students'), {
        ...studentData,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });

      // Clear cache
      studentsCache.clear();
      localStorage.removeItem('adminStudentsCache');

      return docRef.id;
    } catch (error) {
      console.error('Error adding student:', error);
      throw new Error('Failed to add student. Please check your connection and try again.');
    }
  }

  static async updateStudent(studentId: string, updateData: Partial<Omit<Student, 'id'>>) {
    try {
      const studentRef = doc(db, 'students', studentId);
      await updateDoc(studentRef, {
        ...updateData,
        updatedAt: Timestamp.now()
      });

      // Clear cache
      studentsCache.clear();
      localStorage.removeItem('adminStudentsCache');

      return studentId;
    } catch (error) {
      console.error('Error updating student:', error);
      throw new Error('Failed to update student. Please check your connection and try again.');
    }
  }

  static async deleteStudent(studentId: string) {
    try {
      const studentRef = doc(db, 'students', studentId);
      await deleteDoc(studentRef);

      // Clear cache
      studentsCache.clear();
      localStorage.removeItem('adminStudentsCache');

      return studentId;
    } catch (error) {
      console.error('Error deleting student:', error);
      throw new Error('Failed to delete student. Please check your connection and try again.');
    }
  }

  static async bulkAddStudents(students: Omit<Student, 'id'>[]) {
    const batch = writeBatch(db);

    try {
      const results = [];

      for (const studentData of students) {
        const docRef = doc(collection(db, 'students'));
        batch.set(docRef, {
          ...studentData,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        });
        results.push(docRef.id);
      }

      await batch.commit();

      // Clear cache
      studentsCache.clear();
      localStorage.removeItem('adminStudentsCache');

      return results;
    } catch (error) {
      console.error('Error bulk adding students:', error);
      throw new Error('Failed to add students. Please check your connection and try again.');
    }
  }
}