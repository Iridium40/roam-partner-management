import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  Lock,
  Mail,
  Eye,
  EyeOff,
  Shield,
  DollarSign,
  Calendar,
  CheckCircle,
  Phone,
  User,
  Building,
  Star,
} from "lucide-react";
import { BusinessRegistrationForm } from "@/components/BusinessRegistrationForm";
import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import type { BusinessRegistration, BusinessType } from "@/lib/database.types";
import { useAuth } from "@/contexts/AuthContext";

export default function ProviderPortal() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("login");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { signIn } = useAuth();

  useEffect(() => {
    checkIfAlreadyAuthenticated();
  }, []);

  const checkIfAlreadyAuthenticated = async () => {
    // Skip Supabase client check since we're using direct API
    // Auth state is managed through AuthContext
    console.log("Skipping auth check - using AuthContext for auth state");
  };

  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
  });

  const [signupData, setSignupData] = useState<
    Partial<BusinessRegistration> & {
      password: string;
      confirmPassword: string;
      agreedToTerms: boolean;
      agreedToBackground: boolean;
    }
  >({
    // Business Information
    business_name: "",
    business_type: "" as BusinessType,
    contact_email: "",
    phone: "",
    website_url: "",

    // Owner/Primary Contact
    owner_first_name: "",
    owner_last_name: "",
    owner_email: "",
    owner_phone: "",
    owner_date_of_birth: new Date(),

    // Business Address
    business_address: {
      address_line1: "",
      address_line2: "",
      city: "",
      state: "",
      postal_code: "",
      country: "United States",
    },

    // Form fields
    password: "",
    confirmPassword: "",
    agreedToTerms: false,
    agreedToBackground: false,
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      // Use AuthContext signIn method which now uses direct API
      await signIn(loginData.email, loginData.password);

      // Success - redirect to provider dashboard
      navigate("/provider-dashboard");
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "An error occurred during login",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (
    data: BusinessRegistration & {
      password: string;
      confirmPassword: string;
      agreedToTerms: boolean;
      agreedToBackground: boolean;
    },
  ) => {
    setIsLoading(true);
    setError("");

    try {
      // Validate passwords match
      if (data.password !== data.confirmPassword) {
        throw new Error("Passwords do not match");
      }

      if (!data.business_type) {
        throw new Error("Please select a business type");
      }

      if (!data.business_name) {
        throw new Error("Please enter a business name");
      }

      if (!data.owner_first_name || !data.owner_last_name) {
        throw new Error("Please enter owner name");
      }

      if (!data.agreedToTerms || !data.agreedToBackground) {
        throw new Error("Please agree to terms and background check");
      }

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.owner_email!,
        password: data.password,
      });

      if (authError) {
        throw new Error(authError.message);
      }

      if (!authData.user) {
        throw new Error("Failed to create user account");
      }

      // First create a business profile for this provider
      const { data: businessData, error: businessError } = await supabase
        .from("business_profiles")
        .insert({
          business_name: data.business_name!,
          business_type: data.business_type!,
          contact_email: data.contact_email || data.owner_email,
          phone: data.phone || data.owner_phone,
          website_url: data.website_url,
          verification_status: "pending",
          is_active: false,
          setup_step: 1,
          setup_completed: false,
        })
        .select()
        .single();

      if (businessError || !businessData) {
        // Clean up auth user if business creation fails
        await supabase.auth.signOut();
        throw new Error(
          "Failed to create business profile: " +
            (businessError?.message || "Unknown error"),
        );
      }

      // Create a default location for the business with address
      const { data: locationData, error: locationError } = await supabase
        .from("business_locations")
        .insert({
          business_id: businessData.id,
          location_name: "Main Location",
          address_line1: data.business_address?.address_line1,
          address_line2: data.business_address?.address_line2,
          city: data.business_address?.city,
          state: data.business_address?.state,
          postal_code: data.business_address?.postal_code,
          country: data.business_address?.country,
          is_primary: true,
          is_active: true,
        })
        .select()
        .single();

      if (locationError || !locationData) {
        // Clean up auth user and business if location creation fails
        await supabase.auth.signOut();
        throw new Error(
          "Failed to create business location: " +
            (locationError?.message || "Unknown error"),
        );
      }

      // Create provider record with owner role
      const { error: providerError } = await supabase.from("providers").insert({
        user_id: authData.user.id,
        business_id: businessData.id,
        location_id: locationData.id,
        first_name: data.owner_first_name!,
        last_name: data.owner_last_name!,
        email: data.owner_email!,
        phone: data.owner_phone!,
        date_of_birth: data.owner_date_of_birth?.toISOString().split("T")[0],
        provider_role: "owner",
        verification_status: "pending",
        background_check_status: "under_review",
        is_active: false, // Inactive until verified by admin
        business_managed: true, // Default to true
      });

      // Create setup progress tracking
      await supabase.from("business_setup_progress").insert({
        business_id: businessData.id,
        current_step: 1,
        total_steps: 8,
        business_profile_completed: false,
        locations_completed: false,
        services_pricing_completed: false,
        staff_setup_completed: false,
        integrations_completed: false,
        stripe_connect_completed: false,
        subscription_completed: false,
        go_live_completed: false,
      });

      if (providerError) {
        // Clean up auth user if provider creation fails
        await supabase.auth.signOut();
        throw new Error(
          "Failed to create provider profile: " + providerError.message,
        );
      }

      // Success - redirect to new onboarding flow
      navigate("/provider-onboarding-flow", {
        state: {
          message:
            "Account created successfully! Let's complete your provider setup.",
          businessType: data.business_type,
          businessId: businessData.id,
          businessName: data.business_name,
        },
      });
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "An error occurred during signup",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const benefits = [
    {
      icon: DollarSign,
      title: "You Control Your Earnings",
      description:
        "Keep everything you charge (minus payout transaction fee only)",
    },
    {
      icon: Calendar,
      title: "Flexible Schedule",
      description: "Control when and where you work",
    },
    {
      icon: Users,
      title: "Quality Clients",
      description: "Connect with verified customers",
    },
    {
      icon: Shield,
      title: "Full Support",
      description: "Rescheduling and Cancellation 24/7 support",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-roam-light-blue/10">
      {/* Navigation */}
      <nav className="border-b bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <img
                src="https://cdn.builder.io/api/v1/image/assets%2Fa42b6f9ec53e4654a92af75aad56d14f%2F38446bf6c22b453fa45caf63b0513e21?format=webp&width=800"
                alt="ROAM - Your Best Life. Everywhere."
                className="h-8 w-auto"
              />
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center min-h-[60vh] lg:min-h-[80vh]">
            {/* Left Side - Branding */}
            <div className="text-center lg:text-left space-y-8">
              <div>
                <div className="flex justify-center lg:justify-start mb-8">
                  <img
                    src="https://cdn.builder.io/api/v1/image/assets%2Fa42b6f9ec53e4654a92af75aad56d14f%2F38446bf6c22b453fa45caf63b0513e21?format=webp&width=800"
                    alt="ROAM - Your Best Life. Everywhere."
                    className="h-16 sm:h-20 lg:h-24 w-auto"
                  />
                </div>
                <h1 className="text-2xl sm:text-4xl lg:text-6xl font-bold mb-4 sm:mb-6 text-roam-blue">
                  Provider Management
                </h1>
                <p className="text-base sm:text-lg lg:text-xl text-gray-600 leading-relaxed mb-6 sm:mb-8">
                  Access your provider dashboard and manage your services
                </p>
              </div>

              <Card className="bg-gradient-to-r from-roam-light-blue/10 to-roam-blue/10 border-roam-light-blue/30 mt-8" />
            </div>

            {/* Right Side - Auth Forms */}
            <div className="w-full max-w-md sm:max-w-lg mx-auto lg:mx-0">
              <Card className="border-border/50 shadow-lg">
                <CardHeader className="text-center pb-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-roam-blue to-roam-light-blue rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="w-8 h-8 text-white" />
                  </div>
                  <CardTitle className="text-2xl">Provider Access</CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs
                    value={activeTab}
                    onValueChange={setActiveTab}
                    className="w-full"
                  >
                    <TabsList className="grid w-full grid-cols-2 mb-6">
                      <TabsTrigger
                        value="login"
                        className="data-[state=active]:bg-roam-blue data-[state=active]:text-white"
                      >
                        Sign In
                      </TabsTrigger>
                      <TabsTrigger
                        value="signup"
                        className="data-[state=active]:bg-roam-blue data-[state=active]:text-white"
                      >
                        Get Started
                      </TabsTrigger>
                    </TabsList>

                    {/* Login Form */}
                    <TabsContent value="login">
                      <form onSubmit={handleLogin} className="space-y-4">
                        {error && (
                          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                            <div className="flex items-start gap-2">
                              <div className="w-4 h-4 text-red-600 mt-0.5">
                                ⚠️
                              </div>
                              <p className="text-sm text-red-800">{error}</p>
                            </div>
                          </div>
                        )}
                        <div className="space-y-2">
                          <Label htmlFor="login-email">Email Address</Label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                            <Input
                              id="login-email"
                              type="email"
                              placeholder="provider@example.com"
                              className="pl-10"
                              value={loginData.email}
                              onChange={(e) =>
                                setLoginData({
                                  ...loginData,
                                  email: e.target.value,
                                })
                              }
                              required
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="login-password">Password</Label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                            <Input
                              id="login-password"
                              type={showPassword ? "text" : "password"}
                              placeholder="Enter your password"
                              className="pl-10 pr-10"
                              value={loginData.password}
                              onChange={(e) =>
                                setLoginData({
                                  ...loginData,
                                  password: e.target.value,
                                })
                              }
                              required
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center space-x-2">
                            <Checkbox id="remember" />
                            <Label
                              htmlFor="remember"
                              className="text-sm font-normal"
                            >
                              Remember me
                            </Label>
                          </div>
                          <Button
                            variant="link"
                            className="p-0 h-auto text-roam-blue"
                          >
                            Forgot password?
                          </Button>
                        </div>

                        <Button
                          type="submit"
                          className="w-full bg-roam-blue hover:bg-roam-blue/90"
                          disabled={isLoading}
                        >
                          {isLoading ? "Signing in..." : "Sign In"}
                        </Button>
                      </form>
                    </TabsContent>

                    {/* Enhanced Business Registration Form */}
                    <TabsContent value="signup">
                      <div className="space-y-4">
                        <div className="bg-roam-light-blue/10 border border-roam-light-blue/30 rounded-lg p-4">
                          <h4 className="font-medium text-roam-blue mb-2">
                            New Provider Onboarding
                          </h4>
                          <p className="text-sm text-foreground/70 mb-3">
                            Experience our streamlined two-phase onboarding
                            process designed for faster approval and setup.
                          </p>
                          <Button
                            onClick={() =>
                              navigate("/provider-onboarding-flow")
                            }
                            className="w-full bg-roam-blue hover:bg-roam-blue/90"
                            size="lg"
                          >
                            Start New Provider Application
                          </Button>
                        </div>

                        <div className="text-center text-sm text-foreground/60">
                          <span>OR</span>
                        </div>

                        <BusinessRegistrationForm
                          onSubmit={handleSignup}
                          loading={isLoading}
                          error={error}
                        />
                      </div>
                    </TabsContent>
                  </Tabs>

                  {/* Footer */}
                  <div className="mt-6 text-center text-sm text-foreground/60">
                    <p>
                      Need help?{" "}
                      <Button
                        variant="link"
                        className="p-0 h-auto text-roam-blue"
                      >
                        Contact Support
                      </Button>
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Security Notice */}
              <Card className="mt-6 bg-green-50 border-green-200">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Shield className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-green-900 mb-1">
                        Secure & Verified
                      </h4>
                      <p className="text-sm text-green-800">
                        All provider applications undergo comprehensive
                        background checks and identity verification for the
                        safety of our customers and platform integrity.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-200 py-8 mt-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            {/* Agreement Statement */}
            <div className="text-center mb-6">
              <p className="text-sm text-gray-600">
                By entering and using this portal, you agree to comply with our
                policies and terms.
              </p>
            </div>

            {/* Footer Links */}
            <div className="flex flex-wrap justify-center items-center gap-6 text-sm">
              <a
                href="#"
                className="text-gray-600 hover:text-roam-blue transition-colors"
              >
                Terms of Service
              </a>
              <span className="text-gray-300">|</span>
              <a
                href="#"
                className="text-gray-600 hover:text-roam-blue transition-colors"
              >
                Privacy Policy
              </a>
              <span className="text-gray-300">|</span>
              <a
                href="#"
                className="text-gray-600 hover:text-roam-blue transition-colors"
              >
                Cookie Policy
              </a>
              <span className="text-gray-300">|</span>
              <a
                href="#"
                className="text-gray-600 hover:text-roam-blue transition-colors"
              >
                Disclaimer
              </a>
            </div>

            {/* Copyright */}
            <div className="text-center mt-6 pt-6 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                © {new Date().getFullYear()} ROAM. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
