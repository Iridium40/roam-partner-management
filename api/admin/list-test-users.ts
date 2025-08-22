import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client with service role key for admin operations
const supabaseUrl = process.env.VITE_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    console.log("Admin: Listing test users...");

    // Get all users from auth
    const { data: users, error: userError } =
      await supabase.auth.admin.listUsers();

    if (userError) {
      console.error("Error fetching users:", userError);
      return res.status(500).json({ error: "Failed to fetch users" });
    }

    // Filter test users (exclude production emails)
    const testUsers = users.users
      .filter((user) => {
        const email = user.email || "";
        // Consider test users those with common test domains or patterns
        return (
          email.includes("test") ||
          email.includes("example.com") ||
          email.includes("demo") ||
          email.includes("@gmail.com")
        ); // You can adjust this filter
      })
      .map((user) => ({
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at,
        email_confirmed_at: user.email_confirmed_at,
      }))
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );

    console.log(`Found ${testUsers.length} test users`);

    return res.status(200).json({
      success: true,
      count: testUsers.length,
      users: testUsers,
      message: `Found ${testUsers.length} test users`,
    });
  } catch (error: any) {
    console.error("Admin list users error:", error);
    return res.status(500).json({
      error: error.message || "Internal server error",
      details: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
}
