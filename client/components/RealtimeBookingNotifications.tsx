import React, { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Bell,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  User,
  Building,
  Wifi,
  WifiOff,
  X,
  Maximize2,
  Minimize2,
} from "lucide-react";
import useRealtimeBookings, {
  BookingUpdate,
} from "@/hooks/useRealtimeBookings";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface RealtimeBookingNotificationsProps {
  userType?: "customer" | "provider" | "business";
  className?: string;
  showConnectionStatus?: boolean;
  maxNotifications?: number;
  autoHide?: boolean;
  autoHideDelay?: number;
}

export default function RealtimeBookingNotifications({
  userType,
  className,
  showConnectionStatus = true,
  maxNotifications = 10,
  autoHide = false,
  autoHideDelay = 5000,
}: RealtimeBookingNotificationsProps) {
  const { user } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  const [notifications, setNotifications] = useState<BookingUpdate[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const { isConnected, bookingUpdates, lastUpdate, refreshBookings } =
    useRealtimeBookings({
      userId: user?.id,
      userType,
      enableNotifications: false, // We'll handle notifications in this component
      onStatusChange: (booking) => {
        // Add to notifications if not dismissed
        if (!dismissedIds.has(booking.id)) {
          setNotifications((prev) => [
            booking,
            ...prev.slice(0, maxNotifications - 1),
          ]);

          // Auto-hide notification after delay
          if (autoHide) {
            setTimeout(() => {
              dismissNotification(booking.id);
            }, autoHideDelay);
          }
        }
      },
    });

  const dismissNotification = (bookingId: string) => {
    setDismissedIds((prev) => new Set([...prev, bookingId]));
    setNotifications((prev) => prev.filter((n) => n.id !== bookingId));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
    setDismissedIds(new Set());
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "confirmed":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "completed":
        return <CheckCircle className="w-4 h-4 text-blue-500" />;
      case "cancelled":
        return <XCircle className="w-4 h-4 text-red-500" />;
      case "in_progress":
        return <Loader2 className="w-4 h-4 text-orange-500 animate-spin" />;
      case "rescheduled":
        return <Clock className="w-4 h-4 text-yellow-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-700 border-green-200";
      case "completed":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "cancelled":
        return "bg-red-100 text-red-700 border-red-200";
      case "in_progress":
        return "bg-orange-100 text-orange-700 border-orange-200";
      case "rescheduled":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "pending":
        return "bg-gray-100 text-gray-700 border-gray-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const updateTime = new Date(dateString);
    const diffInMinutes = Math.floor(
      (now.getTime() - updateTime.getTime()) / (1000 * 60),
    );

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const unreadCount = notifications.length;

  if (!user) return null;

  return (
    <div className={cn("relative", className)}>
      {/* Notification Bell */}
      <div className="relative">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="relative"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>

        {/* Connection Status Indicator */}
        {showConnectionStatus && (
          <div className="absolute -bottom-1 -right-1">
            {isConnected ? (
              <Wifi
                className="w-3 h-3 text-green-500"
                title="Connected to real-time updates"
              />
            ) : (
              <WifiOff
                className="w-3 h-3 text-red-500"
                title="Disconnected from real-time updates"
              />
            )}
          </div>
        )}
      </div>

      {/* Notifications Panel */}
      {isExpanded && (
        <Card className="absolute top-12 right-0 w-96 max-h-96 shadow-lg border z-50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Bell className="w-4 h-4" />
                Booking Updates
                {unreadCount > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {unreadCount}
                  </Badge>
                )}
              </CardTitle>
              <div className="flex items-center gap-1">
                {/* Connection Status */}
                {showConnectionStatus && (
                  <div className="flex items-center gap-1 mr-2">
                    {isConnected ? (
                      <div className="flex items-center gap-1 text-xs text-green-600">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        Live
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-xs text-red-600">
                        <div className="w-2 h-2 bg-red-500 rounded-full" />
                        Offline
                      </div>
                    )}
                  </div>
                )}

                {/* Refresh Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={refreshBookings}
                  className="h-6 w-6 p-0"
                >
                  <Loader2 className="w-3 h-3" />
                </Button>

                {/* Minimize Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(false)}
                  className="h-6 w-6 p-0"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </div>

            {/* Last Update Time */}
            {lastUpdate && (
              <p className="text-xs text-gray-500">
                Last updated: {formatTimeAgo(lastUpdate.toISOString())}
              </p>
            )}
          </CardHeader>

          <CardContent className="p-0">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <Bell className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No recent notifications</p>
                <p className="text-xs">
                  You'll see booking updates here in real-time
                </p>
              </div>
            ) : (
              <ScrollArea className="h-64">
                <div className="p-2 space-y-2">
                  {notifications.map((notification, index) => (
                    <div key={`${notification.id}-${notification.updated_at}`}>
                      <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex-shrink-0 mt-1">
                          {getStatusIcon(notification.status)}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-xs capitalize",
                                getStatusColor(notification.status),
                              )}
                            >
                              {notification.status.replace("_", " ")}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              {formatTimeAgo(notification.updated_at)}
                            </span>
                          </div>

                          <p className="text-sm font-medium text-gray-900 truncate">
                            {notification.service_name || "Service"}
                          </p>

                          {notification.business_name && (
                            <p className="text-xs text-gray-500 flex items-center gap-1">
                              <Building className="w-3 h-3" />
                              {notification.business_name}
                            </p>
                          )}

                          {notification.scheduled_date && (
                            <p className="text-xs text-gray-500 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(
                                notification.scheduled_date,
                              ).toLocaleDateString()}
                              {notification.scheduled_time &&
                                ` at ${notification.scheduled_time}`}
                            </p>
                          )}
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => dismissNotification(notification.id)}
                          className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>

                      {index < notifications.length - 1 && (
                        <Separator className="my-1" />
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}

            {/* Clear All Button */}
            {notifications.length > 0 && (
              <div className="p-2 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllNotifications}
                  className="w-full text-xs"
                >
                  Clear All
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
