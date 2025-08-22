import { VercelRequest, VercelResponse } from "@vercel/node";
import jwt from "jsonwebtoken";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      businessId,
      userId = "test-user-123",
      applicationId = "test-app-123",
    } = req.body;

    if (!businessId) {
      return res.status(400).json({ error: "businessId is required" });
    }

    // Generate Phase 2 secure token with proper structure
    const phase2TokenPayload = {
      business_id: businessId,
      user_id: userId,
      application_id: applicationId,
      issued_at: Date.now(),
      expires_at: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
      phase: "phase2",
    };

    const jwtSecret = process.env.JWT_SECRET || "your-default-secret-key";

    const token = jwt.sign(phase2TokenPayload, jwtSecret, { expiresIn: "7d" });

    // Generate the Phase 2 URL
    const baseUrl =
      req.headers.origin || process.env.FRONTEND_URL || "http://localhost:8080";
    const phase2Url = `${baseUrl}/provider-onboarding/phase2?token=${token}`;

    return res.status(200).json({
      success: true,
      businessId,
      userId,
      applicationId,
      token,
      phase2Url,
      expiresAt: new Date(phase2TokenPayload.expires_at).toISOString(),
      message: "Phase 2 token generated successfully",
    });
  } catch (error) {
    console.error("Token generation error:", error);
    return res.status(500).json({
      error: "Failed to generate token",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
