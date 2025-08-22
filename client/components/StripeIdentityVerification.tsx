import React, { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Shield,
  CheckCircle,
  AlertCircle,
  User,
  FileText,
  Camera,
  Clock,
  RefreshCw,
  Info,
  ExternalLink,
} from "lucide-react";

// Initialize Stripe
const stripePromise = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "",
);

interface VerificationSessionData {
  client_secret: string;
  id: string;
  status: string;
  last_verification_report?: {
    type: string;
    id: string;
    status: string;
    created: number;
  };
}

interface StripeIdentityVerificationProps {
  userId?: string;
  businessId?: string;
  onVerificationComplete: (verificationData: VerificationSessionData) => void;
  onVerificationPending: () => void;
  onVerificationFailed?: (error: string) => void;
  className?: string;
}

type VerificationStatus =
  | "not_started"
  | "requires_input"
  | "processing"
  | "verified"
  | "canceled"
  | "requires_action";

export default function StripeIdentityVerification({
  userId,
  businessId,
  onVerificationComplete,
  onVerificationPending,
  onVerificationFailed,
  className = "",
}: StripeIdentityVerificationProps) {
  const [verificationStatus, setVerificationStatus] =
    useState<VerificationStatus>("not_started");
  const [verificationSession, setVerificationSession] =
    useState<VerificationSessionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stripe, setStripe] = useState<any>(null);

  // Initialize Stripe
  useEffect(() => {
    const initializeStripe = async () => {
      const stripeInstance = await stripePromise;
      setStripe(stripeInstance);
    };
    initializeStripe();
  }, []);

  // Check existing verification status on mount
  useEffect(() => {
    if (userId && businessId) {
      checkExistingVerification();
    }
  }, [userId, businessId]);

  const checkExistingVerification = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/stripe/check-verification-status/${userId}?businessId=${businessId}`,
      );

      if (response.ok) {
        const data = await response.json();
        if (data.verification_session) {
          setVerificationSession(data.verification_session);
          setVerificationStatus(data.verification_session.status);

          // Handle different statuses
          if (data.verification_session.status === "verified") {
            onVerificationComplete(data.verification_session);
          } else if (data.verification_session.status === "processing") {
            onVerificationPending();
          }
        }
      }
    } catch (error) {
      console.error("Error checking verification status:", error);
    } finally {
      setLoading(false);
    }
  };

  const createVerificationSession =
    async (): Promise<VerificationSessionData> => {
      const response = await fetch("/api/stripe/create-verification-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          businessId,
          type: "document", // Can be 'document' or 'id_number'
          options: {
            document: {
              allowed_types: ["driving_license", "passport", "id_card"],
              require_id_number: true,
              require_live_capture: true,
              require_matching_selfie: true,
            },
          },
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Failed to create verification session",
        );
      }

      return result;
    };

  const startVerification = async () => {
    if (!stripe) {
      setError("Stripe is not loaded. Please refresh the page and try again.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Create verification session
      const sessionData = await createVerificationSession();
      setVerificationSession(sessionData);

      // Launch Stripe Identity verification
      const { error } = await stripe.verifyIdentity(sessionData.client_secret);

      if (error) {
        console.error("Stripe Identity error:", error);
        setError(error.message || "Verification failed. Please try again.");
        setVerificationStatus("canceled");
        onVerificationFailed?.(error.message || "Verification failed");
      } else {
        // Verification completed, check status
        setVerificationStatus("processing");
        onVerificationPending();

        // Poll for verification results
        pollVerificationStatus(sessionData.id);
      }
    } catch (error) {
      console.error("Verification error:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Verification failed. Please try again.";
      setError(errorMessage);
      setVerificationStatus("canceled");
      onVerificationFailed?.(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const pollVerificationStatus = async (sessionId: string) => {
    const maxAttempts = 30; // Poll for 5 minutes max (10 second intervals)
    let attempts = 0;

    const poll = async () => {
      try {
        const response = await fetch(
          `/api/stripe/check-verification-status/${userId}?sessionId=${sessionId}`,
        );

        if (response.ok) {
          const data = await response.json();
          const session = data.verification_session;

          setVerificationSession(session);
          setVerificationStatus(session.status);

          if (session.status === "verified") {
            onVerificationComplete(session);
            return;
          } else if (
            session.status === "requires_input" ||
            session.status === "canceled"
          ) {
            setError(
              "Verification failed. Please try again or contact support.",
            );
            onVerificationFailed?.("Verification failed");
            return;
          } else if (
            session.status === "processing" &&
            attempts < maxAttempts
          ) {
            // Continue polling
            attempts++;
            setTimeout(poll, 10000); // Poll every 10 seconds
          } else if (attempts >= maxAttempts) {
            setError(
              "Verification is taking longer than expected. Please contact support.",
            );
            onVerificationFailed?.("Verification timeout");
          }
        }
      } catch (error) {
        console.error("Error polling verification status:", error);
        if (attempts < maxAttempts) {
          attempts++;
          setTimeout(poll, 10000);
        }
      }
    };

    poll();
  };

  const retryVerification = () => {
    setVerificationStatus("not_started");
    setVerificationSession(null);
    setError(null);
  };

  const getStatusIcon = () => {
    switch (verificationStatus) {
      case "verified":
        return <CheckCircle className="h-8 w-8 text-green-600" />;
      case "processing":
        return <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />;
      case "canceled":
      case "requires_input":
        return <AlertCircle className="h-8 w-8 text-red-600" />;
      default:
        return <Shield className="h-8 w-8 text-roam-blue" />;
    }
  };

  const getStatusBadge = () => {
    switch (verificationStatus) {
      case "verified":
        return (
          <Badge className="bg-green-600 hover:bg-green-700">Verified</Badge>
        );
      case "processing":
        return (
          <Badge className="bg-blue-600 hover:bg-blue-700">Processing</Badge>
        );
      case "canceled":
      case "requires_input":
        return <Badge variant="destructive">Failed</Badge>;
      case "requires_action":
        return (
          <Badge className="bg-yellow-600 hover:bg-yellow-700">
            Action Required
          </Badge>
        );
      default:
        return <Badge variant="outline">Not Started</Badge>;
    }
  };

  const getStatusMessage = () => {
    switch (verificationStatus) {
      case "verified":
        return "Your identity has been successfully verified! You can now proceed to the next step.";
      case "processing":
        return "We're reviewing your identity documents. This usually takes a few minutes but can take up to 24 hours.";
      case "canceled":
        return "Identity verification was canceled. Please try again or contact support if you continue to experience issues.";
      case "requires_input":
        return "Additional information is required. Please try the verification process again.";
      case "requires_action":
        return "Please complete the verification process by following the instructions.";
      default:
        return "We need to verify your identity to ensure the security and trustworthiness of our platform.";
    }
  };

  return (
    <Card className={className}>
      <CardHeader className="text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          {getStatusIcon()}
          {getStatusBadge()}
        </div>
        <CardTitle className="text-xl">Identity Verification</CardTitle>
        <p className="text-foreground/70">{getStatusMessage()}</p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Information Alert */}
        {verificationStatus === "not_started" && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>What you'll need:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>
                  A government-issued photo ID (driver's license, passport, or
                  state ID)
                </li>
                <li>A smartphone or computer with a camera</li>
                <li>About 2-3 minutes to complete the process</li>
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Verification Process Steps */}
        {verificationStatus === "not_started" && (
          <div className="space-y-4">
            <h4 className="font-semibold">Verification Process:</h4>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-roam-blue text-white text-sm flex items-center justify-center flex-shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  <p className="font-medium flex items-center gap-2">
                    <Camera className="h-4 w-4" />
                    Take photos of your ID
                  </p>
                  <p className="text-sm text-foreground/70">
                    You'll be asked to photograph the front and back of your
                    government-issued ID
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-roam-blue text-white text-sm flex items-center justify-center flex-shrink-0 mt-0.5">
                  2
                </div>
                <div>
                  <p className="font-medium flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Take a selfie
                  </p>
                  <p className="text-sm text-foreground/70">
                    A quick selfie to match with your ID photo for verification
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-roam-blue text-white text-sm flex items-center justify-center flex-shrink-0 mt-0.5">
                  3
                </div>
                <div>
                  <p className="font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Wait for verification
                  </p>
                  <p className="text-sm text-foreground/70">
                    Results are usually available within minutes, but can take
                    up to 24 hours
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Processing Status */}
        {verificationStatus === "processing" && (
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              Your documents are being reviewed. We'll notify you as soon as
              verification is complete. You can continue with other setup steps
              while we process your verification.
            </AlertDescription>
          </Alert>
        )}

        {/* Success Status */}
        {verificationStatus === "verified" && verificationSession && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <strong>Verification Complete!</strong> Your identity was verified
              on{" "}
              {verificationSession.last_verification_report &&
                new Date(
                  verificationSession.last_verification_report.created * 1000,
                ).toLocaleDateString()}
              .
            </AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          {verificationStatus === "not_started" && (
            <Button
              onClick={startVerification}
              disabled={loading || !stripe}
              className="w-full bg-roam-blue hover:bg-roam-blue/90"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Starting Verification...
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4 mr-2" />
                  Start Identity Verification
                </>
              )}
            </Button>
          )}

          {(verificationStatus === "canceled" ||
            verificationStatus === "requires_input") && (
            <Button
              onClick={retryVerification}
              disabled={loading}
              variant="outline"
              className="w-full"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          )}

          {verificationStatus === "processing" && (
            <Button
              onClick={() => checkExistingVerification()}
              disabled={loading}
              variant="outline"
              className="w-full"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Check Status
            </Button>
          )}
        </div>

        {/* Security Notice */}
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            <strong>Your data is secure:</strong> Identity verification is
            powered by Stripe Identity, which uses bank-level security. Your
            personal information is encrypted and protected according to
            industry standards.{" "}
            <Button
              variant="link"
              className="p-0 h-auto text-roam-blue"
              asChild
            >
              <a
                href="https://stripe.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
              >
                Learn more <ExternalLink className="h-3 w-3 ml-1" />
              </a>
            </Button>
          </AlertDescription>
        </Alert>

        {/* Help Section */}
        <div className="text-center text-sm text-foreground/60">
          <p>
            Having trouble with verification?{" "}
            <Button variant="link" className="p-0 h-auto text-roam-blue">
              Contact Support
            </Button>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
