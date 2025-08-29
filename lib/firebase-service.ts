import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  Timestamp,
  writeBatch,
  getDoc,
  setDoc,
  limit,
  startAt
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Cache for student data
const studentsCache = new Map<string, { data: any[], timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Cache for attendance sessions
const sessionsCache = new Map<string, { data: any[], timestamp: number }>();

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
  }, count: number = 10, offset: number = 0) {
    const cacheKey = `sessions_${JSON.stringify(filters)}_${count}_${offset}`;
    const now = Date.now();

    // Check cache first
    const cached = sessionsCache.get(cacheKey);
    if (cached && (now - cached.timestamp) < CACHE_DURATION) {
      return cached.data;
    }

    try {
      let q = query(collection(db, 'attendance_sessions'), limit(count), startAt(offset));

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
      }));

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
        .sort((a, b) => b.createdAt?.toDate() - a.createdAt?.toDate())
        .slice(0, 5);

      // Calculate weekly stats (last 7 days)
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const weeklySessions = sessions.filter(s =>
        s.createdAt?.toDate() >= weekAgo
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
        };
      }
      return null;
    } catch (error) {
      console.error('Error getting session by ID:', error);
      throw new Error('Failed to get session data. Please check your connection and try again.');
    }
  }

  // Clear all caches (useful after logout or data changes)
  static clearCache() {
    studentsCache.clear();
    sessionsCache.clear();
  }
}