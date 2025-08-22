import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  User,
  Building,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  MapPin,
  Calendar,
  Globe,
} from "lucide-react";
import type { BusinessRegistration, BusinessType } from "@/lib/database.types";

interface BusinessRegistrationFormProps {
  onSubmit: (
    data: BusinessRegistration & {
      password: string;
      confirmPassword: string;
      agreedToTerms: boolean;
      agreedToBackground: boolean;
    },
  ) => Promise<void>;
  loading: boolean;
  error: string;
}

export const BusinessRegistrationForm: React.FC<
  BusinessRegistrationFormProps
> = ({ onSubmit, loading, error }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<
    BusinessRegistration & {
      password: string;
      confirmPassword: string;
      agreedToTerms: boolean;
      agreedToBackground: boolean;
    }
  >({
    // Business Information
    business_name: "",
    business_type: "independent",
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

  const handleInputChange = (field: string, value: any) => {
    if (field.includes(".")) {
      const [parent, child] = field.split(".");
      setFormData((prev) => ({
        ...prev,
        [parent]: {
          ...prev[parent as keyof typeof prev],
          [child]: value,
        },
      }));
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!(formData.business_name && formData.business_type);
      case 2:
        return !!(
          formData.owner_first_name &&
          formData.owner_last_name &&
          formData.owner_email &&
          formData.owner_phone
        );
      case 3:
        return !!(
          formData.business_address.address_line1 &&
          formData.business_address.city &&
          formData.business_address.state &&
          formData.business_address.postal_code
        );
      case 4:
        return !!(
          formData.password &&
          formData.confirmPassword &&
          formData.password === formData.confirmPassword &&
          formData.agreedToTerms &&
          formData.agreedToBackground
        );
      default:
        return false;
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep) && currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const businessTypes: {
    value: BusinessType;
    label: string;
    description: string;
  }[] = [
    {
      value: "independent",
      label: "Independent Provider",
      description: "Solo practitioner offering services directly to customers",
    },
    {
      value: "small_business",
      label: "Small Business",
      description: "Business with 2-25 providers across multiple locations",
    },
    {
      value: "franchise",
      label: "Franchise",
      description:
        "Part of a larger franchise network with standardized operations",
    },
    {
      value: "enterprise",
      label: "Enterprise",
      description:
        "Large organization with 100+ providers and multiple locations",
    },
    {
      value: "other",
      label: "Other",
      description: "Other business structure not listed above",
    },
  ];

  const usStates = [
    "Alabama",
    "Alaska",
    "Arizona",
    "Arkansas",
    "California",
    "Colorado",
    "Connecticut",
    "Delaware",
    "Florida",
    "Georgia",
    "Hawaii",
    "Idaho",
    "Illinois",
    "Indiana",
    "Iowa",
    "Kansas",
    "Kentucky",
    "Louisiana",
    "Maine",
    "Maryland",
    "Massachusetts",
    "Michigan",
    "Minnesota",
    "Mississippi",
    "Missouri",
    "Montana",
    "Nebraska",
    "Nevada",
    "New Hampshire",
    "New Jersey",
    "New Mexico",
    "New York",
    "North Carolina",
    "North Dakota",
    "Ohio",
    "Oklahoma",
    "Oregon",
    "Pennsylvania",
    "Rhode Island",
    "South Carolina",
    "South Dakota",
    "Tennessee",
    "Texas",
    "Utah",
    "Vermont",
    "Virginia",
    "Washington",
    "West Virginia",
    "Wisconsin",
    "Wyoming",
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Progress Indicator */}
      <div className="flex items-center justify-center space-x-4 mb-8">
        {[1, 2, 3, 4].map((step) => (
          <div key={step} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step <= currentStep
                  ? "bg-roam-blue text-white"
                  : "bg-gray-200 text-gray-500"
              }`}
            >
              {step}
            </div>
            {step < 4 && (
              <div
                className={`w-16 h-0.5 ${
                  step < currentStep ? "bg-roam-blue" : "bg-gray-200"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Business Information */}
      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="w-5 h-5 text-roam-blue" />
              Business Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="business_name">Business Name *</Label>
              <Input
                id="business_name"
                value={formData.business_name}
                onChange={(e) =>
                  handleInputChange("business_name", e.target.value)
                }
                placeholder="Enter your business name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="business_type">Business Type *</Label>
              <Select
                value={formData.business_type}
                onValueChange={(value) =>
                  handleInputChange("business_type", value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select business type" />
                </SelectTrigger>
                <SelectContent>
                  {businessTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div>
                        <div className="font-medium">{type.label}</div>
                        <div className="text-sm text-gray-500">
                          {type.description}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="website_url">Website (Optional)</Label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  id="website_url"
                  type="text"
                  value={formData.website_url}
                  onChange={(e) =>
                    handleInputChange("website_url", e.target.value)
                  }
                  placeholder="yourdomain.com"
                  className="pl-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Owner Information */}
      {currentStep === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-roam-blue" />
              Owner/Primary Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="owner_first_name">First Name *</Label>
                <Input
                  id="owner_first_name"
                  value={formData.owner_first_name}
                  onChange={(e) =>
                    handleInputChange("owner_first_name", e.target.value)
                  }
                  placeholder="John"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="owner_last_name">Last Name *</Label>
                <Input
                  id="owner_last_name"
                  value={formData.owner_last_name}
                  onChange={(e) =>
                    handleInputChange("owner_last_name", e.target.value)
                  }
                  placeholder="Doe"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="owner_email">Email Address *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  id="owner_email"
                  type="email"
                  value={formData.owner_email}
                  onChange={(e) =>
                    handleInputChange("owner_email", e.target.value)
                  }
                  placeholder="john@example.com"
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="owner_phone">Phone Number *</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  id="owner_phone"
                  type="tel"
                  value={formData.owner_phone}
                  onChange={(e) =>
                    handleInputChange("owner_phone", e.target.value)
                  }
                  placeholder="(555) 123-4567"
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="owner_date_of_birth">Date of Birth *</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  id="owner_date_of_birth"
                  type="date"
                  value={
                    formData.owner_date_of_birth.toISOString().split("T")[0]
                  }
                  onChange={(e) =>
                    handleInputChange(
                      "owner_date_of_birth",
                      new Date(e.target.value),
                    )
                  }
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contact_email">Business Contact Email</Label>
                <Input
                  id="contact_email"
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) =>
                    handleInputChange("contact_email", e.target.value)
                  }
                  placeholder="Same as owner email if empty"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Business Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  placeholder="Same as owner phone if empty"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Business Address */}
      {currentStep === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-roam-blue" />
              Business Address
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="address_line1">Street Address *</Label>
              <Input
                id="address_line1"
                value={formData.business_address.address_line1}
                onChange={(e) =>
                  handleInputChange(
                    "business_address.address_line1",
                    e.target.value,
                  )
                }
                placeholder="123 Main Street"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address_line2">Address Line 2 (Optional)</Label>
              <Input
                id="address_line2"
                value={formData.business_address.address_line2}
                onChange={(e) =>
                  handleInputChange(
                    "business_address.address_line2",
                    e.target.value,
                  )
                }
                placeholder="Suite, Unit, etc."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  value={formData.business_address.city}
                  onChange={(e) =>
                    handleInputChange("business_address.city", e.target.value)
                  }
                  placeholder="Miami"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State *</Label>
                <Select
                  value={formData.business_address.state}
                  onValueChange={(value) =>
                    handleInputChange("business_address.state", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    {usStates.map((state) => (
                      <SelectItem key={state} value={state}>
                        {state}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="postal_code">ZIP Code *</Label>
                <Input
                  id="postal_code"
                  value={formData.business_address.postal_code}
                  onChange={(e) =>
                    handleInputChange(
                      "business_address.postal_code",
                      e.target.value,
                    )
                  }
                  placeholder="33101"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Select
                  value={formData.business_address.country}
                  onValueChange={(value) =>
                    handleInputChange("business_address.country", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="United States">United States</SelectItem>
                    <SelectItem value="Canada">Canada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Account Security & Agreements */}
      {currentStep === 4 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-roam-blue" />
              Account Security & Agreements
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) =>
                    handleInputChange("password", e.target.value)
                  }
                  placeholder="Create a strong password"
                  className="pl-10 pr-10"
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

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password *</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    handleInputChange("confirmPassword", e.target.value)
                  }
                  placeholder="Confirm your password"
                  className="pl-10"
                  required
                />
              </div>
              {formData.password !== formData.confirmPassword &&
                formData.confirmPassword && (
                  <p className="text-sm text-red-600">Passwords do not match</p>
                )}
            </div>

            <div className="space-y-4">
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="agreedToTerms"
                  checked={formData.agreedToTerms}
                  onCheckedChange={(checked) =>
                    handleInputChange("agreedToTerms", checked)
                  }
                />
                <Label htmlFor="agreedToTerms" className="text-sm leading-5">
                  I agree to the{" "}
                  <a href="/terms" className="text-roam-blue hover:underline">
                    Terms of Service
                  </a>{" "}
                  and{" "}
                  <a href="/privacy" className="text-roam-blue hover:underline">
                    Privacy Policy
                  </a>
                </Label>
              </div>

              <div className="flex items-start space-x-2">
                <Checkbox
                  id="agreedToBackground"
                  checked={formData.agreedToBackground}
                  onCheckedChange={(checked) =>
                    handleInputChange("agreedToBackground", checked)
                  }
                />
                <Label
                  htmlFor="agreedToBackground"
                  className="text-sm leading-5"
                >
                  I consent to background verification checks and document
                  verification as required for platform approval
                </Label>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        {currentStep > 1 ? (
          <Button type="button" variant="outline" onClick={prevStep}>
            Previous
          </Button>
        ) : (
          <div />
        )}

        {currentStep < 4 ? (
          <Button
            type="button"
            className="bg-roam-blue hover:bg-roam-blue/90"
            onClick={nextStep}
            disabled={!validateStep(currentStep)}
          >
            Next
          </Button>
        ) : (
          <Button
            type="submit"
            className="bg-roam-blue hover:bg-roam-blue/90"
            disabled={loading || !validateStep(currentStep)}
          >
            {loading ? "Creating Account..." : "Create Account"}
          </Button>
        )}
      </div>
    </form>
  );
};
