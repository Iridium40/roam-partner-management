import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: "Missing userId" });
    }

    // Get user authentication status
    const { data: userData } = await supabase.auth.admin.getUserById(
      userId as string,
    );
    if (!userData.user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Get business profile for this user
    const { data: businessProfile, error: businessError } = await supabase
      .from("business_profiles")
      .select("*")
      .eq("owner_user_id", userId)
      .single();

    if (businessError || !businessProfile) {
      // No business profile yet - need to start onboarding
      return res.status(200).json({
        phase: "phase1",
        currentStep: "signup",
        needsOnboarding: true,
        userData: {
          email: userData.user.email,
          id: userData.user.id,
        },
      });
    }

    // Get provider record
    const { data: provider } = await supabase
      .from("providers")
      .select("*")
      .eq("business_id", businessProfile.id)
      .single();

    // Get application status
    const { data: application } = await supabase
      .from("provider_applications")
      .select("*")
      .eq("business_id", businessProfile.id)
      .single();

    // Get setup progress
    const { data: setupProgress } = await supabase
      .from("business_setup_progress")
      .select("*")
      .eq("business_id", businessProfile.id)
      .single();

    // Determine current phase and step
    let phase: "phase1" | "phase2" | "complete" = "phase1";
    let currentStep = "business_info";

    if (businessProfile.verification_status === "approved") {
      phase = "phase2";

      // Determine Phase 2 step
      if (!businessProfile.identity_verified) {
        currentStep = "identity_verification";
      } else if (!businessProfile.bank_connected) {
        currentStep = "bank_connection";
      } else if (!businessProfile.stripe_connect_account_id) {
        currentStep = "stripe_setup";
      } else {
        // Check if Stripe account is fully active
        const { data: stripeAccount } = await supabase
          .from("stripe_connect_accounts")
          .select("charges_enabled, payouts_enabled")
          .eq("business_id", businessProfile.id)
          .single();

        if (stripeAccount?.charges_enabled && stripeAccount?.payouts_enabled) {
          phase = "complete";
          currentStep = "complete";
        } else {
          currentStep = "stripe_setup";
        }
      }
    } else {
      // Phase 1 - determine step based on setup progress
      if (!businessProfile.business_name) {
        currentStep = "business_info";
      } else if (
        !application ||
        application.application_status !== "submitted"
      ) {
        // Check if documents are uploaded
        const { data: documents } = await supabase
          .from("provider_documents")
          .select("document_type")
          .eq("business_id", businessProfile.id)
          .eq("upload_status", "uploaded");

        const requiredTypes = ["professional_license", "professional_headshot"];
        if (businessProfile.business_type !== "sole_proprietorship") {
          requiredTypes.push("business_license");
        }

        const hasAllRequiredDocs = requiredTypes.every((type) =>
          documents?.some((doc) => doc.document_type === type),
        );

        if (!hasAllRequiredDocs) {
          currentStep = "documents";
        } else {
          currentStep = "review";
        }
      } else if (businessProfile.verification_status === "under_review") {
        currentStep = "submitted";
      } else if (businessProfile.verification_status === "pending") {
        currentStep = "review";
      }
    }

    // If setup is complete, redirect to dashboard
    if (phase === "complete") {
      return res.status(200).json({
        phase: "complete",
        currentStep: "complete",
        redirectTo: "/provider-dashboard",
        businessId: businessProfile.id,
        userId: userId,
      });
    }

    return res.status(200).json({
      phase,
      currentStep,
      businessId: businessProfile.id,
      userId: userId,
      userData: {
        id: userData.user.id,
        email: userData.user.email,
        firstName: provider?.first_name,
        lastName: provider?.last_name,
        phone: provider?.phone,
      },
      businessData: {
        businessName: businessProfile.business_name,
        businessType: businessProfile.business_type,
        contactEmail: businessProfile.contact_email,
        phone: businessProfile.phone,
        serviceCategories: businessProfile.service_categories,
        serviceSubcategories: businessProfile.service_subcategories,
        businessHours: businessProfile.business_hours,
        businessAddress: {
          // Get from business_locations table
        },
        website: businessProfile.website_url,
        socialMedia: businessProfile.social_media,
        businessDescription: businessProfile.business_description,
        yearsExperience: businessProfile.years_experience,
      },
      applicationStatus: {
        status: application?.application_status || "not_submitted",
        submittedAt: application?.submitted_at,
        reviewStatus: application?.review_status,
      },
      verificationStatus: {
        business: businessProfile.verification_status,
        identity: businessProfile.identity_verified,
        background: provider?.background_check_status,
      },
      setupProgress: setupProgress || {
        current_step: 1,
        total_steps: 8,
        phase_1_completed: false,
        phase_2_completed: false,
      },
    });
  } catch (error) {
    console.error("Onboarding status check error:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
