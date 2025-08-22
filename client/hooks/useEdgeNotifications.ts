import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface Notification {
  id: string;
  type: string;
  userId: string;
  userType: string;
  bookingId?: string;
  message: string;
  timestamp: string;
  read: boolean;
  data?: any;
}

interface NotificationPreferences {
  email: boolean;
  push: boolean;
  sms: boolean;
  inApp: boolean;
}

export function useEdgeNotifications() {
  const { user, customer, userType } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    email: true,
    push: true,
    sms: true,
    inApp: true
  });
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const currentUser = user || customer;

  // Connect to SSE stream
  const connect = useCallback(() => {
    if (!currentUser?.id) return;

    try {
      // Close existing connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      // Create new SSE connection
      const eventSource = new EventSource(
        `/api/notifications/edge?userId=${currentUser.id}&userType=${userType || 'customer'}`
      );

      eventSource.onopen = () => {
        setIsConnected(true);
        console.log('Connected to notification stream');
      };

      eventSource.onmessage = (event) => {
        try {
          const notification: Notification = JSON.parse(event.data);
          
          // Handle different notification types
          switch (notification.type) {
            case 'connected':
              console.log('SSE connection established');
              break;
              
            case 'booking_status_update':
              handleBookingStatusUpdate(notification);
              break;
              
            case 'new_message':
              handleNewMessage(notification);
              break;
              
            case 'booking_reminder':
              handleBookingReminder(notification);
              break;
              
            default:
              handleGenericNotification(notification);
          }

          // Add to notifications list
          setNotifications(prev => [notification, ...prev.slice(0, 49)]); // Keep last 50
          
        } catch (error) {
          console.error('Error parsing notification:', error);
        }
      };

      eventSource.onerror = (error) => {
        console.error('SSE connection error:', error);
        setIsConnected(false);

        // Check if this is a development environment and log helpful info
        if (process.env.NODE_ENV === 'development') {
          console.log('SSE connection failed - this might be expected in development');
          console.log('Make sure the dev server is running with the notifications route');
        }

        // Attempt to reconnect after 5 seconds, but only if not in a continuous error loop
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }

        reconnectTimeoutRef.current = setTimeout(() => {
          if (document.visibilityState === 'visible') {
            connect();
          }
        }, 5000);
      };

      eventSourceRef.current = eventSource;

    } catch (error) {
      console.error('Error connecting to notification stream:', error);
      setIsConnected(false);

      // In development, provide helpful feedback
      if (process.env.NODE_ENV === 'development') {
        console.log('SSE connection failed. This is normal in development mode.');
        console.log('Notifications will work in production with Vercel Edge Functions.');
      }
    }
  }, [currentUser?.id, userType]);

  // Disconnect from SSE stream
  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    setIsConnected(false);
  }, []);

  // Handle booking status updates
  const handleBookingStatusUpdate = (notification: Notification) => {
    const { data } = notification;
    
    toast({
      title: 'Booking Status Updated',
      description: `${data.serviceName} - ${data.newStatus}`,
      action: data.bookingId ? {
        label: 'View Booking',
        onClick: () => {
          // Navigate to booking details
          window.location.href = `/my-bookings?booking=${data.bookingId}`;
        }
      } : undefined
    });
  };

  // Handle new messages
  const handleNewMessage = (notification: Notification) => {
    toast({
      title: 'New Message',
      description: notification.message,
      action: notification.bookingId ? {
        label: 'Open Chat',
        onClick: () => {
          // Open messaging modal
          window.location.href = `/my-bookings?chat=${notification.bookingId}`;
        }
      } : undefined
    });
  };

  // Handle booking reminders
  const handleBookingReminder = (notification: Notification) => {
    toast({
      title: 'Booking Reminder',
      description: notification.message,
      action: notification.bookingId ? {
        label: 'View Details',
        onClick: () => {
          window.location.href = `/my-bookings?booking=${notification.bookingId}`;
        }
      } : undefined
    });
  };

  // Handle generic notifications
  const handleGenericNotification = (notification: Notification) => {
    toast({
      title: 'Notification',
      description: notification.message
    });
  };

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const response = await fetch('/api/notifications/edge', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId, read: true })
      });

      if (response.ok) {
        setNotifications(prev => 
          prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
        );
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications/edge', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: currentUser?.id, 
          markAllRead: true 
        })
      });

      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }, [currentUser?.id]);

  // Update notification preferences
  const updatePreferences = useCallback(async (newPreferences: Partial<NotificationPreferences>) => {
    try {
      const response = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser?.id,
          preferences: { ...preferences, ...newPreferences }
        })
      });

      if (response.ok) {
        setPreferences(prev => ({ ...prev, ...newPreferences }));
      }
    } catch (error) {
      console.error('Error updating notification preferences:', error);
    }
  }, [currentUser?.id, preferences]);

  // Get unread count
  const unreadCount = notifications.filter(n => !n.read).length;

  // Connect on mount and user change
  useEffect(() => {
    if (currentUser?.id) {
      connect();
    }

    // Handle page visibility changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && currentUser?.id && !isConnected) {
        // Reconnect when page becomes visible
        connect();
      } else if (document.visibilityState === 'hidden') {
        // Optionally disconnect when page is hidden to save resources
        // disconnect();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      disconnect();
    };
  }, [currentUser?.id, connect, disconnect, isConnected]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    notifications,
    isConnected,
    preferences,
    unreadCount,
    markAsRead,
    markAllAsRead,
    updatePreferences,
    connect,
    disconnect
  };
}
