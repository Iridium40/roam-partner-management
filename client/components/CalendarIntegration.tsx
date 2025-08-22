import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Calendar,
  CheckCircle,
  XCircle,
  RefreshCw,
  Settings,
  AlertCircle,
  Clock,
  Sync,
  Plus,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import type { CalendarConnection, CalendarType } from "@/lib/database.types";

interface CalendarIntegrationProps {
  providerId: string;
}

interface CalendarProvider {
  type: CalendarType;
  name: string;
  icon: React.ReactNode;
  description: string;
  authUrl: string;
  features: string[];
}

const calendarProviders: CalendarProvider[] = [
  {
    type: "google",
    name: "Google Calendar",
    icon: <div className="w-6 h-6 bg-blue-500 rounded"></div>,
    description: "Sync with Google Calendar for seamless scheduling",
    authUrl: "/api/auth/google-calendar",
    features: [
      "Two-way sync",
      "Event creation",
      "Conflict detection",
      "Automatic reminders",
    ],
  },
  {
    type: "outlook",
    name: "Microsoft Outlook",
    icon: <div className="w-6 h-6 bg-blue-600 rounded"></div>,
    description: "Connect with Outlook and Office 365 calendars",
    authUrl: "/api/auth/outlook-calendar",
    features: [
      "Office 365 sync",
      "Meeting scheduling",
      "Team calendar access",
      "Exchange integration",
    ],
  },
  {
    type: "apple",
    name: "Apple Calendar",
    icon: <div className="w-6 h-6 bg-gray-800 rounded"></div>,
    description: "Sync with iCloud and Apple Calendar",
    authUrl: "/api/auth/apple-calendar",
    features: [
      "iCloud sync",
      "Cross-device access",
      "Native iOS integration",
      "Family calendar sharing",
    ],
  },
];

export const CalendarIntegration: React.FC<CalendarIntegrationProps> = ({
  providerId,
}) => {
  const { user } = useAuth();
  const [connections, setConnections] = useState<CalendarConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [isSetupDialogOpen, setIsSetupDialogOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] =
    useState<CalendarProvider | null>(null);

  useEffect(() => {
    fetchConnections();
  }, [providerId]);

  const fetchConnections = async () => {
    try {
      const { data, error } = await supabase
        .from("provider_calendar_connections")
        .select("*")
        .eq("provider_id", providerId);

      if (error) throw error;
      setConnections(data || []);
    } catch (error) {
      console.error("Error fetching calendar connections:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (provider: CalendarProvider) => {
    try {
      // In a real implementation, this would initiate OAuth flow
      // For demo purposes, we'll simulate a successful connection
      const { error } = await supabase
        .from("provider_calendar_connections")
        .insert({
          provider_id: providerId,
          calendar_type: provider.type,
          sync_enabled: true,
          created_at: new Date().toISOString(),
        });

      if (error) throw error;

      await fetchConnections();
      setIsSetupDialogOpen(false);
    } catch (error) {
      console.error("Error connecting calendar:", error);
    }
  };

  const handleDisconnect = async (connectionId: string) => {
    try {
      const { error } = await supabase
        .from("provider_calendar_connections")
        .delete()
        .eq("id", connectionId);

      if (error) throw error;
      await fetchConnections();
    } catch (error) {
      console.error("Error disconnecting calendar:", error);
    }
  };

  const handleToggleSync = async (connectionId: string, enabled: boolean) => {
    try {
      const { error } = await supabase
        .from("provider_calendar_connections")
        .update({ sync_enabled: enabled })
        .eq("id", connectionId);

      if (error) throw error;
      await fetchConnections();
    } catch (error) {
      console.error("Error updating sync status:", error);
    }
  };

  const handleSyncNow = async (
    connectionId: string,
    calendarType: CalendarType,
  ) => {
    setSyncing(connectionId);
    try {
      // Simulate sync process
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const { error } = await supabase
        .from("provider_calendar_connections")
        .update({ last_sync_at: new Date().toISOString() })
        .eq("id", connectionId);

      if (error) throw error;
      await fetchConnections();
    } catch (error) {
      console.error("Error syncing calendar:", error);
    } finally {
      setSyncing(null);
    }
  };

  const getConnectionStatus = (connection: CalendarConnection) => {
    if (!connection.sync_enabled) {
      return { color: "bg-gray-100 text-gray-800", text: "Disabled" };
    }

    if (connection.last_sync_at) {
      const lastSync = new Date(connection.last_sync_at);
      const now = new Date();
      const diffHours = (now.getTime() - lastSync.getTime()) / (1000 * 60 * 60);

      if (diffHours < 1) {
        return { color: "bg-green-100 text-green-800", text: "Synced" };
      } else if (diffHours < 24) {
        return { color: "bg-yellow-100 text-yellow-800", text: "Sync pending" };
      } else {
        return { color: "bg-red-100 text-red-800", text: "Sync needed" };
      }
    }

    return { color: "bg-blue-100 text-blue-800", text: "Connected" };
  };

  const getProviderByType = (type: CalendarType) => {
    return calendarProviders.find((p) => p.type === type);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
          <p>Loading calendar connections...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Calendar Integration</h3>
          <p className="text-sm text-foreground/60">
            Sync your bookings with your calendar to avoid conflicts and stay
            organized.
          </p>
        </div>

        <Dialog open={isSetupDialogOpen} onOpenChange={setIsSetupDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-roam-blue hover:bg-roam-blue/90">
              <Plus className="w-4 h-4 mr-2" />
              Connect Calendar
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Connect Your Calendar</DialogTitle>
              <DialogDescription>
                Choose a calendar provider to sync your bookings and
                availability.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {calendarProviders.map((provider) => {
                const isConnected = connections.some(
                  (c) => c.calendar_type === provider.type,
                );

                return (
                  <Card
                    key={provider.type}
                    className={`cursor-pointer transition-all ${
                      selectedProvider?.type === provider.type
                        ? "ring-2 ring-roam-blue"
                        : "hover:shadow-md"
                    } ${isConnected ? "opacity-50" : ""}`}
                    onClick={() =>
                      !isConnected && setSelectedProvider(provider)
                    }
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          {provider.icon}
                          <div>
                            <h4 className="font-semibold flex items-center gap-2">
                              {provider.name}
                              {isConnected && (
                                <Badge className="bg-green-100 text-green-800">
                                  Connected
                                </Badge>
                              )}
                            </h4>
                            <p className="text-sm text-foreground/60">
                              {provider.description}
                            </p>
                          </div>
                        </div>

                        {selectedProvider?.type === provider.type &&
                          !isConnected && (
                            <CheckCircle className="w-5 h-5 text-roam-blue" />
                          )}
                      </div>

                      <div className="mt-3">
                        <p className="text-xs font-medium text-foreground/70 mb-2">
                          Features:
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {provider.features.map((feature) => (
                            <Badge
                              key={feature}
                              variant="secondary"
                              className="text-xs"
                            >
                              {feature}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsSetupDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() =>
                  selectedProvider && handleConnect(selectedProvider)
                }
                disabled={!selectedProvider}
                className="bg-roam-blue hover:bg-roam-blue/90"
              >
                Connect Calendar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Connected Calendars */}
      {connections.length > 0 ? (
        <div className="space-y-4">
          <h4 className="font-medium">Connected Calendars</h4>

          {connections.map((connection) => {
            const provider = getProviderByType(connection.calendar_type);
            const status = getConnectionStatus(connection);

            if (!provider) return null;

            return (
              <Card key={connection.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {provider.icon}
                      <div>
                        <h5 className="font-medium">{provider.name}</h5>
                        <p className="text-sm text-foreground/60">
                          {connection.last_sync_at
                            ? `Last synced: ${new Date(connection.last_sync_at).toLocaleString()}`
                            : "Never synced"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Badge className={status.color}>{status.text}</Badge>

                      <div className="flex items-center gap-2">
                        <Label
                          htmlFor={`sync-${connection.id}`}
                          className="text-sm"
                        >
                          Sync enabled
                        </Label>
                        <Switch
                          id={`sync-${connection.id}`}
                          checked={connection.sync_enabled}
                          onCheckedChange={(enabled) =>
                            handleToggleSync(connection.id, enabled)
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <Separator className="my-3" />

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-foreground/60" />
                      <span className="text-sm text-foreground/60">
                        Two-way sync • Automatic conflict detection
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          handleSyncNow(connection.id, connection.calendar_type)
                        }
                        disabled={
                          syncing === connection.id || !connection.sync_enabled
                        }
                      >
                        {syncing === connection.id ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Sync className="w-4 h-4" />
                        )}
                        {syncing === connection.id ? "Syncing..." : "Sync Now"}
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDisconnect(connection.id)}
                        className="text-red-600 border-red-300 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="p-6 text-center">
            <Calendar className="w-12 h-12 text-foreground/40 mx-auto mb-4" />
            <h4 className="font-medium mb-2">No Calendar Connected</h4>
            <p className="text-sm text-foreground/60 mb-4">
              Connect your calendar to automatically sync bookings and prevent
              double-booking.
            </p>
            <Button
              onClick={() => setIsSetupDialogOpen(true)}
              className="bg-roam-blue hover:bg-roam-blue/90"
            >
              <Plus className="w-4 h-4 mr-2" />
              Connect Your First Calendar
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Sync Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sync Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>How calendar sync works:</strong>
              <ul className="mt-2 space-y-1 text-sm">
                <li>
                  • Bookings are automatically added to your connected calendars
                </li>
                <li>• Existing calendar events block booking availability</li>
                <li>• Changes in either system sync automatically</li>
                <li>• Conflict detection prevents double-booking</li>
              </ul>
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <Label className="font-medium">Sync Frequency</Label>
              <p className="text-foreground/60">Every 15 minutes</p>
            </div>
            <div>
              <Label className="font-medium">Event Visibility</Label>
              <p className="text-foreground/60">Private events</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
