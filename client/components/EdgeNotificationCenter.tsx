import React, { useState } from 'react';
import { Bell, X, Check, Settings, Mail, Smartphone, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useEdgeNotifications } from '@/hooks/useEdgeNotifications';
import { formatDistanceToNow } from 'date-fns';

export function EdgeNotificationCenter() {
  const {
    notifications,
    isConnected,
    preferences,
    unreadCount,
    markAsRead,
    markAllAsRead,
    updatePreferences
  } = useEdgeNotifications();

  const [showSettings, setShowSettings] = useState(false);

  const handleMarkAsRead = (notificationId: string) => {
    markAsRead(notificationId);
  };

  const handleMarkAllAsRead = () => {
    markAllAsRead();
  };

  const handlePreferenceChange = (key: keyof typeof preferences, value: boolean) => {
    updatePreferences({ [key]: value });
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'booking_status_update':
        return '📅';
      case 'new_message':
        return '💬';
      case 'booking_reminder':
        return '⏰';
      default:
        return '🔔';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'booking_status_update':
        return 'text-blue-600';
      case 'new_message':
        return 'text-green-600';
      case 'booking_reminder':
        return 'text-orange-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="relative p-2 hover:bg-accent"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            )}
            {!isConnected && (
              <div className="absolute -bottom-1 -right-1 h-2 w-2 bg-red-500 rounded-full" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="end">
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="font-semibold">Notifications</h3>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSettings(true)}
              >
                <Settings className="h-4 w-4" />
              </Button>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMarkAllAsRead}
                >
                  Mark all read
                </Button>
              )}
            </div>
          </div>

          <ScrollArea className="h-80">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No notifications yet</p>
              </div>
            ) : (
              <div className="p-2">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-3 rounded-lg mb-2 transition-colors ${
                      notification.read
                        ? 'bg-muted/50'
                        : 'bg-blue-50 border border-blue-200'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-lg">
                        {getNotificationIcon(notification.type)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p
                            className={`text-sm font-medium ${
                              notification.read ? 'text-muted-foreground' : 'text-foreground'
                            }`}
                          >
                            {notification.message}
                          </p>
                          {!notification.read && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => handleMarkAsRead(notification.id)}
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(notification.timestamp), {
                            addSuffix: true
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {!isConnected && (
            <div className="p-3 bg-yellow-50 border-t border-yellow-200">
              <p className="text-xs text-yellow-800">
                Connection lost. Reconnecting...
              </p>
            </div>
          )}
        </PopoverContent>
      </Popover>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Notification Preferences</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <Label htmlFor="email-notifications">Email Notifications</Label>
              </div>
              <Switch
                id="email-notifications"
                checked={preferences.email}
                onCheckedChange={(checked) => handlePreferenceChange('email', checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                <Label htmlFor="sms-notifications">SMS Notifications</Label>
              </div>
              <Switch
                id="sms-notifications"
                checked={preferences.sms}
                onCheckedChange={(checked) => handlePreferenceChange('sms', checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Monitor className="h-4 w-4" />
                <Label htmlFor="push-notifications">Push Notifications</Label>
              </div>
              <Switch
                id="push-notifications"
                checked={preferences.push}
                onCheckedChange={(checked) => handlePreferenceChange('push', checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                <Label htmlFor="in-app-notifications">In-App Notifications</Label>
              </div>
              <Switch
                id="in-app-notifications"
                checked={preferences.inApp}
                onCheckedChange={(checked) => handlePreferenceChange('inApp', checked)}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
