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

interface TaxInformation {
  business_tax_id?: string;
  business_tax_id_type?: "ein" | "ssn";
  mcc?: string;
  product_description?: string;
  url?: string;
}

interface ConnectAccountRequest {
  userId: string;
  businessId: string;
  businessType: "sole_proprietorship" | "llc" | "corporation" | "partnership";
  businessName: string;
  email: string;
  taxInfo: TaxInformation;
  country: string;
  capabilities: {
    card_payments?: { requested: boolean };
    transfers?: { requested: boolean };
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
      businessType,
      businessName,
      email,
      taxInfo,
      country = "US",
      capabilities,
    }: ConnectAccountRequest = req.body;

    if (!userId || !businessId || !businessType || !businessName || !email) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Verify business profile exists and prerequisites are met
    const { data: businessProfile, error: businessError } = await supabase
      .from("business_profiles")
      .select("*")
      .eq("id", businessId)
      .eq("owner_user_id", userId)
      .single();

    if (businessError || !businessProfile) {
      return res.status(404).json({ error: "Business profile not found" });
    }

    if (businessProfile.verification_status !== "approved") {
      return res.status(403).json({
        error: "Business must be approved before Stripe account creation",
        currentStatus: businessProfile.verification_status,
      });
    }

    // Check if identity is verified
    if (!businessProfile.identity_verified) {
      return res.status(403).json({
        error:
          "Identity verification must be completed before Stripe account creation",
      });
    }

    // Check if bank is connected
    if (!businessProfile.bank_connected) {
      return res.status(403).json({
        error: "Bank account must be connected before Stripe account creation",
      });
    }

    // Check if Stripe account already exists
    const { data: existingAccount } = await supabase
      .from("stripe_connect_accounts")
      .select("*")
      .eq("business_id", businessId)
      .single();

    if (existingAccount && existingAccount.account_id) {
      // Return existing account
      const stripeAccount = await stripe.accounts.retrieve(
        existingAccount.account_id,
      );

      return res.status(200).json({
        account: {
          id: stripeAccount.id,
          type: stripeAccount.type,
          country: stripeAccount.country,
          default_currency: stripeAccount.default_currency,
          details_submitted: stripeAccount.details_submitted,
          charges_enabled: stripeAccount.charges_enabled,
          payouts_enabled: stripeAccount.payouts_enabled,
          requirements: stripeAccount.requirements,
          capabilities: stripeAccount.capabilities,
        },
        existing: true,
      });
    }

    // Prepare account creation parameters
    const accountParams: Stripe.AccountCreateParams = {
      type: "express",
      country,
      email,
      capabilities: capabilities || {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type:
        businessType === "sole_proprietorship" ? "individual" : "company",
      metadata: {
        user_id: userId,
        business_id: businessId,
        business_name: businessName,
        business_type: businessType,
      },
    };

    // Add business profile information
    if (businessType !== "sole_proprietorship") {
      accountParams.company = {
        name: businessName,
        structure:
          businessType === "llc"
            ? "limited_liability_company"
            : businessType === "corporation"
              ? "corporation"
              : "partnership" as any,
      };

      if (taxInfo.business_tax_id) {
        accountParams.company.tax_id = taxInfo.business_tax_id;
      }
    }

    // Add business information
    if (taxInfo.mcc) {
      accountParams.business_profile = {
        mcc: taxInfo.mcc,
        name: businessName,
        product_description: taxInfo.product_description,
        support_email: email,
        url: taxInfo.url,
      };
    }

    // Create Stripe Connect account
    const account = await stripe.accounts.create(accountParams);

    // Store account information in database
    const { error: dbError } = await supabase
      .from("stripe_connect_accounts")
      .upsert(
        {
          user_id: userId,
          business_id: businessId,
          account_id: account.id,
          account_type: account.type,
          country: account.country,
          default_currency: account.default_currency,
          business_type: accountParams.business_type,
          details_submitted: account.details_submitted,
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled,
          capabilities: account.capabilities,
          requirements: account.requirements,
          created_at: new Date(account.created * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "business_id",
        },
      );

    if (dbError) {
      console.error("Error storing Stripe account:", dbError);
      // Continue anyway - account was created successfully
    }

    // Create onboarding link if account needs setup
    let onboardingUrl = null;
    if (!account.details_submitted) {
      try {
        const accountLink = await stripe.accountLinks.create({
          account: account.id,
          refresh_url: `${req.headers.origin || "http://localhost:8080"}/provider-onboarding/stripe`,
          return_url: `${req.headers.origin || "http://localhost:8080"}/provider-onboarding/complete`,
          type: "account_onboarding",
        });

        onboardingUrl = accountLink.url;
      } catch (linkError) {
        console.error("Error creating account link:", linkError);
        // Continue without onboarding link
      }
    }

    // Update business profile
    const { error: updateError } = await supabase
      .from("business_profiles")
      .update({
        stripe_connect_account_id: account.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", businessId);

    if (updateError) {
      console.error("Error updating business profile:", updateError);
    }

    // Update setup progress
    const { error: progressError } = await supabase
      .from("business_setup_progress")
      .update({
        stripe_connect_completed:
          account.charges_enabled && account.payouts_enabled,
        current_step:
          account.charges_enabled && account.payouts_enabled ? 8 : 7,
        updated_at: new Date().toISOString(),
      })
      .eq("business_id", businessId);

    if (progressError) {
      console.error("Error updating setup progress:", progressError);
    }

    return res.status(200).json({
      account: {
        id: account.id,
        type: account.type,
        country: account.country,
        default_currency: account.default_currency,
        details_submitted: account.details_submitted,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        requirements: account.requirements,
        capabilities: account.capabilities,
      },
      onboarding_url: onboardingUrl,
    });
  } catch (error) {
    console.error("Stripe Connect account creation error:", error);

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
