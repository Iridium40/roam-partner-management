import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client with service role key for admin operations
const supabaseUrl = process.env.VITE_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { userId, email } = req.method === "GET" ? req.query : req.body;

    if (!userId && !email) {
      return res.status(400).json({ error: "userId or email is required" });
    }

    let targetUserId = userId;

    // If email provided, look up userId
    if (email && !userId) {
      const { data: userData, error: userError } =
        await supabase.auth.admin.listUsers();
      if (userError) {
        return res
          .status(500)
          .json({ error: "Failed to lookup user by email" });
      }

      const user = userData.users.find((u) => u.email === email);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      targetUserId = user.id;
    }

    // Get user info
    const { data: userData, error: userError } =
      await supabase.auth.admin.getUserById(targetUserId as string);
    if (userError || !userData.user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Get provider records
    const { data: providerRecords, error: providerError } = await supabase
      .from("providers")
      .select("*")
      .eq("user_id", targetUserId);

    if (providerError) {
      console.error("Error fetching provider records:", providerError);
    }

    // Get business profiles for this user's businesses
    let businessProfiles = [];
    if (providerRecords && providerRecords.length > 0) {
      const businessIds = providerRecords.map((p) => p.business_id);
      const { data: businesses, error: businessError } = await supabase
        .from("business_profiles")
        .select("*")
        .in("id", businessIds);

      if (businessError) {
        console.error("Error fetching business profiles:", businessError);
      } else {
        businessProfiles = businesses || [];
      }
    }

    // If POST method, try to fix any broken relationships
    if (req.method === "POST") {
      const { fixRelationships } = req.body;

      if (fixRelationships && businessProfiles.length > 0) {
        // Ensure provider relationship exists for the most recent business
        const latestBusiness = businessProfiles.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        )[0];

        const existingProvider = providerRecords?.find(
          (p) =>
            p.business_id === latestBusiness.id && p.provider_role === "owner",
        );

        if (!existingProvider) {
          const { error: fixError } = await supabase.from("providers").upsert(
            {
              user_id: targetUserId,
              business_id: latestBusiness.id,
              email: userData.user.email,
              provider_role: "owner",
              verification_status: "pending",
              background_check_status: "under_review",
              is_active: false,
              business_managed: true,
            },
            {
              onConflict: "user_id,business_id",
            },
          );

          if (fixError) {
            return res.status(500).json({
              error: "Failed to fix provider relationship",
              details: fixError.message,
            });
          }

          return res.status(200).json({
            message: "Fixed provider relationship",
            user: userData.user,
            fixedBusinessId: latestBusiness.id,
          });
        }
      }
    }

    return res.status(200).json({
      user: {
        id: userData.user.id,
        email: userData.user.email,
        created_at: userData.user.created_at,
      },
      providerRecords: providerRecords || [],
      businessProfiles: businessProfiles || [],
      summary: {
        hasProviderRecord: (providerRecords?.length || 0) > 0,
        hasBusinessProfile: businessProfiles.length > 0,
        ownerRelationships:
          providerRecords?.filter((p) => p.provider_role === "owner").length ||
          0,
      },
    });
  } catch (error) {
    console.error("Debug user-business error:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
