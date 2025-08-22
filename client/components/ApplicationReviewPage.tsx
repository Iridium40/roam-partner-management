import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Loader2,
  CheckCircle,
  AlertCircle,
  User,
  Building,
  MapPin,
  Phone,
  Mail,
  Clock,
  FileText,
  Image,
  Star,
  Calendar,
  Shield,
  ArrowRight,
  Info,
  Eye,
} from "lucide-react";
import type { BusinessInfoFormData } from "./BusinessInfoForm";

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

interface UploadedDocument {
  id: string;
  file: File;
  type: string;
  url?: string;
  uploadProgress: number;
  status: "pending" | "uploading" | "uploaded" | "error";
  error?: string;
}

interface UserData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
}

interface ApplicationReviewData {
  userData: UserData;
  businessInfo: BusinessInfoFormData;
  documents: UploadedDocument[];
}

interface ApplicationReviewPageProps {
  applicationData: ApplicationReviewData;
  onSubmit: () => Promise<void>;
  onEdit: (section: "user" | "business" | "documents") => void;
  loading?: boolean;
  error?: string;
  serviceCategories?: ServiceCategoryDB[];
  serviceSubcategories?: ServiceSubcategoryDB[];
}

const documentTypeNames = {
  drivers_license: "Driver's License",
  proof_of_address: "Proof of Address",
  liability_insurance: "Liability Insurance",
  professional_license: "Professional License/Certification",
  professional_certificate: "Professional Certificate",
  business_license: "Business License",
};

export function ApplicationReviewPage({
  applicationData,
  onSubmit,
  onEdit,
  loading = false,
  error,
  serviceCategories = [],
  serviceSubcategories = [],
}: ApplicationReviewPageProps) {
  const [finalConsent, setFinalConsent] = useState(false);

  // Utility function to convert snake_case or underscore-separated text to CamelCase
  const toCamelCase = (text: string): string => {
    return text
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  // Helper function to get category name from ID
  const getCategoryName = (categoryId: string): string => {
    const category = serviceCategories.find(cat => cat.id === categoryId);
    if (!category) return categoryId; // fallback to ID if not found
    return category.description || toCamelCase(category.service_category_type);
  };

  // Helper function to get subcategory name from ID
  const getSubcategoryName = (subcategoryId: string): string => {
    const subcategory = serviceSubcategories.find(sub => sub.id === subcategoryId);
    if (!subcategory) return subcategoryId; // fallback to ID if not found
    return subcategory.description || toCamelCase(subcategory.service_subcategory_type);
  };
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [submissionConsent, setSubmissionConsent] = useState(false);

  const { userData, businessInfo, documents } = applicationData;

  const formatBusinessHours = (hours: any) => {
    return Object.entries(hours)
      .map(([day, time]: [string, any]) => {
        if (time.closed) {
          return `${day.charAt(0).toUpperCase() + day.slice(1)}: Closed`;
        }
        return `${day.charAt(0).toUpperCase() + day.slice(1)}: ${time.open} - ${time.close}`;
      })
      .join(", ");
  };

  const formatAddress = (address: any) => {
    const parts = [
      address.addressLine1,
      address.addressLine2,
      address.city,
      address.state,
      address.postalCode,
    ].filter(Boolean);
    return parts.join(", ");
  };

  const getUploadedDocuments = () => {
    return documents.filter((doc) => doc.status === "uploaded");
  };

  const canSubmit = () => {
    return finalConsent && termsAccepted && submissionConsent && !loading;
  };

  const handleSubmit = async () => {
    if (!canSubmit()) return;

    try {
      await onSubmit();
    } catch (submitError) {
      console.error("Application submission error:", submitError);
    }
  };

  const previewDocument = (document: UploadedDocument) => {
    if (document.url) {
      window.open(document.url, "_blank");
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-roam-blue">
            Review Your Application
          </CardTitle>
          <p className="text-foreground/70">
            Please review all information before submitting your provider
            application
          </p>
        </CardHeader>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Personal Information Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-roam-blue" />
            <CardTitle className="text-lg">Personal Information</CardTitle>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit("user")}
            disabled={loading}
          >
            Edit
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Full Name</Label>
              <p className="text-sm text-foreground/80">
                {userData.firstName} {userData.lastName}
              </p>
            </div>
            <div>
              <Label className="text-sm font-medium">Date of Birth</Label>
              <p className="text-sm text-foreground/80">
                {new Date(userData.dateOfBirth).toLocaleDateString()}
              </p>
            </div>
            <div>
              <Label className="text-sm font-medium">Email Address</Label>
              <p className="text-sm text-foreground/80 flex items-center gap-1">
                <Mail className="h-3 w-3" />
                {userData.email}
              </p>
            </div>
            <div>
              <Label className="text-sm font-medium">Phone Number</Label>
              <p className="text-sm text-foreground/80 flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {userData.phone}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Business Information Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center gap-2">
            <Building className="h-5 w-5 text-roam-blue" />
            <CardTitle className="text-lg">Business Information</CardTitle>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit("business")}
            disabled={loading}
          >
            Edit
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Business Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Business Name</Label>
              <p className="text-sm text-foreground/80">
                {businessInfo.businessName}
              </p>
            </div>
            <div>
              <Label className="text-sm font-medium">Business Type</Label>
              <p className="text-sm text-foreground/80 capitalize">
                {businessInfo.businessType.replace("_", " ")}
              </p>
            </div>
            <div>
              <Label className="text-sm font-medium">Contact Email</Label>
              <p className="text-sm text-foreground/80">
                {businessInfo.contactEmail}
              </p>
            </div>
            <div>
              <Label className="text-sm font-medium">Business Phone</Label>
              <p className="text-sm text-foreground/80">{businessInfo.phone}</p>
            </div>
            <div>
              <Label className="text-sm font-medium">Years of Experience</Label>
              <p className="text-sm text-foreground/80">
                {businessInfo.yearsExperience}
              </p>
            </div>
          </div>

          <Separator />

          {/* Business Address */}
          <div>
            <Label className="text-sm font-medium flex items-center gap-1 mb-2">
              <MapPin className="h-3 w-3" />
              Business Address
            </Label>
            <p className="text-sm text-foreground/80">
              {formatAddress(businessInfo.businessAddress)}
            </p>
          </div>

          <Separator />

          {/* Service Categories */}
          <div>
            <Label className="text-sm font-medium flex items-center gap-1 mb-2">
              <Star className="h-3 w-3" />
              Service Categories
            </Label>
            <div className="flex flex-wrap gap-2">
              {businessInfo.serviceCategories.map((categoryId) => (
                <Badge key={categoryId} variant="outline">
                  {getCategoryName(categoryId)}
                </Badge>
              ))}
            </div>
          </div>

          {/* Service Subcategories */}
          {businessInfo.serviceSubcategories.length > 0 && (
            <div>
              <Label className="text-sm font-medium mb-2">
                Specific Services
              </Label>
              <div className="flex flex-wrap gap-2">
                {businessInfo.serviceSubcategories.map((subcategoryId) => (
                  <Badge key={subcategoryId} variant="secondary">
                    {getSubcategoryName(subcategoryId)}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Business Hours */}
          <div>
            <Label className="text-sm font-medium flex items-center gap-1 mb-2">
              <Clock className="h-3 w-3" />
              Business Hours
            </Label>
            <div className="text-sm text-foreground/80 space-y-1">
              {Object.entries(businessInfo.businessHours).map(
                ([day, hours]: [string, any]) => (
                  <div key={day} className="flex justify-between">
                    <span className="capitalize font-medium">{day}:</span>
                    <span>
                      {hours.closed
                        ? "Closed"
                        : `${hours.open} - ${hours.close}`}
                    </span>
                  </div>
                ),
              )}
            </div>
          </div>

          {/* Optional Information */}
          {(businessInfo.businessDescription ||
            businessInfo.website ||
            businessInfo.socialMedia?.instagram ||
            businessInfo.socialMedia?.facebook) && (
            <>
              <Separator />
              <div className="space-y-3">
                {businessInfo.businessDescription && (
                  <div>
                    <Label className="text-sm font-medium">
                      Business Description
                    </Label>
                    <p className="text-sm text-foreground/80">
                      {businessInfo.businessDescription}
                    </p>
                  </div>
                )}
                {businessInfo.website && (
                  <div>
                    <Label className="text-sm font-medium">Website</Label>
                    <p className="text-sm text-foreground/80">
                      {businessInfo.website}
                    </p>
                  </div>
                )}
                {(businessInfo.socialMedia?.instagram ||
                  businessInfo.socialMedia?.facebook) && (
                  <div>
                    <Label className="text-sm font-medium">Social Media</Label>
                    <div className="text-sm text-foreground/80 space-y-1">
                      {businessInfo.socialMedia?.instagram && (
                        <p>Instagram: {businessInfo.socialMedia.instagram}</p>
                      )}
                      {businessInfo.socialMedia?.facebook && (
                        <p>Facebook: {businessInfo.socialMedia.facebook}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Documents Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-roam-blue" />
            <CardTitle className="text-lg">Uploaded Documents</CardTitle>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit("documents")}
            disabled={loading}
          >
            Edit
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {getUploadedDocuments().map((document) => (
              <div
                key={document.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {document.type.includes("headshot") ? (
                    <Image className="h-5 w-5 text-roam-blue" />
                  ) : (
                    <FileText className="h-5 w-5 text-roam-blue" />
                  )}
                  <div>
                    <p className="font-medium">
                      {documentTypeNames[
                        document.type as keyof typeof documentTypeNames
                      ] || document.type}
                    </p>
                    <p className="text-xs text-foreground/60">
                      {document.file.name}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className="text-green-700 border-green-300"
                  >
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Uploaded
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => previewDocument(document)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}

            {getUploadedDocuments().length === 0 && (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-foreground/60">No documents uploaded yet</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Final Consent and Terms */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5 text-roam-blue" />
            Final Agreements
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Information Notice */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>What happens after submission:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>
                  Background check and document verification (2-3 business days)
                </li>
                <li>Admin review of your application (1-2 business days)</li>
                <li>Email notification with secure link for Phase 2 setup</li>
                <li>
                  Identity verification and financial setup (Stripe & Plaid)
                </li>
              </ul>
            </AlertDescription>
          </Alert>

          {/* Consent Checkboxes */}
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <Checkbox
                id="finalConsent"
                checked={finalConsent}
                onCheckedChange={(checked) =>
                  setFinalConsent(checked as boolean)
                }
                disabled={loading}
              />
              <Label
                htmlFor="finalConsent"
                className="text-sm leading-relaxed cursor-pointer"
              >
                I confirm that all information provided in this application is
                accurate and complete. I understand that providing false
                information may result in application rejection or account
                termination.
              </Label>
            </div>

            <div className="flex items-start space-x-3">
              <Checkbox
                id="termsAccepted"
                checked={termsAccepted}
                onCheckedChange={(checked) =>
                  setTermsAccepted(checked as boolean)
                }
                disabled={loading}
              />
              <Label
                htmlFor="termsAccepted"
                className="text-sm leading-relaxed cursor-pointer"
              >
                I agree to the ROAM{" "}
                <Button
                  variant="link"
                  className="p-0 h-auto text-roam-blue underline"
                >
                  Terms of Service
                </Button>
                ,{" "}
                <Button
                  variant="link"
                  className="p-0 h-auto text-roam-blue underline"
                >
                  Privacy Policy
                </Button>
                , and{" "}
                <Button
                  variant="link"
                  className="p-0 h-auto text-roam-blue underline"
                >
                  Provider Agreement
                </Button>
                .
              </Label>
            </div>

            <div className="flex items-start space-x-3">
              <Checkbox
                id="submissionConsent"
                checked={submissionConsent}
                onCheckedChange={(checked) =>
                  setSubmissionConsent(checked as boolean)
                }
                disabled={loading}
              />
              <Label
                htmlFor="submissionConsent"
                className="text-sm leading-relaxed cursor-pointer"
              >
                I consent to background checks, identity verification, and
                understand that my application will be reviewed by ROAM
                administrators. I agree to provide additional documentation if
                requested during the review process.
              </Label>
            </div>
          </div>

          {/* Timeline Information */}
          <Alert>
            <Calendar className="h-4 w-4" />
            <AlertDescription>
              <strong>Expected Timeline:</strong> Most applications are
              processed within 3-5 business days. You'll receive email updates
              at each stage of the review process.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Submit Button */}
      <Card>
        <CardContent className="pt-6">
          <Button
            onClick={handleSubmit}
            className="w-full bg-roam-blue hover:bg-roam-blue/90"
            disabled={!canSubmit()}
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting Application...
              </>
            ) : (
              <>
                Submit Application
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>

          <p className="text-center text-sm text-foreground/60 mt-4">
            By submitting this application, you're taking the first step to join
            the ROAM provider network.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
