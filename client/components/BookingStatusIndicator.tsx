import React from "react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import useRealtimeBookings from "@/hooks/useRealtimeBookings";
import {
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  DollarSign,
  MapPin,
  User,
  ArrowRight,
} from "lucide-react";

interface BookingStatusIndicatorProps {
  status: string;
  previousStatus?: string;
  showProgress?: boolean;
  size?: "sm" | "md" | "lg";
  animated?: boolean;
  showIcon?: boolean;
  showText?: boolean;
  className?: string;
}

const BOOKING_STATUS_FLOW = [
  "pending",
  "confirmed",
  "in_progress",
  "completed",
];

const PAYMENT_STATUS_FLOW = ["pending_payment", "paid", "completed"];

export default function BookingStatusIndicator({
  status,
  previousStatus,
  showProgress = false,
  size = "md",
  animated = true,
  showIcon = true,
  showText = true,
  className,
}: BookingStatusIndicatorProps) {
  const getStatusConfig = (status: string) => {
    const configs = {
      pending: {
        label: "Pending",
        icon: Clock,
        color: "bg-yellow-100 text-yellow-700 border-yellow-200",
        progressColor: "bg-yellow-500",
        description: "Awaiting confirmation",
      },
      confirmed: {
        label: "Confirmed",
        icon: CheckCircle,
        color: "bg-green-100 text-green-700 border-green-200",
        progressColor: "bg-green-500",
        description: "Booking confirmed",
      },
      in_progress: {
        label: "In Progress",
        icon: Loader2,
        color: "bg-blue-100 text-blue-700 border-blue-200",
        progressColor: "bg-blue-500",
        description: "Service in progress",
        spin: true,
      },
      completed: {
        label: "Completed",
        icon: CheckCircle,
        color: "bg-emerald-100 text-emerald-700 border-emerald-200",
        progressColor: "bg-emerald-500",
        description: "Service completed",
      },
      cancelled: {
        label: "Cancelled",
        icon: XCircle,
        color: "bg-red-100 text-red-700 border-red-200",
        progressColor: "bg-red-500",
        description: "Booking cancelled",
      },
      rescheduled: {
        label: "Rescheduled",
        icon: Calendar,
        color: "bg-orange-100 text-orange-700 border-orange-200",
        progressColor: "bg-orange-500",
        description: "Date/time changed",
      },
      pending_payment: {
        label: "Payment Due",
        icon: DollarSign,
        color: "bg-amber-100 text-amber-700 border-amber-200",
        progressColor: "bg-amber-500",
        description: "Payment required",
      },
      paid: {
        label: "Paid",
        icon: CheckCircle,
        color: "bg-green-100 text-green-700 border-green-200",
        progressColor: "bg-green-500",
        description: "Payment confirmed",
      },
      no_show: {
        label: "No Show",
        icon: AlertCircle,
        color: "bg-gray-100 text-gray-700 border-gray-200",
        progressColor: "bg-gray-500",
        description: "Customer did not show",
      },
    };

    return (
      configs[status as keyof typeof configs] || {
        label: status.replace("_", " "),
        icon: AlertCircle,
        color: "bg-gray-100 text-gray-700 border-gray-200",
        progressColor: "bg-gray-500",
        description: "Unknown status",
      }
    );
  };

  const config = getStatusConfig(status);
  const IconComponent = config.icon;

  const getProgressPercentage = () => {
    const isPaymentFlow = status.includes("payment") || status === "paid";
    const flow = isPaymentFlow ? PAYMENT_STATUS_FLOW : BOOKING_STATUS_FLOW;
    const currentIndex = flow.indexOf(status);

    if (currentIndex === -1) {
      // Handle special cases
      if (status === "cancelled" || status === "no_show") return 0;
      if (status === "rescheduled") return 50;
      return 25;
    }

    return ((currentIndex + 1) / flow.length) * 100;
  };

  const getSizeClasses = () => {
    switch (size) {
      case "sm":
        return {
          badge: "text-xs px-2 py-1",
          icon: "w-3 h-3",
          progress: "h-1",
        };
      case "lg":
        return {
          badge: "text-sm px-3 py-2",
          icon: "w-5 h-5",
          progress: "h-3",
        };
      default:
        return {
          badge: "text-sm px-2.5 py-1.5",
          icon: "w-4 h-4",
          progress: "h-2",
        };
    }
  };

  const sizeClasses = getSizeClasses();
  const progressPercentage = getProgressPercentage();

  return (
    <div className={cn("space-y-2", className)}>
      {/* Status Badge */}
      <div className="flex items-center gap-2">
        <Badge
          variant="outline"
          className={cn(
            "flex items-center gap-1.5 transition-all duration-300",
            config.color,
            sizeClasses.badge,
            animated && previousStatus && "animate-pulse",
          )}
        >
          {showIcon && (
            <IconComponent
              className={cn(
                sizeClasses.icon,
                config.spin && animated && "animate-spin",
              )}
            />
          )}
          {showText && (
            <span className="capitalize font-medium">{config.label}</span>
          )}
        </Badge>

        {/* Status Change Animation */}
        {animated && previousStatus && previousStatus !== status && (
          <div className="flex items-center gap-1 text-xs text-gray-500 animate-fade-in">
            <ArrowRight className="w-3 h-3" />
            <span>Updated</span>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      {showProgress && (
        <div className="space-y-1">
          <Progress
            value={progressPercentage}
            className={cn("transition-all duration-500", sizeClasses.progress)}
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>{config.description}</span>
            <span>{Math.round(progressPercentage)}%</span>
          </div>
        </div>
      )}
    </div>
  );
}

// Booking Status Timeline Component
interface BookingStatusTimelineProps {
  currentStatus: string;
  isPaymentFlow?: boolean;
  className?: string;
}

export function BookingStatusTimeline({
  currentStatus,
  isPaymentFlow = false,
  className,
}: BookingStatusTimelineProps) {
  const flow = isPaymentFlow ? PAYMENT_STATUS_FLOW : BOOKING_STATUS_FLOW;
  const currentIndex = flow.indexOf(currentStatus);

  const getStepStatus = (stepIndex: number) => {
    if (stepIndex < currentIndex) return "completed";
    if (stepIndex === currentIndex) return "current";
    return "pending";
  };

  return (
    <div className={cn("space-y-4", className)}>
      {flow.map((status, index) => {
        const stepStatus = getStepStatus(index);
        const config = getStatusConfig(status);
        const IconComponent = config.icon;

        return (
          <div key={status} className="flex items-center gap-3">
            {/* Step Indicator */}
            <div
              className={cn(
                "flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all duration-300",
                stepStatus === "completed" &&
                  "bg-green-500 border-green-500 text-white",
                stepStatus === "current" &&
                  "bg-blue-500 border-blue-500 text-white animate-pulse",
                stepStatus === "pending" &&
                  "bg-gray-100 border-gray-300 text-gray-400",
              )}
            >
              <IconComponent className="w-4 h-4" />
            </div>

            {/* Step Content */}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "font-medium transition-colors duration-300",
                    stepStatus === "completed" && "text-green-700",
                    stepStatus === "current" && "text-blue-700",
                    stepStatus === "pending" && "text-gray-500",
                  )}
                >
                  {config.label}
                </span>
                {stepStatus === "current" && (
                  <Badge
                    variant="outline"
                    className="text-xs bg-blue-50 text-blue-700"
                  >
                    Current
                  </Badge>
                )}
              </div>
              <p className="text-sm text-gray-600">{config.description}</p>
            </div>

            {/* Connecting Line */}
            {index < flow.length - 1 && (
              <div
                className={cn(
                  "absolute left-4 mt-8 w-0.5 h-6 transition-colors duration-300",
                  stepStatus === "completed" ? "bg-green-500" : "bg-gray-300",
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );

  function getStatusConfig(status: string) {
    const configs = {
      pending: {
        label: "Pending",
        icon: Clock,
        description: "Awaiting confirmation",
      },
      confirmed: {
        label: "Confirmed",
        icon: CheckCircle,
        description: "Booking confirmed",
      },
      in_progress: {
        label: "In Progress",
        icon: Loader2,
        description: "Service in progress",
      },
      completed: {
        label: "Completed",
        icon: CheckCircle,
        description: "Service completed",
      },
      pending_payment: {
        label: "Payment Due",
        icon: DollarSign,
        description: "Payment required",
      },
      paid: {
        label: "Paid",
        icon: CheckCircle,
        description: "Payment confirmed",
      },
    };

    return (
      configs[status as keyof typeof configs] || {
        label: status.replace("_", " "),
        icon: AlertCircle,
        description: "Unknown status",
      }
    );
  }
}

// Real-time Status Update Component
interface RealtimeStatusUpdateProps {
  bookingId: string;
  currentStatus: string;
  onStatusChange?: (newStatus: string) => void;
  className?: string;
}

export function RealtimeStatusUpdate({
  bookingId,
  currentStatus,
  onStatusChange,
  className,
}: RealtimeStatusUpdateProps) {
  const { getLatestBookingStatus } = useRealtimeBookings({
    onStatusChange: (booking) => {
      if (booking.id === bookingId && onStatusChange) {
        onStatusChange(booking.status);
      }
    },
  });

  const latestStatus = getLatestBookingStatus(bookingId) || currentStatus;
  const hasUpdated = latestStatus !== currentStatus;

  return (
    <div className={cn("relative", className)}>
      <BookingStatusIndicator
        status={latestStatus}
        previousStatus={hasUpdated ? currentStatus : undefined}
        animated={true}
        showProgress={true}
      />

      {hasUpdated && (
        <div className="absolute -top-1 -right-1">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping" />
          <div className="absolute top-0 w-2 h-2 bg-blue-500 rounded-full" />
        </div>
      )}
    </div>
  );
}
