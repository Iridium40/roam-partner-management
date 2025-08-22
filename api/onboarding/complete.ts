import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { EmailService } from "../../server/services/emailService";

const supabase = createClient(
  process.env.VITE_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

interface CompletionRequest {
  userId: string;
  businessId: string;
  phase2Data?: {
    stripeAccountId?: string;
    plaidAccountId?: string;
    identityVerified?: boolean;
    paymentSetupComplete?: boolean;
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { userId, businessId, phase2Data }: CompletionRequest = req.body;

    if (!userId || !businessId) {
      return res.status(400).json({ error: "Missing userId or businessId" });
    }

    // Verify user owns this business
    const { data: providerRecord, error: providerError } = await supabase
      .from("providers")
      .select("business_id")
      .eq("user_id", userId)
      .eq("business_id", businessId)
      .eq("provider_role", "owner")
      .single();

    if (providerError || !providerRecord) {
      return res
        .status(404)
        .json({ error: "Business not found or not owned by user" });
    }

    // Update business profile to mark as fully onboarded
    const { error: updateBusinessError } = await supabase
      .from("business_profiles")
      .update({
        verification_status: "approved",
        is_active: true,
        setup_completed: true,
        setup_step: 8, // Final step
        onboarding_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", businessId);

    if (updateBusinessError) {
      console.error("Error updating business profile:", updateBusinessError);
      return res.status(500).json({ error: "Failed to complete onboarding" });
    }

    // Update provider to active status
    const { error: updateProviderError } = await supabase
      .from("providers")
      .update({
        verification_status: "approved",
        is_active: true,
        onboarding_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("business_id", businessId);

    if (updateProviderError) {
      console.error("Error updating provider:", updateProviderError);
      // Continue anyway
    }

    // Update application status to completed
    const { error: updateApplicationError } = await supabase
      .from("provider_applications")
      .update({
        application_status: "completed",
        current_phase: "complete",
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("business_id", businessId);

    if (updateApplicationError) {
      console.error("Error updating application:", updateApplicationError);
      // Continue anyway
    }

    // Update setup progress (if table exists)
    try {
      const { error: progressError } = await supabase
        .from("business_setup_progress")
        .update({
          current_step: 8,
          phase_1_completed: true,
          phase_2_completed: true,
          phase_2_completed_at: new Date().toISOString(),
          stripe_connect_completed: phase2Data?.paymentSetupComplete || false,
          setup_completed: true,
          go_live_completed: true,
          updated_at: new Date().toISOString(),
        })
        .eq("business_id", businessId);

      if (progressError) {
        console.log(
          "Setup progress tracking not available:",
          progressError.message,
        );
      }
    } catch (setupProgressError) {
      console.log(
        "Setup progress tracking not available - table may not exist",
      );
    }

    // Get user info for email
    const { data: userData } = await supabase.auth.admin.getUserById(userId);
    const firstName = userData.user?.user_metadata?.first_name || "Provider";
    const userEmail = userData.user?.email || "";

    // Send completion email
    try {
      if (userEmail) {
        const dashboardUrl = `${req.headers.origin || process.env.FRONTEND_URL}/provider-dashboard`;

        const emailSent = await EmailService.sendOnboardingCompleteEmail(
          userEmail,
          firstName,
          dashboardUrl,
        );

        if (!emailSent) {
          console.error("Failed to send onboarding completion email");
        }
      }
    } catch (emailError) {
      console.error("Error sending onboarding completion email:", emailError);
      // Continue - don't fail the completion if email fails
    }

    return res.status(200).json({
      success: true,
      message: "Onboarding completed successfully!",
      businessId,
      completedAt: new Date().toISOString(),
      nextSteps: {
        dashboardAccess: "You can now access your provider dashboard",
        serviceSetup: "Configure your services and availability",
        firstBooking: "Start receiving customer bookings",
      },
    });
  } catch (error) {
    console.error("Onboarding completion error:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
