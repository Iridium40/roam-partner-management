import { Request, Response } from 'express';

// Notification preferences interface
interface NotificationConfig {
  email: boolean;
  push: boolean;
  sms: boolean;
  inApp: boolean;
}

// Store SSE connections for development
const sseConnections = new Map<string, Response>();

export function handleEdgeNotifications(req: Request, res: Response) {
  const { userId, userType } = req.query;

  if (!userId) {
    return res.status(400).json({ error: 'Missing userId' });
  }

  // Set up SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  // Store this connection
  sseConnections.set(userId as string, res);

  // Send initial connection message
  const initialMessage = JSON.stringify({
    type: 'connected',
    timestamp: new Date().toISOString(),
    userId,
    userType
  });
  
  res.write(`data: ${initialMessage}\n\n`);

  // Send periodic heartbeat to keep connection alive
  const heartbeatInterval = setInterval(() => {
    try {
      res.write(`data: ${JSON.stringify({
        type: 'heartbeat',
        timestamp: new Date().toISOString()
      })}\n\n`);
    } catch (error) {
      // Connection closed, clean up
      clearInterval(heartbeatInterval);
      sseConnections.delete(userId as string);
    }
  }, 30000); // Every 30 seconds

  // Clean up when client disconnects
  req.on('close', () => {
    clearInterval(heartbeatInterval);
    sseConnections.delete(userId as string);
    console.log(`SSE connection closed for user: ${userId}`);
  });

  req.on('error', () => {
    clearInterval(heartbeatInterval);
    sseConnections.delete(userId as string);
    console.log(`SSE connection error for user: ${userId}`);
  });

  console.log(`SSE connection established for user: ${userId}`);
}

// Handle PATCH requests for marking notifications as read
export function handleNotificationUpdates(req: Request, res: Response) {
  try {
    const { notificationId, read, userId, markAllRead } = req.body;

    if (markAllRead && userId) {
      console.log(`Marking all notifications as read for user: ${userId}`);
      return res.json({ success: true, message: 'All notifications marked as read' });
    }

    if (notificationId && typeof read === 'boolean') {
      console.log(`Marking notification ${notificationId} as read: ${read}`);
      return res.json({ success: true, message: 'Notification updated' });
    }

    return res.status(400).json({ error: 'Invalid request parameters' });
  } catch (error) {
    console.error('Error updating notification:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Function to broadcast notification to a specific user (for development)
export function broadcastToUser(userId: string, notification: any) {
  const connection = sseConnections.get(userId);
  if (connection) {
    try {
      const message = JSON.stringify(notification);
      connection.write(`data: ${message}\n\n`);
      console.log(`Notification sent to user ${userId}:`, notification.type);
    } catch (error) {
      console.error(`Failed to send notification to user ${userId}:`, error);
      // Remove dead connection
      sseConnections.delete(userId);
    }
  }
}

// Function to broadcast to all connected users (for development)
export function broadcastToAll(notification: any) {
  sseConnections.forEach((connection, userId) => {
    try {
      const message = JSON.stringify(notification);
      connection.write(`data: ${message}\n\n`);
    } catch (error) {
      console.error(`Failed to broadcast to user ${userId}:`, error);
      // Remove dead connection
      sseConnections.delete(userId);
    }
  });
}

// Helper function to get user notification config (mock for development)
async function getUserNotificationConfig(userId: string): Promise<NotificationConfig> {
  // In development, return default config
  return {
    email: true,
    push: true,
    sms: true,
    inApp: true
  };
}

// Development helper to simulate notifications
export function simulateNotification(userId: string, type: string, message: string, data?: any) {
  const notification = {
    id: `dev-${Date.now()}`,
    type,
    userId,
    message,
    timestamp: new Date().toISOString(),
    read: false,
    data
  };

  broadcastToUser(userId, notification);
  return notification;
}
