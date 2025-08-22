import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client with service role key for admin operations
const supabaseUrl = process.env.VITE_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "DELETE") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    console.log(`Admin: Deleting test user with email: ${email}`);

    // First, find the user by email
    const { data: users, error: userError } =
      await supabase.auth.admin.listUsers();

    if (userError) {
      console.error("Error fetching users:", userError);
      return res.status(500).json({ error: "Failed to fetch users" });
    }

    const user = users.users.find((u) => u.email === email);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const userId = user.id;
    console.log(`Found user ID: ${userId}`);

    // Delete from related tables first (to avoid foreign key constraints)
    const deleteOperations = [
      // Delete provider documents
      supabase.from("provider_documents").delete().eq("user_id", userId),

      // Delete provider applications
      supabase.from("provider_applications").delete().eq("user_id", userId),

      // Delete business setup progress if it exists
      supabase
        .from("business_setup_progress")
        .delete()
        .eq("user_id", userId)
        .then((result) => {
          // Don't fail if table doesn't exist
          if (
            result.error &&
            !result.error.message.includes("does not exist")
          ) {
            console.warn(
              "Error deleting business_setup_progress:",
              result.error,
            );
          }
          return result;
        }),
    ];

    // Execute all delete operations
    const results = await Promise.allSettled(deleteOperations);

    // Log any errors but don't fail the entire operation
    results.forEach((result, index) => {
      if (result.status === "rejected") {
        console.warn(`Delete operation ${index} failed:`, result.reason);
      }
    });

    // Finally, delete the user from auth
    const { error: authDeleteError } =
      await supabase.auth.admin.deleteUser(userId);

    if (authDeleteError) {
      console.error("Error deleting user from auth:", authDeleteError);
      return res.status(500).json({
        error: "Failed to delete user from auth",
        details: authDeleteError.message,
      });
    }

    console.log(`✅ Successfully deleted test user: ${email}`);

    return res.status(200).json({
      success: true,
      message: `User ${email} has been successfully deleted`,
      deletedUserId: userId,
    });
  } catch (error: any) {
    console.error("Admin delete user error:", error);
    return res.status(500).json({
      error: error.message || "Internal server error",
      details: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
}
