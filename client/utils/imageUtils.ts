import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_PUBLIC_SUPABASE_URL!,
  import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY!
);

export interface ImageUploadRequirements {
  maxWidth: number;
  maxHeight: number;
  aspectRatio?: number; // width/height ratio
  maxSize: number; // in bytes
  formats: string[];
  purpose: string;
}

export const IMAGE_REQUIREMENTS = {
  businessLogo: {
    maxWidth: 512,
    maxHeight: 512,
    aspectRatio: 1, // Square
    maxSize: 2 * 1024 * 1024, // 2MB
    formats: ['jpg', 'jpeg', 'png', 'webp'],
    purpose: 'Square logo for profile and search results'
  },
  businessCover: {
    maxWidth: 1200,
    maxHeight: 400,
    aspectRatio: 3, // 3:1 ratio
    maxSize: 5 * 1024 * 1024, // 5MB
    formats: ['jpg', 'jpeg', 'png', 'webp'],
    purpose: 'Banner image for business profile page'
  },
  personalAvatar: {
    maxWidth: 400,
    maxHeight: 400,
    aspectRatio: 1, // Square
    maxSize: 1 * 1024 * 1024, // 1MB
    formats: ['jpg', 'jpeg', 'png', 'webp'],
    purpose: 'Provider headshot for booking interface'
  },
  personalCover: {
    maxWidth: 1200,
    maxHeight: 400,
    aspectRatio: 3, // 3:1 ratio
    maxSize: 3 * 1024 * 1024, // 3MB
    formats: ['jpg', 'jpeg', 'png', 'webp'],
    purpose: 'Personal profile banner'
  },
  staffPhoto: {
    maxWidth: 300,
    maxHeight: 300,
    aspectRatio: 1, // Square
    maxSize: 1 * 1024 * 1024, // 1MB
    formats: ['jpg', 'jpeg', 'png', 'webp'],
    purpose: 'Staff member photo'
  }
} as const;

export type ImageType = keyof typeof IMAGE_REQUIREMENTS;

export interface ImageValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ImageUploadResult {
  success: boolean;
  url?: string;
  error?: string;
  publicUrl?: string;
}

export class ImageUploadService {
  /**
   * Validate image file against requirements
   */
  static validateImage(file: File, imageType: ImageType): Promise<ImageValidationResult> {
    return new Promise((resolve) => {
      const requirements = IMAGE_REQUIREMENTS[imageType];
      const errors: string[] = [];
      const warnings: string[] = [];

      // Check file size
      if (file.size > requirements.maxSize) {
        errors.push(`File size (${this.formatFileSize(file.size)}) exceeds maximum allowed (${this.formatFileSize(requirements.maxSize)})`);
      }

      // Check file format
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      if (!fileExtension || !requirements.formats.includes(fileExtension)) {
        errors.push(`File format not supported. Allowed formats: ${requirements.formats.join(', ')}`);
      }

      // Check image dimensions and aspect ratio
      const img = new Image();
      img.onload = () => {
        // Check dimensions
        if (img.width > requirements.maxWidth || img.height > requirements.maxHeight) {
          warnings.push(`Image will be resized from ${img.width}x${img.height} to fit ${requirements.maxWidth}x${requirements.maxHeight}`);
        }

        // Check aspect ratio
        if (requirements.aspectRatio) {
          const actualRatio = img.width / img.height;
          const expectedRatio = requirements.aspectRatio;
          const tolerance = 0.1;
          
          if (Math.abs(actualRatio - expectedRatio) > tolerance) {
            warnings.push(`Image aspect ratio (${actualRatio.toFixed(2)}:1) differs from recommended (${expectedRatio}:1). Image may be cropped.`);
          }
        }

        resolve({
          isValid: errors.length === 0,
          errors,
          warnings
        });
      };

      img.onerror = () => {
        errors.push('Invalid image file');
        resolve({
          isValid: false,
          errors,
          warnings
        });
      };

      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Resize and optimize image
   */
  static resizeImage(file: File, imageType: ImageType): Promise<File> {
    return new Promise((resolve, reject) => {
      const requirements = IMAGE_REQUIREMENTS[imageType];
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = this.calculateDimensions(
          img.width,
          img.height,
          requirements.maxWidth,
          requirements.maxHeight,
          requirements.aspectRatio
        );

        canvas.width = width;
        canvas.height = height;

        // Draw and resize image
        ctx?.drawImage(img, 0, 0, width, height);

        // Convert to blob with optimization
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const optimizedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now()
              });
              resolve(optimizedFile);
            } else {
              reject(new Error('Failed to optimize image'));
            }
          },
          'image/jpeg',
          0.9 // 90% quality
        );
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Upload image to Supabase storage
   */
  static async uploadImage(
    file: File,
    imageType: ImageType,
    businessId: string,
    userId?: string
  ): Promise<ImageUploadResult> {
    try {
      // Validate image first
      const validation = await this.validateImage(file, imageType);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.errors.join(', ')
        };
      }

      // Resize if needed
      const optimizedFile = await this.resizeImage(file, imageType);

      // Generate unique filename
      const fileExtension = optimizedFile.name.split('.').pop() || 'jpg';
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2);
      const fileName = `${imageType}_${businessId}_${timestamp}_${randomId}.${fileExtension}`;

      // Determine storage path
      const storagePath = this.getStoragePath(imageType, businessId, userId);
      const fullPath = `${storagePath}/${fileName}`;

      // Upload to Supabase storage
      const { data, error } = await supabase.storage
        .from('business-images')
        .upload(fullPath, optimizedFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Storage upload error:', error);
        return {
          success: false,
          error: `Upload failed: ${error.message}`
        };
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('business-images')
        .getPublicUrl(fullPath);

      return {
        success: true,
        url: fullPath,
        publicUrl: urlData.publicUrl
      };

    } catch (error) {
      console.error('Image upload error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      };
    }
  }

  /**
   * Delete image from storage
   */
  static async deleteImage(imagePath: string): Promise<boolean> {
    try {
      const { error } = await supabase.storage
        .from('business-images')
        .remove([imagePath]);

      if (error) {
        console.error('Failed to delete image:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Delete image error:', error);
      return false;
    }
  }

  /**
   * Get storage path for image type
   */
  private static getStoragePath(imageType: ImageType, businessId: string, userId?: string): string {
    switch (imageType) {
      case 'businessLogo':
      case 'businessCover':
        return `businesses/${businessId}`;
      case 'personalAvatar':
      case 'personalCover':
        return `providers/${userId || businessId}`;
      case 'staffPhoto':
        return `businesses/${businessId}/staff`;
      default:
        return `businesses/${businessId}/misc`;
    }
  }

  /**
   * Calculate optimal dimensions
   */
  private static calculateDimensions(
    originalWidth: number,
    originalHeight: number,
    maxWidth: number,
    maxHeight: number,
    aspectRatio?: number
  ): { width: number; height: number } {
    let width = originalWidth;
    let height = originalHeight;

    // If aspect ratio is specified, crop/pad to match
    if (aspectRatio) {
      const currentRatio = width / height;
      
      if (currentRatio > aspectRatio) {
        // Too wide, crop width
        width = height * aspectRatio;
      } else if (currentRatio < aspectRatio) {
        // Too tall, crop height
        height = width / aspectRatio;
      }
    }

    // Scale down if needed
    if (width > maxWidth || height > maxHeight) {
      const scaleX = maxWidth / width;
      const scaleY = maxHeight / height;
      const scale = Math.min(scaleX, scaleY);
      
      width = Math.round(width * scale);
      height = Math.round(height * scale);
    }

    return { width, height };
  }

  /**
   * Format file size for display
   */
  private static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Generate image preview URL
   */
  static generatePreviewUrl(file: File): string {
    return URL.createObjectURL(file);
  }

  /**
   * Cleanup preview URL
   */
  static cleanupPreviewUrl(url: string): void {
    URL.revokeObjectURL(url);
  }
}

export default ImageUploadService;
