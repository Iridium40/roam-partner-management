import "./global.css";

import { Toaster } from "@/components/ui/toaster";
// Import test utilities for development (available in browser console as window.testUtils)
import "@/utils/testUtils";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute, RoleBasedRedirect } from "@/components/ProtectedRoute";
import SystemBrandingInitializer from "@/components/SystemBrandingInitializer";

// Type declaration for React root container
declare global {
  interface HTMLElement {
    _reactRoot?: ReturnType<typeof createRoot>;
  }
}

// Provider Portal Pages Only
import ProviderPortal from "./pages/ProviderPortal";
import ProviderDashboard from "./pages/ProviderDashboard";
import ProviderOnboardingFlow from "./pages/ProviderOnboardingFlow";
import LandingPage from "./pages/LandingPage";
import ErrorBoundary from "./components/ErrorBoundary";
import NotFound from "./pages/NotFound";
import SignIn from "./pages/SignIn";
import Phase2Entry from "./pages/Phase2Entry";
import ImageUploadTest from "./pages/ImageUploadTest";
import Phase2Test from "./pages/Phase2Test";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <SystemBrandingInitializer />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Landing Page */}
            <Route path="/" element={<Navigate to="/landing" replace />} />
            <Route path="/landing" element={<LandingPage />} />

            {/* Provider Portal Authentication */}
            <Route path="/sign-in" element={<SignIn />} />
            <Route path="/provider-portal" element={<ProviderPortal />} />

            {/* Development/Testing */}
            <Route path="/image-upload-test" element={<ImageUploadTest />} />
            <Route path="/phase2-test" element={<Phase2Test />} />


            {/* Protected routes - any authenticated provider */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <RoleBasedRedirect />
                </ProtectedRoute>
              }
            />

            {/* Owner-specific routes */}
            <Route
              path="/owner/dashboard"
              element={
                <ProtectedRoute allowedRoles={["owner"]}>
                  <ProviderDashboard />
                </ProtectedRoute>
              }
            />

            {/* Dispatcher-specific routes */}
            <Route
              path="/dispatcher/dashboard"
              element={
                <ProtectedRoute allowedRoles={["owner", "dispatcher"]}>
                  <ProviderDashboard />
                </ProtectedRoute>
              }
            />

            {/* Provider-specific routes */}
            <Route
              path="/provider/dashboard"
              element={
                <ProtectedRoute
                  allowedRoles={["owner", "dispatcher", "provider"]}
                >
                  <ProviderDashboard />
                </ProtectedRoute>
              }
            />

            {/* Legacy route redirects */}
            <Route
              path="/provider-dashboard"
              element={
                <ProtectedRoute>
                  <RoleBasedRedirect />
                </ProtectedRoute>
              }
            />



            {/* Provider Onboarding Flow - New comprehensive system */}
            <Route
              path="/provider-onboarding"
              element={
                <ErrorBoundary>
                  <ProviderOnboardingFlow />
                </ErrorBoundary>
              }
            />
            
            {/* Alternative onboarding route for easier access */}
            <Route
              path="/become-a-provider"
              element={
                <ErrorBoundary>
                  <ProviderOnboardingFlow />
                </ErrorBoundary>
              }
            />

            {/* Phase 2 Entry Point - Token validation */}
            <Route
              path="/provider-onboarding/phase2"
              element={
                <ErrorBoundary>
                  <Phase2Entry />
                </ErrorBoundary>
              }
            />

            {/* Phase 2 Steps */}
            <Route
              path="/provider-onboarding/phase2/:step"
              element={
                <ErrorBoundary>
                  <ProviderOnboardingFlow />
                </ErrorBoundary>
              }
            />



            {/* 404 - Catch all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

// Prevent multiple root creations during hot module reloading
const container = document.getElementById("root")!;

if (import.meta.hot) {
  // In development with HMR, always create a new root to avoid stale closures
  const root = createRoot(container);
  root.render(<App />);

  // Clean up on HMR update
  import.meta.hot.dispose(() => {
    root.unmount();
  });
} else {
  // In production or when HMR is not available
  if (!container._reactRoot) {
    const root = createRoot(container);
    container._reactRoot = root;
    root.render(<App />);
  } else {
    container._reactRoot.render(<App />);
  }
}
