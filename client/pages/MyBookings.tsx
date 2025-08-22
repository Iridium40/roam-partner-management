import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Phone,
  MessageCircle,
  Star,
  MoreHorizontal,
  Video,
  Building,
  Smartphone,
  AlertCircle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Info,
  X,
  Edit,
  Hash,
  Map,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import useRealtimeBookings from "@/hooks/useRealtimeBookings";
import RealtimeBookingNotifications from "@/components/RealtimeBookingNotifications";
import BookingStatusIndicator, {
  RealtimeStatusUpdate,
} from "@/components/BookingStatusIndicator";
import ConversationChat from "@/components/ConversationChat";

// Helper functions for delivery types
const getDeliveryIcon = (type: string) => {
  const icons = {
    mobile: Smartphone,
    business_location: Building,
    virtual: Video,
  };
  return icons[type as keyof typeof icons] || Smartphone;
};

const getDeliveryLabel = (type: string) => {
  const labels = {
    mobile: "Mobile Service",
    business_location: "Business",
    virtual: "Virtual",
  };
  return labels[type as keyof typeof labels] || type;
};

export default function MyBookings() {
  const { user, customer, userType, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedBookingForCancel, setSelectedBookingForCancel] =
    useState<any>(null);
  const [cancellationReason, setCancellationReason] = useState("");
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [selectedBookingForReschedule, setSelectedBookingForReschedule] =
    useState<any>(null);
  const [newBookingDate, setNewBookingDate] = useState("");
  const [newBookingTime, setNewBookingTime] = useState("");
  const [rescheduleReason, setRescheduleReason] = useState("");
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [selectedBookingForMessage, setSelectedBookingForMessage] =
    useState<any>(null);

  const currentUser = user || customer;

  // Debug current user data
  console.log("MyBookings - currentUser:", currentUser);
  console.log("MyBookings - user:", user);
  console.log("MyBookings - customer:", customer);

  // Real-time booking updates
  const { isConnected, refreshBookings } = useRealtimeBookings({
    userId: currentUser?.id,
    userType: "customer",
    onStatusChange: (bookingUpdate) => {
      // Update the specific booking in our local state
      setBookings((prev) =>
        prev.map((booking) =>
          booking.id === bookingUpdate.id
            ? {
                ...booking,
                status: bookingUpdate.status,
                updated_at: bookingUpdate.updated_at,
              }
            : booking,
        ),
      );
    },
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState({
    upcoming: 1,
    active: 1,
    past: 1,
  });
  const ITEMS_PER_PAGE = 10;
  // Fetch bookings data on component mount
  useEffect(() => {
    const fetchBookings = async (retryCount = 0) => {
      if (!currentUser) return;

      try {
        setLoading(true);
        setError(null);

        console.log("Fetching bookings for user:", currentUser.email);
        console.log("Current user object:", currentUser);
        console.log("Customer object:", customer);

        let bookingsResponse;

        // For authenticated users, query by customer_id, not guest_email
        if (customer && customer.id) {
          console.log(
            "Authenticated user - querying by customer_id:",
            customer.id,
          );

          bookingsResponse = await supabase
            .from("bookings")
            .select(
              `
              id,
              customer_id,
              provider_id,
              service_id,
              booking_date,
              start_time,
              total_amount,
              created_at,
              service_fee,
              service_fee_charged,
              service_fee_charged_at,
              remaining_balance,
              remaining_balance_charged,
              remaining_balance_charged_at,
              cancellation_fee,
              refund_amount,
              cancelled_at,
              cancelled_by,
              cancellation_reason,
              guest_name,
              guest_email,
              guest_phone,
              customer_location_id,
              business_location_id,
              delivery_type,
              payment_status,
              booking_status,
              admin_notes,
              tip_eligible,
              tip_amount,
              tip_status,
              tip_requested_at,
              tip_deadline,
              booking_reference,
              business_id,
              decline_reason,
              services (
                id,
                name,
                min_price
              ),
              customer_profiles (
                id,
                first_name,
                last_name,
                email,
                image_url
              ),
              providers!provider_id (
                id,
                user_id,
                first_name,
                last_name,
                location_id,
                image_url
              ),
              business_profiles (
                id,
                business_name
              ),
              business_locations (
                id,
                location_name,
                address_line1,
                address_line2,
                city,
                state,
                postal_code,
                country,
                latitude,
                longitude
              )
            `,
            )
            .eq("customer_id", customer.id)
            .order("booking_date", { ascending: true })
            .limit(50);
        } else {
          console.log(
            "No customer profile found - querying by guest_email:",
            currentUser.email,
          );

          bookingsResponse = await supabase
            .from("bookings")
            .select(
              `
              id,
              customer_id,
              provider_id,
              service_id,
              booking_date,
              start_time,
              total_amount,
              created_at,
              service_fee,
              service_fee_charged,
              service_fee_charged_at,
              remaining_balance,
              remaining_balance_charged,
              remaining_balance_charged_at,
              cancellation_fee,
              refund_amount,
              cancelled_at,
              cancelled_by,
              cancellation_reason,
              guest_name,
              guest_email,
              guest_phone,
              customer_location_id,
              business_location_id,
              delivery_type,
              payment_status,
              booking_status,
              admin_notes,
              tip_eligible,
              tip_amount,
              tip_status,
              tip_requested_at,
              tip_deadline,
              booking_reference,
              business_id,
              decline_reason,
              services (
                id,
                name,
                min_price
              ),
              customer_profiles (
                id,
                first_name,
                last_name,
                email,
                image_url
              ),
              providers!provider_id (
                id,
                first_name,
                last_name,
                location_id,
                image_url
              ),
              business_profiles (
                id,
                business_name
              ),
              business_locations (
                id,
                location_name,
                address_line1,
                address_line2,
                city,
                state,
                postal_code,
                country,
                latitude,
                longitude
              )
            `,
            )
            .eq("guest_email", currentUser.email)
            .order("booking_date", { ascending: true })
            .limit(50);
        }

        console.log("Bookings query response:", bookingsResponse);

        // Debug: Log the first booking to see what fields are returned
        if (bookingsResponse.data && bookingsResponse.data.length > 0) {
          console.log(
            "First booking fields:",
            Object.keys(bookingsResponse.data[0]),
          );
          console.log(
            "First booking provider_id:",
            bookingsResponse.data[0].provider_id,
          );
          console.log(
            "First booking provider object:",
            bookingsResponse.data[0].providers,
          );
          console.log("First booking full data:", bookingsResponse.data[0]);

          // Check for any fields that might contain provider information
          const providerFields = Object.keys(bookingsResponse.data[0]).filter(
            (key) =>
              key.toLowerCase().includes("provider") ||
              key.toLowerCase().includes("user") ||
              key === "assigned_provider_id" ||
              key === "provider_user_id",
          );
          console.log("Potential provider-related fields:", providerFields);

          // Try to query providers directly to see if there are any
          console.log(
            "First booking provider_id value:",
            bookingsResponse.data[0].provider_id,
          );
          console.log(
            "Provider_id type:",
            typeof bookingsResponse.data[0].provider_id,
          );

          if (bookingsResponse.data[0].provider_id) {
            const { data: providerData, error: providerError } = await supabase
              .from("providers")
              .select("*")
              .eq("id", bookingsResponse.data[0].provider_id);
            console.log("Direct provider query result:", {
              providerData,
              providerError,
            });

            // Also try to get all providers to see if any exist
            const { data: allProviders, error: allProvidersError } =
              await supabase
                .from("providers")
                .select("id, first_name, last_name")
                .limit(5);
            console.log("All providers sample:", {
              allProviders,
              allProvidersError,
            });
          }
        }

        // Check for authentication error
        if (bookingsResponse.status === 401 && retryCount === 0) {
          console.log("JWT token expired, refreshing session...");
          const { data: refreshData, error: refreshError } =
            await supabase.auth.refreshSession();

          if (refreshError) {
            console.error("Token refresh failed:", refreshError);
            setError(
              "Your session has expired. Please refresh the page and sign in again.",
            );
            return;
          }

          if (refreshData?.session) {
            console.log("Session refreshed successfully, retrying...");
            return await fetchBookings(1);
          }
        }

        const { data: bookingsData, error: bookingsError } = bookingsResponse;

        if (bookingsError) {
          console.error("Bookings query error:", bookingsError);
          throw new Error("Failed to fetch bookings from database");
        }

        console.log("Found bookings:", bookingsData?.length || 0);
        console.log("Bookings data detail:", bookingsData);

        // Transform the database data to match the expected format
        const transformedBookings = (bookingsData || []).map((booking: any) => {
          const provider = booking.providers;
          const service = booking.services;
          const customer = booking.customer_profiles;
          const businessLocation = booking.business_locations;

          // Determine location string based on delivery type
          let location = "Location TBD";
          let locationDetails = null;

          if (
            booking.delivery_type === "business_location" &&
            businessLocation
          ) {
            // Format business address
            const addressParts = [
              businessLocation.address_line1,
              businessLocation.city,
              businessLocation.state,
              businessLocation.postal_code,
            ].filter(Boolean);

            location =
              addressParts.length > 0
                ? addressParts.join(", ")
                : "Business Location";
            locationDetails = {
              name: businessLocation.location_name || "Business Location",
              address: {
                line1: businessLocation.address_line1,
                line2: businessLocation.address_line2,
                city: businessLocation.city,
                state: businessLocation.state,
                postalCode: businessLocation.postal_code,
                country: businessLocation.country,
              },
              coordinates: {
                latitude: businessLocation.latitude,
                longitude: businessLocation.longitude,
              },
            };
          } else if (
            booking.delivery_type === "customer_location" ||
            booking.delivery_type === "mobile"
          ) {
            location = "Your Location";
          } else if (booking.delivery_type === "virtual") {
            location = "Video Call";
          }

          return {
            id: booking.id,
            status: booking.booking_status || "pending",
            service: service?.name || "Unknown Service",
            provider_id: booking.provider_id, // Preserve original provider_id
            provider: {
              name: provider
                ? `${provider.first_name} ${provider.last_name}`
                : "Unknown Provider",
              rating: 4.9, // Default rating - would need to implement rating system
              phone: null, // Don't expose provider phone to customer
              image: provider?.image_url || null,
              firstName: provider?.first_name || "",
              lastName: provider?.last_name || "",
            },
            date: booking.booking_date,
            time: booking.start_time
              ? new Date(`1970-01-01T${booking.start_time}`).toLocaleTimeString(
                  [],
                  { hour: "numeric", minute: "2-digit" },
                )
              : "Time TBD",
            duration: "60 minutes", // Default duration
            deliveryType: booking.delivery_type || "business_location",
            location: location,
            locationDetails: locationDetails,
            price: `$${booking.total_amount || 0}`,
            notes: booking.admin_notes || "",
            bookingDate: booking.created_at,
            guestName: booking.guest_name,
            guestEmail: booking.guest_email,
            paymentStatus: booking.payment_status,
            bookingReference: booking.booking_reference || "",
          };
        });

        setBookings(transformedBookings);

        if (transformedBookings.length === 0) {
          console.log("No bookings found for email:", currentUser.email);
        }
      } catch (err: any) {
        console.error("Error fetching bookings:", err);

        // Check if this is a JWT expiration error and we haven't retried yet
        if (
          (err.message?.includes("JWT") ||
            err.message?.includes("401") ||
            err.status === 401) &&
          retryCount === 0
        ) {
          console.log("JWT error detected, attempting token refresh...");
          try {
            const { data: refreshData, error: refreshError } =
              await supabase.auth.refreshSession();

            if (!refreshError && refreshData?.session) {
              console.log("Session refreshed, retrying bookings fetch...");
              return await fetchBookings(1);
            }
          } catch (refreshError) {
            console.error("Token refresh failed:", refreshError);
          }

          setError(
            "Your session has expired. Please refresh the page and sign in again.",
          );
          return;
        }

        // Improved error message extraction
        let errorMessage = "Failed to load bookings. Please try again.";
        if (typeof err === "string") {
          errorMessage = err;
        } else if (err?.message) {
          errorMessage = err.message;
        } else if (err?.details) {
          errorMessage = err.details;
        } else if (err?.hint) {
          errorMessage = err.hint;
        }

        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, [currentUser]);

  const getStatusConfig = (status: string) => {
    const configs = {
      confirmed: {
        label: "Confirmed",
        color: "bg-green-100 text-green-800",
        icon: CheckCircle,
        description: "Your booking is confirmed",
      },
      pending: {
        label: "Pending",
        color: "bg-yellow-100 text-yellow-800",
        icon: Clock,
        description: "Waiting for provider confirmation",
      },
      in_progress: {
        label: "In Progress",
        color: "bg-blue-100 text-blue-800",
        icon: RefreshCw,
        description: "Service is currently active",
      },
      completed: {
        label: "Completed",
        color: "bg-gray-100 text-gray-800",
        icon: CheckCircle,
        description: "Service completed successfully",
      },
      cancelled: {
        label: "Cancelled",
        color: "bg-red-100 text-red-800",
        icon: XCircle,
        description: "Booking was cancelled",
      },
      declined: {
        label: "Declined",
        color: "bg-red-100 text-red-800",
        icon: XCircle,
        description: "Booking was declined by provider",
      },
      no_show: {
        label: "No Show",
        color: "bg-gray-100 text-gray-800",
        icon: XCircle,
        description: "Customer did not show up",
      },
    };
    return configs[status as keyof typeof configs] || configs.pending;
  };

  // Filter bookings by status
  const allUpcomingBookings = bookings.filter(
    (b) => b.status === "confirmed" || b.status === "pending",
  );
  const allPastBookings = bookings
    .filter(
      (b) =>
        b.status === "completed" ||
        b.status === "cancelled" ||
        b.status === "declined" ||
        b.status === "no_show",
    )
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const allActiveBookings = bookings.filter((b) => b.status === "in_progress");

  // Pagination logic
  const getPaginatedBookings = (bookings: any[], page: number) => {
    const startIndex = (page - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return bookings.slice(startIndex, endIndex);
  };

  const getTotalPages = (totalItems: number) => {
    return Math.ceil(totalItems / ITEMS_PER_PAGE);
  };

  // Paginated booking arrays
  const upcomingBookings = getPaginatedBookings(
    allUpcomingBookings,
    currentPage.upcoming,
  );
  const pastBookings = getPaginatedBookings(allPastBookings, currentPage.past);
  const activeBookings = getPaginatedBookings(
    allActiveBookings,
    currentPage.active,
  );

  // Page navigation functions
  const handlePageChange = (
    category: "upcoming" | "active" | "past",
    direction: "next" | "prev",
  ) => {
    setCurrentPage((prev) => {
      const totalItems =
        category === "upcoming"
          ? allUpcomingBookings.length
          : category === "active"
            ? allActiveBookings.length
            : allPastBookings.length;
      const totalPages = getTotalPages(totalItems);
      const currentPageNum = prev[category];

      let newPage = currentPageNum;
      if (direction === "next" && currentPageNum < totalPages) {
        newPage = currentPageNum + 1;
      } else if (direction === "prev" && currentPageNum > 1) {
        newPage = currentPageNum - 1;
      }

      return { ...prev, [category]: newPage };
    });
  };

  // Handler functions
  const handleCancel = (booking: any) => {
    setSelectedBookingForCancel(booking);
    setCancellationReason("");
    setShowCancelModal(true);
  };

  const handleReschedule = (booking: any) => {
    setSelectedBookingForReschedule(booking);
    setShowRescheduleModal(true);
  };

  const handleMessage = (booking: any) => {
    setSelectedBookingForMessage(booking);
    setShowMessageModal(true);
  };

  // Calculate cancellation fee and refund amount
  const calculateCancellationDetails = (booking: any) => {
    const bookingDateTime = new Date(`${booking.date} ${booking.time}`);
    const now = new Date();
    const hoursUntilBooking =
      (bookingDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    // Extract total amount for calculations (remove $ and convert to number)
    const totalAmount = parseFloat(booking.price?.replace("$", "") || "0");

    // Apply cancellation policy
    let cancellationFee = 0;
    let refundAmount = totalAmount;
    let isWithin24Hours = false;
    let isPastBooking = false;

    if (hoursUntilBooking <= 0) {
      // Booking is in the past - no refund allowed
      isPastBooking = true;
      cancellationFee = totalAmount;
      refundAmount = 0;
    } else if (hoursUntilBooking <= 24) {
      // Within 24 hours - no refund allowed
      isWithin24Hours = true;
      cancellationFee = totalAmount;
      refundAmount = 0;
    }

    return {
      totalAmount,
      cancellationFee,
      refundAmount,
      isWithin24Hours,
      isPastBooking,
      hoursUntilBooking,
    };
  };

  // Cancel booking function
  const cancelBooking = async () => {
    if (!selectedBookingForCancel || !currentUser) {
      toast({
        title: "Error",
        description: "Unable to cancel booking. Please try again.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Calculate cancellation fee and refund amount using the same logic as the modal
      const cancellationDetails = calculateCancellationDetails(
        selectedBookingForCancel,
      );
      const { totalAmount, cancellationFee, refundAmount } =
        cancellationDetails;

      const { error } = await supabase
        .from("bookings")
        .update({
          booking_status: "cancelled",
          cancelled_at: new Date().toISOString(),
          cancelled_by: currentUser.id,
          cancellation_reason:
            cancellationReason.trim() || "Cancelled by customer",
          cancellation_fee: cancellationFee,
          refund_amount: refundAmount,
        })
        .eq("id", selectedBookingForCancel.id);

      if (error) {
        throw error;
      }

      // Update local state
      setBookings((prev) =>
        prev.map((booking) =>
          booking.id === selectedBookingForCancel.id
            ? {
                ...booking,
                status: "cancelled",
                booking_status: "cancelled",
                cancelled_at: new Date().toISOString(),
                cancelled_by: currentUser.id,
                cancellation_reason:
                  cancellationReason.trim() || "Cancelled by customer",
                cancellation_fee: cancellationFee,
                refund_amount: refundAmount,
              }
            : booking,
        ),
      );

      // Close modal and reset state
      setShowCancelModal(false);
      setSelectedBookingForCancel(null);
      setCancellationReason("");

      // Force refresh bookings to ensure we get the latest status from database
      if (refreshBookings) {
        setTimeout(() => refreshBookings(), 100);
      }

      // Show appropriate cancellation message based on refund amount
      const refundMessage =
        refundAmount === 0
          ? "Your booking has been cancelled successfully. No refund will be processed as per our cancellation policy."
          : refundAmount === totalAmount
            ? "Your booking has been cancelled successfully. Full refund will be processed."
            : `Your booking has been cancelled. Refund amount: $${refundAmount.toFixed(2)} (Cancellation fee: $${cancellationFee.toFixed(2)})`;

      toast({
        title: "Booking Cancelled",
        description: refundMessage,
      });
    } catch (error: any) {
      console.error("Error cancelling booking:", error);
      let errorMessage = "Unknown error occurred";

      if (error) {
        if (typeof error === "string") {
          errorMessage = error;
        } else if (error.message) {
          errorMessage = error.message;
        } else if (error.details) {
          errorMessage = error.details;
        } else if (error.hint) {
          errorMessage = error.hint;
        }
      }

      toast({
        title: "Error Cancelling Booking",
        description: `Failed to cancel booking: ${errorMessage}`,
        variant: "destructive",
      });
    }
  };

  // Reschedule booking function
  const rescheduleBooking = async () => {
    if (
      !selectedBookingForReschedule ||
      !currentUser ||
      !newBookingDate ||
      !newBookingTime
    ) {
      toast({
        title: "Error",
        description: "Please select both a new date and time.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Prepare reschedule data with new schema fields
      const rescheduleData = {
        booking_date: newBookingDate,
        start_time: newBookingTime,
        booking_status: "pending",
        // New reschedule tracking fields
        rescheduled_at: new Date().toISOString(),
        rescheduled_by: currentUser.id,
        reschedule_reason: rescheduleReason || null,
        // Store original booking details if this is the first reschedule
        original_booking_date:
          selectedBookingForReschedule.original_booking_date ||
          selectedBookingForReschedule.booking_date,
        original_start_time:
          selectedBookingForReschedule.original_start_time ||
          selectedBookingForReschedule.start_time,
        // Increment reschedule count
        reschedule_count:
          (selectedBookingForReschedule.reschedule_count || 0) + 1,
      };

      const { error } = await supabase
        .from("bookings")
        .update(rescheduleData)
        .eq("id", selectedBookingForReschedule.id);

      if (error) {
        throw error;
      }

      // Update local state with reschedule tracking
      setBookings((prev) =>
        prev.map((booking) =>
          booking.id === selectedBookingForReschedule.id
            ? {
                ...booking,
                date: newBookingDate,
                booking_date: newBookingDate,
                time: new Date(
                  `1970-01-01T${newBookingTime}`,
                ).toLocaleTimeString([], {
                  hour: "numeric",
                  minute: "2-digit",
                }),
                start_time: newBookingTime,
                status: "pending",
                booking_status: "pending",
                // Update reschedule tracking fields in local state
                rescheduled_at: new Date().toISOString(),
                rescheduled_by: currentUser.id,
                reschedule_reason: rescheduleReason || null,
                original_booking_date:
                  booking.original_booking_date || booking.booking_date,
                original_start_time:
                  booking.original_start_time || booking.start_time,
                reschedule_count: (booking.reschedule_count || 0) + 1,
              }
            : booking,
        ),
      );

      // Close modal and reset state
      setShowRescheduleModal(false);
      setSelectedBookingForReschedule(null);
      setNewBookingDate("");
      setNewBookingTime("");
      setRescheduleReason("");

      // Force refresh bookings to ensure we get the latest status from database
      if (refreshBookings) {
        refreshBookings();
      }

      toast({
        title: "Reschedule Request Sent",
        description:
          "Your reschedule request has been sent to the provider for approval.",
      });
    } catch (error: any) {
      console.error("Error rescheduling booking - Full error object:", error);
      console.error("Error type:", typeof error);
      console.error("Error keys:", Object.keys(error || {}));

      let errorMessage = "Unknown error occurred";

      if (error) {
        // Handle different error object structures
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
          // Try to stringify the error object
          try {
            errorMessage = JSON.stringify(error);
          } catch {
            errorMessage = "Unable to parse error details";
          }
        }
      }

      console.error("Parsed error message:", errorMessage);

      toast({
        title: "Error Rescheduling Booking",
        description: `Failed to reschedule booking: ${errorMessage}`,
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Show loading state
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-roam-light-blue/10 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-roam-blue mx-auto mb-4" />
          <p className="text-lg font-semibold">Loading your bookings...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-roam-light-blue/10 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Error Loading Bookings</h2>
          <p className="text-foreground/70 mb-6">{error}</p>
          <Button
            onClick={() => window.location.reload()}
            className="bg-roam-blue hover:bg-roam-blue/90"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-roam-light-blue/10">
      {/* Navigation */}
      <nav className="border-b bg-background/80 backdrop-blur-md">
        {/* ... */}
      </nav>

      {/* Header */}
      <section className="py-8 lg:py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            {/* Back to Home Button */}
            <div className="mb-6">
              <Link to="/home">
                <Button
                  variant="ghost"
                  className="flex items-center gap-2 text-foreground/70 hover:text-foreground hover:bg-accent/50 px-3 py-2 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Home
                </Button>
              </Link>
            </div>

            <h1 className="text-3xl sm:text-4xl font-bold mb-4">
              My <span className="text-roam-blue">Bookings</span>
            </h1>
            <p className="text-lg text-foreground/70 mb-8">
              {userType === "customer"
                ? "Manage your service appointments and view your booking history."
                : "Manage your appointments and view your booking history."}
            </p>

            {/* Active Service Alert */}
            {activeBookings.length > 0 && (
              <Card className="mb-8 border-blue-200 bg-blue-50">
                {/* ... */}
              </Card>
            )}

            {/* Booking Tabs */}
            <Tabs defaultValue="upcoming" className="space-y-6">
              <TabsList className="grid w-full grid-cols-3">
                {/* ... */}
              </TabsList>

              <TabsContent value="upcoming" className="space-y-4">
                {allUpcomingBookings.length === 0 ? (
                  <Card className="p-12 text-center">{/* ... */}</Card>
                ) : (
                  <>
                    <div className="space-y-4">
                      {upcomingBookings.map((booking) => (
                        <BookingCard
                          key={booking.id}
                          booking={booking}
                          onCancel={handleCancel}
                          onReschedule={handleReschedule}
                          onMessage={handleMessage}
                        />
                      ))}
                    </div>

                    {/* Pagination Controls for Upcoming */}
                    {getTotalPages(allUpcomingBookings.length) > 1 && (
                      <div className="flex items-center justify-between pt-4">
                        {/* ... */}
                      </div>
                    )}
                  </>
                )}
              </TabsContent>

              <TabsContent value="active" className="space-y-4">
                {allActiveBookings.length === 0 ? (
                  <Card className="p-12 text-center">{/* ... */}</Card>
                ) : (
                  <>
                    <div className="space-y-4">
                      {activeBookings.map((booking) => (
                        <BookingCard
                          key={booking.id}
                          booking={booking}
                          onCancel={handleCancel}
                          onReschedule={handleReschedule}
                          onMessage={handleMessage}
                        />
                      ))}
                    </div>

                    {/* Pagination Controls for Active */}
                    {getTotalPages(allActiveBookings.length) > 1 && (
                      <div className="flex items-center justify-between pt-4">
                        {/* ... */}
                      </div>
                    )}
                  </>
                )}
              </TabsContent>

              <TabsContent value="past" className="space-y-4">
                {allPastBookings.length === 0 ? (
                  <Card className="p-12 text-center">{/* ... */}</Card>
                ) : (
                  <>
                    <div className="space-y-4">
                      {pastBookings.map((booking) => (
                        <BookingCard
                          key={booking.id}
                          booking={booking}
                          onCancel={handleCancel}
                          onReschedule={handleReschedule}
                          onMessage={handleMessage}
                        />
                      ))}
                    </div>

                    {/* Pagination Controls for Past */}
                    {getTotalPages(allPastBookings.length) > 1 && (
                      <div className="flex items-center justify-between pt-4">
                        <div className="text-sm text-foreground/60">
                          Showing {(currentPage.past - 1) * ITEMS_PER_PAGE + 1}{" "}
                          to{" "}
                          {Math.min(
                            currentPage.past * ITEMS_PER_PAGE,
                            allPastBookings.length,
                          )}{" "}
                          of {allPastBookings.length} bookings
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange("past", "prev")}
                            disabled={currentPage.past === 1}
                          >
                            <ChevronLeft className="w-4 h-4" />
                            Previous
                          </Button>
                          <span className="text-sm font-medium">
                            Page {currentPage.past} of{" "}
                            {getTotalPages(allPastBookings.length)}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange("past", "next")}
                            disabled={
                              currentPage.past ===
                              getTotalPages(allPastBookings.length)
                            }
                          >
                            Next
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </section>

      {/* Cancellation Modal */}
      <Dialog open={showCancelModal} onOpenChange={setShowCancelModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="w-5 h-5" />
              Cancel Booking
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedBookingForCancel && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-sm">
                  {selectedBookingForCancel.serviceName ||
                    selectedBookingForCancel.service ||
                    "Service"}
                </h4>
                <p className="text-sm text-gray-600">
                  Date: {formatDate(selectedBookingForCancel.date)} at{" "}
                  {selectedBookingForCancel.time}
                </p>
                <p className="text-sm text-gray-600">
                  Provider:{" "}
                  {selectedBookingForCancel.provider?.name || "Provider"}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label
                htmlFor="cancellation-reason"
                className="text-sm font-medium"
              >
                Reason for Cancellation{" "}
                <span className="text-gray-500">(Optional)</span>
              </Label>
              <Textarea
                id="cancellation-reason"
                placeholder="Please let us know why you're cancelling this booking..."
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                rows={3}
                className="resize-none"
              />
              <p className="text-xs text-gray-500">
                This information helps us improve our service.
              </p>
            </div>

            {selectedBookingForCancel &&
              (() => {
                const cancellationDetails = calculateCancellationDetails(
                  selectedBookingForCancel,
                );
                return (
                  <>
                    {/* Cancellation Fee Breakdown */}
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <h4 className="font-medium text-sm mb-2">
                        Cancellation Details
                      </h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Booking Total:</span>
                          <span className="font-medium">
                            ${cancellationDetails.totalAmount.toFixed(2)}
                          </span>
                        </div>
                        {(cancellationDetails.isWithin24Hours ||
                          cancellationDetails.isPastBooking) && (
                          <>
                            <div className="flex justify-between text-red-600">
                              <span>Cancellation Fee:</span>
                              <span className="font-medium">
                                $
                                {cancellationDetails.cancellationFee.toFixed(2)}
                              </span>
                            </div>
                            <div className="border-t pt-1 mt-1">
                              <div className="flex justify-between font-medium">
                                <span>Refund Amount:</span>
                                <span className="text-red-600">
                                  ${cancellationDetails.refundAmount.toFixed(2)}
                                </span>
                              </div>
                            </div>
                          </>
                        )}
                        {!cancellationDetails.isWithin24Hours &&
                          !cancellationDetails.isPastBooking && (
                            <div className="flex justify-between font-medium text-green-600">
                              <span>Refund Amount:</span>
                              <span>
                                ${cancellationDetails.refundAmount.toFixed(2)}
                              </span>
                            </div>
                          )}
                      </div>
                    </div>

                    <div
                      className={`border rounded-lg p-3 ${cancellationDetails.isPastBooking || cancellationDetails.isWithin24Hours ? "bg-red-50 border-red-200" : "bg-yellow-50 border-yellow-200"}`}
                    >
                      <div className="flex items-start gap-2">
                        <AlertCircle
                          className={`w-4 h-4 mt-0.5 flex-shrink-0 ${cancellationDetails.isPastBooking || cancellationDetails.isWithin24Hours ? "text-red-600" : "text-yellow-600"}`}
                        />
                        <div
                          className={`text-sm ${cancellationDetails.isPastBooking || cancellationDetails.isWithin24Hours ? "text-red-800" : "text-yellow-800"}`}
                        >
                          <p className="font-medium">Cancellation Policy</p>
                          {cancellationDetails.isPastBooking ? (
                            <p>
                              This booking is in the past. You may cancel it but
                              no refund will be provided as per our policy.
                            </p>
                          ) : cancellationDetails.isWithin24Hours ? (
                            <p>
                              This booking is within 24 hours of the appointment
                              time. You may cancel it but no refund will be
                              provided as per our policy.
                            </p>
                          ) : (
                            <p>
                              This booking can be cancelled with a full refund
                              as it's more than 24 hours away from the
                              appointment time.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCancelModal(false);
                  setSelectedBookingForCancel(null);
                  setCancellationReason("");
                }}
                className="flex-1"
              >
                Keep Booking
              </Button>
              <Button
                onClick={cancelBooking}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                Cancel Booking
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reschedule Modal */}
      <Dialog open={showRescheduleModal} onOpenChange={setShowRescheduleModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-roam-blue">
              <Edit className="w-5 h-5" />
              Reschedule Booking
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedBookingForReschedule && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-sm">
                  {selectedBookingForReschedule.service || "Service"}
                </h4>
                <p className="text-sm text-gray-600">
                  Current Date: {formatDate(selectedBookingForReschedule.date)}{" "}
                  at {selectedBookingForReschedule.time}
                </p>
                <p className="text-sm text-gray-600">
                  Provider:{" "}
                  {selectedBookingForReschedule.provider?.name || "Provider"}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label
                  htmlFor="new-booking-date"
                  className="text-sm font-medium"
                >
                  New Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="new-booking-date"
                  type="date"
                  value={newBookingDate}
                  onChange={(e) => setNewBookingDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="w-full"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="new-booking-time"
                  className="text-sm font-medium"
                >
                  New Time <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="new-booking-time"
                  type="time"
                  value={newBookingTime}
                  onChange={(e) => setNewBookingTime(e.target.value)}
                  className="w-full"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="reschedule-reason"
                className="text-sm font-medium"
              >
                Reason for Rescheduling{" "}
                <span className="text-gray-500">(Optional)</span>
              </Label>
              <Textarea
                id="reschedule-reason"
                placeholder="Please let us know why you need to reschedule..."
                value={rescheduleReason}
                onChange={(e) => setRescheduleReason(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium">Reschedule Policy</p>
                  <p>
                    Your booking will be set to pending status and the provider
                    will need to confirm the new date and time.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowRescheduleModal(false);
                  setSelectedBookingForReschedule(null);
                  setNewBookingDate("");
                  setNewBookingTime("");
                  setRescheduleReason("");
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={rescheduleBooking}
                className="flex-1 bg-roam-blue hover:bg-roam-blue/90 text-white"
                disabled={!newBookingDate || !newBookingTime}
              >
                Request Reschedule
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Messaging Modal */}
      <ConversationChat
        isOpen={showMessageModal}
        onClose={() => setShowMessageModal(false)}
        booking={
          selectedBookingForMessage
            ? {
                id: selectedBookingForMessage.id,
                customer_name:
                  `${currentUser?.first_name || ""} ${currentUser?.last_name || ""}`.trim() ||
                  "Customer",
                customer_email: currentUser?.email || "",
                customer_phone: (currentUser as any)?.phone || "",
                service_name: selectedBookingForMessage.service || "Service",
                provider_name:
                  selectedBookingForMessage.provider?.name || "Provider",
                business_id: selectedBookingForMessage.business_id || "",
                customer_id: selectedBookingForMessage.customer_id,
                // Include the actual database profile objects
                customer_profiles: selectedBookingForMessage.customer_profiles,
                providers: selectedBookingForMessage.providers,
              }
            : undefined
        }
      />
    </div>
  );
}

function BookingCard({
  booking,
  onCancel,
  onReschedule,
  onMessage,
}: {
  booking: any;
  onCancel: (booking: any) => void;
  onReschedule: (booking: any) => void;
  onMessage: (booking: any) => void;
}) {
  const [showMoreInfo, setShowMoreInfo] = useState(false);

  const statusConfig = {
    confirmed: {
      label: "Confirmed",
      color: "bg-green-100 text-green-800",
      icon: CheckCircle,
      description: "Your booking is confirmed",
    },
    pending: {
      label: "Pending",
      color: "bg-yellow-100 text-yellow-800",
      icon: Clock,
      description: "Waiting for provider confirmation",
    },
    in_progress: {
      label: "In Progress",
      color: "bg-blue-100 text-blue-800",
      icon: RefreshCw,
      description: "Service is currently active",
    },
    completed: {
      label: "Completed",
      color: "bg-gray-100 text-gray-800",
      icon: CheckCircle,
      description: "Service completed successfully",
    },
    cancelled: {
      label: "Cancelled",
      color: "bg-red-100 text-red-800",
      icon: XCircle,
      description: "Booking was cancelled",
    },
    declined: {
      label: "Declined",
      color: "bg-red-100 text-red-800",
      icon: XCircle,
      description: "Booking was declined by provider",
    },
    no_show: {
      label: "No Show",
      color: "bg-gray-100 text-gray-800",
      icon: XCircle,
      description: "Customer did not show up",
    },
  }[booking.status];

  const DeliveryIcon = getDeliveryIcon(booking.deliveryType);
  const deliveryLabel = getDeliveryLabel(booking.deliveryType);

  // Check if booking is within 24 hours and cannot be cancelled
  const isWithin24Hours = () => {
    const now = new Date();
    const bookingDateTime = new Date(`${booking.date} ${booking.time}`);
    const timeDifferenceMs = bookingDateTime.getTime() - now.getTime();
    const hoursUntilBooking = timeDifferenceMs / (1000 * 60 * 60);
    return hoursUntilBooking <= 24 && hoursUntilBooking > 0;
  };

  const canCancelBooking =
    (booking.status === "pending" || booking.status === "confirmed") &&
    !isWithin24Hours();

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
          <div className="flex items-start gap-4 min-w-0 flex-1">
            <Avatar className="w-12 h-12 flex-shrink-0">
              <AvatarImage
                src={booking.provider.image}
                alt={booking.provider.name}
                className="object-cover"
              />
              <AvatarFallback className="bg-gradient-to-br from-roam-blue to-roam-light-blue text-white text-sm font-semibold">
                {booking.provider.firstName?.[0]?.toUpperCase() || ""}
                {booking.provider.lastName?.[0]?.toUpperCase() || ""}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-lg mb-1">{booking.service}</h3>
              <div className="flex items-center gap-2 mb-2">
                <p className="text-foreground/60">
                  with {booking.provider.name}
                </p>
                {booking.status === "confirmed" && (
                  <div className="flex items-center gap-1 text-xs text-roam-blue bg-roam-blue/10 px-2 py-1 rounded-full">
                    <MessageCircle className="w-3 h-3" />
                    <span>Messaging Available</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-4 text-sm text-foreground/60 mb-2">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {new Date(booking.date).toLocaleDateString()}
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {booking.time} ({booking.duration})
                </div>
              </div>

              {/* More Info Button with indicators */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  {booking.bookingReference && (
                    <div
                      className="w-2 h-2 bg-roam-blue rounded-full"
                      title="Booking Reference Available"
                    />
                  )}
                  <div
                    className="w-2 h-2 bg-green-500 rounded-full"
                    title="Status Details Available"
                  />
                  <div
                    className="w-2 h-2 bg-yellow-500 rounded-full"
                    title="Rating & Price Available"
                  />
                  {booking.reschedule_count > 0 && (
                    <div
                      className="w-2 h-2 bg-amber-500 rounded-full"
                      title="Reschedule History Available"
                    />
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowMoreInfo(!showMoreInfo)}
                  className="text-roam-blue hover:text-roam-blue/80 hover:bg-roam-blue/10 p-1 h-auto"
                >
                  <Info className="w-4 h-4 mr-1" />
                  <span className="text-xs">More Info</span>
                  {showMoreInfo ? (
                    <ChevronUp className="w-4 h-4 ml-1" />
                  ) : (
                    <ChevronDown className="w-4 h-4 ml-1" />
                  )}
                </Button>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 self-start">
            {booking.status === "completed" &&
            new Date(booking.date) < new Date() ? (
              <Button
                size="sm"
                variant="outline"
                className="border-roam-blue text-roam-blue hover:bg-roam-blue hover:text-white"
                onClick={() => {
                  // Navigate to book the same service again
                  window.location.href = `/book-service/${booking.serviceId}`;
                }}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Book Again
              </Button>
            ) : null}
          </div>
        </div>

        <div className="flex items-start gap-2 mb-4">
          <DeliveryIcon className="w-4 h-4 text-roam-blue mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium">{deliveryLabel}</p>
            <div className="flex items-start gap-2">
              <p className="text-sm text-foreground/60 flex-1">
                {booking.location}
              </p>
              {booking.deliveryType === "business_location" &&
                booking.location !== "Location TBD" && (
                  <button
                    onClick={() => {
                      const address = booking.location;

                      // Detect platform and open appropriate maps app
                      const isIOS = /iPad|iPhone|iPod/.test(
                        navigator.userAgent,
                      );
                      const isMobile =
                        /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
                          navigator.userAgent,
                        );

                      let mapsUrl;

                      // Use GPS coordinates if available, otherwise use address
                      if (
                        booking.locationDetails &&
                        booking.locationDetails.coordinates.latitude
                      ) {
                        const { latitude, longitude } =
                          booking.locationDetails.coordinates;
                        if (isIOS) {
                          mapsUrl = `maps://maps.google.com/maps?daddr=${latitude},${longitude}&amp;ll=`;
                        } else if (isMobile) {
                          mapsUrl = `geo:${latitude},${longitude}?q=${encodeURIComponent(address)}`;
                        } else {
                          mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
                        }
                      } else {
                        // Fallback to address-based navigation when no coordinates
                        const encodedAddress = encodeURIComponent(address);
                        if (isIOS) {
                          mapsUrl = `maps://maps.google.com/maps?daddr=${encodedAddress}`;
                        } else if (isMobile) {
                          mapsUrl = `geo:0,0?q=${encodedAddress}`;
                        } else {
                          mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`;
                        }
                      }

                      window.open(mapsUrl, "_blank");
                    }}
                    className="text-roam-blue hover:text-roam-blue/80 transition-colors"
                    title="Get directions"
                  >
                    <Map className="w-4 h-4" />
                  </button>
                )}
            </div>
          </div>
        </div>

        {/* Collapsible More Info Section */}
        {showMoreInfo && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
            <h4 className="font-medium text-sm text-gray-800 mb-3 flex items-center gap-2">
              <Info className="w-4 h-4" />
              Additional Details
            </h4>

            {/* Booking Reference */}
            {booking.bookingReference && (
              <div className="flex items-center gap-2 p-2 bg-white rounded-lg border-l-4 border-roam-blue">
                <Hash className="w-4 h-4 text-roam-blue" />
                <div>
                  <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                    Booking Reference
                  </span>
                  <p className="text-sm font-mono font-semibold text-gray-900">
                    {booking.bookingReference}
                  </p>
                </div>
              </div>
            )}

            {/* Status Update */}
            <div className="p-2 bg-white rounded-lg">
              <span className="text-xs font-medium text-gray-600 uppercase tracking-wide block mb-2">
                Current Status
              </span>
              <RealtimeStatusUpdate
                bookingId={booking.id}
                currentStatus={booking.status}
                onStatusChange={(newStatus) => {
                  console.log(
                    `Booking ${booking.id} status changed to ${newStatus}`,
                  );
                }}
              />
            </div>

            {/* Rating and Price */}
            <div className="flex items-center justify-between p-2 bg-white rounded-lg">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-roam-warning fill-current" />
                <span className="text-sm font-medium">
                  {booking.provider.rating} stars
                </span>
              </div>
              <span className="text-lg font-semibold text-roam-blue">
                {booking.price}
              </span>
            </div>

            {/* Reschedule History */}
            {booking.reschedule_count > 0 && (
              <div className="flex items-center gap-2 p-2 bg-amber-50 rounded-lg border-l-4 border-amber-400">
                <RefreshCw className="w-4 h-4 text-amber-600" />
                <div className="flex-1">
                  <span className="text-xs font-medium text-amber-700 uppercase tracking-wide">
                    Rescheduled {booking.reschedule_count} time
                    {booking.reschedule_count > 1 ? "s" : ""}
                  </span>
                  {booking.original_booking_date &&
                    booking.original_start_time && (
                      <p className="text-xs text-amber-600">
                        Originally:{" "}
                        {new Date(
                          booking.original_booking_date,
                        ).toLocaleDateString()}{" "}
                        at{" "}
                        {new Date(
                          `1970-01-01T${booking.original_start_time}`,
                        ).toLocaleTimeString([], {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </p>
                    )}
                  {booking.reschedule_reason && (
                    <p className="text-xs text-amber-600 mt-1">
                      Reason: {booking.reschedule_reason}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {booking.notes && (
          <div className="bg-accent/20 rounded-lg p-3 mb-4">
            <p className="text-sm text-foreground/80">
              <strong>Notes:</strong> {booking.notes}
            </p>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Primary action - Message Provider (most common) */}
          <div className="flex gap-2">
            {booking.status === "confirmed" && booking.provider && (
              <Button
                size="sm"
                className="bg-roam-blue hover:bg-roam-blue/90 text-white font-medium"
                onClick={() => onMessage(booking)}
                title={`Message ${booking.provider.name} about this booking`}
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Message Provider
              </Button>
            )}
          </div>

          {/* Secondary actions - Cancel and Reschedule (less common) */}
          <div className="flex gap-2">
            {(booking.status === "pending" || booking.status === "confirmed") &&
              booking.status !== "cancelled" &&
              booking.status !== "declined" &&
              booking.status !== "completed" &&
              booking.status !== "no_show" && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-roam-blue text-roam-blue hover:bg-roam-blue hover:text-white"
                    onClick={() => onReschedule(booking)}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Reschedule
                  </Button>
                  {canCancelBooking ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-red-500 text-red-600 hover:bg-red-500 hover:text-white"
                      onClick={() => onCancel(booking)}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                  ) : isWithin24Hours() ? (
                    <div className="flex flex-col items-end">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-gray-300 text-gray-400 cursor-not-allowed"
                        disabled
                      >
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                      </Button>
                      <p className="text-xs text-red-600 mt-1 max-w-[120px] text-right">
                        Cannot cancel within 24 hours
                      </p>
                    </div>
                  ) : null}
                </>
              )}
          </div>
          {booking.status === "completed" &&
            new Date(booking.date) >= new Date() && (
              <Button size="sm" className="bg-roam-blue hover:bg-roam-blue/90">
                <Star className="w-4 h-4 mr-2" />
                Leave Review
              </Button>
            )}
          {booking.status === "cancelled" && (
            <Button size="sm" className="bg-roam-blue hover:bg-roam-blue/90">
              <RefreshCw className="w-4 h-4 mr-2" />
              Book Again
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
