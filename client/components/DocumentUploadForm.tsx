import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Upload,
  FileText,
  Image,
  Camera,
  CheckCircle,
  AlertCircle,
  X,
  Eye,
  Shield,
  Info,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { BusinessDocumentType } from "@/lib/database.types";

interface UploadedDocument {
  id: string;
  file: File;
  type: DocumentType;
  url?: string;
  uploadProgress: number;
  status: "pending" | "uploading" | "uploaded" | "error";
  error?: string;
}

type DocumentType = BusinessDocumentType;

interface RequiredDocuments {
  drivers_license: boolean;
  proof_of_address: boolean;
  liability_insurance: boolean;
  professional_license: boolean;
  professional_certificate: boolean;
  business_license: boolean;
}

interface DocumentUploadFormProps {
  onSubmit: (documents: UploadedDocument[]) => Promise<void>;
  loading?: boolean;
  error?: string;
  businessType?: string;
  userId: string;
  businessId?: string;
}

const documentRequirements = {
  drivers_license: {
    title: "Driver's License",
    description: "Government-issued photo identification",
    required: true,
    acceptedFormats: [".pdf", ".jpg", ".jpeg", ".png"],
    maxSize: 5, // MB
    examples: ["Driver's License", "State ID", "Passport"],
  },
  proof_of_address: {
    title: "Proof of Address",
    description: "Recent utility bill or lease agreement",
    required: true,
    acceptedFormats: [".pdf", ".jpg", ".jpeg", ".png"],
    maxSize: 5, // MB
    examples: ["Utility Bill", "Lease Agreement", "Bank Statement"],
  },
  liability_insurance: {
    title: "Liability Insurance",
    description: "Professional liability insurance certificate",
    required: false,
    acceptedFormats: [".pdf", ".jpg", ".jpeg", ".png"],
    maxSize: 5, // MB
    examples: [
      "General Liability",
      "Professional Indemnity",
      "Malpractice Insurance",
    ],
  },
  professional_license: {
    title: "Professional License/Certification",
    description:
      "Your professional license, certification, or training credentials",
    required: true,
    acceptedFormats: [".pdf", ".jpg", ".jpeg", ".png"],
    maxSize: 5, // MB
    examples: [
      "Massage License",
      "Cosmetology License",
      "Personal Trainer Certification",
    ],
  },
  professional_certificate: {
    title: "Professional Certificate",
    description: "Professional certification or clear headshot photo",
    required: true,
    acceptedFormats: [".jpg", ".jpeg", ".png", ".pdf"],
    maxSize: 2, // MB
    examples: [
      "Professional certificate",
      "Professional headshot",
      "Business portrait",
    ],
  },
  business_license: {
    title: "Business License",
    description: "Business registration or operating license (if applicable)",
    required: false,
    acceptedFormats: [".pdf", ".jpg", ".jpeg", ".png"],
    maxSize: 5, // MB
    examples: ["Business Registration", "DBA Certificate", "Operating License"],
  },
};

export function DocumentUploadForm({
  onSubmit,
  loading = false,
  error,
  businessType,
  userId,
  businessId,
}: DocumentUploadFormProps) {
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [dragOver, setDragOver] = useState<DocumentType | null>(null);
  const [uploadingCount, setUploadingCount] = useState(0);
  const fileInputRefs = useRef<Record<DocumentType, HTMLInputElement | null>>(
    {} as any,
  );

  // Determine which documents are required based on business type
  const getRequiredDocuments = (): RequiredDocuments => {
    const base: RequiredDocuments = {
      drivers_license: true,
      proof_of_address: true,
      liability_insurance: false,
      professional_license: true,
      professional_certificate: true,
      business_license: false,
    };

    // Business entities typically need business license
    if (businessType && businessType !== "sole_proprietorship") {
      base.business_license = true;
    }

    return base;
  };

  const requiredDocs = getRequiredDocuments();

  const validateFile = (
    file: File,
    documentType: DocumentType,
  ): string | null => {
    const requirements = documentRequirements[documentType];

    // Check file size
    const maxSizeBytes = requirements.maxSize * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return `File size must be less than ${requirements.maxSize}MB`;
    }

    // Check file type
    const fileExtension = "." + file.name.split(".").pop()?.toLowerCase();
    if (!requirements.acceptedFormats.includes(fileExtension)) {
      return `File must be one of: ${requirements.acceptedFormats.join(", ")}`;
    }

    // Check for duplicate document type
    const existingDoc = documents.find(
      (doc) => doc.type === documentType && doc.status !== "error",
    );
    if (existingDoc) {
      return `A ${requirements.title.toLowerCase()} has already been uploaded`;
    }

    return null;
  };

  const generateDocumentPath = (
    userId: string,
    documentType: DocumentType,
    fileName: string,
  ): string => {
    const timestamp = Date.now();
    const fileExtension = fileName.split(".").pop();
    return `provider-documents/${userId}/${documentType}_${timestamp}.${fileExtension}`;
  };

  const uploadToSupabase = async (
    file: File,
    documentType: DocumentType,
  ): Promise<string> => {
    const filePath = generateDocumentPath(userId, documentType, file.name);

    const { data, error } = await supabase.storage
      .from("provider-documents")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("provider-documents").getPublicUrl(data.path);

    return publicUrl;
  };

  const handleFileSelect = async (
    files: FileList | null,
    documentType: DocumentType,
  ) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    const validationError = validateFile(file, documentType);

    if (validationError) {
      // Add error document
      const errorDoc: UploadedDocument = {
        id: `${documentType}-${Date.now()}`,
        file,
        type: documentType,
        uploadProgress: 0,
        status: "error",
        error: validationError,
      };
      setDocuments((prev) => [...prev, errorDoc]);
      return;
    }

    // Create document entry
    const newDoc: UploadedDocument = {
      id: `${documentType}-${Date.now()}`,
      file,
      type: documentType,
      uploadProgress: 0,
      status: "uploading",
    };

    setDocuments((prev) => [...prev, newDoc]);
    setUploadingCount((prev) => prev + 1);

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setDocuments((prev) =>
          prev.map((doc) =>
            doc.id === newDoc.id
              ? {
                  ...doc,
                  uploadProgress: Math.min(doc.uploadProgress + 10, 90),
                }
              : doc,
          ),
        );
      }, 200);

      // Upload using API endpoint (which handles both storage and database)
      const formData = new FormData();
      formData.append("documents", file);
      formData.append("userId", userId);
      formData.append("businessId", businessId || "");
      formData.append(
        "documentMappings",
        JSON.stringify({ [file.name]: documentType }),
      );

      console.log("Uploading file:", {
        fileName: file.name,
        fileSize: file.size,
        documentType: documentType,
        userId: userId,
        businessId: businessId
      });

      console.log("Sending fetch request to upload documents...");
      const response = await fetch("/api/onboarding/upload-documents", {
        method: "POST",
        body: formData,
      });
      console.log("Fetch response status:", response.status);
      console.log("Fetch response headers:", Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: response.statusText }));
        console.error("Upload API error:", errorData);
        throw new Error(
          `Upload failed: ${errorData.error || response.statusText}`,
        );
      }

      const result = await response.json();
      console.log("Upload API response:", result);
      console.log("Upload API response.uploaded:", result.uploaded);
      console.log("Upload API response.errors:", result.errors);
      console.log("Upload API response.success:", result.success);
      const uploadedDoc = result.uploaded?.[0];

      clearInterval(progressInterval);

      // Update document with success
      setDocuments((prev) =>
        prev.map((doc) =>
          doc.id === newDoc.id
            ? {
                ...doc,
                uploadProgress: 100,
                status: "uploaded",
                url: uploadedDoc?.url || "",
              }
            : doc,
        ),
      );
    } catch (uploadError) {
      console.error("Upload error:", uploadError);

      // Update document with error
      setDocuments((prev) =>
        prev.map((doc) =>
          doc.id === newDoc.id
            ? {
                ...doc,
                status: "error",
                error:
                  uploadError instanceof Error
                    ? uploadError.message
                    : "Upload failed",
              }
            : doc,
        ),
      );
    } finally {
      setUploadingCount((prev) => prev - 1);
    }
  };

  const handleDrop = (e: React.DragEvent, documentType: DocumentType) => {
    e.preventDefault();
    setDragOver(null);
    const files = e.dataTransfer.files;
    handleFileSelect(files, documentType);
  };

  const handleDragOver = (e: React.DragEvent, documentType: DocumentType) => {
    e.preventDefault();
    setDragOver(documentType);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(null);
  };

  const removeDocument = (docId: string) => {
    setDocuments((prev) => prev.filter((doc) => doc.id !== docId));
  };

  const retryUpload = (docId: string) => {
    console.log("Retrying upload for document ID:", docId);
    console.log("Available documents:", documents);
    
    const document = documents.find((doc) => doc.id === docId);
    if (document) {
      console.log("Found document to retry:", document);
      // Remove the failed document and re-upload
      setDocuments((prev) => prev.filter((doc) => doc.id !== docId));
      const fileList = {
        0: document.file,
        length: 1,
      } as unknown as FileList;
      handleFileSelect(fileList, document.type);
    } else {
      console.error("Document not found for retry:", docId);
    }
  };

  const openCamera = (documentType: DocumentType) => {
    // This would open camera for mobile devices
    // For now, just trigger file input
    fileInputRefs.current[documentType]?.click();
  };

  const canSubmit = () => {
    const requiredDocTypes = Object.entries(requiredDocs)
      .filter(([_, required]) => required)
      .map(([type]) => type as DocumentType);

    const uploadedRequiredDocs = requiredDocTypes.every((type) =>
      documents.some((doc) => doc.type === type && doc.status === "uploaded"),
    );

    return uploadedRequiredDocs && uploadingCount === 0;
  };

  const handleSubmit = async () => {
    if (!canSubmit()) return;

    const uploadedDocs = documents.filter((doc) => doc.status === "uploaded");
    try {
      await onSubmit(uploadedDocs);
    } catch (submitError) {
      console.error("Document submission error:", submitError);
    }
  };

  const getDocumentStatus = (documentType: DocumentType) => {
    const doc = documents.find(
      (doc) => doc.type === documentType,
    );
    return doc?.status || null;
  };

  const getDocumentError = (documentType: DocumentType) => {
    const doc = documents.find(
      (doc) => doc.type === documentType && doc.status === "error",
    );
    return doc?.error || null;
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold text-roam-blue">
          Document Upload
        </CardTitle>
        <p className="text-foreground/70">
          Upload required documents for verification
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-8">
          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Security Notice */}
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              <strong>Secure Upload:</strong> All documents are encrypted and
              stored securely. Only you and approved ROAM administrators can
              access your documents.
            </AlertDescription>
          </Alert>

          {/* Document Upload Sections */}
          <div className="space-y-6">
            {Object.entries(documentRequirements).map(
              ([docType, requirements]) => {
                const documentType = docType as DocumentType;
                const isRequired = requiredDocs[documentType];
                const status = getDocumentStatus(documentType);
                const error = getDocumentError(documentType);
                const uploadedDoc = documents.find(
                  (doc) =>
                    doc.type === documentType && doc.status === "uploaded",
                );

                return (
                  <div key={documentType} className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                          {requirements.title}
                          {isRequired && (
                            <Badge variant="destructive" className="text-xs">
                              Required
                            </Badge>
                          )}
                          {!isRequired && (
                            <Badge variant="outline" className="text-xs">
                              Optional
                            </Badge>
                          )}
                          {status === "uploaded" && (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          )}
                        </h3>
                        <p className="text-sm text-foreground/70">
                          {requirements.description}
                        </p>
                      </div>
                    </div>

                    {/* Upload Area */}
                    <div
                      className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                        dragOver === documentType
                          ? "border-roam-blue bg-roam-light-blue/10"
                          : status === "uploaded"
                            ? "border-green-300 bg-green-50"
                            : error
                              ? "border-red-300 bg-red-50"
                              : "border-gray-300 hover:border-roam-blue"
                      }`}
                      onDrop={(e) => handleDrop(e, documentType)}
                      onDragOver={(e) => handleDragOver(e, documentType)}
                      onDragLeave={handleDragLeave}
                    >
                      {/* Hidden file input */}
                      <input
                        ref={(el) => (fileInputRefs.current[documentType] = el)}
                        type="file"
                        accept={requirements.acceptedFormats.join(",")}
                        onChange={(e) =>
                          handleFileSelect(e.target.files, documentType)
                        }
                        className="hidden"
                      />

                      {status === "uploaded" && uploadedDoc ? (
                        <div className="space-y-3">
                          <CheckCircle className="h-12 w-12 text-green-600 mx-auto" />
                          <div>
                            <p className="font-medium text-green-800">
                              {uploadedDoc.file.name}
                            </p>
                            <p className="text-sm text-green-600">
                              Successfully uploaded
                            </p>
                          </div>
                          <div className="flex justify-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                window.open(uploadedDoc.url, "_blank")
                              }
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Preview
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => removeDocument(uploadedDoc.id)}
                            >
                              <X className="h-4 w-4 mr-2" />
                              Remove
                            </Button>
                          </div>
                        </div>
                      ) : status === "uploading" ? (
                        <div className="space-y-3">
                          <Loader2 className="h-12 w-12 text-roam-blue mx-auto animate-spin" />
                          <div>
                            <p className="font-medium">Uploading...</p>
                            <Progress
                              value={
                                documents.find(
                                  (doc) => doc.type === documentType,
                                )?.uploadProgress || 0
                              }
                              className="w-full max-w-xs mx-auto"
                            />
                          </div>
                        </div>
                      ) : error ? (
                        <div className="space-y-3">
                          <AlertCircle className="h-12 w-12 text-red-600 mx-auto" />
                          <div>
                            <p className="font-medium text-red-800">
                              Upload Failed
                            </p>
                            <p className="text-sm text-red-600">{error}</p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const failedDoc = documents.find(
                                (doc) =>
                                  doc.type === documentType &&
                                  doc.status === "error",
                              );
                              if (failedDoc) {
                                retryUpload(failedDoc.id);
                              } else {
                                console.error("Failed document not found for retry:", documentType);
                              }
                            }}
                          >
                            Try Again
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {requirements.title.includes("Headshot") ? (
                            <Image className="h-12 w-12 text-gray-400 mx-auto" />
                          ) : (
                            <FileText className="h-12 w-12 text-gray-400 mx-auto" />
                          )}
                          <div>
                            <p className="text-lg font-medium mb-2">
                              Drop {requirements.title.toLowerCase()} here or
                              click to browse
                            </p>
                            <p className="text-sm text-foreground/60 mb-3">
                              Formats: {requirements.acceptedFormats.join(", ")}{" "}
                              • Max size: {requirements.maxSize}MB
                            </p>
                            <div className="flex justify-center gap-2">
                              <Button
                                variant="outline"
                                onClick={() =>
                                  fileInputRefs.current[documentType]?.click()
                                }
                                disabled={loading}
                              >
                                <Upload className="h-4 w-4 mr-2" />
                                Choose File
                              </Button>
                              {requirements.title.includes("Headshot") && (
                                <Button
                                  variant="outline"
                                  onClick={() => openCamera(documentType)}
                                  disabled={loading}
                                >
                                  <Camera className="h-4 w-4 mr-2" />
                                  Take Photo
                                </Button>
                              )}
                            </div>
                          </div>
                          <div className="text-xs text-foreground/50">
                            <p className="font-medium mb-1">Examples:</p>
                            <p>{requirements.examples.join(" • ")}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              },
            )}
          </div>

          {/* Upload Progress Summary */}
          {uploadingCount > 0 && (
            <Alert>
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertDescription>
                Uploading {uploadingCount} document
                {uploadingCount > 1 ? "s" : ""}...
              </AlertDescription>
            </Alert>
          )}

          {/* Completion Requirements */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Before you can submit:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1">
                {Object.entries(requiredDocs)
                  .filter(([_, required]) => required)
                  .map(([type]) => {
                    const docType = type as DocumentType;
                    const uploaded = documents.some(
                      (doc) =>
                        doc.type === docType && doc.status === "uploaded",
                    );
                    return (
                      <li
                        key={type}
                        className={uploaded ? "text-green-700" : ""}
                      >
                        {uploaded ? "✓" : "•"}{" "}
                        {documentRequirements[docType].title}
                      </li>
                    );
                  })}
              </ul>
            </AlertDescription>
          </Alert>

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            className="w-full bg-roam-blue hover:bg-roam-blue/90"
            disabled={!canSubmit() || loading}
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting Documents...
              </>
            ) : (
              "Continue to Review"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
