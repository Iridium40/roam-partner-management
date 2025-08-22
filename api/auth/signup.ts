import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { EmailService } from "../../server/services/emailService";

// Initialize Supabase client with service role key for admin operations
const supabaseUrl = process.env.VITE_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface SignupData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  dateOfBirth: string;
  agreedToTerms: boolean;
  agreedToBackground: boolean;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS",
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const signupData: SignupData = req.body;

    // Validate required fields
    const requiredFields: (keyof SignupData)[] = [
      "email",
      "password",
      "firstName",
      "lastName",
      "phone",
      "dateOfBirth",
    ];
    for (const field of requiredFields) {
      if (!signupData[field]) {
        return res
          .status(400)
          .json({ error: `Missing required field: ${field}` });
      }
    }

    // Validate agreements
    if (!signupData.agreedToTerms) {
      return res
        .status(400)
        .json({ error: "You must agree to the Terms of Service" });
    }

    if (!signupData.agreedToBackground) {
      return res
        .status(400)
        .json({ error: "You must consent to background check" });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(signupData.email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    // Validate password strength
    if (signupData.password.length < 8) {
      return res
        .status(400)
        .json({ error: "Password must be at least 8 characters long" });
    }

    // Validate age (must be 18+)
    const birthDate = new Date(signupData.dateOfBirth);
    const age = new Date().getFullYear() - birthDate.getFullYear();
    if (age < 18) {
      return res.status(400).json({
        error: "You must be at least 18 years old to register as a provider",
      });
    }

    console.log("Creating user account for:", signupData.email);

    // Create user with Supabase Auth using admin API
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email: signupData.email,
        password: signupData.password,
        email_confirm: true, // Auto-confirm email for now
        user_metadata: {
          first_name: signupData.firstName,
          last_name: signupData.lastName,
          phone: signupData.phone,
          date_of_birth: signupData.dateOfBirth,
          agreed_to_terms: signupData.agreedToTerms,
          agreed_to_background: signupData.agreedToBackground,
          onboarding_step: "business_info",
          created_at: new Date().toISOString(),
        },
      });

    if (authError) {
      console.error("Auth error:", authError);

      // Handle specific Supabase auth errors
      if (
        authError.code === "email_exists" ||
        authError.message.includes("already registered") ||
        authError.message.includes("already been registered")
      ) {
        return res.status(409).json({
          error: "An account with this email already exists",
          code: "email_exists"
        });
      }

      return res.status(400).json({
        error: authError.message || "Failed to create user account",
        details: authError,
        code: authError.code || "unknown_error"
      });
    }

    if (!authData.user) {
      return res
        .status(500)
        .json({ error: "Failed to create user - no user data returned" });
    }

    console.log("User created successfully:", authData.user.id);

    // Create initial entry in provider_applications table (only with valid columns)
    const { error: applicationError } = await supabase
      .from("provider_applications")
      .insert({
        user_id: authData.user.id,
        application_status: "draft",
        review_status: "pending",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    if (applicationError) {
      console.error("Error creating provider application:", applicationError);
      // Don't fail the signup if application creation fails - we can retry later
    }

    // Send welcome email (don't fail signup if email fails)
    try {
      const emailSent = await EmailService.sendWelcomeEmail(
        signupData.email,
        signupData.firstName,
      );
      if (!emailSent) {
        console.error(
          "Failed to send welcome email, but continuing with signup",
        );
      }
    } catch (emailError) {
      console.error("Error sending welcome email:", emailError);
      if (
        emailError.name === "validation_error" &&
        emailError.message?.includes("domain is not verified")
      ) {
        console.log(
          "💡 Domain verification needed: Add and verify 'roamyourbestlife.com' at https://resend.com/domains",
        );
      }
      // Continue with signup even if email fails
    }

    return res.status(201).json({
      success: true,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        firstName: signupData.firstName,
        lastName: signupData.lastName,
        phone: signupData.phone,
        dateOfBirth: signupData.dateOfBirth,
      },
      message: "Account created successfully",
    });
  } catch (error: any) {
    console.error("Signup error:", error);
    return res.status(500).json({
      error: error.message || "Internal server error",
      details: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
}
