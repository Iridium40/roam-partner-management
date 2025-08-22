import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Loader2,
  Mail,
  Lock,
  User,
  Phone,
  Calendar,
  Eye,
  EyeOff,
  AlertCircle,
} from "lucide-react";

interface ProviderSignupFormData {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  phone: string;
  dateOfBirth: string;
  agreedToTerms: boolean;
  agreedToBackground: boolean;
}

interface ProviderSignupFormProps {
  onSubmit: (data: ProviderSignupFormData) => Promise<void>;
  loading?: boolean;
  error?: string;
}

export function ProviderSignupForm({
  onSubmit,
  loading = false,
  error,
}: ProviderSignupFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState<ProviderSignupFormData>({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    phone: "",
    dateOfBirth: "",
    agreedToTerms: false,
    agreedToBackground: false,
  });

  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof ProviderSignupFormData, string>>
  >({});

  const validateField = (
    field: keyof ProviderSignupFormData,
    value: string | boolean,
  ): string | null => {
    switch (field) {
      case "email":
        if (!value) return "Email is required";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value as string))
          return "Please enter a valid email address";
        return null;
      case "password":
        if (!value) return "Password is required";
        if ((value as string).length < 8)
          return "Password must be at least 8 characters";
        if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(value as string)) {
          return "Password must contain at least one uppercase letter, one lowercase letter, and one number";
        }
        return null;
      case "confirmPassword":
        if (!value) return "Please confirm your password";
        if (value !== formData.password) return "Passwords do not match";
        return null;
      case "firstName":
        if (!value) return "First name is required";
        if ((value as string).length < 2)
          return "First name must be at least 2 characters";
        return null;
      case "lastName":
        if (!value) return "Last name is required";
        if ((value as string).length < 2)
          return "Last name must be at least 2 characters";
        return null;
      case "phone":
        if (!value) return "Phone number is required";
        if (!/^\+?[\d\s\-\(\)]{10,}$/.test(value as string))
          return "Please enter a valid phone number";
        return null;
      case "dateOfBirth":
        if (!value) return "Date of birth is required";
        const age =
          new Date().getFullYear() - new Date(value as string).getFullYear();
        if (age < 18)
          return "You must be at least 18 years old to register as a provider";
        return null;
      case "agreedToTerms":
        if (!value) return "You must agree to the Terms of Service";
        return null;
      case "agreedToBackground":
        if (!value) return "You must consent to background check";
        return null;
      default:
        return null;
    }
  };

  const handleInputChange =
    (field: keyof ProviderSignupFormData) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setFormData((prev) => ({ ...prev, [field]: value }));

      // Clear field error when user starts typing
      if (fieldErrors[field]) {
        setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
      }
    };

  const handleCheckboxChange =
    (field: keyof ProviderSignupFormData) => (checked: boolean) => {
      setFormData((prev) => ({ ...prev, [field]: checked }));

      // Clear field error when user interacts
      if (fieldErrors[field]) {
        setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
      }
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all fields
    const errors: Partial<Record<keyof ProviderSignupFormData, string>> = {};

    (Object.keys(formData) as Array<keyof ProviderSignupFormData>).forEach(
      (field) => {
        const error = validateField(field, formData[field]);
        if (error) {
          errors[field] = error;
        }
      },
    );

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    try {
      await onSubmit(formData);
    } catch (submitError) {
      // Error handling is managed by parent component
      console.error("Signup form submission error:", submitError);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold text-roam-blue">
          Become a ROAM Provider
        </CardTitle>
        <p className="text-foreground/70">Step 1: Create your account</p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Personal Information */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    id="firstName"
                    type="text"
                    placeholder="John"
                    className="pl-10"
                    value={formData.firstName}
                    onChange={handleInputChange("firstName")}
                    disabled={loading}
                  />
                </div>
                {fieldErrors.firstName && (
                  <p className="text-sm text-red-600">
                    {fieldErrors.firstName}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    id="lastName"
                    type="text"
                    placeholder="Doe"
                    className="pl-10"
                    value={formData.lastName}
                    onChange={handleInputChange("lastName")}
                    disabled={loading}
                  />
                </div>
                {fieldErrors.lastName && (
                  <p className="text-sm text-red-600">{fieldErrors.lastName}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@example.com"
                    className="pl-10"
                    value={formData.email}
                    onChange={handleInputChange("email")}
                    disabled={loading}
                  />
                </div>
                {fieldErrors.email && (
                  <p className="text-sm text-red-600">{fieldErrors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="(555) 123-4567"
                    className="pl-10"
                    value={formData.phone}
                    onChange={handleInputChange("phone")}
                    disabled={loading}
                  />
                </div>
                {fieldErrors.phone && (
                  <p className="text-sm text-red-600">{fieldErrors.phone}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateOfBirth">Date of Birth *</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  id="dateOfBirth"
                  type="date"
                  className="pl-10"
                  value={formData.dateOfBirth}
                  onChange={handleInputChange("dateOfBirth")}
                  disabled={loading}
                  max={
                    new Date(
                      new Date().setFullYear(new Date().getFullYear() - 18),
                    )
                      .toISOString()
                      .split("T")[0]
                  }
                />
              </div>
              {fieldErrors.dateOfBirth && (
                <p className="text-sm text-red-600">
                  {fieldErrors.dateOfBirth}
                </p>
              )}
              <p className="text-xs text-foreground/60">
                You must be at least 18 years old
              </p>
            </div>
          </div>

          {/* Password Fields */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a strong password"
                  className="pl-10 pr-10"
                  value={formData.password}
                  onChange={handleInputChange("password")}
                  disabled={loading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {fieldErrors.password && (
                <p className="text-sm text-red-600">{fieldErrors.password}</p>
              )}
              <p className="text-xs text-foreground/60">
                At least 8 characters with uppercase, lowercase, and number
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password *</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your password"
                  className="pl-10 pr-10"
                  value={formData.confirmPassword}
                  onChange={handleInputChange("confirmPassword")}
                  disabled={loading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={loading}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {fieldErrors.confirmPassword && (
                <p className="text-sm text-red-600">
                  {fieldErrors.confirmPassword}
                </p>
              )}
            </div>
          </div>

          {/* Agreements */}
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <Checkbox
                id="agreedToTerms"
                checked={formData.agreedToTerms}
                onCheckedChange={handleCheckboxChange("agreedToTerms")}
                disabled={loading}
              />
              <div className="space-y-1">
                <Label
                  htmlFor="agreedToTerms"
                  className="text-sm leading-relaxed cursor-pointer"
                >
                  I agree to the{" "}
                  <Button
                    variant="link"
                    className="p-0 h-auto text-roam-blue underline"
                    type="button"
                  >
                    Terms of Service
                  </Button>{" "}
                  and{" "}
                  <Button
                    variant="link"
                    className="p-0 h-auto text-roam-blue underline"
                    type="button"
                  >
                    Privacy Policy
                  </Button>
                  *
                </Label>
                {fieldErrors.agreedToTerms && (
                  <p className="text-sm text-red-600">
                    {fieldErrors.agreedToTerms}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Checkbox
                id="agreedToBackground"
                checked={formData.agreedToBackground}
                onCheckedChange={handleCheckboxChange("agreedToBackground")}
                disabled={loading}
              />
              <div className="space-y-1">
                <Label
                  htmlFor="agreedToBackground"
                  className="text-sm leading-relaxed cursor-pointer"
                >
                  I consent to a comprehensive background check including
                  criminal history, sex offender registry, and identity
                  verification as required for platform approval *
                </Label>
                {fieldErrors.agreedToBackground && (
                  <p className="text-sm text-red-600">
                    {fieldErrors.agreedToBackground}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Information Notice */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Phase 1:</strong> This creates your account. After
              approval, you'll receive a secure link to complete identity
              verification and financial setup (Stripe Identity, bank connection
              via Plaid).
            </AlertDescription>
          </Alert>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full bg-roam-blue hover:bg-roam-blue/90"
            disabled={loading}
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating Account...
              </>
            ) : (
              "Create Account & Continue"
            )}
          </Button>

          <div className="text-center text-sm text-foreground/60">
            <p>
              Already have an account?{" "}
              <Button
                variant="link"
                className="p-0 h-auto text-roam-blue"
                type="button"
              >
                Sign in here
              </Button>
            </p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
