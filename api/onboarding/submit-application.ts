import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { EmailService } from "../../server/services/emailService";

const supabase = createClient(
  process.env.VITE_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

interface ApplicationData {
  userId: string;
  businessId: string;
  finalConsents: {
    informationAccuracy: boolean;
    termsAccepted: boolean;
    backgroundCheckConsent: boolean;
  };
  submissionMetadata?: {
    userAgent?: string;
    ipAddress?: string;
    timestamp: string;
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      userId,
      businessId,
      finalConsents,
      submissionMetadata,
    }: ApplicationData = req.body;

    if (!userId || !businessId || !finalConsents) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Validate all consents are given
    const { informationAccuracy, termsAccepted, backgroundCheckConsent } =
      finalConsents;
    if (!informationAccuracy || !termsAccepted || !backgroundCheckConsent) {
      return res
        .status(400)
        .json({ error: "All consents must be given to submit application" });
    }

    // Verify business profile exists and user is the owner
    // First check if user owns this business through providers table
    console.log(
      "Checking ownership for userId:",
      userId,
      "businessId:",
      businessId,
    );

    const { data: providerRecord, error: providerError } = await supabase
      .from("providers")
      .select("business_id, provider_role")
      .eq("user_id", userId)
      .eq("business_id", businessId)
      .eq("provider_role", "owner")
      .single();

    console.log("Provider lookup result:", { providerRecord, providerError });

    if (providerError || !providerRecord) {
      // Let's also check if there's ANY provider record for this user
      const { data: anyProviderRecord, error: anyProviderError } =
        await supabase.from("providers").select("*").eq("user_id", userId);

      console.log("Any provider records for user:", anyProviderRecord);

      return res.status(404).json({
        error: "Business profile not found or not owned by user",
        debug: {
          userId,
          businessId,
          providerError: providerError?.message,
          anyProviderRecords: anyProviderRecord?.length || 0,
        },
      });
    }

    // Get the business profile
    const { data: businessProfile, error: businessError } = await supabase
      .from("business_profiles")
      .select("*")
      .eq("id", businessId)
      .single();

    if (businessError || !businessProfile) {
      return res.status(404).json({ error: "Business profile not found" });
    }

    // Check if required documents are uploaded
    console.log("Checking documents for businessId:", businessId);

    // Query documents by business_id only (no provider_id column exists)
    console.log("=== DOCUMENT QUERY DEBUG ===");
    console.log("Querying documents for businessId:", businessId);
    console.log("Querying documents for userId:", userId);
    
    const { data: documentsByBusiness, error: documentsError1 } = await supabase
      .from("business_documents")
      .select("*")
      .eq("business_id", businessId);

    console.log("Documents query error:", documentsError1);
    console.log("Documents query result:", documentsByBusiness);

    // Also try querying all documents to see what's in the table
    const { data: allDocuments, error: allDocsError } = await supabase
      .from("business_documents")
      .select("*")
      .limit(10);
    
    console.log("All documents in table (first 10):", allDocuments);
    console.log("All documents query error:", allDocsError);

    // No need to query by user since there's no user/provider column
    const documentsByUser = null;
    const documentsError2 = null;

    if (documentsError1)
      console.error("Error querying documents by business:", documentsError1);

    // Use business documents only
    const documents = documentsByBusiness;

    // Include all uploaded documents regardless of status (they exist in DB)
    const uploadedTypes = documents?.map((doc) => doc.document_type) || [];

    console.log("All documents found:", documents);
    console.log(
      "Document verification statuses:",
      documents?.map((d) => ({
        type: d.document_type,
        status: d.verification_status,
        id: d.id,
        business_id: d.business_id,
      })),
    );

    console.log("Uploaded document types:", uploadedTypes);
    console.log("Document types found in database:", documents?.map(d => d.document_type));

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

    console.log("Required document types:", requiredTypes);

    const missingDocuments = requiredTypes.filter(
      (type) => !uploadedTypes.includes(type),
    );

    console.log("Missing documents:", missingDocuments);

    if (missingDocuments.length > 0) {
      return res.status(400).json({
        error: "Missing required documents",
        missingDocuments,
        debug: {
          businessId,
          userId,
          documentsByBusiness,
          documentsByUser,
          uploadedTypes,
          requiredTypes,
        },
      });
    }

    // Create application submission record
    const submissionData = {
      user_id: userId,
      business_id: businessId,
      application_status: "submitted",
      review_status: "pending",
      consents_given: finalConsents,
      submission_metadata: {
        user_agent: req.headers["user-agent"] || submissionMetadata?.userAgent,
        ip_address:
          req.headers["x-forwarded-for"] ||
          req.headers["x-real-ip"] ||
          submissionMetadata?.ipAddress,
        timestamp: new Date().toISOString(),
      },
      submitted_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: submission, error: submissionError } = await supabase
      .from("provider_applications")
      .insert(submissionData)
      .select()
      .single();

    if (submissionError) {
      console.error("Error creating application submission:", submissionError);
      return res.status(500).json({ error: "Failed to submit application" });
    }

    // Update business profile status
    const { error: updateError } = await supabase
      .from("business_profiles")
      .update({
        verification_status: "under_review",
        setup_step: 2, // Phase 1 complete
        application_submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", businessId);

    if (updateError) {
      console.error("Error updating business profile:", updateError);
      // Continue anyway - submission was successful
    }

    // Update provider status
    const { error: providerUpdateError } = await supabase
      .from("providers")
      .update({
        verification_status: "under_review",
        background_check_status: "pending",
        updated_at: new Date().toISOString(),
      })
      .eq("business_id", businessId);

    if (providerUpdateError) {
      console.error("Error updating provider status:", providerUpdateError);
      // Continue anyway - submission was successful
    }

    // Create initial setup progress tracking (optional - table may not exist)
    try {
      const { error: progressError } = await supabase
        .from("business_setup_progress")
        .upsert(
          {
            business_id: businessId,
            current_step: 2,
            total_steps: 8,
            business_profile_completed: true,
            locations_completed: true,
            services_pricing_completed: false,
            staff_setup_completed: false,
            integrations_completed: false,
            stripe_connect_completed: false,
            subscription_completed: false,
            go_live_completed: false,
            phase_1_completed: true,
            phase_1_completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "business_id",
          },
        );

      if (progressError) {
        console.log(
          "Setup progress tracking table not available:",
          progressError.message,
        );
        // Continue anyway - this is optional functionality
      }
    } catch (setupProgressError) {
      console.log(
        "Setup progress tracking not available - table may not exist",
      );
      // Continue anyway - this is optional functionality
    }

    // Get user info for email
    const user = await supabase.auth.admin.getUserById(userId);
    const firstName = user.data.user?.user_metadata?.first_name || "Provider";
    const userEmail = user.data.user?.email || "";

    // Send confirmation email to provider (don't fail if email fails)
    try {
      if (userEmail) {
        const emailSent = await EmailService.sendApplicationSubmittedEmail(
          userEmail,
          firstName,
          submission.id,
        );
        if (!emailSent) {
          console.error("Failed to send application submitted email");
        }
      }
    } catch (emailError) {
      console.error("Error sending application submitted email:", emailError);
      // Continue - don't fail the submission if email fails
    }

    // TODO: Send email notification to admins about new application
    // TODO: Queue background check initiation

    return res.status(200).json({
      success: true,
      applicationId: submission.id,
      submissionDate: submission.submitted_at,
      message:
        "Application submitted successfully! You will receive an email within 3-5 business days with next steps.",
      nextSteps: {
        backgroundCheck: "We will initiate a background check within 24 hours",
        documentReview: "Our team will review your uploaded documents",
        adminReview: "Admin review typically takes 2-3 business days",
        approvalNotification:
          "You will receive an email with a secure link to complete Phase 2 setup",
      },
    });
  } catch (error) {
    console.error("Application submission error:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
