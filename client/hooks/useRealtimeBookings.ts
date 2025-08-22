import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface BookingUpdate {
  id: string;
  status: string;
  previous_status?: string;
  updated_at: string;
  customer_id?: string;
  provider_id?: string;
  business_id?: string;
  service_name?: string;
  business_name?: string;
  scheduled_date?: string;
  scheduled_time?: string;
}

interface UseRealtimeBookingsOptions {
  userId?: string;
  userType?: "customer" | "provider" | "business";
  onStatusChange?: (booking: BookingUpdate) => void;
  enableNotifications?: boolean;
}

export function useRealtimeBookings(options: UseRealtimeBookingsOptions = {}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [bookingUpdates, setBookingUpdates] = useState<BookingUpdate[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const {
    userId = user?.id,
    userType,
    onStatusChange,
    enableNotifications = true,
  } = options;

  // Status change notifications
  const showStatusNotification = useCallback(
    (booking: BookingUpdate) => {
      if (!enableNotifications) return;

      const statusMessages = {
        confirmed: "Your booking has been confirmed!",
        in_progress: "Your service is now in progress",
        completed: "Your booking has been completed",
        cancelled: "Your booking has been cancelled",
        rescheduled: "Your booking has been rescheduled",
        pending_payment: "Payment is required for your booking",
        paid: "Payment confirmed for your booking",
      };

      const message =
        statusMessages[booking.status as keyof typeof statusMessages] ||
        `Booking status updated to ${booking.status}`;

      const variant =
        booking.status === "cancelled" ? "destructive" : "default";

      toast({
        title: "Booking Update",
        description: `${message} - ${booking.service_name || "Service"}`,
        variant,
      });
    },
    [enableNotifications, toast],
  );

  // Set up real-time subscription
  useEffect(() => {
    if (!userId) return;

    // Setting up real-time booking subscription

    // Create subscription for bookings table
    const subscription = supabase
      .channel("booking_updates")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "bookings",
          filter:
            userType === "customer"
              ? `customer_id=eq.${userId}`
              : userType === "provider"
                ? `provider_id=eq.${userId}`
                : userType === "business"
                  ? `business_id=eq.${userId}`
                  : `or(customer_id.eq.${userId},provider_id.eq.${userId},business_id.eq.${userId})`,
        },
        (payload) => {
          // Booking update received

          const newBooking = payload.new as any;
          const oldBooking = payload.old as any;

          const bookingUpdate: BookingUpdate = {
            id: newBooking.id,
            status: newBooking.status,
            previous_status: oldBooking?.status,
            updated_at: newBooking.updated_at,
            customer_id: newBooking.customer_id,
            provider_id: newBooking.provider_id,
            business_id: newBooking.business_id,
            service_name: newBooking.service_name,
            business_name: newBooking.business_name,
            scheduled_date: newBooking.scheduled_date,
            scheduled_time: newBooking.scheduled_time,
          };

          // Update state
          setBookingUpdates((prev) => [bookingUpdate, ...prev.slice(0, 49)]); // Keep last 50 updates
          setLastUpdate(new Date());

          // Show notification if status actually changed
          if (oldBooking?.status !== newBooking.status) {
            showStatusNotification(bookingUpdate);
          }

          // Call custom callback
          if (onStatusChange) {
            onStatusChange(bookingUpdate);
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "bookings",
          filter:
            userType === "customer"
              ? `customer_id=eq.${userId}`
              : userType === "provider"
                ? `provider_id=eq.${userId}`
                : userType === "business"
                  ? `business_id=eq.${userId}`
                  : `or(customer_id.eq.${userId},provider_id.eq.${userId},business_id.eq.${userId})`,
        },
        (payload) => {
          console.log("New booking received:", payload);

          const newBooking = payload.new as any;

          const bookingUpdate: BookingUpdate = {
            id: newBooking.id,
            status: newBooking.status,
            updated_at: newBooking.created_at,
            customer_id: newBooking.customer_id,
            provider_id: newBooking.provider_id,
            business_id: newBooking.business_id,
            service_name: newBooking.service_name,
            business_name: newBooking.business_name,
            scheduled_date: newBooking.scheduled_date,
            scheduled_time: newBooking.scheduled_time,
          };

          // Update state
          setBookingUpdates((prev) => [bookingUpdate, ...prev.slice(0, 49)]);
          setLastUpdate(new Date());

          // Show notification for new bookings
          if (userType === "provider" || userType === "business") {
            toast({
              title: "New Booking",
              description: `New booking received for ${bookingUpdate.service_name || "service"}`,
            });
          }

          // Call custom callback
          if (onStatusChange) {
            onStatusChange(bookingUpdate);
          }
        },
      )
      .subscribe((status) => {
        // Subscription status updated
        setIsConnected(status === "SUBSCRIBED");
      });

    // Cleanup subscription
    return () => {
      // Cleaning up booking subscription
      subscription.unsubscribe();
      setIsConnected(false);
    };
  }, [userId, userType]); // Removed unstable dependencies to prevent subscription recreation

  // Method to manually check for updates
  const refreshBookings = useCallback(async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from("bookings")
        .select(
          `
          id,
          status,
          updated_at,
          customer_id,
          provider_id,
          business_id,
          service_name,
          business_name,
          scheduled_date,
          scheduled_time
        `,
        )
        .or(
          userType === "customer"
            ? `customer_id.eq.${userId}`
            : userType === "provider"
              ? `provider_id.eq.${userId}`
              : userType === "business"
                ? `business_id.eq.${userId}`
                : `customer_id.eq.${userId},provider_id.eq.${userId},business_id.eq.${userId}`,
        )
        .order("updated_at", { ascending: false })
        .limit(10);

      if (error) {
        console.error("Error refreshing bookings - Full error object:", error);
        console.error("Error type:", typeof error);
        console.error("Error keys:", Object.keys(error || {}));

        // Extract meaningful error message
        let errorMessage = "Unknown error occurred";
        if (error) {
          if (typeof error === "string") {
            errorMessage = error;
          } else if (error.message) {
            errorMessage = error.message;
          } else if ('error_description' in error) {
            errorMessage = (error as any).error_description;
          } else if (error.details) {
            errorMessage = error.details;
          } else if (error.hint) {
            errorMessage = error.hint;
          } else if (error.code) {
            errorMessage = `Database error (${error.code})`;
          } else {
            try {
              errorMessage = JSON.stringify(error);
            } catch {
              errorMessage = "Unable to parse error details";
            }
          }
        }

        console.error("Parsed error message:", errorMessage);

        // Show error toast to user
        toast({
          title: "Error Refreshing Bookings",
          description: `Failed to refresh bookings: ${errorMessage}`,
          variant: "destructive",
        });

        return;
      }

      const updates: BookingUpdate[] = data.map((booking) => ({
        id: booking.id,
        status: booking.status,
        updated_at: booking.updated_at,
        customer_id: booking.customer_id,
        provider_id: booking.provider_id,
        business_id: booking.business_id,
        service_name: booking.service_name,
        business_name: booking.business_name,
        scheduled_date: booking.scheduled_date,
        scheduled_time: booking.scheduled_time,
      }));

      setBookingUpdates(updates);
      setLastUpdate(new Date());
    } catch (error: any) {
      console.error("Error in refreshBookings - Full error object:", error);
      console.error("Error type:", typeof error);
      console.error("Error keys:", Object.keys(error || {}));

      // Extract meaningful error message
      let errorMessage = "Unknown error occurred";
      if (error) {
        if (typeof error === "string") {
          errorMessage = error;
        } else if (error.message) {
          errorMessage = error.message;
        } else if (error.error_description) {
          errorMessage = error.error_description;
        } else if (error.details) {
          errorMessage = error.details;
        } else if (error.hint) {
          errorMessage = error.hint;
        } else if (error.code) {
          errorMessage = `Database error (${error.code})`;
        } else {
          try {
            errorMessage = JSON.stringify(error);
          } catch {
            errorMessage = "Unable to parse error details";
          }
        }
      }

      console.error("Parsed error message:", errorMessage);

      // Show error toast to user
      toast({
        title: "Error Refreshing Bookings",
        description: `Failed to refresh bookings: ${errorMessage}`,
        variant: "destructive",
      });
    }
  }, [userId, userType]);

  // Get updates for a specific booking
  const getBookingUpdates = useCallback(
    (bookingId: string) => {
      return bookingUpdates.filter((update) => update.id === bookingId);
    },
    [bookingUpdates],
  );

  // Get latest status for a booking
  const getLatestBookingStatus = useCallback(
    (bookingId: string) => {
      const updates = getBookingUpdates(bookingId);
      return updates.length > 0 ? updates[0].status : null;
    },
    [getBookingUpdates],
  );

  return {
    isConnected,
    bookingUpdates,
    lastUpdate,
    refreshBookings,
    getBookingUpdates,
    getLatestBookingStatus,
  };
}

export default useRealtimeBookings;
