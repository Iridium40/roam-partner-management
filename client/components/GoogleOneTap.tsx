import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";

// TypeScript declarations for Google One Tap
declare global {
  interface Window {
    google: {
      accounts: {
        id: {
          initialize: (config: GoogleOneTapConfig) => void;
          prompt: (
            callback?: (notification: GoogleOneTapNotification) => void,
          ) => void;
          cancel: () => void;
          disableAutoSelect: () => void;
        };
      };
    };
  }
}

interface GoogleOneTapConfig {
  client_id: string;
  callback: (response: CredentialResponse) => void;
  nonce?: string;
  auto_select?: boolean;
  cancel_on_tap_outside?: boolean;
  use_fedcm_for_prompt?: boolean;
}

interface CredentialResponse {
  credential: string;
  select_by: string;
}

interface GoogleOneTapNotification {
  isDisplayed: () => boolean;
  isNotDisplayed: () => boolean;
  getNotDisplayedReason: () => string;
  isSkippedMoment: () => boolean;
  getSkippedReason: () => string;
  isDismissedMoment: () => boolean;
  getDismissedReason: () => string;
}

// Generate nonce for Google ID token sign-in
const generateNonce = async (): Promise<[string, string]> => {
  const nonce = btoa(
    String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))),
  );
  const encoder = new TextEncoder();
  const encodedNonce = encoder.encode(nonce);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encodedNonce);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashedNonce = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return [nonce, hashedNonce];
};

interface GoogleOneTapProps {
  clientId: string;
  onSuccess?: () => void;
  onError?: (error: any) => void;
}

const GoogleOneTap: React.FC<GoogleOneTapProps> = ({
  clientId,
  onSuccess,
  onError,
}) => {
  const { customer, signInWithGoogleIdToken } = useAuth();
  const scriptLoaded = useRef(false);
  const initialized = useRef(false);

  useEffect(() => {
    // Don't show One Tap if user is already signed in
    if (customer) return;

    const loadGoogleScript = () => {
      if (scriptLoaded.current) return;

      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = initializeGoogleOneTap;
      document.head.appendChild(script);
      scriptLoaded.current = true;
    };

    const initializeGoogleOneTap = async () => {
      if (initialized.current || !window.google?.accounts?.id) return;

      try {
        console.log("Initializing Google One Tap", {
          clientId,
          origin: window.location.origin,
          hostname: window.location.hostname,
        });
        const [nonce, hashedNonce] = await generateNonce();

        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async (response: CredentialResponse) => {
            try {
              console.log("Google One Tap callback received");

              // Use the new signInWithGoogleIdToken method if available
              if (signInWithGoogleIdToken) {
                await signInWithGoogleIdToken(response.credential, nonce);
              } else {
                // Fallback to direct Supabase call
                const { supabase } = await import("@/lib/supabase");
                const { data, error } = await supabase.auth.signInWithIdToken({
                  provider: "google",
                  token: response.credential,
                  nonce,
                });

                if (error) throw error;
                console.log("Successfully signed in with Google One Tap");
              }

              onSuccess?.();
            } catch (error) {
              console.error("Error signing in with Google One Tap:", error);
              onError?.(error);
            }
          },
          nonce: hashedNonce,
          auto_select: false,
          cancel_on_tap_outside: true,
          use_fedcm_for_prompt: false, // Disable FedCM to avoid permission errors
        });

        // Show the One Tap prompt
        window.google.accounts.id.prompt((notification) => {
          if (notification.isNotDisplayed()) {
            const reason = notification.getNotDisplayedReason();
            console.log("Google One Tap not displayed:", reason);

            // Handle origin-related errors
            if (reason.includes("origin") || reason.includes("domain")) {
              console.warn(
                "Google OAuth origin error detected. Check that the current domain is configured in Google Cloud Console:",
                window.location.origin,
              );
            }
          } else if (notification.isSkippedMoment()) {
            console.log(
              "Google One Tap skipped:",
              notification.getSkippedReason(),
            );
          } else if (notification.isDismissedMoment()) {
            console.log(
              "Google One Tap dismissed:",
              notification.getDismissedReason(),
            );
          }
        });

        initialized.current = true;
      } catch (error: any) {
        console.error("Error initializing Google One Tap:", error);

        // Provide more specific error messages for common issues
        if (
          error.message?.includes("origin") ||
          error.message?.includes("domain")
        ) {
          console.error(
            "Google OAuth Configuration Error:",
            `The current domain (${window.location.origin}) is not authorized for this Google Client ID.`,
            "Please add this domain to the OAuth consent screen in Google Cloud Console.",
          );
        }

        onError?.(error);
      }
    };

    // Load the script
    loadGoogleScript();

    // Cleanup function
    return () => {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.cancel();
      }
    };
  }, [clientId, customer, onSuccess, onError, signInWithGoogleIdToken]);

  // This component doesn't render anything visible
  return null;
};

export default GoogleOneTap;
