import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Configuration, PlaidApi, PlaidEnvironments } from "plaid";
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

interface ExchangeTokenRequest {
  public_token: string;
  account_id: string;
  userId: string;
  businessId: string;
  metadata: {
    institution: {
      name: string;
      institution_id: string;
    };
    account: {
      id: string;
      name: string;
      mask?: string;
      type: string;
      subtype: string;
    };
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
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
    }: ExchangeTokenRequest = req.body;

    if (!public_token || !account_id || !userId || !businessId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Verify business profile exists
    const { data: businessProfile, error: businessError } = await supabase
      .from("business_profiles")
      .select("*")
      .eq("id", businessId)
      .eq("owner_user_id", userId)
      .single();

    if (businessError || !businessProfile) {
      return res.status(404).json({ error: "Business profile not found" });
    }

    // Exchange public token for access token
    const exchangeResponse = await client.itemPublicTokenExchange({
      public_token,
    });

    const { access_token, item_id } = exchangeResponse.data;

    // Get account information
    const accountsResponse = await client.accountsGet({
      access_token,
    });

    const selectedAccount = accountsResponse.data.accounts.find(
      (account) => account.account_id === account_id,
    );

    if (!selectedAccount) {
      return res.status(400).json({ error: "Selected account not found" });
    }

    // Get institution information
    const institutionResponse = await client.institutionsGetById({
      institution_id: metadata.institution.institution_id,
      country_codes: ["US" as any],
    });

    const institution = institutionResponse.data.institution;

    // Perform account verification (Auth product)
    const authResponse = await client.authGet({
      access_token,
    });

    const accountAuth = authResponse.data.accounts.find(
      (account) => account.account_id === account_id,
    );

    if (!accountAuth) {
      return res.status(400).json({ error: "Account verification failed" });
    }

    // Store bank connection in database
    const connectionData = {
      user_id: userId,
      business_id: businessId,
      plaid_access_token: access_token,
      plaid_item_id: item_id,
      plaid_account_id: account_id,
      institution_id: institution.institution_id,
      institution_name: institution.name,
      account_name: selectedAccount.name,
      account_mask: selectedAccount.mask,
      account_type: selectedAccount.type,
      account_subtype: selectedAccount.subtype,
      verification_status: "verified",
      routing_numbers: (accountAuth as any).numbers?.ach?.map((ach: any) => ach.routing) || [],
      account_number_mask: (accountAuth as any).numbers?.ach?.[0]?.account || "",
      connected_at: new Date().toISOString(),
      is_active: true,
    };

    const { data: dbConnection, error: dbError } = await supabase
      .from("plaid_bank_connections")
      .upsert(connectionData, {
        onConflict: "business_id",
      })
      .select()
      .single();

    if (dbError) {
      console.error("Error storing bank connection:", dbError);
      return res.status(500).json({ error: "Failed to store bank connection" });
    }

    // Update business profile to mark bank connection as complete
    const { error: updateError } = await supabase
      .from("business_profiles")
      .update({
        bank_connected: true,
        bank_connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", businessId);

    if (updateError) {
      console.error("Error updating business profile:", updateError);
      // Continue anyway - connection was successful
    }

    // Update setup progress
    const { error: progressError } = await supabase
      .from("business_setup_progress")
      .update({
        plaid_connected: true,
        current_step: Math.max(6, dbConnection ? 6 : 5),
        updated_at: new Date().toISOString(),
      })
      .eq("business_id", businessId);

    if (progressError) {
      console.error("Error updating setup progress:", progressError);
    }

    // Return connection data (without sensitive tokens)
    const responseData = {
      access_token, // This will be used for further Plaid operations
      item_id,
      institution: {
        name: institution.name,
        institution_id: institution.institution_id,
      },
      accounts: [
        {
          account_id: selectedAccount.account_id,
          name: selectedAccount.name,
          mask: selectedAccount.mask,
          type: selectedAccount.type,
          subtype: selectedAccount.subtype,
          verification_status: "verified",
        },
      ],
      connected_at: dbConnection.connected_at,
    };

    return res.status(200).json(responseData);
  } catch (error) {
    console.error("Plaid token exchange error:", error);

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
