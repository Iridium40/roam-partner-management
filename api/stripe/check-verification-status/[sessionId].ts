import type { VercelRequest, VercelResponse } from "@vercel/node";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-07-30.basil",
});

const supabase = createClient(
  process.env.VITE_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { sessionId } = req.query;
    const { userId, businessId } = req.query;

    if (!sessionId && !userId) {
      return res.status(400).json({ error: "Missing sessionId or userId" });
    }

    let verificationSession: Stripe.Identity.VerificationSession;
    let dbRecord: any = null;

    if (sessionId) {
      // Get specific session by ID
      verificationSession = await stripe.identity.verificationSessions.retrieve(
        sessionId as string,
      );

      // Get corresponding database record
      const { data: dbData } = await supabase
        .from("stripe_identity_verifications")
        .select("*")
        .eq("session_id", sessionId)
        .single();

      dbRecord = dbData;
    } else {
      // Get latest session for user/business
      const { data: dbData, error: dbError } = await supabase
        .from("stripe_identity_verifications")
        .select("*")
        .eq("user_id", userId as string)
        .eq("business_id", businessId as string)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (dbError || !dbData) {
        return res.status(404).json({ error: "No verification session found" });
      }

      dbRecord = dbData;
      verificationSession = await stripe.identity.verificationSessions.retrieve(
        dbData.session_id,
      );
    }

    // Update database record with latest status
    const updateData: any = {
      status: verificationSession.status,
      updated_at: new Date().toISOString(),
    };

    // If verification is complete, get the verification report
    if (
      verificationSession.status === "verified" &&
      verificationSession.last_verification_report
    ) {
      const verificationReport =
        await stripe.identity.verificationReports.retrieve(
          verificationSession.last_verification_report as string,
        );

      updateData.verification_report = {
        id: verificationReport.id,
        type: verificationReport.type,
        created: verificationReport.created,
        document: verificationReport.document
          ? {
              type: verificationReport.document.type,
              status: verificationReport.document.status,
            }
          : null,
        selfie: verificationReport.selfie
          ? {
              status: verificationReport.selfie.status,
            }
          : null,
      };

      updateData.verified_at = new Date().toISOString();

      // Also update business profile verification status
      if (dbRecord) {
        await supabase
          .from("business_profiles")
          .update({
            identity_verified: true,
            identity_verified_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", dbRecord.business_id);

        // Update provider verification status
        await supabase
          .from("providers")
          .update({
            identity_verification_status: "verified",
            updated_at: new Date().toISOString(),
          })
          .eq("business_id", dbRecord.business_id);
      }
    } else if (
      verificationSession.status === "requires_input" ||
      verificationSession.status === "canceled"
    ) {
      updateData.failed_at = new Date().toISOString();
    }

    // Update database record
    if (dbRecord) {
      const { error: updateError } = await supabase
        .from("stripe_identity_verifications")
        .update(updateData)
        .eq("session_id", verificationSession.id);

      if (updateError) {
        console.error("Error updating verification record:", updateError);
      }
    }

    // Return verification session data
    const responseData = {
      verification_session: {
        id: verificationSession.id,
        status: verificationSession.status,
        type: verificationSession.type,
        created: verificationSession.created,
        client_secret:
          verificationSession.status === "requires_input"
            ? verificationSession.client_secret
            : null,
        last_verification_report: updateData.verification_report,
      },
    };

    return res.status(200).json(responseData);
  } catch (error) {
    console.error("Stripe Identity verification status check error:", error);

    if (error instanceof Stripe.errors.StripeError) {
      return res.status(400).json({
        error: "Stripe error",
        details: error.message,
        type: error.type,
      });
    }

    return res.status(500).json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
