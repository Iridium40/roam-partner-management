import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import jwt from "jsonwebtoken";
import { EmailService } from "../../server/services/emailService";

const supabase = createClient(
  process.env.VITE_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

interface ApprovalRequest {
  businessId: string;
  adminUserId: string;
  approvalNotes?: string;
  sendEmail?: boolean;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      businessId,
      adminUserId,
      approvalNotes,
      sendEmail = true,
    }: ApprovalRequest = req.body;

    if (!businessId || !adminUserId) {
      return res
        .status(400)
        .json({ error: "Missing businessId or adminUserId" });
    }

    // Verify admin permissions (you may want to add role checking here)
    const { data: adminUser } =
      await supabase.auth.admin.getUserById(adminUserId);
    if (!adminUser.user) {
      return res.status(403).json({ error: "Invalid admin user" });
    }

    // Get business profile and application
    const { data: businessProfile, error: businessError } = await supabase
      .from("business_profiles")
      .select("*")
      .eq("id", businessId)
      .single();

    if (businessError || !businessProfile) {
      return res.status(404).json({ error: "Business profile not found" });
    }

    const { data: application, error: applicationError } = await supabase
      .from("provider_applications")
      .select("*")
      .eq("business_id", businessId)
      .single();

    if (applicationError || !application) {
      return res.status(404).json({ error: "Application not found" });
    }

    if (application.application_status !== "submitted") {
      return res.status(400).json({
        error: "Application must be in submitted status to approve",
        currentStatus: application.application_status,
      });
    }

    // Update business profile to approved
    const { error: updateBusinessError } = await supabase
      .from("business_profiles")
      .update({
        verification_status: "approved",
        approved_at: new Date().toISOString(),
        approved_by: adminUserId,
        approval_notes: approvalNotes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", businessId);

    if (updateBusinessError) {
      console.error("Error updating business profile:", updateBusinessError);
      return res
        .status(500)
        .json({ error: "Failed to update business profile" });
    }

    // Update application status
    const { error: updateApplicationError } = await supabase
      .from("provider_applications")
      .update({
        application_status: "approved",
        review_status: "approved",
        reviewed_at: new Date().toISOString(),
        reviewed_by: adminUserId,
        approval_notes: approvalNotes,
        updated_at: new Date().toISOString(),
      })
      .eq("business_id", businessId);

    if (updateApplicationError) {
      console.error("Error updating application:", updateApplicationError);
      return res.status(500).json({ error: "Failed to update application" });
    }

    // Update provider status
    const { error: updateProviderError } = await supabase
      .from("providers")
      .update({
        verification_status: "approved",
        background_check_status: "approved", // Assuming background check is complete
        updated_at: new Date().toISOString(),
      })
      .eq("business_id", businessId);

    if (updateProviderError) {
      console.error("Error updating provider:", updateProviderError);
      // Continue anyway
    }

    // Generate Phase 2 secure token with proper structure
    const phase2TokenPayload = {
      business_id: businessId,
      user_id: businessProfile.owner_user_id || application.user_id,
      application_id: application.id,
      issued_at: Date.now(),
      expires_at: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days
      phase: "phase2"
    };

    const approvalToken = jwt.sign(
      phase2TokenPayload,
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "7d" }
    );

    // Create approval record
    const { error: approvalRecordError } = await supabase
      .from("application_approvals")
      .insert({
        business_id: businessId,
        application_id: application.id,
        approved_by: adminUserId,
        approval_token: approvalToken,
        token_expires_at: new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000,
        ).toISOString(), // 7 days
        approval_notes: approvalNotes,
        created_at: new Date().toISOString(),
      });

    if (approvalRecordError) {
      console.error("Error creating approval record:", approvalRecordError);
      // Continue anyway
    }

    // Update setup progress
    const { error: progressError } = await supabase
      .from("business_setup_progress")
      .update({
        phase_1_completed: true,
        phase_1_completed_at: new Date().toISOString(),
        current_step: 3, // Start of Phase 2
        updated_at: new Date().toISOString(),
      })
      .eq("business_id", businessId);

    if (progressError) {
      console.error("Error updating setup progress:", progressError);
    }

    // Send approval email with secure link (if enabled)
    if (sendEmail) {
      try {
        // Get user email
        const { data: userData } = await supabase.auth.admin.getUserById(
          businessProfile.owner_user_id,
        );

        if (userData.user?.email) {
          const approvalUrl = `${req.headers.origin || process.env.FRONTEND_URL}/provider-onboarding/phase2?token=${approvalToken}`;
          const firstName =
            userData.user.user_metadata?.first_name || "Provider";

          // Send approval email using Resend
          const emailSent = await EmailService.sendApplicationApprovedEmail(
            userData.user.email,
            firstName,
            approvalUrl,
          );

          if (!emailSent) {
            console.error(
              "Failed to send approval email to:",
              userData.user.email,
            );
          } else {
            console.log(
              "Approval email sent successfully to:",
              userData.user.email,
            );
          }
        }
      } catch (emailError) {
        console.error("Error sending approval email:", emailError);
        // Don't fail the approval if email fails
      }
    }

    return res.status(200).json({
      success: true,
      message: "Application approved successfully",
      approvalToken,
      approvalUrl: `${req.headers.origin || process.env.FRONTEND_URL}/provider-onboarding/phase2?token=${approvalToken}`,
      approvedAt: new Date().toISOString(),
      approvedBy: adminUserId,
    });
  } catch (error) {
    console.error("Application approval error:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
