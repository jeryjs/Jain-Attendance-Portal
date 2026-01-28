// app/api/sms/delivery-report/route.ts
// Webhook endpoint for Pragati SMS delivery reports

import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

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

/**
 * Delivery Report status codes (from Pragati API docs)
 * Map to human-readable statuses
 */
const STATUS_CODES: Record<string, string> = {
  '1': 'delivered',
  '2': 'failed',
  '4': 'buffered',
  '8': 'sent_to_carrier',
  '16': 'rejected',
};

/**
 * Update notification status in Firestore based on delivery report
 */
async function updateNotificationStatus(
  phone: string,
  messageId: string,
  status: string,
  reasonCode?: string
): Promise<void> {
  const db = getFirestore(getFirebaseApp());

  try {
    // Clean phone number (remove country code if present)
    const cleanPhone = phone.replace(/^91/, '').replace(/\D/g, '');

    // Find the notification document by searching for the phone number
    // SMS notifications are stored by date, so we may need to search recent dates
    const recentDates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      recentDates.push(date.toISOString().split('T')[0]);
    }

    let updated = false;

    for (const date of recentDates) {
      const docRef = doc(db, 'sms_notifications', date);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) continue;

      const data = docSnap.data();
      const notifications = data?.notifications || [];

      // Find the notification with matching phone
      const notificationIndex = notifications.findIndex(
        (n: any) => n.phone.replace(/\D/g, '') === cleanPhone
      );

      if (notificationIndex === -1) continue;

      // Update the specific notification
      const notification = notifications[notificationIndex];
      
      // Only update if messageId matches or if we're updating from pending
      if (notification.messageId === messageId || notification.status === 'pending') {
        notification.deliveryStatus = status;
        notification.deliveryReasonCode = reasonCode;
        notification.deliveredAt = serverTimestamp();

        // Update overall counts
        const successCount = notifications.filter((n: any) => 
          n.status === 'sent' && n.deliveryStatus === 'delivered'
        ).length;
        
        const failedCount = notifications.filter((n: any) => 
          n.status === 'failed' || n.deliveryStatus === 'failed'
        ).length;

        await updateDoc(docRef, {
          notifications,
          successCount,
          failedCount,
          updatedAt: serverTimestamp()
        });

        console.log(`[SMS-DLR] Updated notification for ${cleanPhone} on ${date}: ${status}`);
        updated = true;
        break;
      }
    }

    if (!updated) {
      console.warn(`[SMS-DLR] No matching notification found for phone ${cleanPhone}`);
    }

  } catch (error) {
    console.error('[SMS-DLR] Error updating notification status:', error);
  }
}

/**
 * Webhook handler for SMS delivery reports
 * Pragati will make a GET request with delivery status
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  return NextResponse.json({ message: '[SMS-API] This API is now sunset' });
  
  const deliveryReport = {
    to: searchParams.get('p'),
    status: searchParams.get('d'),
    reasonCode: searchParams.get('2'),
    messageId: searchParams.get('7'),
    deliveredDate: searchParams.get('3'),
    submitDate: searchParams.get('14'),
    tag: searchParams.get('TAG'),
  };

  console.log('[SMS-DLR] Received delivery report:', deliveryReport);

  // Validate required fields
  if (!deliveryReport.to || !deliveryReport.status) {
    console.warn('[SMS-DLR] Invalid delivery report - missing required fields');
    return NextResponse.json({ message: 'Invalid report' }, { status: 400 });
  }

  // ⚠️ IMPORTANT: messageId should be validated before use
  if (!deliveryReport.messageId) {
    console.warn('[SMS-DLR] Missing messageId - cannot reliably update notification');
  }

  try {
    const statusText = STATUS_CODES[deliveryReport.status!!] || 'unknown';

    await updateNotificationStatus(
      deliveryReport.to!!,
      deliveryReport.messageId || '',
      statusText,
      deliveryReport.reasonCode || undefined
    );

    return NextResponse.json({ 
      message: 'Report received',
      status: statusText 
    });

  } catch (error) {
    console.error('[SMS-DLR] Error processing delivery report:', error);
    return NextResponse.json({ 
      message: 'Error processing report',
      // error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// Support POST as well (some providers use POST for webhooks)
export async function POST(request: NextRequest) {
  return GET(request);
}
