import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Smartphone,
  Bell,
  Mail,
  MessageCircle,
  Clock,
  Shield,
  Settings,
  CheckCircle,
  AlertCircle,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import type { CommunicationPreferences as CommunicationPreferencesType } from "@/lib/database.types";

interface CommunicationPreferencesProps {
  userId: string;
}

interface NotificationSetting {
  key: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  channels: ("sms" | "push" | "email")[];
}

const notificationSettings: NotificationSetting[] = [
  {
    key: "new_booking",
    title: "New Bookings",
    description: "When customers book your services",
    icon: <Bell className="w-4 h-4" />,
    channels: ["sms", "push", "email"],
  },
  {
    key: "booking_updates",
    title: "Booking Updates",
    description: "Changes to existing bookings",
    icon: <MessageCircle className="w-4 h-4" />,
    channels: ["sms", "push", "email"],
  },
  {
    key: "payment_received",
    title: "Payment Notifications",
    description: "When payments are processed",
    icon: <CheckCircle className="w-4 h-4" />,
    channels: ["sms", "push", "email"],
  },
  {
    key: "customer_messages",
    title: "Customer Messages",
    description: "Messages from customers",
    icon: <Mail className="w-4 h-4" />,
    channels: ["sms", "push", "email"],
  },
  {
    key: "schedule_reminders",
    title: "Schedule Reminders",
    description: "Upcoming appointment reminders",
    icon: <Clock className="w-4 h-4" />,
    channels: ["sms", "push"],
  },
  {
    key: "emergency_alerts",
    title: "Emergency Alerts",
    description: "Important system notifications",
    icon: <AlertCircle className="w-4 h-4" />,
    channels: ["sms", "push", "email"],
  },
];

export const CommunicationPreferences: React.FC<
  CommunicationPreferencesProps
> = ({ userId }) => {
  const { user } = useAuth();
  const [preferences, setPreferences] =
    useState<CommunicationPreferencesType | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);
  const [pushSubscribed, setPushSubscribed] = useState(false);

  useEffect(() => {
    checkPushSupport();
    fetchPreferences();
  }, [userId]);

  const checkPushSupport = () => {
    if ("serviceWorker" in navigator && "PushManager" in window) {
      setPushSupported(true);
      checkPushSubscription();
    }
  };

  const checkPushSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setPushSubscribed(!!subscription);
    } catch (error) {
      console.error("Error checking push subscription:", error);
    }
  };

  const fetchPreferences = async () => {
    try {
      const { data, error } = await supabase
        .from("user_communication_preferences")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error && error.code !== "PGRST116") {
        // Not found error
        throw error;
      }

      if (data) {
        setPreferences(data);
      } else {
        // Create default preferences
        const defaultPreferences = {
          user_id: userId,
          sms_enabled: true,
          push_enabled: true,
          email_enabled: true,
          notification_types: {
            new_booking: { sms: true, push: true, email: true },
            booking_updates: { sms: true, push: true, email: false },
            payment_received: { sms: false, push: true, email: true },
            customer_messages: { sms: true, push: true, email: false },
            schedule_reminders: { sms: true, push: true },
            emergency_alerts: { sms: true, push: true, email: true },
          },
          quiet_hours_start: "22:00",
          quiet_hours_end: "07:00",
        };

        const { data: created, error: createError } = await supabase
          .from("user_communication_preferences")
          .insert(defaultPreferences)
          .select()
          .single();

        if (createError) throw createError;
        setPreferences(created);
      }
    } catch (error) {
      console.error("Error fetching preferences:", error);
    } finally {
      setLoading(false);
    }
  };

  const updatePreferences = async (
    updates: Partial<CommunicationPreferencesType>,
  ) => {
    if (!preferences) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("user_communication_preferences")
        .update(updates)
        .eq("user_id", userId);

      if (error) throw error;

      setPreferences({ ...preferences, ...updates });
    } catch (error) {
      console.error("Error updating preferences:", error);
    } finally {
      setSaving(false);
    }
  };

  const toggleMainChannel = async (
    channel: "sms" | "push" | "email",
    enabled: boolean,
  ) => {
    const updateKey =
      `${channel}_enabled` as keyof CommunicationPreferencesType;
    await updatePreferences({ [updateKey]: enabled });
  };

  const toggleNotificationType = async (
    notificationKey: string,
    channel: "sms" | "push" | "email",
    enabled: boolean,
  ) => {
    if (!preferences) return;

    const currentTypes = (preferences.notification_types as any) || {};
    const updatedTypes = {
      ...currentTypes,
      [notificationKey]: {
        ...currentTypes[notificationKey],
        [channel]: enabled,
      },
    };

    await updatePreferences({ notification_types: updatedTypes });
  };

  const subscribeToPush = async () => {
    if (!pushSupported) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.REACT_APP_VAPID_PUBLIC_KEY,
      });

      // Save subscription to database
      const { error } = await supabase.from("push_subscriptions").insert({
        user_id: userId,
        subscription_data: subscription,
        user_agent: navigator.userAgent,
      });

      if (error) throw error;
      setPushSubscribed(true);
    } catch (error) {
      console.error("Error subscribing to push notifications:", error);
    }
  };

  const unsubscribeFromPush = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
      }

      // Remove subscription from database
      await supabase.from("push_subscriptions").delete().eq("user_id", userId);

      setPushSubscribed(false);
    } catch (error) {
      console.error("Error unsubscribing from push notifications:", error);
    }
  };

  const getNotificationSetting = (
    notificationKey: string,
    channel: "sms" | "push" | "email",
  ): boolean => {
    if (!preferences?.notification_types) return false;
    const types = preferences.notification_types as any;
    return types[notificationKey]?.[channel] || false;
  };

  const isChannelEnabled = (channel: "sms" | "push" | "email"): boolean => {
    if (!preferences) return false;
    return preferences[
      `${channel}_enabled` as keyof CommunicationPreferencesType
    ] as boolean;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Settings className="w-6 h-6 animate-spin mx-auto mb-2" />
          <p>Loading communication preferences...</p>
        </CardContent>
      </Card>
    );
  }

  if (!preferences) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <AlertCircle className="w-6 h-6 text-red-500 mx-auto mb-2" />
          <p>Failed to load communication preferences.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold">Communication Preferences</h3>
        <p className="text-sm text-foreground/60">
          Manage how and when you receive notifications about your business.
        </p>
      </div>

      {/* Main Channel Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notification Channels</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* SMS */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Smartphone className="w-5 h-5 text-blue-500" />
              <div>
                <Label className="font-medium">SMS Messages</Label>
                <p className="text-sm text-foreground/60">
                  Receive text messages on your phone
                </p>
              </div>
            </div>
            <Switch
              checked={isChannelEnabled("sms")}
              onCheckedChange={(enabled) => toggleMainChannel("sms", enabled)}
              disabled={saving}
            />
          </div>

          <Separator />

          {/* Push Notifications */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-green-500" />
              <div>
                <Label className="font-medium">Push Notifications</Label>
                <p className="text-sm text-foreground/60">
                  Browser notifications on this device
                  {!pushSupported && (
                    <Badge variant="secondary" className="ml-2">
                      Not supported
                    </Badge>
                  )}
                  {pushSupported && pushSubscribed && (
                    <Badge className="ml-2 bg-green-100 text-green-800">
                      Active
                    </Badge>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {pushSupported && !pushSubscribed && (
                <Button size="sm" variant="outline" onClick={subscribeToPush}>
                  Enable
                </Button>
              )}
              {pushSupported && pushSubscribed && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={unsubscribeFromPush}
                >
                  Disable
                </Button>
              )}
              <Switch
                checked={isChannelEnabled("push") && pushSubscribed}
                onCheckedChange={(enabled) =>
                  toggleMainChannel("push", enabled)
                }
                disabled={saving || !pushSupported || !pushSubscribed}
              />
            </div>
          </div>

          <Separator />

          {/* Email */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-orange-500" />
              <div>
                <Label className="font-medium">Email Notifications</Label>
                <p className="text-sm text-foreground/60">
                  Receive emails at {user?.email}
                </p>
              </div>
            </div>
            <Switch
              checked={isChannelEnabled("email")}
              onCheckedChange={(enabled) => toggleMainChannel("email", enabled)}
              disabled={saving}
            />
          </div>
        </CardContent>
      </Card>

      {/* Notification Types */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notification Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {notificationSettings.map((setting) => (
              <div key={setting.key} className="space-y-2">
                <div className="flex items-center gap-2">
                  {setting.icon}
                  <div>
                    <Label className="font-medium">{setting.title}</Label>
                    <p className="text-sm text-foreground/60">
                      {setting.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 ml-6">
                  {setting.channels.map((channel) => {
                    const isMainChannelEnabled = isChannelEnabled(channel);
                    const isNotificationEnabled = getNotificationSetting(
                      setting.key,
                      channel,
                    );
                    const isDisabled = !isMainChannelEnabled || saving;

                    if (channel === "push" && !pushSupported) return null;

                    return (
                      <div key={channel} className="flex items-center gap-2">
                        <Switch
                          checked={
                            isNotificationEnabled && isMainChannelEnabled
                          }
                          onCheckedChange={(enabled) =>
                            toggleNotificationType(
                              setting.key,
                              channel,
                              enabled,
                            )
                          }
                          disabled={isDisabled}
                          className="scale-75"
                        />
                        <Label
                          className={`text-sm ${isDisabled ? "text-foreground/40" : ""}`}
                        >
                          {channel.toUpperCase()}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quiet Hours */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <VolumeX className="w-4 h-4" />
            Quiet Hours
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-foreground/60">
            Set hours when you don't want to receive non-urgent notifications.
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-time">Start Time</Label>
              <Input
                id="start-time"
                type="time"
                value={preferences.quiet_hours_start || "22:00"}
                onChange={(e) =>
                  updatePreferences({ quiet_hours_start: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-time">End Time</Label>
              <Input
                id="end-time"
                type="time"
                value={preferences.quiet_hours_end || "07:00"}
                onChange={(e) =>
                  updatePreferences({ quiet_hours_end: e.target.value })
                }
              />
            </div>
          </div>

          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              Emergency alerts and urgent customer messages will still be
              delivered during quiet hours.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* SMS Information */}
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          <strong>Privacy & Security:</strong> Your phone number is securely
          stored and only used for business notifications. You can opt out of
          SMS messages at any time by replying STOP to any message.
        </AlertDescription>
      </Alert>
    </div>
  );
};
