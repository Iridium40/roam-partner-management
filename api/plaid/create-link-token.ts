import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  Configuration,
  PlaidApi,
  PlaidEnvironments,
  Products,
  CountryCode,
} from "plaid";
import { createClient } from "@supabase/supabase-js";

const configuration = new Configuration({
  basePath:
    PlaidEnvironments[
      process.env.PLAID_ENV as keyof typeof PlaidEnvironments
    ] || PlaidEnvironments.sandbox,
  baseOptions: {
    headers: {
      "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID!,
      "PLAID-SECRET": process.env.PLAID_SECRET!,
    },
  },
});

const client = new PlaidApi(configuration);

const supabase = createClient(
  process.env.VITE_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

interface LinkTokenRequest {
  userId: string;
  businessId: string;
  businessType: "sole_proprietorship" | "llc" | "corporation" | "partnership";
  products: Products[];
  country_codes: CountryCode[];
  account_filters?: {
    depository?: {
      account_type?: "business" | "personal";
      account_subtypes?: string[];
    };
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
      products = [Products.Auth],
      country_codes = [CountryCode.Us],
      account_filters,
    }: LinkTokenRequest = req.body;

    if (!userId || !businessId) {
      return res.status(400).json({ error: "Missing userId or businessId" });
    }

    // Verify business profile exists and is approved
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
        error: "Business must be approved before bank connection",
        currentStatus: businessProfile.verification_status,
      });
    }

    // Get user information for Plaid
    const { data: userData } = await supabase.auth.admin.getUserById(userId);
    if (!userData.user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Create Plaid Link token
    const request = {
      user: {
        client_user_id: userId,
      },
      client_name: "ROAM Provider Onboarding",
      products,
      country_codes,
      language: "en" as const,
      webhook: process.env.PLAID_WEBHOOK_URL,
      account_filters: {
        depository: {
          account_type:
            businessType === "sole_proprietorship" ? "personal" : "business",
          account_subtypes:
            businessType === "sole_proprietorship"
              ? ["checking", "savings"] as any
              : ["checking"] as any,
        },
      },
    };

    const response = await client.linkTokenCreate(request);
    const linkToken = response.data.link_token;

    // Store link token request in database
    const { error: dbError } = await supabase
      .from("plaid_link_sessions")
      .insert({
        user_id: userId,
        business_id: businessId,
        link_token: linkToken,
        expiration: response.data.expiration,
        request_id: response.data.request_id,
        status: "created",
        created_at: new Date().toISOString(),
      });

    if (dbError) {
      console.error("Error storing link token:", dbError);
      // Continue anyway - link token was created successfully
    }

    return res.status(200).json({
      link_token: linkToken,
      expiration: response.data.expiration,
      request_id: response.data.request_id,
    });
  } catch (error) {
    console.error("Plaid Link token creation error:", error);

    if (error && typeof error === "object" && "response" in error) {
      const plaidError = error as any;
      return res.status(400).json({
        error: "Plaid error",
        details: plaidError.response?.data?.error_message || plaidError.message,
        error_code: plaidError.response?.data?.error_code,
      });
    }

    return res.status(500).json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
