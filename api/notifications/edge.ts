import type { VercelRequest } from "@vercel/node";

export const runtime = 'edge';

// Notification preferences interface
interface NotificationConfig {
  email: boolean;
  push: boolean;
  sms: boolean;
  inApp: boolean;
}

// WebSocket-like connections for real-time updates
const connections = new Map<string, ReadableStreamDefaultController>();

export default async function handler(request: VercelRequest, res: any) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const userType = searchParams.get('userType'); // 'customer', 'provider', 'owner', 'dispatcher'

  if (!userId) {
    return res.status(400).json({ error: 'Missing userId' });
  }

  // Create a stream for Server-Sent Events (SSE)
  const stream = new ReadableStream({
    start(controller) {
      // Store the controller for this user
      connections.set(userId, controller);

      // Send initial connection message
      controller.enqueue(
        new TextEncoder().encode(`data: ${JSON.stringify({
          type: 'connected',
          timestamp: new Date().toISOString(),
          userId,
          userType
        })}\n\n`)
      );

      // Clean up when connection closes - removed signal for Vercel compatibility
      // request.signal.addEventListener('abort', () => {
      //   connections.delete(userId);
      //   controller.close();
      // });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Cache-Control'
    }
  });
}

// POST function removed for Vercel compatibility - use the main handler instead
// export async function POST(request: NextRequest) {
//   try {
//     const body = await request.json();
//     const { 
//       type, 
//       userId, 
//       userType, 
//       bookingId, 
//       message, 
//       notificationType = 'booking_update' 
//     } = body;

//     // Validate required fields
//     if (!type || !userId) {
//       return new Response('Missing required fields', { status: 400 });
//     }

//     // Get user's notification preferences
//     const userConfig = await getUserNotificationConfig(userId);

//     // Create notification payload
//     const notification = {
//       id: crypto.randomUUID(),
//       type: notificationType,
//       userId,
//       userType,
//       bookingId,
//       message,
//       timestamp: new Date().toISOString(),
//       read: false
//     };

//     // Send to connected clients via SSE
//     const controller = connections.get(userId);
//     if (controller) {
//       controller.enqueue(
//         new TextEncoder().encode(`data: ${JSON.stringify(notification)}\n\n`)
//       );
//     }

//     // Send notifications based on user preferences
//     const promises: Promise<any>[] = [];

//     if (userConfig.email) {
//       promises.push(sendEmailNotification(notification));
//     }

//     if (userConfig.sms) {
//       promises.push(sendSMSNotification(notification));
//     }

//     if (userConfig.push) {
//       promises.push(sendPushNotification(notification));
//     }

//     // Wait for all notifications to be sent
//     await Promise.allSettled(promises);

//     return new Response(JSON.stringify({ 
//       success: true, 
//       notificationId: notification.id 
//     }), {
//       headers: { 'Content-Type': 'application/json' }
//     });

//   } catch (error) {
//     console.error('Notification error:', error);
//     return new Response('Internal server error', { status: 500 });
//   }
// }

// Helper functions
async function getUserNotificationConfig(userId: string): Promise<NotificationConfig> {
  // In a real implementation, you'd fetch this from database
  // For now, return default config
  return {
    email: true,
    push: true,
    sms: true,
    inApp: true
  };
}

async function sendEmailNotification(notification: any) {
  // Integrate with your email service (SendGrid, Resend, etc.)
  console.log('Sending email notification:', notification);
}

async function sendSMSNotification(notification: any) {
  // Integrate with Twilio SMS
  console.log('Sending SMS notification:', notification);
}

async function sendPushNotification(notification: any) {
  // Integrate with web push notifications
  console.log('Sending push notification:', notification);
}

// Function to broadcast to all connected users
export async function broadcastNotification(notification: any) {
  const promises: Promise<void>[] = [];
  
  connections.forEach((controller, userId) => {
    try {
      controller.enqueue(
        new TextEncoder().encode(`data: ${JSON.stringify(notification)}\n\n`)
      );
    } catch (error) {
      // Remove dead connections
      connections.delete(userId);
    }
  });

  await Promise.allSettled(promises);
}
