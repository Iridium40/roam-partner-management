import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { EmailService } from "../../server/services/emailService";

const supabase = createClient(
  process.env.VITE_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

interface RejectionRequest {
  businessId: string;
  adminUserId: string;
  reason: string;
  nextSteps: string;
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
      reason,
      nextSteps,
      sendEmail = true,
    }: RejectionRequest = req.body;

    if (!businessId || !adminUserId || !reason || !nextSteps) {
      return res.status(400).json({
        error:
          "Missing required fields: businessId, adminUserId, reason, nextSteps",
      });
    }

    // Verify admin permissions
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

    // Get application record
    const { data: application, error: applicationError } = await supabase
      .from("provider_applications")
      .select("*")
      .eq("business_id", businessId)
      .single();

    if (applicationError || !application) {
      return res.status(404).json({ error: "Application not found" });
    }

    // Update business profile status
    const { error: updateBusinessError } = await supabase
      .from("business_profiles")
      .update({
        verification_status: "rejected",
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
        application_status: "rejected",
        review_status: "rejected",
        rejection_reason: reason,
        rejection_next_steps: nextSteps,
        reviewed_by: adminUserId,
        reviewed_at: new Date().toISOString(),
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
        verification_status: "rejected",
        updated_at: new Date().toISOString(),
      })
      .eq("business_id", businessId);

    if (updateProviderError) {
      console.error("Error updating provider:", updateProviderError);
      // Continue anyway
    }

    // Send rejection email (if enabled)
    if (sendEmail) {
      try {
        // Get user email
        const { data: userData } = await supabase.auth.admin.getUserById(
          application.user_id,
        );

        if (userData.user?.email) {
          const firstName =
            userData.user.user_metadata?.first_name || "Provider";

          // Send rejection email using Resend
          const emailSent = await EmailService.sendApplicationRejectedEmail(
            userData.user.email,
            firstName,
            reason,
            nextSteps,
          );

          if (!emailSent) {
            console.error(
              "Failed to send rejection email to:",
              userData.user.email,
            );
          } else {
            console.log(
              "Rejection email sent successfully to:",
              userData.user.email,
            );
          }
        }
      } catch (emailError) {
        console.error("Error sending rejection email:", emailError);
      }
    }

    return res.status(200).json({
      success: true,
      message: "Application rejected successfully",
      businessId,
      applicationId: application.id,
      rejectedAt: new Date().toISOString(),
      rejectedBy: adminUserId,
    });
  } catch (error) {
    console.error("Application rejection error:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
