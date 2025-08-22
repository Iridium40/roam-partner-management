import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Upload,
  Image as ImageIcon,
  X,
  CheckCircle,
  AlertCircle,
  Building,
  Globe,
  Camera,
  ArrowRight,
  Loader2,
} from "lucide-react";
import ImageUploadService, {
  IMAGE_REQUIREMENTS,
  ImageType,
} from "@/utils/imageUtils";

interface BusinessProfileData {
  businessName: string;
  detailedDescription: string;
  websiteUrl: string;
  socialMediaLinks: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    linkedin?: string;
  };
  logoUrl?: string;
  coverImageUrl?: string;
  businessCategoryRefined?: string;
}

interface BusinessProfileSetupProps {
  businessId: string;
  userId: string;
  onComplete: (data: BusinessProfileData) => void;
  onBack?: () => void;
  initialData?: Partial<BusinessProfileData>;
  className?: string;
}

interface ImageUpload {
  file: File | null;
  preview: string | null;
  uploading: boolean;
  uploaded: boolean;
  url?: string;
  error?: string;
}

export default function BusinessProfileSetup({
  businessId,
  userId,
  onComplete,
  onBack,
  initialData,
  className = "",
}: BusinessProfileSetupProps) {
  const [formData, setFormData] = useState<BusinessProfileData>({
    businessName: initialData?.businessName || "",
    detailedDescription: initialData?.detailedDescription || "",
    websiteUrl: initialData?.websiteUrl || "",
    socialMediaLinks: initialData?.socialMediaLinks || {},
    logoUrl: initialData?.logoUrl,
    coverImageUrl: initialData?.coverImageUrl,
    businessCategoryRefined: initialData?.businessCategoryRefined,
  });

  const [logoUpload, setLogoUpload] = useState<ImageUpload>({
    file: null,
    preview: null,
    uploading: false,
    uploaded: false,
  });

  const [coverUpload, setCoverUpload] = useState<ImageUpload>({
    file: null,
    preview: null,
    uploading: false,
    uploaded: false,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  // Load existing data
  useEffect(() => {
    loadExistingData();
    return () => {
      // Cleanup preview URLs
      if (logoUpload.preview)
        ImageUploadService.cleanupPreviewUrl(logoUpload.preview);
      if (coverUpload.preview)
        ImageUploadService.cleanupPreviewUrl(coverUpload.preview);
    };
  }, []);

  const loadExistingData = async () => {
    try {
      const response = await fetch(`/api/business/profile/${businessId}`);
      if (response.ok) {
        const data = await response.json();
        setFormData((prev) => ({
          ...prev,
          ...data,
        }));
      }
    } catch (error) {
      console.log("No existing business profile data found");
    }
  };

  const handleInputChange = (
    field: keyof BusinessProfileData,
    value: string,
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Clear validation error when user starts typing
    if (validationErrors[field]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleSocialMediaChange = (platform: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      socialMediaLinks: {
        ...prev.socialMediaLinks,
        [platform]: value,
      },
    }));
  };

  const handleImageSelect = async (
    event: React.ChangeEvent<HTMLInputElement>,
    imageType: "logo" | "cover",
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const uploadState = imageType === "logo" ? logoUpload : coverUpload;
    const setUploadState =
      imageType === "logo" ? setLogoUpload : setCoverUpload;
    const uploadType: ImageType =
      imageType === "logo" ? "businessLogo" : "businessCover";

    // Clean up previous preview
    if (uploadState.preview) {
      ImageUploadService.cleanupPreviewUrl(uploadState.preview);
    }

    // Validate image
    const validation = await ImageUploadService.validateImage(file, uploadType);

    if (!validation.isValid) {
      setUploadState({
        file: null,
        preview: null,
        uploading: false,
        uploaded: false,
        error: validation.errors.join(", "),
      });
      return;
    }

    // Create preview
    const preview = ImageUploadService.generatePreviewUrl(file);

    setUploadState({
      file,
      preview,
      uploading: false,
      uploaded: false,
      error:
        validation.warnings.length > 0
          ? validation.warnings.join(", ")
          : undefined,
    });
  };

  const uploadImage = async (imageType: "logo" | "cover") => {
    const uploadState = imageType === "logo" ? logoUpload : coverUpload;
    const setUploadState =
      imageType === "logo" ? setLogoUpload : setCoverUpload;
    const uploadType: ImageType =
      imageType === "logo" ? "businessLogo" : "businessCover";

    if (!uploadState.file) return;

    setUploadState((prev) => ({ ...prev, uploading: true, error: undefined }));

    try {
      const result = await ImageUploadService.uploadImage(
        uploadState.file,
        uploadType,
        businessId,
        userId,
      );

      if (result.success && result.publicUrl) {
        setUploadState((prev) => ({
          ...prev,
          uploading: false,
          uploaded: true,
          url: result.publicUrl,
        }));

        // Update form data
        const field = imageType === "logo" ? "logoUrl" : "coverImageUrl";
        setFormData((prev) => ({
          ...prev,
          [field]: result.publicUrl,
        }));
      } else {
        setUploadState((prev) => ({
          ...prev,
          uploading: false,
          error: result.error || "Upload failed",
        }));
      }
    } catch (error) {
      setUploadState((prev) => ({
        ...prev,
        uploading: false,
        error: error instanceof Error ? error.message : "Upload failed",
      }));
    }
  };

  const removeImage = (imageType: "logo" | "cover") => {
    const uploadState = imageType === "logo" ? logoUpload : coverUpload;
    const setUploadState =
      imageType === "logo" ? setLogoUpload : setCoverUpload;

    if (uploadState.preview) {
      ImageUploadService.cleanupPreviewUrl(uploadState.preview);
    }

    setUploadState({
      file: null,
      preview: null,
      uploading: false,
      uploaded: false,
    });

    // Clear from form data
    const field = imageType === "logo" ? "logoUrl" : "coverImageUrl";
    setFormData((prev) => ({
      ...prev,
      [field]: undefined,
    }));
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.businessName.trim()) {
      errors.businessName = "Business name is required";
    }

    if (!formData.detailedDescription.trim()) {
      errors.detailedDescription = "Business description is required";
    } else if (formData.detailedDescription.length < 50) {
      errors.detailedDescription =
        "Description should be at least 50 characters";
    }

    if (formData.websiteUrl && !isValidUrl(formData.websiteUrl)) {
      errors.websiteUrl = "Please enter a valid website URL";
    }

    // Validate social media URLs
    Object.entries(formData.socialMediaLinks).forEach(([platform, url]) => {
      if (url && !isValidUrl(url)) {
        errors[`social_${platform}`] = `Please enter a valid ${platform} URL`;
      }
    });

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url.startsWith("http") ? url : `https://${url}`);
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      setError("Please fix the errors above");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Upload any pending images
      if (logoUpload.file && !logoUpload.uploaded) {
        await uploadImage("logo");
      }
      if (coverUpload.file && !coverUpload.uploaded) {
        await uploadImage("cover");
      }

      // Save business profile data (temporary test endpoint)
      const response = await fetch(`/api/test-business-profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId,
          ...formData,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save business profile");
      }

      // Mark step as completed
      await fetch("/api/onboarding/save-phase2-progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_id: businessId,
          step: "business_profile",
          data: formData,
        }),
      });

      onComplete(formData);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to save business profile",
      );
    } finally {
      setLoading(false);
    }
  };

  const completionPercentage = () => {
    let completed = 0;
    const total = 6; // name, description, logo, cover, website, social

    if (formData.businessName.trim()) completed++;
    if (formData.detailedDescription.trim()) completed++;
    if (formData.logoUrl || logoUpload.uploaded) completed++;
    if (formData.coverImageUrl || coverUpload.uploaded) completed++;
    if (formData.websiteUrl.trim()) completed++;
    if (Object.values(formData.socialMediaLinks).some((url) => url?.trim()))
      completed++;

    return Math.round((completed / total) * 100);
  };

  return (
    <div className={`max-w-4xl mx-auto ${className}`}>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-roam-blue/10 rounded-full flex items-center justify-center">
              <Building className="w-6 h-6 text-roam-blue" />
            </div>
            <div>
              <CardTitle className="text-2xl text-roam-blue">
                Business Profile Setup
              </CardTitle>
              <p className="text-foreground/70">
                Complete your business branding and visual identity
              </p>
            </div>
          </div>

          {/* Progress indicator */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Profile Completion</span>
              <Badge variant="outline">
                {completionPercentage()}% Complete
              </Badge>
            </div>
            <Progress value={completionPercentage()} className="h-2" />
          </div>
        </CardHeader>

        <CardContent className="space-y-8">
          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Business Logo Upload */}
          <div className="space-y-4">
            <div>
              <Label className="text-base font-semibold">Business Logo</Label>
              <p className="text-sm text-foreground/70">
                Square logo (512x512px recommended) • Max 2MB • JPG, PNG, WebP
              </p>
            </div>

            <div className="flex items-start gap-6">
              <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50 relative overflow-hidden">
                {logoUpload.preview || formData.logoUrl ? (
                  <>
                    <img
                      src={logoUpload.preview || formData.logoUrl}
                      alt="Business Logo"
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => removeImage("logo")}
                      className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <div className="text-center">
                    <ImageIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-xs text-gray-500">Logo</p>
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-3">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() =>
                      document.getElementById("logo-upload")?.click()
                    }
                    disabled={logoUpload.uploading}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Choose Logo
                  </Button>

                  {logoUpload.file && !logoUpload.uploaded && (
                    <Button
                      onClick={() => uploadImage("logo")}
                      disabled={logoUpload.uploading}
                      className="bg-roam-blue hover:bg-roam-blue/90"
                    >
                      {logoUpload.uploading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        "Upload"
                      )}
                    </Button>
                  )}
                </div>

                {logoUpload.uploaded && (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm">Logo uploaded successfully</span>
                  </div>
                )}

                {logoUpload.error && (
                  <Alert className="border-amber-200 bg-amber-50">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    <AlertDescription className="text-amber-800">
                      {logoUpload.error}
                    </AlertDescription>
                  </Alert>
                )}

                <input
                  id="logo-upload"
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageSelect(e, "logo")}
                  className="hidden"
                />
              </div>
            </div>
          </div>

          {/* Business Cover Image */}
          <div className="space-y-4">
            <div>
              <Label className="text-base font-semibold">
                Business Cover Image
              </Label>
              <p className="text-sm text-foreground/70">
                Banner image (1200x400px recommended) • Max 5MB • JPG, PNG, WebP
              </p>
            </div>

            <div className="space-y-4">
              <div className="w-full h-48 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50 relative overflow-hidden">
                {coverUpload.preview || formData.coverImageUrl ? (
                  <>
                    <img
                      src={coverUpload.preview || formData.coverImageUrl}
                      alt="Business Cover"
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => removeImage("cover")}
                      className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </>
                ) : (
                  <div className="text-center">
                    <Camera className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">Upload cover image</p>
                    <p className="text-xs text-gray-400">
                      1200x400px recommended
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() =>
                    document.getElementById("cover-upload")?.click()
                  }
                  disabled={coverUpload.uploading}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Choose Cover Image
                </Button>

                {coverUpload.file && !coverUpload.uploaded && (
                  <Button
                    onClick={() => uploadImage("cover")}
                    disabled={coverUpload.uploading}
                    className="bg-roam-blue hover:bg-roam-blue/90"
                  >
                    {coverUpload.uploading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      "Upload"
                    )}
                  </Button>
                )}
              </div>

              {coverUpload.uploaded && (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm">
                    Cover image uploaded successfully
                  </span>
                </div>
              )}

              {coverUpload.error && (
                <Alert className="border-amber-200 bg-amber-50">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800">
                    {coverUpload.error}
                  </AlertDescription>
                </Alert>
              )}

              <input
                id="cover-upload"
                type="file"
                accept="image/*"
                onChange={(e) => handleImageSelect(e, "cover")}
                className="hidden"
              />
            </div>
          </div>

          {/* Business Information */}
          <div className="grid gap-6 md:grid-cols-2">
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="businessName" className="text-base font-semibold">
                Business Name *
              </Label>
              <Input
                id="businessName"
                value={formData.businessName}
                onChange={(e) =>
                  handleInputChange("businessName", e.target.value)
                }
                placeholder="Enter your business name"
                className={
                  validationErrors.businessName ? "border-red-500" : ""
                }
              />
              {validationErrors.businessName && (
                <p className="text-red-500 text-sm">
                  {validationErrors.businessName}
                </p>
              )}
            </div>

            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="description" className="text-base font-semibold">
                Detailed Business Description *
              </Label>
              <Textarea
                id="description"
                value={formData.detailedDescription}
                onChange={(e) =>
                  handleInputChange("detailedDescription", e.target.value)
                }
                placeholder="Describe your business, services, and what makes you unique..."
                rows={4}
                className={
                  validationErrors.detailedDescription ? "border-red-500" : ""
                }
              />
              <div className="flex justify-between text-sm">
                <span
                  className={
                    validationErrors.detailedDescription
                      ? "text-red-500"
                      : "text-foreground/70"
                  }
                >
                  {validationErrors.detailedDescription ||
                    "At least 50 characters recommended"}
                </span>
                <span className="text-foreground/50">
                  {formData.detailedDescription.length} characters
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="website" className="text-base font-semibold">
                Website URL
              </Label>
              <Input
                id="website"
                value={formData.websiteUrl}
                onChange={(e) =>
                  handleInputChange("websiteUrl", e.target.value)
                }
                placeholder="https://yourbusiness.com"
                className={validationErrors.websiteUrl ? "border-red-500" : ""}
              />
              {validationErrors.websiteUrl && (
                <p className="text-red-500 text-sm">
                  {validationErrors.websiteUrl}
                </p>
              )}
            </div>
          </div>

          {/* Social Media Links */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">
              Social Media Links
            </Label>
            <div className="grid gap-4 md:grid-cols-2">
              {[
                {
                  key: "facebook",
                  label: "Facebook",
                  placeholder: "https://facebook.com/yourbusiness",
                },
                {
                  key: "instagram",
                  label: "Instagram",
                  placeholder: "https://instagram.com/yourbusiness",
                },
                {
                  key: "twitter",
                  label: "Twitter",
                  placeholder: "https://twitter.com/yourbusiness",
                },
                {
                  key: "linkedin",
                  label: "LinkedIn",
                  placeholder: "https://linkedin.com/company/yourbusiness",
                },
              ].map(({ key, label, placeholder }) => (
                <div key={key} className="space-y-2">
                  <Label htmlFor={key}>{label}</Label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id={key}
                      value={
                        formData.socialMediaLinks[
                          key as keyof typeof formData.socialMediaLinks
                        ] || ""
                      }
                      onChange={(e) =>
                        handleSocialMediaChange(key, e.target.value)
                      }
                      placeholder={placeholder}
                      className={`pl-10 ${validationErrors[`social_${key}`] ? "border-red-500" : ""}`}
                    />
                  </div>
                  {validationErrors[`social_${key}`] && (
                    <p className="text-red-500 text-sm">
                      {validationErrors[`social_${key}`]}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between pt-6">
            {onBack && (
              <Button variant="outline" onClick={onBack}>
                Back
              </Button>
            )}

            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="bg-roam-blue hover:bg-roam-blue/90 ml-auto"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  Continue to Personal Profile
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
