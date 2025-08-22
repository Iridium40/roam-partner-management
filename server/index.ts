import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import { getOnboardingStatus } from "./routes/onboarding";
import {
  handleEdgeNotifications,
  handleNotificationUpdates,
} from "./routes/edge-notifications";

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
  // Disable body parsing for file uploads - let multer handle it
  app.use('/api/onboarding/upload-documents', (req, res, next) => {
    console.log("Local server: Disabling body parser for upload-documents");
    next();
  });

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);

  // Basic onboarding route
  app.get("/api/onboarding/status/:userId", getOnboardingStatus);

  // Business info route - use Vercel API function
  app.post("/api/onboarding/business-info", async (req, res) => {
    try {
      const businessInfoHandler = await import(
        "../api/onboarding/business-info"
      );
      await businessInfoHandler.default(req, res);
    } catch (error) {
      console.error("Error importing business-info handler:", error);
      res.status(500).json({ error: "Failed to load business-info handler" });
    }
  });



  // Auth signup route
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const signupHandler = await import("../api/auth/signup");
      await signupHandler.default(req, res);
    } catch (error) {
      console.error("Error importing signup handler:", error);
      res.status(500).json({ error: "Failed to load signup handler" });
    }
  });

  // Submit application route
  app.post("/api/onboarding/submit-application", async (req, res) => {
    try {
      const submitHandler = await import(
        "../api/onboarding/submit-application"
      );
      await submitHandler.default(req, res);
    } catch (error) {
      console.error("Error importing submit application handler:", error);
      res
        .status(500)
        .json({ error: "Failed to load submit application handler" });
    }
  });

  // Upload documents route
  app.post("/api/onboarding/upload-documents", async (req, res) => {
    try {
      console.log("Local server: Upload documents route called");
      console.log("Request headers:", req.headers);
      console.log("Request body keys:", Object.keys(req.body || {}));
      
      const uploadHandler = await import("../api/onboarding/upload-documents");
      await uploadHandler.default(req, res);
    } catch (error) {
      console.error("Error importing upload documents handler:", error);
      res
        .status(500)
        .json({ error: "Failed to load upload documents handler" });
    }
  });

  // Onboarding status route (dynamic parameter)
  app.get("/api/onboarding/status/:userId", async (req, res) => {
    try {
      const statusHandler = await import("../api/onboarding/status/[userId]");
      await statusHandler.default(req, res);
    } catch (error) {
      console.error("Error importing onboarding status handler:", error);
      res
        .status(500)
        .json({ error: "Failed to load onboarding status handler" });
    }
  });

  // Phase 2 validation route
  app.post("/api/onboarding/validate-phase2-token", async (req, res) => {
    try {
      const validateHandler = await import(
        "../api/onboarding/validate-phase2-token"
      );
      await validateHandler.default(req, res);
    } catch (error) {
      console.error("Error importing validate phase2 token handler:", error);
      res
        .status(500)
        .json({ error: "Failed to load validate phase2 token handler" });
    }
  });



  // Business profile routes
  app.get("/api/business/profile/:businessId", async (req, res) => {
    try {
      const profileHandler = await import(
        "../api/business/profile/[businessId]"
      );
      await profileHandler.default(req, res);
    } catch (error) {
      console.error("Error importing business profile handler:", error);
      res
        .status(500)
        .json({ error: "Failed to load business profile handler" });
    }
  });

  app.put("/api/business/profile/:businessId", async (req, res) => {
    try {
      const profileHandler = await import(
        "../api/business/profile/[businessId]"
      );
      await profileHandler.default(req, res);
    } catch (error) {
      console.error("Error importing business profile handler:", error);
      res
        .status(500)
        .json({ error: "Failed to load business profile handler" });
    }
  });

  // Provider profile routes
  app.get("/api/provider/profile/:userId", async (req, res) => {
    try {
      const profileHandler = await import("../api/provider/profile/[userId]");
      await profileHandler.default(req, res);
    } catch (error) {
      console.error("Error importing provider profile handler:", error);
      res
        .status(500)
        .json({ error: "Failed to load provider profile handler" });
    }
  });

  app.put("/api/provider/profile/:userId", async (req, res) => {
    try {
      const profileHandler = await import("../api/provider/profile/[userId]");
      await profileHandler.default(req, res);
    } catch (error) {
      console.error("Error importing provider profile handler:", error);
      res
        .status(500)
        .json({ error: "Failed to load provider profile handler" });
    }
  });

  // Phase 2 progress routes
  app.post("/api/onboarding/save-phase2-progress", async (req, res) => {
    try {
      const progressHandler = await import(
        "../api/onboarding/save-phase2-progress"
      );
      await progressHandler.default(req, res);
    } catch (error) {
      console.error("Error importing save phase2 progress handler:", error);
      res
        .status(500)
        .json({ error: "Failed to load save phase2 progress handler" });
    }
  });

  // Edge notifications routes (development equivalent)
  app.get("/api/notifications/edge", handleEdgeNotifications);
  app.patch("/api/notifications/edge", handleNotificationUpdates);

  return app;
}
