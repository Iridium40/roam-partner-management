import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
  fallback?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  redirectTo = "/sign-in",
  fallback = null,
}) => {
  const { customer, loading } = useAuth();

  if (loading) {
    return (
      fallback || (
        <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-roam-light-blue/10 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-roam-blue to-roam-light-blue rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
              <div className="w-8 h-8 bg-white rounded-full"></div>
            </div>
            <h2 className="text-xl font-semibold text-roam-blue mb-2">
              Loading...
            </h2>
            <p className="text-foreground/60">
              Please wait while we verify your session.
            </p>
          </div>
        </div>
      )
    );
  }

  if (!customer) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
};

// For backward compatibility (if any other components use this)
export const RoleBasedRedirect: React.FC = () => {
  return <Navigate to="/customer/bookings" replace />;
};
