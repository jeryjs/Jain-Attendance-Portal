// app/api/cron/route.ts
// Cron job to send absence notifications via SMS
// Runs daily at 11 AM UTC (5:00 PM IST) via Vercel Cron

import { NextRequest, NextResponse } from 'next/server';
import { AttendanceSession, Student } from '@/lib/types';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, doc, setDoc, Timestamp, writeBatch } from 'firebase/firestore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Max 60 seconds for Vercel Hobby

// Initialize Firebase (singleton pattern)
function getFirebaseApp() {
  if (getApps().length === 0) {
    const firebaseConfig = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    };
    
    return initializeApp(firebaseConfig);
  }
  return getApps()[0];
}

interface AbsenceNotification {
  usn: string;
  name: string;
  phone: string;
  missedSessions: string[];
  guid?: string;
  status: string; 
  sentAt?: Date;
}

interface SmsRecipient {
  phone: string;
  templateVars: string[];
}

interface SmsResult {
  phone: string;
  success: boolean;
  guid?: string;
  error?: string;
  errorCode?: string;
}

/**
/**
 * Send SMS notifications via SMS API
 */
async function sendAbsenceNotifications(recipients: SmsRecipient[]): Promise<SmsResult[]> {
  const SMS_DLT_CONFIG = JSON.parse(process.env.SMS_DLT_CONFIG || '{}') as { 
    API_URL: string; 
    API_KEY: string; 
    TEMPLATE_TEXT: string;
    TEMPLATE_ID: number;
  };

  if (!SMS_DLT_CONFIG.API_KEY) {
    throw new Error('SMS_API_KEY not configured');
  }

  const smsResponse = await fetch(`${SMS_DLT_CONFIG.API_URL}/api/sms/send`, {
    method: 'POST',
    headers: {
      'X-API-Key': SMS_DLT_CONFIG.API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      template: SMS_DLT_CONFIG.TEMPLATE_TEXT,
      templateId: SMS_DLT_CONFIG.TEMPLATE_ID,
      recipients
    })
  });

  if (!smsResponse.ok) {
    const errorText = await smsResponse.text();
    throw new Error(`SMS API HTTP error: ${smsResponse.status} - ${errorText}`);
  }

  const smsResult = await smsResponse.json();

  // Notify vishal sir and me
  await fetch('https://sms-api.sa-fet.com/api/sms/send', {
    method: 'POST',
    headers: {},
    body: JSON.stringify({
      template: SMS_DLT_CONFIG.TEMPLATE_TEXT,
      templateId: SMS_DLT_CONFIG.TEMPLATE_ID,
      recipients: [
        { phone: '9629519659', templateVars: [`\n--${smsResult.message}--\n`, `\n--${smsResult.summary}--`] },
        { phone: '7892908515', templateVars: [`\n--${smsResult.message}--\n`, `\n--${smsResult.summary}--`] }
      ]
    }),
  });
  
  // Return results from SMS API
  return smsResult.results || [];
}
/**
 * Process absences for a specific date
 * Returns notifications data to be stored in Firestore
 */
async function processAbsencesForDate(date: string): Promise<AbsenceNotification[]> {
  const db = getFirestore(getFirebaseApp());
  
  console.log(`[CRON] Processing absences for ${date}`);

  // Get all sessions for the specified date
  const sessionsRef = collection(db, 'attendance_sessions');
  const sessionsQuery = query(sessionsRef, where('date', '==', date));
  const sessionsSnapshot = await getDocs(sessionsQuery);

  if (sessionsSnapshot.empty) {
    console.log(`[CRON] No sessions found for ${date}`);
    return [];
  }

  const sessions = sessionsSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as AttendanceSession[];

  console.log(`[CRON] Found ${sessions.length} sessions for ${date}`);

  // Group sessions by section
  const sessionsBySection = sessions.reduce((acc, session) => {
    const section = session.section;
    if (!acc[section]) acc[section] = [];
    acc[section].push(session);
    return acc;
  }, {} as Record<string, any[]>);

  const notifications: AbsenceNotification[] = [];

  // Process each section
  for (const [section, sectionSessions] of Object.entries(sessionsBySection)) {
    console.log(`[CRON] Processing section ${section} with ${sectionSessions.length} sessions`);

    // Get all students in this section
    const studentsRef = collection(db, 'students');
    const studentsQuery = query(studentsRef, where('section', '==', section));
    const studentsSnapshot = await getDocs(studentsQuery);

    const students = studentsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Student[];

    // Track absences per student
    const absentSessions: Record<string, string[]> = {};

    for (const session of sectionSessions) {
      const presentStudents = session.presentStudents || [];
      
      // Find absent students
      for (const student of students) {
        const usn = student.usn;
        if (!presentStudents.includes(usn)) {
          if (!absentSessions[usn]) {
            absentSessions[usn] = [];
          }
          absentSessions[usn].push(session.session);
        }
      }
    }

    // Create notifications for students with significant absences
    for (const [usn, missedSessions] of Object.entries(absentSessions)) {
      // Apply leeway: only send if absent for 2+ classes (unless only 1-2 sessions held)
      const shouldNotify = missedSessions.length >= 2 || 
                          (sectionSessions.length <= 2 && missedSessions.length > 0);

      if (!shouldNotify) {
        // console.log(`[CRON] Skipping ${usn} - only ${missedSessions.length} absences with ${sectionSessions.length} sessions`);
        continue;
      }

      const student = students.find(s => s.usn === usn);
      if (!student) {
        console.warn(`[CRON] Student not found for USN ${usn}`);
        continue;
      }

      // Check if student has phone number
      if (!student.phone) {
        console.warn(`[CRON] No phone number for student ${usn}`);
        continue;
      }

      notifications.push({
        usn,
        name: student.name,
        phone: student.phone,
        missedSessions,
        status: 'pending'
      });
    }
  }

  console.log(`[CRON] Generated ${notifications.length} notifications for ${date}`);
  return notifications;
}

/**
 * Store notifications and their delivery status in Firestore
 */
async function storeNotifications(
  date: string,
  notifications: AbsenceNotification[]
): Promise<void> {
  const db = getFirestore(getFirebaseApp());

  // Store as a single document per date
  const docRef = doc(db, 'attendance_notifications', date);
  
  await setDoc(docRef, {
    date,
    totalNotifications: notifications.length,
    successCount: notifications.filter(n => n.status === 'sent').length,
    failedCount: notifications.filter(n => n.status !== 'sent').length,
    notifications,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  });

  console.log(`[CRON] Stored notification data for ${date}`);
}

/**
 * Main cron job handler
 * Triggered by Vercel Cron (configured in vercel.json)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.error('[CRON] Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get target date from query param or use today
    const searchParams = request.nextUrl.searchParams;
    const targetDateParam = searchParams.get('date');
    const targetDate = targetDateParam || (() => {
      return (new Date()).toISOString().split('T')[0]; // YYYY-MM-DD
    })();

    console.log(`[CRON] Target date: ${targetDate}`);

    // Check if notifications for this date already exist
    const db = getFirestore(getFirebaseApp());
    const docSnap = await getDocs(query(collection(db, 'attendance_notifications'), where('date', '==', targetDate)));
    if (!docSnap.empty) {
      console.log(`[CRON] Notifications for ${targetDate} already exist.`);
      if (searchParams.get('force') === 'true') {
        console.log('[CRON] Force flag detected, proceeding to re-send notifications.');
      } else {
        return NextResponse.json({ success: true, message: 'Job already run for this date', date: targetDate });
      }
    }

    console.log('[CRON] Starting daily absence notification job...');

    // Step 1: Process absences and generate notifications
    const notifications = await processAbsencesForDate(targetDate);

    if (notifications.length === 0) {
      console.log('[CRON] No notifications to send');
      return NextResponse.json({
        success: true,
        message: 'No notifications to send',
        date: targetDate,
        count: 0
      });
    }

    // Step 2: Send SMS notifications
    const recipients: SmsRecipient[] = notifications.map(n => ({
      phone: n.phone,
      templateVars: [
        n.missedSessions.length.toString(),
        targetDate.split('-').reverse().map((part, i) => i === 0 ? part.slice(-2) : part).join('/') // yyyy-mm-dd to dd/mm/yyyy
      ]
    }));

    console.log(`[CRON] Sending ${recipients.length} SMS notifications...`);
    const smsResults = await sendAbsenceNotifications(recipients);

    // Step 3: Update notification statuses with SMS results
    for (let i = 0; i < notifications.length; i++) {
      const result = smsResults[i];
      if (!result) continue;
      notifications[i].guid = result.guid;
      notifications[i].status = result.error || (result.success ? 'sent' : 'failed');
      notifications[i].sentAt = new Date();
    }

    // Step 4: Store in Firestore
    await storeNotifications(targetDate, notifications);

    const successCount = notifications.filter(n => n.status === 'sent').length;
    const failedCount = notifications.filter(n => n.status !== 'sent').length;
    console.log(`[CRON] Job completed: ${successCount} sent, ${failedCount} failed`);

    return NextResponse.json({
      success: true,
      date: targetDate,
      totalNotifications: notifications.length,
      successCount,
      failedCount,
      message: `Sent ${successCount} notifications, ${failedCount} failed`
    });

  } catch (error) {
    console.error('[CRON] Job failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// Allow manual triggering via POST (for testing)
export async function POST(request: NextRequest) {
  return GET(request);
}
