import React, { useState, useEffect } from "react";
import { useLocation, useNavigate, useSearchParams, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Clock,
  Shield,
  AlertCircle,
  User,
  Building,
  FileText,
  CreditCard,
  Banknote,
  DollarSign,
  Users,
} from "lucide-react";

// Import components
import { ProviderSignupForm } from "@/components/ProviderSignupForm";
import { BusinessInfoForm } from "@/components/BusinessInfoForm";
import { DocumentUploadForm } from "@/components/DocumentUploadForm";
import { ApplicationReviewPage } from "@/components/ApplicationReviewPage";
import StripeIdentityVerification from "@/components/StripeIdentityVerification";
import { PlaidBankConnection } from "@/components/PlaidBankConnection";
import { StripeConnectSetup } from "@/components/StripeConnectSetup";
import WelcomeBackStep from "@/components/WelcomeBackStep";
import { useAuth } from "@/contexts/AuthContext";

type OnboardingPhase = "phase1" | "phase2" | "complete";
type Phase1Step =
  | "signup"
  | "business_info"
  | "documents"
  | "review"
  | "submitted";
type Phase2Step =
  | "welcome"
  | "business_profile"
  | "personal_profile"
  | "business_hours"
  | "staff_management"
  | "banking_payout"
  | "service_pricing"
  | "final_review"
  | "identity_verification"
  | "bank_connection"
  | "stripe_setup"
  | "complete";

interface OnboardingState {
  phase: OnboardingPhase;
  phase1Step: Phase1Step;
  phase2Step: Phase2Step;
  userData?: any;
  businessData?: any;
  documents?: any[];
  approvalToken?: string;
  businessId?: string;
  userId?: string;
  serviceCategories?: any[];
  serviceSubcategories?: any[];
}

const phase1Steps = [
  { id: "signup", title: "Account Creation", icon: User },
  { id: "business_info", title: "Business Information", icon: Building },
  { id: "documents", title: "Document Upload", icon: FileText },
  { id: "review", title: "Review & Submit", icon: CheckCircle },
];

const phase2Steps = [
  { id: "welcome", title: "Welcome Back", icon: Shield },
  { id: "business_profile", title: "Business Profile", icon: Building },
  { id: "personal_profile", title: "Personal Profile", icon: User },
  { id: "business_hours", title: "Business Hours", icon: Clock },
  { id: "staff_management", title: "Staff Management", icon: Users },
  { id: "banking_payout", title: "Banking & Payouts", icon: Banknote },
  { id: "service_pricing", title: "Service Pricing", icon: DollarSign },
  { id: "final_review", title: "Final Review", icon: CheckCircle },
];

export default function ProviderOnboardingFlow() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const params = useParams();
  const { user, isAuthenticated } = useAuth();

  const [onboardingState, setOnboardingState] = useState<OnboardingState>(
    () => ({
      phase: "phase1",
      phase1Step: "signup",
      phase2Step: "welcome",
      userData: undefined,
      businessData: undefined,
      documents: undefined,
      approvalToken: undefined,
      businessId: undefined,
      userId: undefined,
    }),
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize onboarding state based on URL and auth
  useEffect(() => {
    initializeOnboardingState();
  }, [location, isAuthenticated]);

  const initializeOnboardingState = () => {
    // Check if this is a Phase 2 route
    if (location.pathname.includes('/phase2/')) {
      initializePhase2();
      return;
    }

    // Regular Phase 1 initialization
    if (isAuthenticated && user && user.id) {
      // User is logged in, check their onboarding status
      checkOnboardingStatus();
    } else {
      // Start from beginning
      setOnboardingState((prev) => ({
        ...prev,
        phase: "phase1",
        phase1Step: "signup",
      }));
    }
  };

  const initializePhase2 = () => {
    // Check for validated Phase 2 session
    const phase2Session = sessionStorage.getItem('phase2_session');

    if (phase2Session) {
      try {
        const session = JSON.parse(phase2Session);

        // Validate session age (max 2 hours)
        if (Date.now() - session.validated_at < 2 * 60 * 60 * 1000) {
          setOnboardingState(prev => ({
            ...prev,
            phase: "phase2",
            businessId: session.business_id,
            userId: session.user_id,
            phase2Step: (params.step as Phase2Step) || "welcome",
            businessData: { businessName: session.business_name }
          }));
          return;
        }
      } catch (error) {
        console.error('Error parsing phase2 session:', error);
      }
    }

    // Invalid or expired session - redirect to portal
    console.log('No valid Phase 2 session, redirecting to portal');
    navigate('/provider-portal');
  };

  const checkOnboardingStatus = async () => {
    if (!user) return;

    try {
      setLoading(true);
      // Check user's onboarding progress
      const response = await fetch(`/api/onboarding/status/${user.id}`);

      if (response.ok) {
        const status = await response.json();

        if (status.phase === "complete") {
          navigate("/provider-dashboard");
        } else if (status.phase === "phase2") {
          setOnboardingState((prev) => ({
            ...prev,
            phase: "phase2",
            phase2Step: status.currentStep || "welcome",
            businessId: status.businessId || undefined,
            userId: user.id,
          }));
        } else {
          setOnboardingState((prev) => ({
            ...prev,
            phase: "phase1",
            phase1Step: status.currentStep || "business_info",
            userData: status.userData || undefined,
            businessData: status.businessData || undefined,
            businessId: status.businessId || undefined,
            userId: user.id,
          }));
        }
      } else {
        // If API call fails, just start from the beginning
        console.warn(
          "Failed to check onboarding status, starting from beginning",
        );
        setOnboardingState((prev) => ({
          ...prev,
          phase: "phase1",
          phase1Step: "signup",
          userId: user?.id,
        }));
      }
    } catch (error) {
      console.error("Error checking onboarding status:", error);
      // If there's an error, just start from the beginning
      setOnboardingState((prev) => ({
        ...prev,
        phase: "phase1",
        phase1Step: "signup",
        userId: user?.id,
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleSignupComplete = async (signupData: any) => {
    try {
      setLoading(true);
      setError(null);

      // Create user account
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(signupData),
      });

      let result;
      try {
        result = await response.json();
      } catch (parseError) {
        console.error("Failed to parse response JSON:", parseError);
        throw new Error("Server response was not valid JSON");
      }

      if (!response.ok) {
        // Handle specific error cases
        if (response.status === 409) {
          console.log(
            "💡 Developer tip: To delete test users, call: DELETE /api/admin/delete-test-user with { email: 'test@example.com' }",
          );
          throw new Error(
            "An account with this email already exists. Please use a different email or try logging in.",
          );
        }
        throw new Error(result.error || "Failed to create account");
      }

      // Validate result structure
      if (!result.user || !result.user.id) {
        throw new Error("Invalid response: missing user data");
      }

      setOnboardingState((prev) => ({
        ...prev,
        phase1Step: "business_info",
        userData: result.user,
        userId: result.user.id,
      }));
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to create account",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleBusinessInfoComplete = async (businessData: any) => {
    try {
      setLoading(true);
      setError(null);

      // Validate userId exists
      if (!onboardingState.userId) {
        throw new Error(
          "User ID is missing. Please start the signup process again.",
        );
      }

      const response = await fetch("/api/onboarding/business-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: onboardingState.userId,
          businessData,
        }),
      });

      // Clone the response immediately to avoid any body stream issues
      let responseText;
      let result;

      try {
        // Read response directly as text - no cloning needed
        responseText = await response.text();
        console.log("Business info response - Status:", response.status);
        console.log("Raw response length:", responseText.length);

        // Parse the response text as JSON
        if (responseText.trim()) {
          result = JSON.parse(responseText);
          console.log("Parsed response:", result);
        } else {
          throw new Error("Empty response from server");
        }
      } catch (error) {
        console.error("Response processing failed:", error);
        console.error("Response status:", response.status);

        // If it's a JSON parsing error, show the raw text
        if (error.name === "SyntaxError") {
          console.error("Raw response that failed to parse:", responseText);
          throw new Error("Server returned invalid JSON response");
        } else {
          // For other errors, provide helpful messages based on status
          if (response.status >= 500) {
            throw new Error("Server error occurred. Please try again later.");
          } else if (response.status === 404) {
            throw new Error("API endpoint not found. Please contact support.");
          } else if (response.status >= 400) {
            throw new Error(
              "Request failed. Please check your data and try again.",
            );
          } else {
            throw new Error("Failed to process server response");
          }
        }
      }

      if (!response.ok) {
        throw new Error(result.error || "Failed to save business information");
      }

      // Validate result structure
      if (!result.business || !result.business.id) {
        throw new Error("Invalid response: missing business data");
      }

      setOnboardingState((prev) => ({
        ...prev,
        phase1Step: "documents",
        businessData,
        businessId: result.business.id,
      }));
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to save business information",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentsComplete = async (documents: any[]) => {
    setOnboardingState((prev) => ({
      ...prev,
      phase1Step: "review",
      documents,
    }));
  };

  const handleApplicationSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      // Validate required data
      if (!onboardingState.userId) {
        throw new Error(
          "User ID is missing. Please start the signup process again.",
        );
      }
      if (!onboardingState.businessId) {
        throw new Error(
          "Business ID is missing. Please complete business information first.",
        );
      }

      console.log("Submitting application with:", {
        userId: onboardingState.userId,
        businessId: onboardingState.businessId,
      });

      const response = await fetch("/api/onboarding/submit-application", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: onboardingState.userId,
          businessId: onboardingState.businessId,
          finalConsents: {
            informationAccuracy: true,
            termsAccepted: true,
            backgroundCheckConsent: true,
          },
        }),
      });

      // Handle response based on status without reading body initially
      console.log("Submit application response - Status:", response.status);

      // Check if response is successful first
      if (response.ok) {
        // Only try to read the body if the response was successful
        try {
          const result = await response.json();
          console.log("Application submitted successfully:", result);
        } catch (jsonError) {
          console.log(
            "Success response but couldn't parse JSON, continuing anyway",
          );
        }
      } else {
        // For error responses, provide helpful messages based on status code
        if (response.status === 400) {
          // Don't try to read the body, just provide a helpful error based on the context
          throw new Error(
            "Please ensure you have uploaded all required documents (Professional License, Professional Headshot, and Business License if applicable) before submitting your application.",
          );
        } else if (response.status === 404) {
          throw new Error(
            "Business profile not found. Please complete the business information step first.",
          );
        } else if (response.status >= 500) {
          throw new Error("Server error occurred. Please try again later.");
        } else {
          throw new Error(
            `Application submission failed (${response.status}). Please check your information and try again.`,
          );
        }
      }

      if (!response.ok) {
        // Handle specific error types with helpful messages
        if (
          result.error &&
          result.error.includes("Missing required documents")
        ) {
          const missingDocs = result.missingDocuments || [];
          const docNames = missingDocs
            .map((doc) =>
              doc.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
            )
            .join(", ");

          throw new Error(
            `Please upload the following required documents before submitting: ${docNames}. ` +
              `Go back to the Documents step to upload them.`,
          );
        } else if (
          result.error &&
          result.error.includes(
            "Business profile not found or not owned by user",
          )
        ) {
          console.log(
            "💡 Debug tip: To check user-business relationships, run:",
          );
          console.log(
            `window.testUtils.debugUserBusiness('${result.debug?.userId || "USER_EMAIL"}')`,
          );
          console.log("💡 To attempt auto-fix, run:");
          console.log(
            `window.testUtils.debugUserBusiness('${result.debug?.userId || "USER_EMAIL"}', true)`,
          );

          throw new Error(
            "Business ownership verification failed. Please ensure you completed the business information step correctly.",
          );
        } else {
          throw new Error(result.error || "Failed to submit application");
        }
      }

      setOnboardingState((prev) => ({
        ...prev,
        phase1Step: "submitted",
      }));
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to submit application",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleEditSection = (section: "user" | "business" | "documents") => {
    switch (section) {
      case "user":
        setOnboardingState((prev) => ({ ...prev, phase1Step: "signup" }));
        break;
      case "business":
        setOnboardingState((prev) => ({
          ...prev,
          phase1Step: "business_info",
        }));
        break;
      case "documents":
        setOnboardingState((prev) => ({ ...prev, phase1Step: "documents" }));
        break;
    }
  };

  const handlePhase2Welcome = () => {
    navigate('/provider-onboarding/phase2/business_profile');
  };

  const handlePhase2StepComplete = (nextStep: Phase2Step) => {
    navigate(`/provider-onboarding/phase2/${nextStep}`);
  };

  const handlePhase2Complete = () => {
    setOnboardingState((prev) => ({
      ...prev,
      phase: "complete",
      phase2Step: "complete",
    }));

    // Redirect to provider dashboard
    setTimeout(() => {
      navigate("/provider-dashboard");
    }, 2000);
  };

  const handleIdentityVerificationComplete = () => {
    setOnboardingState((prev) => ({
      ...prev,
      phase2Step: "bank_connection",
    }));
  };

  const handleBankConnectionComplete = () => {
    setOnboardingState((prev) => ({
      ...prev,
      phase2Step: "stripe_setup",
    }));
  };

  const handleStripeSetupComplete = () => {
    setOnboardingState((prev) => ({
      ...prev,
      phase: "complete",
      phase2Step: "complete",
    }));

    // Redirect to provider dashboard
    setTimeout(() => {
      navigate("/provider-dashboard");
    }, 2000);
  };

  const getCurrentStepIndex = () => {
    if (onboardingState.phase === "phase1") {
      return phase1Steps.findIndex(
        (step) => step.id === onboardingState.phase1Step,
      );
    } else {
      return phase2Steps.findIndex(
        (step) => step.id === onboardingState.phase2Step,
      );
    }
  };

  const getTotalSteps = () => {
    return onboardingState.phase === "phase1"
      ? phase1Steps.length
      : phase2Steps.length;
  };

  const getProgressPercentage = () => {
    const currentStep = getCurrentStepIndex();
    const totalSteps = getTotalSteps();
    return Math.round(((currentStep + 1) / totalSteps) * 100);
  };

  const renderPhase1Content = () => {
    const { phase1Step } = onboardingState;

    switch (phase1Step) {
      case "signup":
        return (
          <ProviderSignupForm
            onSubmit={handleSignupComplete}
            loading={loading}
            error={error}
          />
        );

      case "business_info":
        // Ensure userId exists before allowing business info entry
        if (!onboardingState.userId) {
          console.warn("UserId missing, redirecting to signup");
          setOnboardingState((prev) => ({
            ...prev,
            phase1Step: "signup",
          }));
          setError("Please complete the signup process first.");
          return null;
        }
        return (
          <BusinessInfoForm
            onSubmit={handleBusinessInfoComplete}
            loading={loading}
            error={error}
            initialData={onboardingState.businessData}
          />
        );

      case "documents":
        // Ensure userId exists before allowing document upload
        if (!onboardingState.userId) {
          console.warn("UserId missing, redirecting to signup");
          setOnboardingState((prev) => ({
            ...prev,
            phase1Step: "signup",
          }));
          setError("Please complete the signup process first.");
          return null;
        }
        return (
          <DocumentUploadForm
            onSubmit={handleDocumentsComplete}
            loading={loading}
            error={error}
            businessType={onboardingState.businessData?.businessType}
            userId={onboardingState.userId}
            businessId={onboardingState.businessId}
          />
        );

      case "review":
        return (
          <ApplicationReviewPage
            applicationData={{
              userData: onboardingState.userData,
              businessInfo: onboardingState.businessData,
              documents: onboardingState.documents || [],
            }}
            onSubmit={handleApplicationSubmit}
            onEdit={handleEditSection}
            loading={loading}
            error={error}
          />
        );

      case "submitted":
        return (
          <Card className="max-w-2xl mx-auto text-center">
            <CardHeader>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <CardTitle className="text-2xl text-green-800">
                Application Submitted!
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert>
                <Clock className="h-4 w-4" />
                <AlertDescription>
                  <strong>What's next:</strong>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>
                      Background check and document verification (2-3 business
                      days)
                    </li>
                    <li>
                      Admin review of your application (1-2 business days)
                    </li>
                    <li>
                      Email notification with secure link for Phase 2 setup
                    </li>
                  </ul>
                </AlertDescription>
              </Alert>

              <p className="text-foreground/70">
                You'll receive an email with next steps once your application is
                approved. Please check your email regularly and add our domain
                to your safe senders list.
              </p>

              <Button
                onClick={() => navigate("/provider-portal")}
                className="bg-roam-blue hover:bg-roam-blue/90"
              >
                Return to Provider Portal
              </Button>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  const renderPhase2Content = () => {
    const { phase2Step } = onboardingState;

    switch (phase2Step) {
      case "welcome":
        return (
          <WelcomeBackStep
            businessName={onboardingState.businessData?.businessName}
            onContinue={handlePhase2Welcome}
            userId={onboardingState.userId}
            businessId={onboardingState.businessId}
          />
        );

      case "business_profile":
        return (
          <Card className="max-w-2xl mx-auto text-center">
            <CardHeader>
              <CardTitle className="text-2xl text-roam-blue">
                Business Profile Setup
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p>Business profile component coming soon...</p>
              <Button onClick={() => handlePhase2StepComplete("personal_profile")} className="mt-4">
                Continue
              </Button>
            </CardContent>
          </Card>
        );

      case "personal_profile":
        return (
          <Card className="max-w-2xl mx-auto text-center">
            <CardHeader>
              <CardTitle className="text-2xl text-roam-blue">
                Personal Profile Setup
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p>Personal profile component coming soon...</p>
              <Button onClick={() => handlePhase2StepComplete("business_hours")} className="mt-4">
                Continue
              </Button>
            </CardContent>
          </Card>
        );

      case "business_hours":
        return (
          <Card className="max-w-2xl mx-auto text-center">
            <CardHeader>
              <CardTitle className="text-2xl text-roam-blue">
                Business Hours Setup
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p>Business hours component coming soon...</p>
              <Button onClick={() => handlePhase2StepComplete("staff_management")} className="mt-4">
                Continue
              </Button>
            </CardContent>
          </Card>
        );

      case "staff_management":
        return (
          <Card className="max-w-2xl mx-auto text-center">
            <CardHeader>
              <CardTitle className="text-2xl text-roam-blue">
                Staff Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p>Staff management component coming soon...</p>
              <Button onClick={() => handlePhase2StepComplete("banking_payout")} className="mt-4">
                Continue
              </Button>
            </CardContent>
          </Card>
        );

      case "banking_payout":
        return (
          <Card className="max-w-2xl mx-auto text-center">
            <CardHeader>
              <CardTitle className="text-2xl text-roam-blue">
                Banking & Payouts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p>Banking and payout component coming soon...</p>
              <Button onClick={() => handlePhase2StepComplete("service_pricing")} className="mt-4">
                Continue
              </Button>
            </CardContent>
          </Card>
        );

      case "service_pricing":
        return (
          <Card className="max-w-2xl mx-auto text-center">
            <CardHeader>
              <CardTitle className="text-2xl text-roam-blue">
                Service Pricing
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p>Service pricing component coming soon...</p>
              <Button onClick={() => handlePhase2StepComplete("final_review")} className="mt-4">
                Continue
              </Button>
            </CardContent>
          </Card>
        );

      case "final_review":
        return (
          <Card className="max-w-2xl mx-auto text-center">
            <CardHeader>
              <CardTitle className="text-2xl text-roam-blue">
                Final Review
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p>Final review component coming soon...</p>
              <Button onClick={handlePhase2Complete} className="mt-4">
                Complete Setup
              </Button>
            </CardContent>
          </Card>
        );

      case "identity_verification":
        return (
          <StripeIdentityVerification
            userId={onboardingState.userId}
            businessId={onboardingState.businessId}
            onVerificationComplete={handleIdentityVerificationComplete}
            onVerificationPending={() => {}}
            className="max-w-2xl mx-auto"
          />
        );

      case "bank_connection":
        return (
          <PlaidBankConnection
            userId={onboardingState.userId!}
            businessId={onboardingState.businessId!}
            businessType={
              onboardingState.businessData?.businessType ||
              "sole_proprietorship"
            }
            onConnectionComplete={handleBankConnectionComplete}
            className="max-w-2xl mx-auto"
          />
        );

      case "stripe_setup":
        return (
          <StripeConnectSetup
            userId={onboardingState.userId!}
            businessId={onboardingState.businessId!}
            businessType={
              onboardingState.businessData?.businessType ||
              "sole_proprietorship"
            }
            businessName={onboardingState.businessData?.businessName || ""}
            userEmail={onboardingState.userData?.email || ""}
            onSetupComplete={handleStripeSetupComplete}
            className="max-w-2xl mx-auto"
          />
        );

      case "complete":
        return (
          <Card className="max-w-2xl mx-auto text-center">
            <CardHeader>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <CardTitle className="text-2xl text-green-800">
                Setup Complete!
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert className="border-green-200 bg-green-50">
                <DollarSign className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  <strong>You're ready to accept bookings!</strong> Your
                  provider account is now fully set up and you can start
                  receiving customer bookings through the ROAM platform.
                </AlertDescription>
              </Alert>

              <p className="text-foreground/70">
                Redirecting you to your provider dashboard...
              </p>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  const renderProgressBar = () => {
    const currentSteps =
      onboardingState.phase === "phase1" ? phase1Steps : phase2Steps;
    const currentStepIndex = getCurrentStepIndex();

    return (
      <div className="w-full max-w-4xl mx-auto mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">
              {onboardingState.phase === "phase1"
                ? "Phase 1: Application"
                : "Phase 2: Setup"}
            </h2>
            <p className="text-sm text-foreground/60">
              Step {currentStepIndex + 1} of {currentSteps.length}
            </p>
          </div>
          <Badge variant="outline">{getProgressPercentage()}% Complete</Badge>
        </div>

        <Progress value={getProgressPercentage()} className="mb-4" />

        <div className="hidden md:flex items-center justify-between">
          {currentSteps.map((step, index) => {
            const Icon = step.icon;
            const isActive = index === currentStepIndex;
            const isCompleted = index < currentStepIndex;

            return (
              <div key={step.id} className="flex items-center">
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                    isCompleted
                      ? "bg-roam-blue border-roam-blue text-white"
                      : isActive
                        ? "border-roam-blue text-roam-blue"
                        : "border-gray-300 text-gray-400"
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <Icon className="w-5 h-5" />
                  )}
                </div>
                {index < currentSteps.length - 1 && (
                  <div
                    className={`hidden md:block w-20 h-1 mx-2 ${
                      isCompleted ? "bg-roam-blue" : "bg-gray-300"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-roam-light-blue/10 flex items-center justify-center">
        <Card className="max-w-md mx-auto text-center">
          <CardContent className="pt-6">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-roam-blue mx-auto mb-4"></div>
            <p>Loading...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-roam-light-blue/10">
      {/* Navigation */}
      <nav className="border-b bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/provider-portal")}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Portal
              </Button>
              <div className="flex items-center space-x-2">
                <img
                  src="https://cdn.builder.io/api/v1/image/assets%2Fa42b6f9ec53e4654a92af75aad56d14f%2F38446bf6c22b453fa45caf63b0513e21?format=webp&width=800"
                  alt="ROAM Logo"
                  className="h-8 w-auto"
                />
              </div>
            </div>
            <Badge
              variant="outline"
              className="border-roam-blue text-roam-blue"
            >
              Provider Onboarding
            </Badge>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderProgressBar()}

        {onboardingState.phase === "phase1"
          ? renderPhase1Content()
          : renderPhase2Content()}
      </div>
    </div>
  );
}
