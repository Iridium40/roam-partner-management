import React, { useState, useEffect, useCallback } from "react";
import { usePlaidLink } from "react-plaid-link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Loader2,
  CreditCard,
  Building,
  CheckCircle,
  AlertCircle,
  Shield,
  Info,
  RefreshCw,
  ExternalLink,
  DollarSign,
  Lock,
  Banknote,
} from "lucide-react";

interface PlaidAccountData {
  account_id: string;
  mask: string;
  name: string;
  official_name?: string;
  type: string;
  subtype: string;
  verification_status?: string;
}

interface PlaidConnectionData {
  access_token: string;
  item_id: string;
  accounts: PlaidAccountData[];
  institution: {
    name: string;
    institution_id: string;
  };
}

interface PlaidBankConnectionProps {
  userId: string;
  businessId: string;
  businessType: "sole_proprietorship" | "llc" | "corporation" | "partnership";
  onConnectionComplete: (connectionData: PlaidConnectionData) => void;
  onConnectionError?: (error: string) => void;
  className?: string;
}

type ConnectionStatus =
  | "not_started"
  | "initializing"
  | "ready"
  | "connecting"
  | "connected"
  | "error";

export function PlaidBankConnection({
  userId,
  businessId,
  businessType,
  onConnectionComplete,
  onConnectionError,
  className = "",
}: PlaidBankConnectionProps) {
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("not_started");
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [connectedAccount, setConnectedAccount] =
    useState<PlaidConnectionData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Determine account requirements based on business type
  const getAccountRequirements = () => {
    if (businessType === "sole_proprietorship") {
      return {
        type: "personal",
        description: "Personal checking or savings account",
        allowed_types: ["depository"],
        allowed_subtypes: ["checking", "savings"],
        note: "As a sole proprietorship, you can use your personal bank account for business transactions.",
      };
    } else {
      return {
        type: "business",
        description: "Business checking account",
        allowed_types: ["depository"],
        allowed_subtypes: ["checking"],
        note: "Business entities require a dedicated business checking account.",
      };
    }
  };

  const accountRequirements = getAccountRequirements();

  // Create Plaid Link Token
  const createLinkToken = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/plaid/create-link-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          businessId,
          businessType,
          products: ["auth"], // For account verification
          country_codes: ["US"],
          account_filters: {
            depository: {
              account_type: accountRequirements.type,
              account_subtypes: accountRequirements.allowed_subtypes,
            },
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to initialize bank connection");
      }
      setLinkToken(data.link_token);
      setConnectionStatus("ready");
    } catch (error) {
      console.error("Error creating link token:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to initialize bank connection";
      setError(errorMessage);
      setConnectionStatus("error");
      onConnectionError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Initialize on mount
  useEffect(() => {
    setConnectionStatus("initializing");
    createLinkToken();
  }, [userId, businessId, businessType]);

  // Check for existing connection
  useEffect(() => {
    checkExistingConnection();
  }, [userId, businessId]);

  const checkExistingConnection = async () => {
    try {
      const response = await fetch(
        `/api/plaid/check-connection/${userId}?businessId=${businessId}`,
      );

      if (response.ok) {
        const data = await response.json();
        if (data.connection) {
          setConnectedAccount(data.connection);
          setConnectionStatus("connected");
        }
      }
    } catch (error) {
      console.error("Error checking existing connection:", error);
    }
  };

  // Handle successful Plaid Link
  const onSuccess = useCallback(
    async (public_token: string, metadata: any) => {
      try {
        setConnectionStatus("connecting");
        setError(null);

        // Select the first checking account by default
        const selectedAccount =
          metadata.accounts.find((account: any) =>
            accountRequirements.allowed_subtypes.includes(account.subtype),
          ) || metadata.accounts[0];

        const response = await fetch("/api/plaid/exchange-public-token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            public_token,
            account_id: selectedAccount.id,
            userId,
            businessId,
            metadata: {
              institution: metadata.institution,
              account: selectedAccount,
            },
          }),
        });

        const connectionData = await response.json();

        if (!response.ok) {
          throw new Error(
            connectionData.error || "Failed to connect bank account",
          );
        }
        setConnectedAccount(connectionData);
        setConnectionStatus("connected");
        onConnectionComplete(connectionData);
      } catch (error) {
        console.error("Error exchanging public token:", error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to connect bank account";
        setError(errorMessage);
        setConnectionStatus("error");
        onConnectionError?.(errorMessage);
      }
    },
    [
      userId,
      businessId,
      onConnectionComplete,
      onConnectionError,
      accountRequirements,
    ],
  );

  // Handle Plaid Link errors
  const onExit = useCallback(
    (err: any, metadata: any) => {
      if (err != null) {
        console.error("Plaid Link error:", err);
        const errorMessage =
          err.display_message ||
          err.error_message ||
          "Bank connection was cancelled";
        setError(errorMessage);
        setConnectionStatus("error");
        onConnectionError?.(errorMessage);
      }
    },
    [onConnectionError],
  );

  // Configure Plaid Link
  const config = {
    token: linkToken,
    onSuccess,
    onExit,
    onEvent: (eventName: string, metadata: any) => {
      console.log("Plaid event:", eventName, metadata);
    },
  };

  const { open, ready } = usePlaidLink(config);

  const handleConnect = () => {
    if (ready && linkToken) {
      open();
    }
  };

  const retryConnection = () => {
    setConnectionStatus("not_started");
    setConnectedAccount(null);
    setError(null);
    createLinkToken();
  };

  const disconnectAccount = async () => {
    try {
      setLoading(true);

      const response = await fetch(`/api/plaid/disconnect/${userId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ businessId }),
      });

      if (response.ok) {
        setConnectedAccount(null);
        setConnectionStatus("ready");
      } else {
        throw new Error("Failed to disconnect account");
      }
    } catch (error) {
      console.error("Error disconnecting account:", error);
      setError("Failed to disconnect account");
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case "connected":
        return <CheckCircle className="h-8 w-8 text-green-600" />;
      case "connecting":
      case "initializing":
        return <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />;
      case "error":
        return <AlertCircle className="h-8 w-8 text-red-600" />;
      default:
        return <CreditCard className="h-8 w-8 text-roam-blue" />;
    }
  };

  const getStatusBadge = () => {
    switch (connectionStatus) {
      case "connected":
        return (
          <Badge className="bg-green-600 hover:bg-green-700">Connected</Badge>
        );
      case "connecting":
        return (
          <Badge className="bg-blue-600 hover:bg-blue-700">Connecting</Badge>
        );
      case "initializing":
        return (
          <Badge className="bg-gray-600 hover:bg-gray-700">Initializing</Badge>
        );
      case "error":
        return <Badge variant="destructive">Error</Badge>;
      case "ready":
        return <Badge variant="outline">Ready to Connect</Badge>;
      default:
        return <Badge variant="outline">Not Started</Badge>;
    }
  };

  const getStatusMessage = () => {
    switch (connectionStatus) {
      case "connected":
        return "Your bank account has been successfully connected and verified.";
      case "connecting":
        return "Establishing secure connection with your bank...";
      case "initializing":
        return "Preparing secure bank connection...";
      case "error":
        return "There was an issue connecting your bank account. Please try again.";
      case "ready":
        return `Connect your ${accountRequirements.type} bank account to receive payments.`;
      default:
        return "Connecting your bank account for secure payments.";
    }
  };

  return (
    <Card className={className}>
      <CardHeader className="text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          {getStatusIcon()}
          {getStatusBadge()}
        </div>
        <CardTitle className="text-xl">Bank Account Connection</CardTitle>
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

        {/* Account Requirements */}
        {connectionStatus !== "connected" && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Account Requirements:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>
                  <strong>
                    {accountRequirements.type === "business"
                      ? "Business"
                      : "Personal"}{" "}
                    Account:
                  </strong>{" "}
                  {accountRequirements.description}
                </li>
                <li>
                  Account must be in your name
                  {businessType !== "sole_proprietorship" &&
                    " or business name"}
                </li>
                <li>Account must be active and in good standing</li>
              </ul>
              <p className="mt-2 text-sm">{accountRequirements.note}</p>
            </AlertDescription>
          </Alert>
        )}

        {/* Security Information */}
        <div className="space-y-4">
          <h4 className="font-semibold flex items-center gap-2">
            <Shield className="h-4 w-4 text-roam-blue" />
            Secure Bank Connection
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-3 border rounded-lg">
              <Lock className="h-6 w-6 text-roam-blue mx-auto mb-2" />
              <p className="font-medium text-sm">Bank-Level Security</p>
              <p className="text-xs text-foreground/60">
                256-bit SSL encryption
              </p>
            </div>
            <div className="text-center p-3 border rounded-lg">
              <Shield className="h-6 w-6 text-roam-blue mx-auto mb-2" />
              <p className="font-medium text-sm">Read-Only Access</p>
              <p className="text-xs text-foreground/60">
                View only, no transfers
              </p>
            </div>
            <div className="text-center p-3 border rounded-lg">
              <Building className="h-6 w-6 text-roam-blue mx-auto mb-2" />
              <p className="font-medium text-sm">Powered by Plaid</p>
              <p className="text-xs text-foreground/60">
                Trusted by 11,000+ banks
              </p>
            </div>
          </div>
        </div>

        {/* Connected Account Display */}
        {connectionStatus === "connected" && connectedAccount && (
          <div className="space-y-4">
            <Separator />
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Connected Account
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Institution:</span>
                  <span className="text-sm">
                    {connectedAccount.institution.name}
                  </span>
                </div>
                {connectedAccount.accounts.map((account) => (
                  <div
                    key={account.account_id}
                    className="border-t border-green-200 pt-2"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Account:</span>
                      <span className="text-sm">
                        {account.name} ••••{account.mask}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Type:</span>
                      <span className="text-sm capitalize">
                        {account.subtype} {account.type}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          {connectionStatus === "ready" && (
            <Button
              onClick={handleConnect}
              disabled={!ready || loading}
              className="w-full bg-roam-blue hover:bg-roam-blue/90"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Connect Bank Account
                </>
              )}
            </Button>
          )}

          {connectionStatus === "error" && (
            <Button
              onClick={retryConnection}
              disabled={loading}
              variant="outline"
              className="w-full"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          )}

          {connectionStatus === "connected" && (
            <div className="flex gap-2">
              <Button
                onClick={retryConnection}
                variant="outline"
                className="flex-1"
                disabled={loading}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Connect Different Account
              </Button>
              <Button
                onClick={disconnectAccount}
                variant="outline"
                disabled={loading}
              >
                Disconnect
              </Button>
            </div>
          )}
        </div>

        {/* Payment Information */}
        {connectionStatus === "connected" && (
          <Alert>
            <DollarSign className="h-4 w-4" />
            <AlertDescription>
              <strong>Ready for Payments:</strong> Once your Stripe account is
              set up, payments from customers will be transferred to this bank
              account within 2-3 business days.
            </AlertDescription>
          </Alert>
        )}

        {/* Help and Privacy */}
        <div className="space-y-3">
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              <strong>Your privacy is protected:</strong> We use Plaid to
              securely connect to your bank. We never store your banking
              credentials, and the connection is read-only for verification
              purposes.{" "}
              <Button
                variant="link"
                className="p-0 h-auto text-roam-blue"
                asChild
              >
                <a
                  href="https://plaid.com/safety/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Learn more about Plaid security{" "}
                  <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              </Button>
            </AlertDescription>
          </Alert>

          <div className="text-center text-sm text-foreground/60">
            <p>
              Having trouble connecting your bank?{" "}
              <Button variant="link" className="p-0 h-auto text-roam-blue">
                Contact Support
              </Button>
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
