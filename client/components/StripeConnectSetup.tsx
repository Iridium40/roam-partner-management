import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Percent,
  Calendar,
  FileText,
  Globe,
} from "lucide-react";

interface StripeAccountData {
  id: string;
  type: string;
  country: string;
  default_currency: string;
  details_submitted: boolean;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  requirements?: {
    currently_due: string[];
    eventually_due: string[];
    past_due: string[];
    pending_verification: string[];
    disabled_reason?: string;
  };
  capabilities?: {
    card_payments?: {
      status: string;
      requested: boolean;
    };
    transfers?: {
      status: string;
      requested: boolean;
    };
  };
}

interface TaxInformation {
  business_tax_id?: string;
  business_tax_id_type?: "ein" | "ssn";
  mcc?: string; // Merchant Category Code
  product_description?: string;
  url?: string;
}

interface StripeConnectSetupProps {
  userId: string;
  businessId: string;
  businessType: "sole_proprietorship" | "llc" | "corporation" | "partnership";
  businessName: string;
  userEmail: string;
  onSetupComplete: (accountData: StripeAccountData) => void;
  onSetupError?: (error: string) => void;
  className?: string;
}

type SetupStatus =
  | "not_started"
  | "creating"
  | "requires_information"
  | "onboarding"
  | "active"
  | "restricted"
  | "error";

const merchantCategoryCodes = [
  { code: "7230", description: "Beauty Shops" },
  { code: "7298", description: "Health and Beauty Spas" },
  { code: "8099", description: "Medical Services and Health Practitioners" },
  { code: "7991", description: "Tourist Attractions and Exhibits" },
  { code: "8351", description: "Child Care Services" },
  { code: "7349", description: "Cleaning and Maintenance" },
  { code: "8999", description: "Professional Services" },
  { code: "5812", description: "Eating Places and Restaurants" },
  { code: "7299", description: "Miscellaneous Personal Services" },
];

export function StripeConnectSetup({
  userId,
  businessId,
  businessType,
  businessName,
  userEmail,
  onSetupComplete,
  onSetupError,
  className = "",
}: StripeConnectSetupProps) {
  const [setupStatus, setSetupStatus] = useState<SetupStatus>("not_started");
  const [stripeAccount, setStripeAccount] = useState<StripeAccountData | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [onboardingUrl, setOnboardingUrl] = useState<string | null>(null);

  // Tax information form
  const [taxInfo, setTaxInfo] = useState<TaxInformation>({
    business_tax_id: "",
    business_tax_id_type:
      businessType === "sole_proprietorship" ? "ssn" : "ein",
    mcc: "",
    product_description: "",
    url: "",
  });

  const [taxInfoErrors, setTaxInfoErrors] = useState<
    Partial<Record<keyof TaxInformation, string>>
  >({});

  // Check existing Stripe account on mount
  useEffect(() => {
    checkExistingAccount();
  }, [userId, businessId]);

  const checkExistingAccount = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/stripe/check-connect-account/${userId}?businessId=${businessId}`,
      );

      if (response.ok) {
        const data = await response.json();
        if (data.account) {
          setStripeAccount(data.account);
          determineAccountStatus(data.account);
        }
      }
    } catch (error) {
      console.error("Error checking existing account:", error);
    } finally {
      setLoading(false);
    }
  };

  const determineAccountStatus = (account: StripeAccountData) => {
    if (account.charges_enabled && account.payouts_enabled) {
      setSetupStatus("active");
      onSetupComplete(account);
    } else if (account.details_submitted) {
      if (account.requirements?.disabled_reason) {
        setSetupStatus("restricted");
      } else {
        setSetupStatus("onboarding");
      }
    } else {
      setSetupStatus("requires_information");
    }
  };

  const validateTaxInfo = (): boolean => {
    const errors: Partial<Record<keyof TaxInformation, string>> = {};

    if (!taxInfo.mcc) {
      errors.mcc = "Please select a business category";
    }

    if (
      !taxInfo.product_description ||
      taxInfo.product_description.length < 10
    ) {
      errors.product_description =
        "Please provide a detailed description (at least 10 characters)";
    }

    if (businessType !== "sole_proprietorship" && !taxInfo.business_tax_id) {
      errors.business_tax_id =
        "Business Tax ID (EIN) is required for business entities";
    } else if (
      businessType === "sole_proprietorship" &&
      taxInfo.business_tax_id &&
      taxInfo.business_tax_id.length !== 9
    ) {
      errors.business_tax_id = "SSN must be 9 digits";
    } else if (
      businessType !== "sole_proprietorship" &&
      taxInfo.business_tax_id &&
      !/^\d{2}-?\d{7}$/.test(taxInfo.business_tax_id)
    ) {
      errors.business_tax_id = "EIN must be in format XX-XXXXXXX";
    }

    setTaxInfoErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const createStripeAccount = async () => {
    if (!validateTaxInfo()) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/stripe/create-connect-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          businessId,
          businessType,
          businessName,
          email: userEmail,
          taxInfo,
          country: "US",
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create Stripe account");
      }
      setStripeAccount(data.account);
      setOnboardingUrl(data.onboarding_url);
      setSetupStatus("requires_information");
    } catch (error) {
      console.error("Error creating Stripe account:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to create Stripe account";
      setError(errorMessage);
      setSetupStatus("error");
      onSetupError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const continueOnboarding = async () => {
    if (!stripeAccount) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/stripe/create-onboarding-link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          account_id: stripeAccount.id,
          return_url: `${window.location.origin}/provider-onboarding/complete`,
          refresh_url: window.location.href,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create onboarding link");
      }

      // Redirect to Stripe onboarding
      window.location.href = data.url;
    } catch (error) {
      console.error("Error creating onboarding link:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to continue onboarding";
      setError(errorMessage);
      onSetupError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const refreshAccountStatus = async () => {
    await checkExistingAccount();
  };

  const getStatusIcon = () => {
    switch (setupStatus) {
      case "active":
        return <CheckCircle className="h-8 w-8 text-green-600" />;
      case "creating":
      case "onboarding":
        return <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />;
      case "restricted":
      case "error":
        return <AlertCircle className="h-8 w-8 text-red-600" />;
      default:
        return <CreditCard className="h-8 w-8 text-roam-blue" />;
    }
  };

  const getStatusBadge = () => {
    switch (setupStatus) {
      case "active":
        return (
          <Badge className="bg-green-600 hover:bg-green-700">Active</Badge>
        );
      case "onboarding":
        return (
          <Badge className="bg-blue-600 hover:bg-blue-700">In Progress</Badge>
        );
      case "creating":
        return (
          <Badge className="bg-gray-600 hover:bg-gray-700">Creating</Badge>
        );
      case "restricted":
        return <Badge variant="destructive">Restricted</Badge>;
      case "error":
        return <Badge variant="destructive">Error</Badge>;
      case "requires_information":
        return (
          <Badge className="bg-yellow-600 hover:bg-yellow-700">
            Needs Setup
          </Badge>
        );
      default:
        return <Badge variant="outline">Not Started</Badge>;
    }
  };

  const getStatusMessage = () => {
    switch (setupStatus) {
      case "active":
        return "Your Stripe account is active and ready to accept payments!";
      case "onboarding":
        return "Complete your Stripe account setup to start accepting payments.";
      case "creating":
        return "Creating your Stripe payment account...";
      case "restricted":
        return "Your account requires attention. Please complete the required information.";
      case "error":
        return "There was an issue setting up your payment account. Please try again.";
      case "requires_information":
        return "Continue with Stripe to complete your payment account setup.";
      default:
        return "Set up your Stripe payment account to receive customer payments.";
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  return (
    <Card className={className}>
      <CardHeader className="text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          {getStatusIcon()}
          {getStatusBadge()}
        </div>
        <CardTitle className="text-xl">Payment Account Setup</CardTitle>
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

        {/* Platform Fees Information */}
        {setupStatus === "not_started" && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Transparent Pricing:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>You keep 100% of what you charge customers</li>
                <li>Small transaction fee only: 2.9% + $0.30 per payment</li>
                <li>
                  Funds transferred to your bank account in 2-3 business days
                </li>
                <li>No monthly fees, setup fees, or hidden charges</li>
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Tax Information Form */}
        {setupStatus === "not_started" && (
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-roam-blue" />
              <h3 className="text-lg font-semibold">Business Information</h3>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="mcc">Business Category *</Label>
                <Select
                  value={taxInfo.mcc}
                  onValueChange={(value) =>
                    setTaxInfo((prev) => ({ ...prev, mcc: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select your business category" />
                  </SelectTrigger>
                  <SelectContent>
                    {merchantCategoryCodes.map((category) => (
                      <SelectItem key={category.code} value={category.code}>
                        {category.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {taxInfoErrors.mcc && (
                  <p className="text-sm text-red-600">{taxInfoErrors.mcc}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="productDescription">
                  Service Description *
                </Label>
                <Textarea
                  id="productDescription"
                  placeholder="Describe the services you provide to customers..."
                  value={taxInfo.product_description}
                  onChange={(e) =>
                    setTaxInfo((prev) => ({
                      ...prev,
                      product_description: e.target.value,
                    }))
                  }
                  rows={3}
                />
                {taxInfoErrors.product_description && (
                  <p className="text-sm text-red-600">
                    {taxInfoErrors.product_description}
                  </p>
                )}
                <p className="text-xs text-foreground/60">
                  This helps Stripe understand your business for compliance
                  purposes
                </p>
              </div>

              {businessType !== "sole_proprietorship" && (
                <div className="space-y-2">
                  <Label htmlFor="businessTaxId">Business Tax ID (EIN) *</Label>
                  <Input
                    id="businessTaxId"
                    placeholder="XX-XXXXXXX"
                    value={taxInfo.business_tax_id}
                    onChange={(e) =>
                      setTaxInfo((prev) => ({
                        ...prev,
                        business_tax_id: e.target.value,
                      }))
                    }
                  />
                  {taxInfoErrors.business_tax_id && (
                    <p className="text-sm text-red-600">
                      {taxInfoErrors.business_tax_id}
                    </p>
                  )}
                  <p className="text-xs text-foreground/60">
                    Required for business entities (LLC, Corporation,
                    Partnership)
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="businessUrl">Business Website (Optional)</Label>
                <Input
                  id="businessUrl"
                  type="url"
                  placeholder="https://yourbusiness.com"
                  value={taxInfo.url}
                  onChange={(e) =>
                    setTaxInfo((prev) => ({ ...prev, url: e.target.value }))
                  }
                />
                <p className="text-xs text-foreground/60">
                  If you don't have a website, you can leave this blank
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Account Status Display */}
        {setupStatus === "active" && stripeAccount && (
          <div className="space-y-4">
            <Separator />
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Payment Account Active
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <CreditCard className="h-4 w-4 text-green-600" />
                    <span className="font-medium">Card Payments</span>
                  </div>
                  <p className="text-sm text-green-700">
                    {stripeAccount.capabilities?.card_payments?.status ===
                    "active"
                      ? "✓ Enabled"
                      : "⏳ Pending"}
                  </p>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="h-4 w-4 text-green-600" />
                    <span className="font-medium">Payouts</span>
                  </div>
                  <p className="text-sm text-green-700">
                    {stripeAccount.payouts_enabled ? "✓ Enabled" : "⏳ Pending"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Requirements Display */}
        {stripeAccount?.requirements &&
          (setupStatus === "requires_information" ||
            setupStatus === "restricted") && (
            <Alert
              variant={setupStatus === "restricted" ? "destructive" : "default"}
            >
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Additional Information Required:</strong>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  {stripeAccount.requirements.currently_due.map(
                    (requirement) => (
                      <li key={requirement} className="text-sm">
                        {requirement
                          .replace(/_/g, " ")
                          .replace(/\b\w/g, (l) => l.toUpperCase())}
                      </li>
                    ),
                  )}
                </ul>
              </AlertDescription>
            </Alert>
          )}

        {/* Stripe Information */}
        <div className="space-y-4">
          <h4 className="font-semibold flex items-center gap-2">
            <Shield className="h-4 w-4 text-roam-blue" />
            Powered by Stripe
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-3 border rounded-lg">
              <Shield className="h-6 w-6 text-roam-blue mx-auto mb-2" />
              <p className="font-medium text-sm">Secure Processing</p>
              <p className="text-xs text-foreground/60">PCI DSS Level 1</p>
            </div>
            <div className="text-center p-3 border rounded-lg">
              <Globe className="h-6 w-6 text-roam-blue mx-auto mb-2" />
              <p className="font-medium text-sm">Global Platform</p>
              <p className="text-xs text-foreground/60">Trusted worldwide</p>
            </div>
            <div className="text-center p-3 border rounded-lg">
              <Calendar className="h-6 w-6 text-roam-blue mx-auto mb-2" />
              <p className="font-medium text-sm">Fast Transfers</p>
              <p className="text-xs text-foreground/60">2-3 business days</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          {setupStatus === "not_started" && (
            <Button
              onClick={createStripeAccount}
              disabled={loading}
              className="w-full bg-roam-blue hover:bg-roam-blue/90"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating Account...
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Create Payment Account
                </>
              )}
            </Button>
          )}

          {(setupStatus === "requires_information" ||
            setupStatus === "restricted") && (
            <Button
              onClick={continueOnboarding}
              disabled={loading}
              className="w-full bg-roam-blue hover:bg-roam-blue/90"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Redirecting...
                </>
              ) : (
                <>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Continue Setup with Stripe
                </>
              )}
            </Button>
          )}

          {setupStatus === "onboarding" && (
            <div className="flex gap-2">
              <Button
                onClick={refreshAccountStatus}
                disabled={loading}
                variant="outline"
                className="flex-1"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Check Status
              </Button>
              <Button
                onClick={continueOnboarding}
                disabled={loading}
                className="flex-1 bg-roam-blue hover:bg-roam-blue/90"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Continue Setup
              </Button>
            </div>
          )}

          {setupStatus === "error" && (
            <Button
              onClick={() => {
                setSetupStatus("not_started");
                setError(null);
              }}
              disabled={loading}
              variant="outline"
              className="w-full"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          )}
        </div>

        {/* Help Section */}
        <div className="text-center text-sm text-foreground/60">
          <p>
            Questions about payments or fees?{" "}
            <Button variant="link" className="p-0 h-auto text-roam-blue">
              Contact Support
            </Button>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
