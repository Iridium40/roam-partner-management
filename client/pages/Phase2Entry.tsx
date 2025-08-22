import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  Loader2,
  Shield,
} from "lucide-react";

interface TokenValidationResult {
  success: boolean;
  business_id: string;
  user_id: string;
  application_id: string;
  business_name: string;
  progress: any;
  can_access_phase2: boolean;
}

interface Phase2SessionData {
  business_id: string;
  user_id: string;
  application_id: string;
  business_name: string;
  validated_at: number;
  progress?: any;
}

export default function Phase2Entry() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [validationResult, setValidationResult] =
    useState<TokenValidationResult | null>(null);

  useEffect(() => {
    console.log("Phase2Entry component mounted");
    console.log("Current URL:", window.location.href);

    const token = searchParams.get("token");
    const testMode = searchParams.get("test");
    console.log("Token from URL:", token ? "Token present" : "No token found");
    console.log("Test mode:", testMode);

    // Allow test mode to bypass token validation
    if (testMode === "true") {
      console.log("Test mode enabled - bypassing token validation");
      const testSessionData: Phase2SessionData = {
        business_id: "test-business-id",
        user_id: "test-user-id",
        application_id: "test-application-id",
        business_name: "Test Business",
        validated_at: Date.now(),
        progress: {}
      };
      
      sessionStorage.setItem("phase2_session", JSON.stringify(testSessionData));
      
      // Redirect to welcome step
      setTimeout(() => {
        navigate(`/provider-onboarding/phase2/welcome`, {
          replace: true,
          state: {
            validated: true,
            businessName: "Test Business",
          },
        });
      }, 1000);
      return;
    }

    if (!token) {
      console.error("No token found in URL parameters");
      setError("Invalid access link - missing token");
      setLoading(false);
      return;
    }

    validateTokenAndInitialize(token);
  }, [searchParams]);

  const validateTokenAndInitialize = async (token: string) => {
    try {
      setLoading(true);
      setError(null);

      console.log("Validating Phase 2 token...");

      const response = await fetch("/api/onboarding/validate-phase2-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Token validation failed");
      }

      console.log("Token validation successful:", result);
      setValidationResult(result);

      // Store validated session data for Phase 2 access
      const sessionData: Phase2SessionData = {
        business_id: result.business_id,
        user_id: result.user_id,
        application_id: result.application_id,
        business_name: result.business_name,
        validated_at: Date.now(),
        progress: result.progress,
      };

      sessionStorage.setItem("phase2_session", JSON.stringify(sessionData));

      // Determine starting step based on progress
      const startStep = determineStartStep(result.progress);

      console.log("Redirecting to Phase 2 step:", startStep);

      // Auto-redirect after 2 seconds or let user click
      setTimeout(() => {
        navigate(`/provider-onboarding/phase2/${startStep}`, {
          replace: true,
          state: {
            validated: true,
            businessName: result.business_name,
          },
        });
      }, 2000);
    } catch (error) {
      console.error("Token validation error:", error);
      setError(error instanceof Error ? error.message : "Access denied");
    } finally {
      setLoading(false);
    }
  };

  const determineStartStep = (progress: any) => {
    if (!progress) return "welcome";

    // Resume at the first incomplete step
    const steps = [
      "welcome",
      "business_profile",
      "personal_profile",
      "business_hours",
      "staff_management",
      "banking_payout",
      "service_pricing",
      "final_review",
    ];

    for (const step of steps) {
      if (!progress[`${step}_completed`]) {
        return step;
      }
    }

    return "final_review"; // All steps completed
  };

  const handleContinueToPhase2 = () => {
    if (!validationResult) return;

    const startStep = determineStartStep(validationResult.progress);
    navigate(`/provider-onboarding/phase2/${startStep}`, {
      replace: true,
      state: {
        validated: true,
        businessName: validationResult.business_name,
      },
    });
  };

  const LoadingScreen = () => (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-roam-light-blue/10 flex items-center justify-center">
      <Card className="max-w-md mx-auto text-center">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center mb-4">
            <Loader2 className="h-8 w-8 animate-spin text-roam-blue" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Validating Access</h3>
          <p className="text-foreground/70">Verifying your secure link...</p>
        </CardContent>
      </Card>
    </div>
  );

  const ErrorScreen = ({ error }: { error: string }) => (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-roam-light-blue/10 flex items-center justify-center">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <CardTitle className="text-xl text-red-800 text-center">
            Access Denied
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>

          <div className="space-y-2 text-sm text-foreground/70">
            <p>Common issues:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Link has expired (links are valid for 7 days)</li>
              <li>Link has already been used</li>
              <li>Application was not approved</li>
              <li>Browser cached an old version</li>
            </ul>
          </div>

          <div className="flex flex-col gap-2">
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              className="w-full"
            >
              Try Again
            </Button>

            <Button
              onClick={() => navigate("/provider-portal")}
              className="w-full bg-roam-blue hover:bg-roam-blue/90"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Return to Portal
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const SuccessScreen = () => (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-roam-light-blue/10 flex items-center justify-center">
      <Card className="max-w-lg mx-auto">
        <CardHeader>
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <CardTitle className="text-xl text-green-800 text-center">
            Access Verified!
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert className="border-green-200 bg-green-50">
            <Shield className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <strong>Welcome back!</strong> Your secure link has been validated
              for{" "}
              <span className="font-medium">
                {validationResult?.business_name}
              </span>
              .
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div className="text-center">
              <h3 className="font-semibold mb-2">Ready to Continue Setup</h3>
              <p className="text-sm text-foreground/70">
                Redirecting you to continue where you left off...
              </p>
            </div>

            {validationResult?.progress && (
              <div className="p-4 bg-accent/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Progress</span>
                  <Badge variant="outline">Phase 2 Setup</Badge>
                </div>
                <div className="text-xs text-foreground/60">
                  Continuing from where you left off
                </div>
              </div>
            )}
          </div>

          <Button
            onClick={handleContinueToPhase2}
            className="w-full bg-roam-blue hover:bg-roam-blue/90"
            size="lg"
          >
            Continue Setup
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  if (loading) {
    return <LoadingScreen />;
  }

  if (error) {
    return <ErrorScreen error={error} />;
  }

  if (validationResult) {
    return <SuccessScreen />;
  }

  return null;
}
