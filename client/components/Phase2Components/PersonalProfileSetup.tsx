import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Upload,
  Image as ImageIcon,
  X,
  CheckCircle,
  AlertCircle,
  User,
  Globe,
  Camera,
  ArrowRight,
  Loader2,
  Award,
  GraduationCap,
  Plus,
  Trash2
} from 'lucide-react';
import ImageUploadService, { ImageType } from '@/utils/imageUtils';

interface PersonalProfileData {
  professionalTitle: string;
  professionalBio: string;
  yearsExperience: number;
  specialties: string[];
  certifications: Array<{
    id: string;
    name: string;
    issuer: string;
    year: number;
    expiryYear?: number;
  }>;
  education: Array<{
    id: string;
    degree: string;
    institution: string;
    year: number;
  }>;
  awards: Array<{
    id: string;
    name: string;
    issuer: string;
    year: number;
  }>;
  socialLinks: {
    linkedin?: string;
    twitter?: string;
    instagram?: string;
    website?: string;
  };
  avatarUrl?: string;
  coverImageUrl?: string;
}

interface PersonalProfileSetupProps {
  businessId: string;
  userId: string;
  onComplete: (data: PersonalProfileData) => void;
  onBack?: () => void;
  initialData?: Partial<PersonalProfileData>;
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

export default function PersonalProfileSetup({
  businessId,
  userId,
  onComplete,
  onBack,
  initialData,
  className = ""
}: PersonalProfileSetupProps) {
  const [formData, setFormData] = useState<PersonalProfileData>({
    professionalTitle: initialData?.professionalTitle || '',
    professionalBio: initialData?.professionalBio || '',
    yearsExperience: initialData?.yearsExperience || 0,
    specialties: initialData?.specialties || [],
    certifications: initialData?.certifications || [],
    education: initialData?.education || [],
    awards: initialData?.awards || [],
    socialLinks: initialData?.socialLinks || {},
    avatarUrl: initialData?.avatarUrl,
    coverImageUrl: initialData?.coverImageUrl
  });

  const [avatarUpload, setAvatarUpload] = useState<ImageUpload>({
    file: null,
    preview: null,
    uploading: false,
    uploaded: false
  });

  const [coverUpload, setCoverUpload] = useState<ImageUpload>({
    file: null,
    preview: null,
    uploading: false,
    uploaded: false
  });

  const [newSpecialty, setNewSpecialty] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Load existing data
  useEffect(() => {
    loadExistingData();
    return () => {
      // Cleanup preview URLs
      if (avatarUpload.preview) ImageUploadService.cleanupPreviewUrl(avatarUpload.preview);
      if (coverUpload.preview) ImageUploadService.cleanupPreviewUrl(coverUpload.preview);
    };
  }, []);

  const loadExistingData = async () => {
    try {
      const response = await fetch(`/api/provider/profile/${userId}`);
      if (response.ok) {
        const data = await response.json();
        setFormData(prev => ({
          ...prev,
          ...data
        }));
      }
    } catch (error) {
      console.log('No existing personal profile data found');
    }
  };

  const handleInputChange = (field: keyof PersonalProfileData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear validation error when user starts typing
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleSocialLinkChange = (platform: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      socialLinks: {
        ...prev.socialLinks,
        [platform]: value
      }
    }));
  };

  const addSpecialty = () => {
    if (newSpecialty.trim() && !formData.specialties.includes(newSpecialty.trim())) {
      setFormData(prev => ({
        ...prev,
        specialties: [...prev.specialties, newSpecialty.trim()]
      }));
      setNewSpecialty('');
    }
  };

  const removeSpecialty = (specialty: string) => {
    setFormData(prev => ({
      ...prev,
      specialties: prev.specialties.filter(s => s !== specialty)
    }));
  };

  const addCertification = () => {
    const newCert = {
      id: Date.now().toString(),
      name: '',
      issuer: '',
      year: new Date().getFullYear()
    };
    setFormData(prev => ({
      ...prev,
      certifications: [...prev.certifications, newCert]
    }));
  };

  const updateCertification = (id: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      certifications: prev.certifications.map(cert => 
        cert.id === id ? { ...cert, [field]: value } : cert
      )
    }));
  };

  const removeCertification = (id: string) => {
    setFormData(prev => ({
      ...prev,
      certifications: prev.certifications.filter(cert => cert.id !== id)
    }));
  };

  const addEducation = () => {
    const newEdu = {
      id: Date.now().toString(),
      degree: '',
      institution: '',
      year: new Date().getFullYear()
    };
    setFormData(prev => ({
      ...prev,
      education: [...prev.education, newEdu]
    }));
  };

  const updateEducation = (id: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      education: prev.education.map(edu => 
        edu.id === id ? { ...edu, [field]: value } : edu
      )
    }));
  };

  const removeEducation = (id: string) => {
    setFormData(prev => ({
      ...prev,
      education: prev.education.filter(edu => edu.id !== id)
    }));
  };

  const handleImageSelect = async (
    event: React.ChangeEvent<HTMLInputElement>,
    imageType: 'avatar' | 'cover'
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const uploadState = imageType === 'avatar' ? avatarUpload : coverUpload;
    const setUploadState = imageType === 'avatar' ? setAvatarUpload : setCoverUpload;
    const uploadType: ImageType = imageType === 'avatar' ? 'personalAvatar' : 'personalCover';

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
        error: validation.errors.join(', ')
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
      error: validation.warnings.length > 0 ? validation.warnings.join(', ') : undefined
    });
  };

  const uploadImage = async (imageType: 'avatar' | 'cover') => {
    const uploadState = imageType === 'avatar' ? avatarUpload : coverUpload;
    const setUploadState = imageType === 'avatar' ? setAvatarUpload : setCoverUpload;
    const uploadType: ImageType = imageType === 'avatar' ? 'personalAvatar' : 'personalCover';

    if (!uploadState.file) return;

    setUploadState(prev => ({ ...prev, uploading: true, error: undefined }));

    try {
      const result = await ImageUploadService.uploadImage(
        uploadState.file,
        uploadType,
        businessId,
        userId
      );

      if (result.success && result.publicUrl) {
        setUploadState(prev => ({
          ...prev,
          uploading: false,
          uploaded: true,
          url: result.publicUrl
        }));

        // Update form data
        const field = imageType === 'avatar' ? 'avatarUrl' : 'coverImageUrl';
        setFormData(prev => ({
          ...prev,
          [field]: result.publicUrl
        }));
      } else {
        setUploadState(prev => ({
          ...prev,
          uploading: false,
          error: result.error || 'Upload failed'
        }));
      }
    } catch (error) {
      setUploadState(prev => ({
        ...prev,
        uploading: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      }));
    }
  };

  const removeImage = (imageType: 'avatar' | 'cover') => {
    const uploadState = imageType === 'avatar' ? avatarUpload : coverUpload;
    const setUploadState = imageType === 'avatar' ? setAvatarUpload : setCoverUpload;

    if (uploadState.preview) {
      ImageUploadService.cleanupPreviewUrl(uploadState.preview);
    }

    setUploadState({
      file: null,
      preview: null,
      uploading: false,
      uploaded: false
    });

    // Clear from form data
    const field = imageType === 'avatar' ? 'avatarUrl' : 'coverImageUrl';
    setFormData(prev => ({
      ...prev,
      [field]: undefined
    }));
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.professionalTitle.trim()) {
      errors.professionalTitle = 'Professional title is required';
    }

    if (!formData.professionalBio.trim()) {
      errors.professionalBio = 'Professional bio is required';
    } else if (formData.professionalBio.length < 100) {
      errors.professionalBio = 'Bio should be at least 100 characters';
    }

    if (formData.yearsExperience < 0 || formData.yearsExperience > 50) {
      errors.yearsExperience = 'Please enter valid years of experience (0-50)';
    }

    // Validate social media URLs
    Object.entries(formData.socialLinks).forEach(([platform, url]) => {
      if (url && !isValidUrl(url)) {
        errors[`social_${platform}`] = `Please enter a valid ${platform} URL`;
      }
    });

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url.startsWith('http') ? url : `https://${url}`);
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      setError('Please fix the errors above');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Upload any pending images
      if (avatarUpload.file && !avatarUpload.uploaded) {
        await uploadImage('avatar');
      }
      if (coverUpload.file && !coverUpload.uploaded) {
        await uploadImage('cover');
      }

      // Save personal profile data
      const response = await fetch(`/api/provider/profile/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          businessId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save personal profile');
      }

      // Mark step as completed
      await fetch('/api/onboarding/save-phase2-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_id: businessId,
          step: 'personal_profile',
          data: formData
        })
      });

      onComplete(formData);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to save personal profile');
    } finally {
      setLoading(false);
    }
  };

  const completionPercentage = () => {
    let completed = 0;
    const total = 7; // title, bio, experience, avatar, cover, specialties, certifications

    if (formData.professionalTitle.trim()) completed++;
    if (formData.professionalBio.trim()) completed++;
    if (formData.yearsExperience > 0) completed++;
    if (formData.avatarUrl || avatarUpload.uploaded) completed++;
    if (formData.coverImageUrl || coverUpload.uploaded) completed++;
    if (formData.specialties.length > 0) completed++;
    if (formData.certifications.length > 0) completed++;

    return Math.round((completed / total) * 100);
  };

  return (
    <div className={`max-w-4xl mx-auto ${className}`}>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-roam-blue/10 rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-roam-blue" />
            </div>
            <div>
              <CardTitle className="text-2xl text-roam-blue">Personal Profile Setup</CardTitle>
              <p className="text-foreground/70">Build your professional presence and showcase your expertise</p>
            </div>
          </div>

          {/* Progress indicator */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Profile Completion</span>
              <Badge variant="outline">{completionPercentage()}% Complete</Badge>
            </div>
            <Progress value={completionPercentage()} className="h-2" />
          </div>
        </CardHeader>

        <CardContent className="space-y-8">
          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">{error}</AlertDescription>
            </Alert>
          )}

          {/* Profile Photos */}
          <div className="grid gap-8 md:grid-cols-2">
            {/* Avatar Upload */}
            <div className="space-y-4">
              <div>
                <Label className="text-base font-semibold">Professional Avatar</Label>
                <p className="text-sm text-foreground/70">
                  Square photo (400x400px) • Max 1MB • JPG, PNG, WebP
                </p>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-full flex items-center justify-center bg-gray-50 relative overflow-hidden">
                  {avatarUpload.preview || formData.avatarUrl ? (
                    <>
                      <img
                        src={avatarUpload.preview || formData.avatarUrl}
                        alt="Avatar"
                        className="w-full h-full object-cover rounded-full"
                      />
                      <button
                        onClick={() => removeImage('avatar')}
                        className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <User className="w-8 h-8 text-gray-400" />
                  )}
                </div>

                <div className="flex-1 space-y-2">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById('avatar-upload')?.click()}
                      disabled={avatarUpload.uploading}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Choose Photo
                    </Button>
                    
                    {avatarUpload.file && !avatarUpload.uploaded && (
                      <Button
                        size="sm"
                        onClick={() => uploadImage('avatar')}
                        disabled={avatarUpload.uploading}
                        className="bg-roam-blue hover:bg-roam-blue/90"
                      >
                        {avatarUpload.uploading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          'Upload'
                        )}
                      </Button>
                    )}
                  </div>

                  {avatarUpload.uploaded && (
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-sm">Uploaded</span>
                    </div>
                  )}

                  {avatarUpload.error && (
                    <p className="text-red-500 text-xs">{avatarUpload.error}</p>
                  )}

                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageSelect(e, 'avatar')}
                    className="hidden"
                  />
                </div>
              </div>
            </div>

            {/* Cover Upload */}
            <div className="space-y-4">
              <div>
                <Label className="text-base font-semibold">Personal Cover Image</Label>
                <p className="text-sm text-foreground/70">
                  Banner (1200x400px) • Max 3MB • JPG, PNG, WebP
                </p>
              </div>

              <div className="space-y-3">
                <div className="w-full h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50 relative overflow-hidden">
                  {coverUpload.preview || formData.coverImageUrl ? (
                    <>
                      <img
                        src={coverUpload.preview || formData.coverImageUrl}
                        alt="Cover"
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={() => removeImage('cover')}
                        className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <Camera className="w-6 h-6 text-gray-400" />
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('cover-upload')?.click()}
                    disabled={coverUpload.uploading}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Choose Cover
                  </Button>
                  
                  {coverUpload.file && !coverUpload.uploaded && (
                    <Button
                      size="sm"
                      onClick={() => uploadImage('cover')}
                      disabled={coverUpload.uploading}
                      className="bg-roam-blue hover:bg-roam-blue/90"
                    >
                      {coverUpload.uploading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        'Upload'
                      )}
                    </Button>
                  )}
                </div>

                {coverUpload.uploaded && (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm">Cover uploaded</span>
                  </div>
                )}

                {coverUpload.error && (
                  <p className="text-red-500 text-xs">{coverUpload.error}</p>
                )}

                <input
                  id="cover-upload"
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageSelect(e, 'cover')}
                  className="hidden"
                />
              </div>
            </div>
          </div>

          {/* Basic Information */}
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-base font-semibold">
                Professional Title *
              </Label>
              <Input
                id="title"
                value={formData.professionalTitle}
                onChange={(e) => handleInputChange('professionalTitle', e.target.value)}
                placeholder="e.g., Licensed Massage Therapist, Certified Yoga Instructor"
                className={validationErrors.professionalTitle ? 'border-red-500' : ''}
              />
              {validationErrors.professionalTitle && (
                <p className="text-red-500 text-sm">{validationErrors.professionalTitle}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="experience" className="text-base font-semibold">
                Years of Experience *
              </Label>
              <Input
                id="experience"
                type="number"
                min="0"
                max="50"
                value={formData.yearsExperience}
                onChange={(e) => handleInputChange('yearsExperience', parseInt(e.target.value) || 0)}
                placeholder="5"
                className={validationErrors.yearsExperience ? 'border-red-500' : ''}
              />
              {validationErrors.yearsExperience && (
                <p className="text-red-500 text-sm">{validationErrors.yearsExperience}</p>
              )}
            </div>
          </div>

          {/* Professional Bio */}
          <div className="space-y-2">
            <Label htmlFor="bio" className="text-base font-semibold">
              Professional Bio *
            </Label>
            <Textarea
              id="bio"
              value={formData.professionalBio}
              onChange={(e) => handleInputChange('professionalBio', e.target.value)}
              placeholder="Tell clients about your background, training, philosophy, and what makes your approach unique..."
              rows={5}
              className={validationErrors.professionalBio ? 'border-red-500' : ''}
            />
            <div className="flex justify-between text-sm">
              <span className={validationErrors.professionalBio ? 'text-red-500' : 'text-foreground/70'}>
                {validationErrors.professionalBio || 'At least 100 characters recommended'}
              </span>
              <span className="text-foreground/50">
                {formData.professionalBio.length} characters
              </span>
            </div>
          </div>

          {/* Specialties */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Specialties & Skills</Label>
            <div className="flex gap-2">
              <Input
                value={newSpecialty}
                onChange={(e) => setNewSpecialty(e.target.value)}
                placeholder="Add a specialty (e.g., Deep Tissue, Swedish, Hot Stone)"
                onKeyPress={(e) => e.key === 'Enter' && addSpecialty()}
              />
              <Button
                type="button"
                onClick={addSpecialty}
                variant="outline"
                disabled={!newSpecialty.trim()}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            
            {formData.specialties.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.specialties.map((specialty, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-1">
                    {specialty}
                    <button
                      onClick={() => removeSpecialty(specialty)}
                      className="ml-1 hover:text-red-500"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Certifications */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Certifications</Label>
              <Button
                type="button"
                onClick={addCertification}
                variant="outline"
                size="sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Certification
              </Button>
            </div>
            
            {formData.certifications.map((cert) => (
              <Card key={cert.id} className="p-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <Label>Certification Name</Label>
                    <Input
                      value={cert.name}
                      onChange={(e) => updateCertification(cert.id, 'name', e.target.value)}
                      placeholder="Certificate Name"
                    />
                  </div>
                  <div>
                    <Label>Issuing Organization</Label>
                    <Input
                      value={cert.issuer}
                      onChange={(e) => updateCertification(cert.id, 'issuer', e.target.value)}
                      placeholder="Organization"
                    />
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Label>Year</Label>
                      <Input
                        type="number"
                        value={cert.year}
                        onChange={(e) => updateCertification(cert.id, 'year', parseInt(e.target.value))}
                        placeholder="2023"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeCertification(cert.id)}
                      className="self-end text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Education */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Education</Label>
              <Button
                type="button"
                onClick={addEducation}
                variant="outline"
                size="sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Education
              </Button>
            </div>
            
            {formData.education.map((edu) => (
              <Card key={edu.id} className="p-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <Label>Degree/Program</Label>
                    <Input
                      value={edu.degree}
                      onChange={(e) => updateEducation(edu.id, 'degree', e.target.value)}
                      placeholder="Degree or Program"
                    />
                  </div>
                  <div>
                    <Label>Institution</Label>
                    <Input
                      value={edu.institution}
                      onChange={(e) => updateEducation(edu.id, 'institution', e.target.value)}
                      placeholder="School or Institution"
                    />
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Label>Year</Label>
                      <Input
                        type="number"
                        value={edu.year}
                        onChange={(e) => updateEducation(edu.id, 'year', parseInt(e.target.value))}
                        placeholder="2023"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeEducation(edu.id)}
                      className="self-end text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Professional Social Links */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Professional Social Links</Label>
            <div className="grid gap-4 md:grid-cols-2">
              {[
                { key: 'linkedin', label: 'LinkedIn', placeholder: 'https://linkedin.com/in/yourprofile' },
                { key: 'website', label: 'Personal Website', placeholder: 'https://yourwebsite.com' },
                { key: 'twitter', label: 'Twitter', placeholder: 'https://twitter.com/yourhandle' },
                { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/yourhandle' }
              ].map(({ key, label, placeholder }) => (
                <div key={key} className="space-y-2">
                  <Label htmlFor={key}>{label}</Label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id={key}
                      value={formData.socialLinks[key as keyof typeof formData.socialLinks] || ''}
                      onChange={(e) => handleSocialLinkChange(key, e.target.value)}
                      placeholder={placeholder}
                      className={`pl-10 ${validationErrors[`social_${key}`] ? 'border-red-500' : ''}`}
                    />
                  </div>
                  {validationErrors[`social_${key}`] && (
                    <p className="text-red-500 text-sm">{validationErrors[`social_${key}`]}</p>
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
                  Continue to Business Hours
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
