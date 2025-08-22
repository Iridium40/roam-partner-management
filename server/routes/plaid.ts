import { Request, Response } from "express";
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

export async function createLinkToken(req: Request, res: Response) {
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

    console.log("Creating Plaid link token for:", { userId, businessId, businessType });

    // For local development, skip business verification if needed
    if (process.env.NODE_ENV === "development") {
      console.log("Development mode: Skipping business verification");
    } else {
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
    }

    // Get user information for Plaid
    let userData;
    try {
      const { data, error } = await supabase.auth.admin.getUserById(userId);
      if (error) {
        console.error("Error fetching user:", error);
        if (process.env.NODE_ENV === "development") {
          console.log("Development mode: Using mock user data");
          userData = { user: { id: userId, email: "test@example.com" } };
        } else {
          return res.status(404).json({ error: "User not found" });
        }
      } else {
        userData = data;
      }
    } catch (error) {
      console.error("Error in user lookup:", error);
      if (process.env.NODE_ENV === "development") {
        console.log("Development mode: Using mock user data after error");
        userData = { user: { id: userId, email: "test@example.com" } };
      } else {
        return res.status(404).json({ error: "User not found" });
      }
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
      // Only include webhook if it's set
      ...(process.env.PLAID_WEBHOOK_URL && { webhook: process.env.PLAID_WEBHOOK_URL }),
      // Simplify account filters for testing
      account_filters: {
        depository: {
          account_subtypes: ["checking"],
        },
      },
    };

    console.log("Plaid request:", JSON.stringify(request, null, 2));
    console.log("Plaid environment:", process.env.PLAID_ENV);
    console.log("Plaid client ID set:", !!process.env.PLAID_CLIENT_ID);
    console.log("Plaid secret set:", !!process.env.PLAID_SECRET);

    const response = await client.linkTokenCreate(request);
    
    console.log("Plaid link token created successfully");

    res.json({
      link_token: response.data.link_token,
      expiration: response.data.expiration,
    });
  } catch (error) {
    console.error("Error creating Plaid link token:", error);
    res.status(500).json({
      error: "Failed to create Plaid link token",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

export async function exchangePublicToken(req: Request, res: Response) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      public_token,
      account_id,
      userId,
      businessId,
      metadata,
    } = req.body;

    if (!public_token || !account_id || !userId || !businessId) {
      return res.status(400).json({
        error: "Missing required fields: public_token, account_id, userId, businessId",
      });
    }

    console.log("Exchanging Plaid public token for:", { userId, businessId, account_id });

    // Exchange public token for access token
    const exchangeResponse = await client.itemPublicTokenExchange({
      public_token,
    });

    const accessToken = exchangeResponse.data.access_token;
    const itemId = exchangeResponse.data.item_id;

    // Get account information
    const accountsResponse = await client.accountsGet({
      access_token: accessToken,
    });

    const selectedAccount = accountsResponse.data.accounts.find(
      (account) => account.account_id === account_id
    );

    if (!selectedAccount) {
      return res.status(400).json({ error: "Selected account not found" });
    }

    // Store the connection in your database
    const { error: dbError } = await supabase
      .from("plaid_connections")
      .upsert({
        user_id: userId,
        business_id: businessId,
        access_token: accessToken,
        item_id: itemId,
        account_id: account_id,
        institution_name: metadata?.institution?.name || "Unknown Bank",
        account_name: selectedAccount.name,
        account_mask: selectedAccount.mask,
        account_type: selectedAccount.type,
        account_subtype: selectedAccount.subtype,
        created_at: new Date().toISOString(),
      });

    if (dbError) {
      console.error("Database error:", dbError);
      return res.status(500).json({ error: "Failed to save bank connection" });
    }

    console.log("Plaid connection saved successfully");

    res.json({
      success: true,
      connection: {
        access_token: accessToken,
        item_id: itemId,
        accounts: [selectedAccount],
        institution: metadata?.institution,
      },
    });
  } catch (error) {
    console.error("Error exchanging Plaid public token:", error);
    res.status(500).json({
      error: "Failed to exchange public token",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

export async function checkConnection(req: Request, res: Response) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { userId } = req.params;
    const { businessId } = req.query;

    if (!userId || !businessId) {
      return res.status(400).json({ error: "Missing userId or businessId" });
    }

    console.log("Checking existing Plaid connection for:", { userId, businessId });

    // Check for existing connection in database
    let connection = null;
    try {
      const { data, error } = await supabase
        .from("plaid_connections")
        .select("*")
        .eq("user_id", userId)
        .eq("business_id", businessId)
        .single();

      if (error && error.code !== "PGRST116") { // PGRST116 is "not found"
        console.error("Database error:", error);
        // In development, don't fail if table doesn't exist
        if (process.env.NODE_ENV === "development" && error.code === "42P01") {
          console.log("Development mode: plaid_connections table doesn't exist, continuing");
        } else {
          return res.status(500).json({ error: "Failed to check connection" });
        }
      } else {
        connection = data;
      }
    } catch (error) {
      console.error("Error checking connection:", error);
      // In development, don't fail if table doesn't exist
      if (process.env.NODE_ENV === "development") {
        console.log("Development mode: Error checking connection, continuing");
      } else {
        return res.status(500).json({ error: "Failed to check connection" });
      }
    }

    if (connection) {
      console.log("Found existing connection");
      res.json({
        connection: {
          access_token: connection.access_token,
          item_id: connection.item_id,
          accounts: [{
            account_id: connection.account_id,
            name: connection.account_name,
            mask: connection.account_mask,
            type: connection.account_type,
            subtype: connection.account_subtype,
          }],
          institution: {
            name: connection.institution_name,
          },
        },
      });
    } else {
      console.log("No existing connection found");
      res.json({ connection: null });
    }
  } catch (error) {
    console.error("Error checking connection:", error);
    res.status(500).json({
      error: "Failed to check connection",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
