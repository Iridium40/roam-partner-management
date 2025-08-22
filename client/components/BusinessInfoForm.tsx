import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Building,
  Mail,
  Phone,
  Globe,
  MapPin,
  Clock,
  AlertCircle,
  Info,
  Star,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

// Database schema interfaces
interface ServiceCategoryDB {
  id: string;
  service_category_type: string;
  description: string;
  is_active: boolean;
  sort_order: number;
  image_url?: string;
  created_at: string;
}

interface ServiceSubcategoryDB {
  id: string;
  category_id: string;
  service_subcategory_type: string;
  description: string;
  is_active: boolean;
  image_url?: string;
  created_at: string;
  service_categories?: {
    service_category_type: string;
  };
}

type BusinessType =
  | "independent"
  | "small_business"
  | "franchise"
  | "enterprise"
  | "other";
type ServiceCategory = string;

interface BusinessHours {
  Monday: { open: string; close: string; closed: boolean };
  Tuesday: { open: string; close: string; closed: boolean };
  Wednesday: { open: string; close: string; closed: boolean };
  Thursday: { open: string; close: string; closed: boolean };
  Friday: { open: string; close: string; closed: boolean };
  Saturday: { open: string; close: string; closed: boolean };
  Sunday: { open: string; close: string; closed: boolean };
}

interface SocialMediaLink {
  platform: string;
  url: string;
}

interface SocialMediaLinks {
  instagram?: string;
  facebook?: string;
  linkedin?: string;
  website?: string;
}

interface BusinessAddress {
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface BusinessInfoFormData {
  businessName: string;
  businessType: BusinessType | "";
  contactEmail: string;
  phone: string;
  serviceCategories: string[]; // Now stores category IDs instead of text
  serviceSubcategories: string[]; // Now stores subcategory IDs instead of text
  businessHours: BusinessHours;
  businessAddress: BusinessAddress;
  website?: string;
  socialMedia?: SocialMediaLinks;
  socialMediaArray?: SocialMediaLink[];
  businessDescription?: string;
  yearsExperience: string;
}

interface BusinessInfoFormProps {
  onSubmit: (data: BusinessInfoFormData) => Promise<void>;
  loading?: boolean;
  error?: string;
  initialData?: Partial<BusinessInfoFormData>;
}

const defaultBusinessHours: BusinessHours = {
  Monday: { open: "09:00", close: "17:00", closed: false },
  Tuesday: { open: "09:00", close: "17:00", closed: false },
  Wednesday: { open: "09:00", close: "17:00", closed: false },
  Thursday: { open: "09:00", close: "17:00", closed: false },
  Friday: { open: "09:00", close: "17:00", closed: false },
  Saturday: { open: "10:00", close: "16:00", closed: false },
  Sunday: { open: "10:00", close: "16:00", closed: true },
};

const serviceCategories = ["beauty", "fitness", "therapy", "healthcare"];

const categoryLabels = {
  beauty: "Beauty & Wellness",
  fitness: "Fitness & Training",
  therapy: "Therapy Services",
  healthcare: "Healthcare Services",
};

const serviceSubcategories = {
  beauty: [
    "Hair Styling & Cuts",
    "Hair Coloring",
    "Makeup Application",
    "Nail Services",
    "Skincare & Facials",
    "Lash Extensions",
    "Eyebrow Services",
    "Waxing",
    "Spa Services",
  ],
  fitness: [
    "Personal Training",
    "Weight Training",
    "HIIT Training",
    "Yoga Instruction",
    "Pilates",
    "Cardio Training",
    "Strength Training",
    "Mobility & Flexibility",
    "Group Fitness Classes",
  ],
  therapy: [
    "Massage Therapy",
    "Deep Tissue Massage",
    "Swedish Massage",
    "Sports Massage",
    "Prenatal Massage",
    "Hot Stone Massage",
    "Reflexology",
    "Therapeutic Massage",
    "Mental Health Therapy",
    "Physical Therapy",
    "Occupational Therapy",
  ],
  healthcare: [
    "Primary Care",
    "Specialized Medicine",
    "Nursing Services",
    "Medical Consultations",
    "Health Coaching",
    "Nutrition Counseling",
    "Pain Management",
    "Preventive Care",
    "Medical Massage",
  ],
};

export function BusinessInfoForm({
  onSubmit,
  loading = false,
  error,
  initialData,
}: BusinessInfoFormProps) {
  const [formData, setFormData] = useState<BusinessInfoFormData>({
    businessName: initialData?.businessName || "",
    businessType: initialData?.businessType || "",
    contactEmail: initialData?.contactEmail || "",
    phone: initialData?.phone || "",
    serviceCategories: initialData?.serviceCategories || [],
    serviceSubcategories: initialData?.serviceSubcategories || [],
    businessHours: initialData?.businessHours || defaultBusinessHours,
    businessAddress: initialData?.businessAddress || {
      addressLine1: "",
      addressLine2: "",
      city: "",
      state: "",
      postalCode: "",
      country: "United States",
    },
    website: initialData?.website || "",
    socialMedia: initialData?.socialMedia || {},
    socialMediaArray: initialData?.socialMediaArray || [],
    businessDescription: initialData?.businessDescription || "",
    yearsExperience: initialData?.yearsExperience || "",
  });

  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<string, string>>
  >({});

  // Dynamic service categories and subcategories from database
  const [serviceCategories, setServiceCategories] = useState<ServiceCategoryDB[]>([]);
  const [serviceSubcategories, setServiceSubcategories] = useState<ServiceSubcategoryDB[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);

  // Fetch service categories and subcategories on component mount
  const fetchServiceData = async () => {
    try {
      setCategoriesLoading(true);
      setCategoriesError(null);

      // Parallel fetch as per your provided logic
      const [categoriesResult, subcategoriesResult] = await Promise.all([
        // 1. CATEGORIES
        supabase
          .from("service_categories")
          .select("*")
          .eq("is_active", true)
          .order("sort_order", { ascending: true }),

        // 2. SUBCATEGORIES with category relationship
        supabase
          .from("service_subcategories")
          .select(`
            *,
            service_categories (
              service_category_type
            )
          `)
          .eq("is_active", true)
          .order("created_at", { ascending: false }),
      ]);

      if (categoriesResult.error) {
        throw new Error(`Categories error: ${categoriesResult.error.message}`);
      }

      if (subcategoriesResult.error) {
        throw new Error(`Subcategories error: ${subcategoriesResult.error.message}`);
      }

      setServiceCategories(categoriesResult.data || []);
      setServiceSubcategories(subcategoriesResult.data || []);

    } catch (error) {
      console.error("Error fetching service data:", error);
      setCategoriesError(error instanceof Error ? error.message : "Failed to load service categories");
    } finally {
      setCategoriesLoading(false);
    }
  };

  useEffect(() => {
    fetchServiceData();
  }, []);

  // Utility function to convert snake_case or underscore-separated text to CamelCase
  const toCamelCase = (text: string): string => {
    return text
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const validateField = (field: string, value: any): string | null => {
    switch (field) {
      case "businessName":
        if (!value) return "Business name is required";
        if (value.length < 2)
          return "Business name must be at least 2 characters";
        return null;
      case "businessType":
        if (!value) return "Please select a business type";
        return null;
      case "contactEmail":
        if (!value) return "Contact email is required";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
          return "Please enter a valid email address";
        return null;
      case "phone":
        if (!value) return "Phone number is required";
        if (!/^\+?[\d\s\-\(\)]{10,}$/.test(value))
          return "Please enter a valid phone number";
        return null;
      case "serviceCategories":
        if (!value || value.length === 0)
          return "Please select at least one service category";
        return null;
      case "addressLine1":
        if (!value) return "Street address is required";
        return null;
      case "city":
        if (!value) return "City is required";
        return null;
      case "state":
        if (!value) return "State is required";
        return null;
      case "postalCode":
        if (!value) return "ZIP/Postal code is required";
        if (!/^\d{5}(-\d{4})?$/.test(value))
          return "Please enter a valid ZIP code";
        return null;
      case "yearsExperience":
        if (!value) return "Years of experience is required";
        return null;
      default:
        return null;
    }
  };

  const handleInputChange =
    (field: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = e.target.value;

      if (field.startsWith("address.")) {
        const addressField = field.split(".")[1];
        setFormData((prev) => ({
          ...prev,
          businessAddress: {
            ...prev.businessAddress,
            [addressField]: value,
          },
        }));
      } else if (field.startsWith("social.")) {
        const socialField = field.split(".")[1];
        setFormData((prev) => ({
          ...prev,
          socialMedia: {
            ...prev.socialMedia,
            [socialField]: value,
          },
          socialMediaArray: (() => {
            const updated = [...(prev.socialMediaArray || [])];
            const existingIndex = updated.findIndex(
              (item) => item.platform === socialField,
            );

            if (value.trim()) {
              if (existingIndex >= 0) {
                updated[existingIndex] = { platform: socialField, url: value };
              } else {
                updated.push({ platform: socialField, url: value });
              }
            } else {
              if (existingIndex >= 0) {
                updated.splice(existingIndex, 1);
              }
            }

            return updated;
          })(),
        }));
      } else {
        setFormData((prev) => ({ ...prev, [field]: value }));
      }

      // Clear field error
      if (fieldErrors[field]) {
        setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
      }
    };

  const handleSelectChange = (field: string) => (value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Clear field error
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const toggleServiceCategory = (categoryId: string) => {
    setFormData((prev) => {
      const isSelected = prev.serviceCategories.includes(categoryId);
      const newCategories = isSelected
        ? prev.serviceCategories.filter((c) => c !== categoryId)
        : [...prev.serviceCategories, categoryId];

      // Remove subcategories that belong to deselected categories
      const newSubcategories = prev.serviceSubcategories.filter((subId) =>
        serviceSubcategories.some(sub =>
          sub.id === subId && newCategories.includes(sub.category_id)
        )
      );

      return {
        ...prev,
        serviceCategories: newCategories,
        serviceSubcategories: newSubcategories,
      };
    });

    // Clear field error
    if (fieldErrors.serviceCategories) {
      setFieldErrors((prev) => ({ ...prev, serviceCategories: undefined }));
    }
  };

  const toggleServiceSubcategory = (subcategoryId: string) => {
    setFormData((prev) => ({
      ...prev,
      serviceSubcategories: prev.serviceSubcategories.includes(subcategoryId)
        ? prev.serviceSubcategories.filter((s) => s !== subcategoryId)
        : [...prev.serviceSubcategories, subcategoryId],
    }));
  };

  const handleBusinessHoursChange = (
    day: keyof BusinessHours,
    field: "open" | "close",
    value: string,
  ) => {
    setFormData((prev) => ({
      ...prev,
      businessHours: {
        ...prev.businessHours,
        [day]: {
          ...prev.businessHours[day],
          [field]: value,
        },
      },
    }));
  };

  const toggleDayClosed = (day: keyof BusinessHours) => {
    setFormData((prev) => ({
      ...prev,
      businessHours: {
        ...prev.businessHours,
        [day]: {
          ...prev.businessHours[day],
          closed: !prev.businessHours[day].closed,
        },
      },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    const errors: Record<string, string> = {};

    const requiredFields = [
      "businessName",
      "businessType",
      "contactEmail",
      "phone",
      "serviceCategories",
      "yearsExperience",
    ];

    const addressFields = ["addressLine1", "city", "state", "postalCode"];

    requiredFields.forEach((field) => {
      const error = validateField(
        field,
        formData[field as keyof BusinessInfoFormData],
      );
      if (error) errors[field] = error;
    });

    addressFields.forEach((field) => {
      const error = validateField(
        field,
        formData.businessAddress[field as keyof BusinessAddress],
      );
      if (error) errors[field] = error;
    });

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    try {
      // Convert business hours format for database storage
      const convertedBusinessHours: {
        [key: string]: { open: string; close: string };
      } = {};

      Object.entries(formData.businessHours).forEach(([day, hours]) => {
        if (!hours.closed) {
          convertedBusinessHours[day] = {
            open: hours.open,
            close: hours.close,
          };
        }
      });

      const submissionData = {
        ...formData,
        businessHours: convertedBusinessHours,
      };

      await onSubmit(submissionData);
    } catch (submitError) {
      console.error("Business info form submission error:", submitError);
    }
  };

  const getAvailableSubcategories = () => {
    if (!formData.serviceCategories.length || !serviceSubcategories.length) {
      return [];
    }

    // Filter subcategories that belong to selected category IDs
    return serviceSubcategories.filter(subcategory =>
      formData.serviceCategories.includes(subcategory.category_id)
    );
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold text-roam-blue">
          Business Information
        </CardTitle>
        <p className="text-foreground/70">
          Tell us about your business and services
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Basic Business Information */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Building className="h-5 w-5 text-roam-blue" />
              Basic Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="businessName">Business Name *</Label>
                <Input
                  id="businessName"
                  placeholder="Your Business Name"
                  value={formData.businessName}
                  onChange={handleInputChange("businessName")}
                  disabled={loading}
                />
                {fieldErrors.businessName && (
                  <p className="text-sm text-red-600">
                    {fieldErrors.businessName}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="businessType">Business Type *</Label>
                <Select
                  value={formData.businessType}
                  onValueChange={handleSelectChange("businessType")}
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select business type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="independent">Independent</SelectItem>
                    <SelectItem value="small_business">
                      Small Business
                    </SelectItem>
                    <SelectItem value="franchise">Franchise</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                {fieldErrors.businessType && (
                  <p className="text-sm text-red-600">
                    {fieldErrors.businessType}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contactEmail">Contact Email *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    id="contactEmail"
                    type="email"
                    placeholder="business@example.com"
                    className="pl-10"
                    value={formData.contactEmail}
                    onChange={handleInputChange("contactEmail")}
                    disabled={loading}
                  />
                </div>
                {fieldErrors.contactEmail && (
                  <p className="text-sm text-red-600">
                    {fieldErrors.contactEmail}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Business Phone *</Label>
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
              <Label htmlFor="yearsExperience">Years of Experience *</Label>
              <Select
                value={formData.yearsExperience}
                onValueChange={handleSelectChange("yearsExperience")}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select experience level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="less-than-1">Less than 1 year</SelectItem>
                  <SelectItem value="1-2">1-2 years</SelectItem>
                  <SelectItem value="3-5">3-5 years</SelectItem>
                  <SelectItem value="6-10">6-10 years</SelectItem>
                  <SelectItem value="11-15">11-15 years</SelectItem>
                  <SelectItem value="16-20">16-20 years</SelectItem>
                  <SelectItem value="20+">20+ years</SelectItem>
                </SelectContent>
              </Select>
              {fieldErrors.yearsExperience && (
                <p className="text-sm text-red-600">
                  {fieldErrors.yearsExperience}
                </p>
              )}
            </div>
          </div>

          {/* Service Categories */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Star className="h-5 w-5 text-roam-blue" />
              Services Offered
            </h3>

            <div className="space-y-4">
              <div>
                <Label>Service Categories *</Label>
                <p className="text-sm text-foreground/60 mb-3">
                  Select all categories that apply to your business
                </p>
                {categoriesLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="ml-2 text-sm">Loading service categories...</span>
                  </div>
                ) : categoriesError ? (
                  <div className="text-red-600 text-sm">
                    Error loading categories: {categoriesError}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {serviceCategories.map((category) => (
                      <div key={category.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={category.id}
                          checked={formData.serviceCategories.includes(category.id)}
                          onCheckedChange={() => toggleServiceCategory(category.id)}
                          disabled={loading || categoriesLoading}
                        />
                        <Label
                          htmlFor={category.id}
                          className="text-sm font-normal cursor-pointer"
                        >
                          {toCamelCase(category.service_category_type)}
                        </Label>
                      </div>
                    ))}
                  </div>
                )}
                {fieldErrors.serviceCategories && (
                  <p className="text-sm text-red-600">
                    {fieldErrors.serviceCategories}
                  </p>
                )}
              </div>

              {/* Service Subcategories */}
              {formData.serviceCategories.length > 0 && (
                <div>
                  <Label>Specific Services (Optional)</Label>
                  <p className="text-sm text-foreground/60 mb-3">
                    Select specific services you offer
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {getAvailableSubcategories().map((subcategory) => (
                      <div
                        key={subcategory.id}
                        className="flex items-center space-x-2"
                      >
                        <Checkbox
                          id={subcategory.id}
                          checked={formData.serviceSubcategories.includes(subcategory.id)}
                          onCheckedChange={() =>
                            toggleServiceSubcategory(subcategory.id)
                          }
                          disabled={loading || categoriesLoading}
                        />
                        <Label
                          htmlFor={subcategory.id}
                          className="text-sm font-normal cursor-pointer"
                        >
                          {toCamelCase(subcategory.service_subcategory_type)}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Business Address */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <MapPin className="h-5 w-5 text-roam-blue" />
              Business Address
            </h3>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="addressLine1">Street Address *</Label>
                <Input
                  id="addressLine1"
                  placeholder="123 Main Street"
                  value={formData.businessAddress.addressLine1}
                  onChange={handleInputChange("address.addressLine1")}
                  disabled={loading}
                />
                {fieldErrors.addressLine1 && (
                  <p className="text-sm text-red-600">
                    {fieldErrors.addressLine1}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="addressLine2">Unit/Suite (Optional)</Label>
                <Input
                  id="addressLine2"
                  placeholder="Suite 100"
                  value={formData.businessAddress.addressLine2}
                  onChange={handleInputChange("address.addressLine2")}
                  disabled={loading}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    placeholder="City"
                    value={formData.businessAddress.city}
                    onChange={handleInputChange("address.city")}
                    disabled={loading}
                  />
                  {fieldErrors.city && (
                    <p className="text-sm text-red-600">{fieldErrors.city}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="state">State *</Label>
                  <Input
                    id="state"
                    placeholder="State"
                    value={formData.businessAddress.state}
                    onChange={handleInputChange("address.state")}
                    disabled={loading}
                  />
                  {fieldErrors.state && (
                    <p className="text-sm text-red-600">{fieldErrors.state}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="postalCode">ZIP Code *</Label>
                  <Input
                    id="postalCode"
                    placeholder="12345"
                    value={formData.businessAddress.postalCode}
                    onChange={handleInputChange("address.postalCode")}
                    disabled={loading}
                  />
                  {fieldErrors.postalCode && (
                    <p className="text-sm text-red-600">
                      {fieldErrors.postalCode}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Business Hours */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Clock className="h-5 w-5 text-roam-blue" />
              Business Hours
            </h3>

            <div className="space-y-3">
              {Object.entries(formData.businessHours).map(([day, hours]) => (
                <div
                  key={day}
                  className="flex items-center gap-4 p-3 border rounded-lg"
                >
                  <div className="w-20 font-medium capitalize">{day}</div>

                  <Checkbox
                    checked={!hours.closed}
                    onCheckedChange={() =>
                      toggleDayClosed(day as keyof BusinessHours)
                    }
                    disabled={loading}
                  />
                  <Label className="text-sm">Open</Label>

                  {!hours.closed && (
                    <>
                      <Input
                        type="time"
                        value={hours.open}
                        onChange={(e) =>
                          handleBusinessHoursChange(
                            day as keyof BusinessHours,
                            "open",
                            e.target.value,
                          )
                        }
                        className="w-32"
                        disabled={loading}
                      />
                      <span className="text-foreground/60">to</span>
                      <Input
                        type="time"
                        value={hours.close}
                        onChange={(e) =>
                          handleBusinessHoursChange(
                            day as keyof BusinessHours,
                            "close",
                            e.target.value,
                          )
                        }
                        className="w-32"
                        disabled={loading}
                      />
                    </>
                  )}

                  {hours.closed && (
                    <span className="text-foreground/60 italic">Closed</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Optional Information */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Globe className="h-5 w-5 text-roam-blue" />
              Additional Information (Optional)
            </h3>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="businessDescription">
                  Business Description
                </Label>
                <Textarea
                  id="businessDescription"
                  placeholder="Tell customers about your business, specialties, and what makes you unique..."
                  value={formData.businessDescription}
                  onChange={handleInputChange("businessDescription")}
                  rows={4}
                  disabled={loading}
                />
                <p className="text-xs text-foreground/60">
                  This will be displayed on your public profile
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  type="url"
                  placeholder="https://yourbusiness.com"
                  value={formData.website}
                  onChange={handleInputChange("website")}
                  disabled={loading}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="instagram">Instagram</Label>
                  <Input
                    id="instagram"
                    placeholder="@yourbusiness"
                    value={formData.socialMedia?.instagram || ""}
                    onChange={handleInputChange("social.instagram")}
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="facebook">Facebook</Label>
                  <Input
                    id="facebook"
                    placeholder="facebook.com/yourbusiness"
                    value={formData.socialMedia?.facebook || ""}
                    onChange={handleInputChange("social.facebook")}
                    disabled={loading}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Information Notice */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              This information will be used to create your business profile. You
              can update most details later from your dashboard, but some
              information may require admin approval to change.
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
                Saving Business Information...
              </>
            ) : (
              "Continue to Document Upload"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
