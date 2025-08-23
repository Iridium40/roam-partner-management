import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, TestTube2 } from "lucide-react";

// Import Phase 2 components
import WelcomeBackStep from "@/components/WelcomeBackStep";
import BusinessProfileSetup from "@/components/Phase2Components/BusinessProfileSetup";
import PersonalProfileSetup from "@/components/Phase2Components/PersonalProfileSetup";
import BusinessHoursSetup from "@/components/Phase2Components/BusinessHoursSetup";
import StaffManagementSetup from "@/components/Phase2Components/StaffManagementSetup";
import BankingPayoutSetup from "@/components/Phase2Components/BankingPayoutSetup";
import ServicePricingSetup from "@/components/Phase2Components/ServicePricingSetup";
import FinalReviewSetup from "@/components/Phase2Components/FinalReviewSetup";

type Phase2Step =
  | "overview"
  | "welcome"
  | "business_profile"
  | "personal_profile"
  | "business_hours"
  | "staff_management"
  | "banking_payout"
  | "service_pricing"
  | "final_review";

export default function Phase2Test() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<Phase2Step>("overview");

  // Test business data
  const testBusinessId = "7a79ba40-cc67-47a4-b9bf-776335c9ea9e"; // Cary's Care Wash
  const testUserId = "7a79ba40-cc67-47a4-b9bf-776335c9ea9e"; // Same as business for testing

  const handleStepComplete = (nextStep: Phase2Step) => {
    console.log(`✅ Step completed: ${currentStep}, moving to: ${nextStep}`);
    setCurrentStep(nextStep);
  };

  const handleBack = () => {
    // Simple back navigation based on current step
    const steps: Phase2Step[] = [
      "overview",
      "welcome",
      "business_profile",
      "personal_profile",
      "business_hours",
      "staff_management",
      "banking_payout",
      "service_pricing",
      "final_review",
    ];

    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case "overview":
        return (
          <Card className="max-w-4xl mx-auto">
            <CardHeader>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-roam-blue to-blue-600 rounded-full flex items-center justify-center">
                  <TestTube2 className="w-8 h-8 text-white" />
                </div>
                <div>
                  <CardTitle className="text-3xl text-roam-blue">
                    Phase 2 Flow Test
                  </CardTitle>
                  <p className="text-foreground/70">
                    Test the complete Phase 2 onboarding experience
                  </p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[
                  {
                    step: "welcome",
                    title: "Welcome Back",
                    desc: "Phase 2 introduction with progress overview",
                  },
                  {
                    step: "business_profile",
                    title: "Business Profile",
                    desc: "Logo, cover image, business info",
                  },
                  {
                    step: "personal_profile",
                    title: "Personal Profile",
                    desc: "Avatar, bio, certifications",
                  },
                  {
                    step: "business_hours",
                    title: "Business Hours",
                    desc: "Operating hours & availability (Coming Soon)",
                  },
                  {
                    step: "staff_management",
                    title: "Staff Management",
                    desc: "Team members & permissions (Coming Soon)",
                  },
                  {
                    step: "banking_payout",
                    title: "Banking & Payouts",
                    desc: "Payment processing setup (Coming Soon)",
                  },
                  {
                    step: "service_pricing",
                    title: "Service Pricing",
                    desc: "Pricing & packages (Coming Soon)",
                  },
                  {
                    step: "final_review",
                    title: "Final Review",
                    desc: "Complete setup & go live (Coming Soon)",
                  },
                ].map(({ step, title, desc }) => (
                  <Card
                    key={step}
                    className="border-2 border-dashed border-gray-300 hover:border-roam-blue transition-colors cursor-pointer"
                    onClick={() => setCurrentStep(step as Phase2Step)}
                  >
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">{title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-foreground/70">{desc}</p>
                      <div className="mt-3">
                        <Button
                          size="sm"
                          className="w-full bg-roam-blue hover:bg-roam-blue/90"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCurrentStep(step as Phase2Step);
                          }}
                        >
                          Test This Step
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="font-semibold text-blue-900 mb-2">
                  🧪 Test Business Details
                </h3>
                <div className="grid gap-2 text-sm text-blue-800">
                  <p>
                    <strong>Business:</strong> Cary's Care Wash
                  </p>
                  <p>
                    <strong>Business ID:</strong> {testBusinessId}
                  </p>
                  <p>
                    <strong>User ID:</strong> {testUserId}
                  </p>
                  <p>
                    <strong>Status:</strong> Approved & Ready for Phase 2
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case "welcome":
        return (
          <WelcomeBackStep
            businessName="Cary's Care Wash"
            onContinue={() => handleStepComplete("business_profile")}
            userId={testUserId}
            businessId={testBusinessId}
          />
        );

      case "business_profile":
        return (
          <BusinessProfileSetup
            businessId={testBusinessId}
            userId={testUserId}
            onComplete={() => handleStepComplete("personal_profile")}
            onBack={handleBack}
            initialData={{
              businessName: "Cary's Care Wash",
              detailedDescription:
                "Professional car wash and detailing services.",
              websiteUrl: "",
              socialMediaLinks: {},
            }}
          />
        );

      case "personal_profile":
        return (
          <PersonalProfileSetup
            businessId={testBusinessId}
            userId={testUserId}
            onComplete={() => handleStepComplete("business_hours")}
            onBack={handleBack}
            initialData={{
              professionalTitle: "Car Wash Specialist",
              professionalBio:
                "Experienced in providing high-quality car wash and detailing services.",
              yearsExperience: 5,
              specialties: ["Car Washing", "Detailing", "Waxing"],
              certifications: [],
              education: [],
              awards: [],
              socialLinks: {},
            }}
          />
        );

      case "business_hours":
        return (
          <BusinessHoursSetup
            businessId={testBusinessId}
            userId={testUserId}
            onComplete={() => handleStepComplete("staff_management")}
            onBack={handleBack}
            initialData={{
              monday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
              tuesday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
              wednesday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
              thursday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
              friday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
              saturday: { isOpen: false, openTime: '09:00', closeTime: '17:00' },
              sunday: { isOpen: false, openTime: '09:00', closeTime: '17:00' }
            }}
          />
        );

      case "staff_management":
        return (
          <StaffManagementSetup
            businessId={testBusinessId}
            userId={testUserId}
            businessType="business"
            onComplete={() => handleStepComplete("banking_payout")}
            onBack={handleBack}
            initialData={[
              {
                id: "1",
                first_name: "John",
                last_name: "Doe",
                email: "john@example.com",
                phone: "(555) 123-4567",
                provider_role: "provider",
                bio: "Experienced service provider",
                experience_years: 3,
                verification_status: "approved",
                is_active: true,
              }
            ]}
          />
        );

      case "banking_payout":
        return (
          <BankingPayoutSetup
            businessId={testBusinessId}
            userId={testUserId}
            onComplete={() => handleStepComplete("service_pricing")}
            onBack={handleBack}
            initialData={{
              stripeConnected: false,
              plaidConnected: false,
            }}
          />
        );

      case "service_pricing":
        return (
          <ServicePricingSetup
            businessId={testBusinessId}
            userId={testUserId}
            onComplete={() => handleStepComplete("final_review")}
            onBack={handleBack}
            initialData={{
              business_services: [],
              business_addons: [],
              eligible_services: [
                {
                  id: "1",
                  name: "Deep Cleaning",
                  description: "Comprehensive cleaning service",
                  min_price: 150,
                  duration_minutes: 120,
                  is_active: true,
                  subcategory_id: "cleaning",
                  service_subcategories: {
                    service_subcategory_type: "cleaning"
                  }
                },
                {
                  id: "2",
                  name: "Regular Maintenance",
                  description: "Standard maintenance service",
                  min_price: 100,
                  duration_minutes: 60,
                  is_active: true,
                  subcategory_id: "maintenance",
                  service_subcategories: {
                    service_subcategory_type: "maintenance"
                  }
                }
              ],
              eligible_addons: [
                {
                  id: "1",
                  name: "Express Service",
                  description: "Faster service delivery",
                  is_active: true
                },
                {
                  id: "2",
                  name: "Premium Materials",
                  description: "High-quality materials upgrade",
                  is_active: true
                }
              ],
              service_addon_map: {
                "1": ["1", "2"],
                "2": ["1"]
              },
              pricingModel: 'fixed',
              currency: 'USD',
              taxRate: 8.5,
              cancellationPolicy: 'By using our platform, you agree to our cancellation policy. For details, visit our Terms of Service.',
            }}
          />
        );

      case "final_review":
        return (
          <FinalReviewSetup
            businessId={testBusinessId}
            userId={testUserId}
            onComplete={() => handleStepComplete("overview")}
            onBack={handleBack}
            phase2Data={{
              business_profile: { businessName: "Cary's Care Wash" },
              personal_profile: { professionalTitle: "Car Wash Specialist" },
              business_hours: { monday: { isOpen: true }, tuesday: { isOpen: true } },
              staff_management: [{ id: "1", first_name: "John", last_name: "Doe" }],
              banking_payout: { payoutMethod: "stripe_connect" },
              service_pricing: { services: [{ id: "1", name: "Deep Cleaning" }] },
            }}
          />
        );

      default:
        return (
          <Card className="max-w-2xl mx-auto text-center">
            <CardHeader>
              <CardTitle className="text-2xl text-roam-blue">
                {currentStep
                  .replace("_", " ")
                  .replace(/\b\w/g, (l) => l.toUpperCase())}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-foreground/70">
                This component is coming soon! It will be implemented as part of
                the complete Phase 2 flow.
              </p>

              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={handleBack}>
                  Back
                </Button>
                <Button
                  onClick={() => {
                    const nextSteps = {
                      business_hours: "staff_management",
                      staff_management: "banking_payout",
                      banking_payout: "service_pricing",
                      service_pricing: "final_review",
                      final_review: "overview",
                    };
                    handleStepComplete(
                      nextSteps[
                        currentStep as keyof typeof nextSteps
                      ] as Phase2Step,
                    );
                  }}
                  className="bg-roam-blue hover:bg-roam-blue/90"
                >
                  Continue (Mock)
                </Button>
              </div>
            </CardContent>
          </Card>
        );
    }
  };

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
            <div className="flex items-center gap-3">
              <Badge
                variant="outline"
                className="border-roam-blue text-roam-blue"
              >
                Phase 2 Test
              </Badge>
              {currentStep !== "overview" && (
                <Badge variant="secondary">
                  {currentStep.replace("_", " ")}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderStepContent()}
      </div>
    </div>
  );
}
