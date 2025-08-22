import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import multer from "multer";

const supabase = createClient(
  process.env.VITE_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// Configure multer for file upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit (increased from 5MB)
  },
  fileFilter: (req, file, cb) => {
    // Allow specific file types
    const allowedTypes = ["image/jpeg", "image/png", "application/pdf"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Invalid file type. Only JPEG, PNG, and PDF files are allowed.",
        ),
      );
    }
  },
});

interface DocumentRecord {
  userId: string;
  businessId: string;
  documentType: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  storageUrl: string;
  status: "uploaded" | "pending_review" | "approved" | "rejected";
}

// Helper function to handle multer middleware in Vercel
function runMiddleware(req: any, res: any, fn: any) {
  return new Promise((resolve, reject) => {
    console.log("Running multer middleware...");
    fn(req, res, (result: any) => {
      if (result instanceof Error) {
        console.error("Multer middleware error:", result);
        return reject(result);
      }
      console.log("Multer middleware completed successfully");
      return resolve(result);
    });
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log("=== UPLOAD DOCUMENTS API CALLED ===");
  console.log("Method:", req.method);
  console.log("URL:", req.url);
  
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Add a simple test response to verify the API is working
  if (req.url?.includes('test')) {
    return res.status(200).json({ message: "API is working", timestamp: new Date().toISOString() });
  }

  console.log("=== UPLOAD DOCUMENTS API START ===");
  console.log("Request headers:", req.headers);
  console.log("Request body keys:", Object.keys(req.body || {}));

      try {
      // Run multer middleware
      console.log("Running multer middleware...");
      await runMiddleware(req, res, upload.array("documents", 10));
      console.log("Multer middleware completed");

      const files = (req as any).files;
      const body = (req as any).body;
      
      console.log("Files after multer:", files);
      console.log("Body after multer:", body);
      
      const { userId, businessId, documentMappings } = body;

    console.log("Files received:", files ? files.length : 0);
    console.log("Files details:", files?.map(f => ({ name: f.originalname, size: f.size, mimetype: f.mimetype })));
    console.log("Request body:", { userId, businessId, documentMappings });

    if (!userId || !businessId) {
      console.error("Missing userId or businessId:", { userId, businessId });
      return res.status(400).json({ error: "Missing userId or businessId" });
    }

    if (!files || files.length === 0) {
      console.error("No files uploaded");
      return res.status(400).json({ error: "No files uploaded" });
    }

    // Parse document mappings (which file corresponds to which document type)
    let mappings: Record<string, string> = {};
    try {
      mappings = JSON.parse(documentMappings || "{}");
      console.log("Parsed document mappings:", mappings);
      console.log(
        "Available files:",
        files.map((f) => f.originalname),
      );
    } catch (error) {
      console.error("Failed to parse document mappings:", error);
      return res.status(400).json({ error: "Invalid document mappings" });
    }

    // Verify user owns this business (same logic as submit API)
    const { data: providerRecord, error: providerError } = await supabase
      .from("providers")
      .select("business_id, provider_role")
      .eq("user_id", userId)
      .eq("business_id", businessId)
      .eq("provider_role", "owner")
      .single();

    if (providerError || !providerRecord) {
      return res
        .status(404)
        .json({ error: "Business profile not found or not owned by user" });
    }

    // Get the business profile
    const { data: businessProfile, error: businessError } = await supabase
      .from("business_profiles")
      .select("id, business_type, verification_status")
      .eq("id", businessId)
      .single();

    if (businessError || !businessProfile) {
      return res.status(404).json({ error: "Business profile not found" });
    }

    const uploadedDocuments: any[] = [];
    const errors: string[] = [];

    // Process each uploaded file
    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Try exact match first, then try normalized filename
      let documentType = mappings[file.originalname];

      if (!documentType) {
        // Try to find a matching key by normalizing both the file name and mapping keys
        const normalizedFileName = file.originalname
          .replace(/[^\w\s.-]/g, " ")
          .replace(/\s+/g, " ")
          .trim();

        for (const [mappingKey, mappingValue] of Object.entries(mappings)) {
          const normalizedMappingKey = mappingKey
            .replace(/[^\w\s.-]/g, " ")
            .replace(/\s+/g, " ")
            .trim();
          if (normalizedFileName === normalizedMappingKey) {
            documentType = mappingValue;
            break;
          }
        }
      }

      // Fallback to document_i if no mapping found
      if (!documentType) {
        documentType = `document_${i}`;
      }

      console.log(
        `File: "${file.originalname}" mapped to type: "${documentType}"`,
      );

      try {
        // Check file size before upload
        const fileSizeMB = file.size / (1024 * 1024);
        console.log(`File size: ${fileSizeMB.toFixed(2)} MB`);
        
        if (fileSizeMB > 5) {
          throw new Error(`File size (${fileSizeMB.toFixed(2)} MB) exceeds the 5MB limit`);
        }

        // Generate unique file path using business_id for consistency
        const timestamp = Date.now();
        const fileExtension = file.originalname.split(".").pop();
        const fileName = `${documentType}_${timestamp}.${fileExtension}`;
        const filePath = `provider-documents/${businessId}/${fileName}`;

        // Upload file to Supabase Storage
        console.log(`Uploading file to storage: ${filePath}`);
        console.log(`File size: ${file.size} bytes`);
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("provider-documents")
          .upload(filePath, file.buffer, {
            contentType: file.mimetype,
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          console.error("Storage upload error:", uploadError);
          console.error("Storage upload error details:", JSON.stringify(uploadError, null, 2));
          
          let errorMessage = uploadError.message;
          if (uploadError.message.includes("maximum allowed size")) {
            errorMessage = `File size (${fileSizeMB.toFixed(2)} MB) is too large. Please upload a file smaller than 5MB.`;
          }
          
          errors.push(
            `Failed to upload ${file.originalname}: ${errorMessage}`,
          );
          continue;
        }

        console.log("Storage upload successful:", uploadData);

        // Get public URL
        const {
          data: { publicUrl },
        } = supabase.storage
          .from("provider-documents")
          .getPublicUrl(uploadData.path);

        // Create document record in database
        const documentRecord: DocumentRecord = {
          userId,
          businessId,
          documentType,
          fileName: file.originalname,
          fileSize: file.size,
          mimeType: file.mimetype,
          storageUrl: publicUrl,
          status: "uploaded",
        };

        console.log("Attempting to save document record:", {
          user_id: userId,
          business_id: businessId,
          document_type: documentType,
          original_filename: file.originalname,
          upload_status: "uploaded",
        });

        const documentData = {
          business_id: businessId,
          document_type: documentType as any, // Cast to any to handle enum type
          document_name: file.originalname,
          file_url: publicUrl,
          file_size_bytes: file.size,
          verification_status: "pending" as any, // Cast to any to handle enum type
        };

        console.log("About to save document data:", documentData);
        console.log("Business ID being used:", businessId);
        console.log("Document type being saved:", documentType);

        // Use insert instead of upsert since we don't have a unique constraint
        const { data: dbRecord, error: dbError } = await supabase
          .from("business_documents")
          .insert(documentData)
          .select()
          .single();

        console.log("Database insert result:", { dbRecord, dbError });
        console.log("Saved document record:", dbRecord);

        if (dbError) {
          console.error("Database record error:", dbError);
          console.error("Error details:", JSON.stringify(dbError, null, 2));
          console.error("Failed to save document record for:", file.originalname);
          errors.push(
            `Failed to save record for ${file.originalname}: ${dbError.message}`,
          );

          // Clean up storage file if database fails
          console.log("Cleaning up storage file due to database error:", uploadData.path);
          await supabase.storage
            .from("provider-documents")
            .remove([uploadData.path]);
          continue;
        }

        console.log("Successfully saved document record:", dbRecord);

        uploadedDocuments.push({
          id: dbRecord.id,
          documentType,
          fileName: file.originalname,
          url: publicUrl,
          status: "uploaded",
          uploadedAt: dbRecord.uploaded_at,
        });
      } catch (fileError) {
        console.error("File processing error:", fileError);
        errors.push(
          `Failed to process ${file.originalname}: ${fileError instanceof Error ? fileError.message : "Unknown error"}`,
        );
      }
    }

    // Update business profile setup step if this is first document upload
    if (uploadedDocuments.length > 0) {
      const { data: existingDocs } = await supabase
        .from("business_documents")
        .select("id")
        .eq("business_id", businessId)
        .limit(1);

      if (!existingDocs || existingDocs.length === 0) {
        // This is the first document upload, update setup step
        await supabase
          .from("business_profiles")
          .update({
            setup_step: Math.max(
              businessProfile.verification_status === "pending" ? 2 : 1,
              2,
            ),
            updated_at: new Date().toISOString(),
          })
          .eq("id", businessId);
      }
    }

    // Check if all required documents are uploaded
    const { data: allDocs } = await supabase
      .from("business_documents")
      .select("document_type")
      .eq("business_id", businessId)
      .in("verification_status", ["pending", "verified", "under_review"]);

    const uploadedTypes = allDocs?.map((doc) => doc.document_type) || [];
    const requiredTypes = [
      "drivers_license",
      "proof_of_address",
      "professional_license",
      "professional_certificate",
    ];

    // Add business_license if not sole proprietorship
    if (businessProfile.business_type !== "sole_proprietorship") {
      requiredTypes.push("business_license");
    }

    const allRequiredUploaded = requiredTypes.every((type) =>
      uploadedTypes.includes(type),
    );

    // Final verification: Query what's actually in the database
    console.log("=== FINAL VERIFICATION ===");
    const { data: finalCheck, error: finalCheckError } = await supabase
      .from("business_documents")
      .select("*")
      .eq("business_id", businessId);

    console.log("Final document check - businessId:", businessId);
    console.log("Final document check - results:", finalCheck);
    console.log("Final document check - error:", finalCheckError);

    return res.status(200).json({
      success: true,
      uploaded: uploadedDocuments,
      errors: errors.length > 0 ? errors : undefined,
      allRequiredUploaded,
      requiredDocuments: requiredTypes,
      uploadedDocuments: uploadedTypes,
      debug: {
        finalDatabaseCheck: finalCheck,
        businessId,
        uploadedCount: uploadedDocuments.length,
      },
    });
  } catch (error) {
    console.error("Document upload error:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

// Disable body parsing for file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};
