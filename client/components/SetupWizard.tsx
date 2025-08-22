import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Building,
  MapPin,
  DollarSign,
  Users,
  Calendar,
  CreditCard,
  Crown,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Smartphone,
  Mail,
  Clock,
  Shield,
  Zap,
  Star,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import type {
  BusinessProfile,
  BusinessLocation,
  BusinessSetupProgress,
  SubscriptionPlan,
  BusinessType,
} from "@/lib/database.types";

interface SetupWizardProps {
  businessId: string;
  onComplete: () => void;
}

const subscriptionPlans: SubscriptionPlan[] = [
  {
    plan_id: "roam_independent",
    plan_name: "ROAM Independent",
    monthly_price: 29.99,
    features: {
      max_providers: 1,
      max_locations: 1,
      advanced_analytics: false,
      priority_support: false,
      api_access: false,
    },
  },
  {
    plan_id: "roam_business",
    plan_name: "ROAM Business",
    monthly_price: 99.99,
    features: {
      max_providers: 25,
      max_locations: 5,
      advanced_analytics: true,
      priority_support: true,
      api_access: false,
    },
  },
  {
    plan_id: "roam_business_plus",
    plan_name: "ROAM Business+",
    monthly_price: 199.99,
    features: {
      max_providers: 100,
      max_locations: 25,
      advanced_analytics: true,
      priority_support: true,
      api_access: true,
    },
  },
];

export const SetupWizard: React.FC<SetupWizardProps> = ({
  businessId,
  onComplete,
}) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<BusinessSetupProgress | null>(null);
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [error, setError] = useState("");

  const [businessData, setBusinessData] = useState({
    website_url: "",
    business_hours: {
      monday: { open: "09:00", close: "17:00", closed: false },
      tuesday: { open: "09:00", close: "17:00", closed: false },
      wednesday: { open: "09:00", close: "17:00", closed: false },
      thursday: { open: "09:00", close: "17:00", closed: false },
      friday: { open: "09:00", close: "17:00", closed: false },
      saturday: { open: "10:00", close: "16:00", closed: false },
      sunday: { open: "12:00", close: "16:00", closed: true },
    },
    social_media: {
      facebook: "",
      instagram: "",
      twitter: "",
      linkedin: "",
    },
  });

  const [locationData, setLocationData] = useState({
    address_line1: "",
    address_line2: "",
    city: "",
    state: "",
    postal_code: "",
    country: "United States",
    offers_mobile_services: false,
    mobile_service_radius: 25,
  });

  const [selectedPlan, setSelectedPlan] = useState<string>("");

  useEffect(() => {
    fetchSetupProgress();
    fetchBusinessData();
  }, [businessId]);

  const fetchSetupProgress = async () => {
    try {
      const { data, error } = await supabase
        .from("business_setup_progress")
        .select("*")
        .eq("business_id", businessId)
        .single();

      if (data) {
        setProgress(data);
        setCurrentStep(data.current_step);
      }
    } catch (error) {
      console.error("Error fetching setup progress:", error);
    }
  };

  const fetchBusinessData = async () => {
    try {
      const { data, error } = await supabase
        .from("business_profiles")
        .select("*")
        .eq("id", businessId)
        .single();

      if (data) {
        setBusiness(data);
        setBusinessData({
          website_url: data.website_url || "",
          business_hours: data.business_hours || businessData.business_hours,
          social_media: data.social_media || businessData.social_media,
        });
      }
    } catch (error) {
      console.error("Error fetching business data:", error);
    }
  };

  const updateProgress = async (
    step: number,
    completedSteps: Partial<BusinessSetupProgress>,
  ) => {
    try {
      const { error } = await supabase
        .from("business_setup_progress")
        .update({
          current_step: step,
          ...completedSteps,
        })
        .eq("business_id", businessId);

      if (error) throw error;
    } catch (error) {
      console.error("Error updating progress:", error);
    }
  };

  const completeStep = async (stepData: any) => {
    setLoading(true);
    setError("");

    try {
      switch (currentStep) {
        case 1: // Business Profile
          await supabase
            .from("business_profiles")
            .update({
              website_url: businessData.website_url,
              business_hours: businessData.business_hours,
              social_media: businessData.social_media,
            })
            .eq("id", businessId);

          await updateProgress(2, { business_profile_completed: true });
          break;

        case 2: // Business Locations
          const { data: locationResult, error: locationError } = await supabase
            .from("business_locations")
            .insert({
              business_id: businessId,
              location_name: "Main Location",
              ...locationData,
              is_primary: true,
              is_active: true,
            });

          if (locationError) throw locationError;

          await updateProgress(3, { locations_completed: true });
          break;

        case 3: // Services & Pricing
          // This would typically involve setting up services
          // For now, we'll mark as completed
          await updateProgress(4, { services_pricing_completed: true });
          break;

        case 4: // Staff Setup
          // For independent providers, this is automatically completed
          // For other business types, this would involve adding staff
          const isIndependent = business?.business_type === "independent";
          await updateProgress(5, { staff_setup_completed: true });
          break;

        case 5: // Integrations
          // This would integrate calendar, SMS, maps
          await updateProgress(6, { integrations_completed: true });
          break;

        case 6: // Stripe Connect
          // This would set up Stripe Connect account
          await updateProgress(7, { stripe_connect_completed: true });
          break;

        case 7: // Subscription
          if (!selectedPlan) {
            setError("Please select a subscription plan");
            return;
          }

          await supabase
            .from("business_profiles")
            .update({
              subscription_plan_id: selectedPlan,
              subscription_status: "trial",
            })
            .eq("id", businessId);

          await updateProgress(8, { subscription_completed: true });
          break;

        case 8: // Go Live
          await supabase
            .from("business_profiles")
            .update({
              setup_completed: true,
              is_active: true,
            })
            .eq("id", businessId);

          await updateProgress(8, {
            go_live_completed: true,
            setup_completed_at: new Date().toISOString(),
          });

          onComplete();
          break;
      }

      if (currentStep < 8) {
        setCurrentStep(currentStep + 1);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    {
      number: 1,
      title: "Business Profile",
      description: "Complete your business details",
      icon: Building,
      completed: progress?.business_profile_completed || false,
    },
    {
      number: 2,
      title: "Locations",
      description: "Add your business locations",
      icon: MapPin,
      completed: progress?.locations_completed || false,
    },
    {
      number: 3,
      title: "Services & Pricing",
      description: "Configure your services",
      icon: DollarSign,
      completed: progress?.services_pricing_completed || false,
    },
    {
      number: 4,
      title: "Staff Setup",
      description: "Add team members",
      icon: Users,
      completed: progress?.staff_setup_completed || false,
    },
    {
      number: 5,
      title: "Integrations",
      description: "Connect calendar, SMS, maps",
      icon: Zap,
      completed: progress?.integrations_completed || false,
    },
    {
      number: 6,
      title: "Stripe Connect",
      description: "Set up payments",
      icon: CreditCard,
      completed: progress?.stripe_connect_completed || false,
    },
    {
      number: 7,
      title: "Subscription",
      description: "Choose your plan",
      icon: Crown,
      completed: progress?.subscription_completed || false,
    },
    {
      number: 8,
      title: "Go Live",
      description: "Activate for customers",
      icon: Star,
      completed: progress?.go_live_completed || false,
    },
  ];

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">
                Complete Your Business Profile
              </h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="website">Website URL</Label>
                  <Input
                    id="website"
                    type="url"
                    value={businessData.website_url}
                    onChange={(e) =>
                      setBusinessData({
                        ...businessData,
                        website_url: e.target.value,
                      })
                    }
                    placeholder="https://yourwebsite.com"
                  />
                </div>

                <div className="space-y-4">
                  <Label>Social Media (Optional)</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      placeholder="Facebook URL"
                      value={businessData.social_media.facebook}
                      onChange={(e) =>
                        setBusinessData({
                          ...businessData,
                          social_media: {
                            ...businessData.social_media,
                            facebook: e.target.value,
                          },
                        })
                      }
                    />
                    <Input
                      placeholder="Instagram URL"
                      value={businessData.social_media.instagram}
                      onChange={(e) =>
                        setBusinessData({
                          ...businessData,
                          social_media: {
                            ...businessData.social_media,
                            instagram: e.target.value,
                          },
                        })
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">
                Add Your Business Location
              </h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="address1">Street Address *</Label>
                  <Input
                    id="address1"
                    value={locationData.address_line1}
                    onChange={(e) =>
                      setLocationData({
                        ...locationData,
                        address_line1: e.target.value,
                      })
                    }
                    placeholder="123 Main Street"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      value={locationData.city}
                      onChange={(e) =>
                        setLocationData({
                          ...locationData,
                          city: e.target.value,
                        })
                      }
                      placeholder="Miami"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State *</Label>
                    <Input
                      id="state"
                      value={locationData.state}
                      onChange={(e) =>
                        setLocationData({
                          ...locationData,
                          state: e.target.value,
                        })
                      }
                      placeholder="Florida"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="postal">ZIP Code *</Label>
                  <Input
                    id="postal"
                    value={locationData.postal_code}
                    onChange={(e) =>
                      setLocationData({
                        ...locationData,
                        postal_code: e.target.value,
                      })
                    }
                    placeholder="33101"
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="mobile"
                      checked={locationData.offers_mobile_services}
                      onChange={(e) =>
                        setLocationData({
                          ...locationData,
                          offers_mobile_services: e.target.checked,
                        })
                      }
                    />
                    <Label htmlFor="mobile">Offer mobile services</Label>
                  </div>

                  {locationData.offers_mobile_services && (
                    <div className="space-y-2">
                      <Label htmlFor="radius">Service Radius (miles)</Label>
                      <Input
                        id="radius"
                        type="number"
                        min="1"
                        max="100"
                        value={locationData.mobile_service_radius}
                        onChange={(e) =>
                          setLocationData({
                            ...locationData,
                            mobile_service_radius: parseInt(e.target.value),
                          })
                        }
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">
                Services & Pricing Setup
              </h3>
              <Alert>
                <DollarSign className="h-4 w-4" />
                <AlertDescription>
                  Service configuration will be available in your dashboard
                  after setup completion. You can add services, set pricing, and
                  configure delivery options.
                </AlertDescription>
              </Alert>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Staff Setup</h3>
              {business?.business_type === "independent" ? (
                <Alert>
                  <Users className="h-4 w-4" />
                  <AlertDescription>
                    As an independent provider, you'll be the primary service
                    provider. You can add additional staff members later from
                    your dashboard.
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert>
                  <Users className="h-4 w-4" />
                  <AlertDescription>
                    Staff management will be available in your dashboard. You
                    can invite dispatchers and providers, assign roles, and
                    manage team permissions.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Integration Setup</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <Calendar className="w-8 h-8 text-roam-blue mx-auto mb-2" />
                      <h4 className="font-semibold">Calendar Sync</h4>
                      <p className="text-sm text-gray-600">
                        Google, Outlook, Apple
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4 text-center">
                      <Smartphone className="w-8 h-8 text-roam-blue mx-auto mb-2" />
                      <h4 className="font-semibold">SMS Notifications</h4>
                      <p className="text-sm text-gray-600">
                        Twilio integration
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4 text-center">
                      <MapPin className="w-8 h-8 text-roam-blue mx-auto mb-2" />
                      <h4 className="font-semibold">Google Maps</h4>
                      <p className="text-sm text-gray-600">Location services</p>
                    </CardContent>
                  </Card>
                </div>

                <Alert>
                  <Zap className="h-4 w-4" />
                  <AlertDescription>
                    Integration setup will be completed automatically. You can
                    configure specific settings and connect your accounts from
                    the dashboard after setup.
                  </AlertDescription>
                </Alert>
              </div>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Payment Setup</h3>
              <Alert>
                <CreditCard className="h-4 w-4" />
                <AlertDescription>
                  Stripe Connect will be configured to handle payments. You'll
                  receive direct payouts to your bank account. Payment setup can
                  be completed from your dashboard.
                </AlertDescription>
              </Alert>
            </div>
          </div>
        );

      case 7:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">
                Choose Your Subscription Plan
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {subscriptionPlans.map((plan) => (
                  <Card
                    key={plan.plan_id}
                    className={`cursor-pointer transition-all ${
                      selectedPlan === plan.plan_id
                        ? "ring-2 ring-roam-blue border-roam-blue"
                        : "hover:shadow-md"
                    }`}
                    onClick={() => setSelectedPlan(plan.plan_id)}
                  >
                    <CardHeader>
                      <CardTitle className="text-center">
                        {plan.plan_name}
                        {plan.plan_id === "roam_business" && (
                          <Badge className="ml-2 bg-roam-blue">Popular</Badge>
                        )}
                      </CardTitle>
                      <div className="text-center">
                        <span className="text-3xl font-bold">
                          ${plan.monthly_price}
                        </span>
                        <span className="text-gray-600">/month</span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2 text-sm">
                        <li>
                          Up to {plan.features.max_providers} provider
                          {plan.features.max_providers > 1 ? "s" : ""}
                        </li>
                        <li>
                          Up to {plan.features.max_locations} location
                          {plan.features.max_locations > 1 ? "s" : ""}
                        </li>
                        <li>
                          {plan.features.advanced_analytics ? "✓" : "���"}{" "}
                          Advanced Analytics
                        </li>
                        <li>
                          {plan.features.priority_support ? "✓" : "✗"} Priority
                          Support
                        </li>
                        <li>
                          {plan.features.api_access ? "✓" : "✗"} API Access
                        </li>
                      </ul>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        );

      case 8:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-4">Ready to Go Live!</h3>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <p className="text-gray-600 mb-6">
                Your business setup is complete. Click "Go Live" to activate
                your business for customer bookings.
              </p>

              <Alert>
                <Star className="h-4 w-4" />
                <AlertDescription>
                  Once activated, customers will be able to find and book your
                  services. You can always modify settings from your dashboard.
                </AlertDescription>
              </Alert>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return true; // No required fields for this step now
      case 2:
        return (
          locationData.address_line1 &&
          locationData.city &&
          locationData.state &&
          locationData.postal_code
        );
      case 7:
        return selectedPlan !== "";
      default:
        return true;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Progress Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">Business Setup</h2>
        <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
          {steps.map((step) => (
            <div
              key={step.number}
              className={`flex flex-col items-center text-center ${
                step.number <= currentStep ? "text-roam-blue" : "text-gray-400"
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 ${
                  step.completed
                    ? "bg-green-500 text-white"
                    : step.number === currentStep
                      ? "bg-roam-blue text-white"
                      : "bg-gray-200 text-gray-500"
                }`}
              >
                {step.completed ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <step.icon className="w-4 h-4" />
                )}
              </div>
              <span className="text-xs font-medium hidden md:block">
                {step.title}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {React.createElement(steps[currentStep - 1]?.icon || Building, {
              className: "w-5 h-5 text-roam-blue",
            })}
            Step {currentStep}: {steps[currentStep - 1]?.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {renderStepContent()}

          {error && (
            <Alert className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-between mt-8">
            <Button
              variant="outline"
              onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
              disabled={currentStep === 1}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>

            <Button
              onClick={() => completeStep({})}
              disabled={loading || !canProceed()}
              className="bg-roam-blue hover:bg-roam-blue/90"
            >
              {loading ? (
                "Processing..."
              ) : currentStep === 8 ? (
                <>
                  <Star className="w-4 h-4 mr-2" />
                  Go Live
                </>
              ) : (
                <>
                  {currentStep < 8 ? "Next" : "Complete"}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
