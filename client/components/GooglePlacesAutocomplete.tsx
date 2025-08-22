import React, { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { MapPin, Loader2 } from "lucide-react";

interface GooglePlacesAutocompleteProps {
  value: string;
  onChange: (value: string, placeData?: google.maps.places.PlaceResult) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

// Declare global Google Maps types
declare global {
  interface Window {
    google?: typeof google;
    initGoogleMaps?: () => void;
    gm_authFailure?: () => void;
  }
}

const GooglePlacesAutocomplete: React.FC<GooglePlacesAutocompleteProps> = ({
  value,
  onChange,
  placeholder = "Enter your address",
  className,
  disabled = false,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(false);
  const [billingError, setBillingError] = useState(false);

  // Google Maps API key
  const GOOGLE_MAPS_API_KEY =
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY ||
    "AIzaSyDuTYClctxxl_cq2Hr8gKbuOY-1-t4bqfw";

  // Debug API key source in cloud environment
  console.log("Google Maps API Key Debug:", {
    fromEnv: !!import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    envValue:
      import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.substring(0, 15) + "...",
    finalKey: GOOGLE_MAPS_API_KEY?.substring(0, 15) + "...",
    domain: window.location.hostname,
    protocol: window.location.protocol,
    url: window.location.href,
    isDev: import.meta.env.DEV,
    mode: import.meta.env.MODE,
  });

  const loadGoogleMapsScript = () => {
    return new Promise<void>((resolve, reject) => {
      // Check if API key is available
      if (!GOOGLE_MAPS_API_KEY) {
        setIsLoading(false);
        reject(new Error("Google Maps API key not configured"));
        return;
      }

      // Check if Google Maps is already loaded
      if (window.google && window.google.maps && window.google.maps.places) {
        setIsGoogleMapsLoaded(true);
        setIsLoading(false);
        resolve();
        return;
      }

      // Check if script is already being loaded
      if (document.querySelector('script[src*="maps.googleapis.com"]')) {
        // Wait for the existing script to load
        window.initGoogleMaps = () => {
          setIsGoogleMapsLoaded(true);
          setIsLoading(false);
          resolve();
        };
        return;
      }

      // Create and load the script
      const script = document.createElement("script");
      const scriptUrl = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&callback=initGoogleMaps`;
      script.src = scriptUrl;
      script.async = true;
      script.defer = true;

      console.log("Loading Google Maps script:", {
        url: scriptUrl.replace(GOOGLE_MAPS_API_KEY, "API_KEY_HIDDEN"),
        timestamp: new Date().toISOString(),
      });

      window.initGoogleMaps = () => {
        console.log("Google Maps script loaded successfully");
        console.log(
          "API Key (first 10 chars):",
          GOOGLE_MAPS_API_KEY?.substring(0, 10),
        );

        // Test if Places API is actually working
        try {
          if (window.google?.maps?.places) {
            console.log("Places API is available");
          } else {
            console.error("Places API not available after script load");
          }
        } catch (e) {
          console.error("Error accessing Places API:", e);
        }

        setIsGoogleMapsLoaded(true);
        setIsLoading(false);
        resolve();
      };

      // Handle Google Maps authentication/billing failures
      window.gm_authFailure = () => {
        console.error("Google Maps authentication failure detected");
        console.error("API Key being used:", GOOGLE_MAPS_API_KEY);
        console.error("Please check:");
        console.error("1. API key is valid");
        console.error("2. Places API is enabled");
        console.error("3. Maps JavaScript API is enabled");
        console.error("4. API key restrictions (domain, IP, etc.)");
        console.error("5. Billing is properly configured");
        setIsGoogleMapsLoaded(false);
        setIsLoading(false);
        setBillingError(true);
        resolve();
      };

      script.onerror = (error) => {
        console.warn(
          "Google Maps script failed to load (network restricted), falling back to manual input:",
          error,
        );
        setIsLoading(false);
        setIsGoogleMapsLoaded(false);
        setBillingError(true);
        // Don't reject, just continue without Google Maps
        resolve();
      };

      // Add timeout to prevent hanging
      const timeout = setTimeout(() => {
        console.warn(
          "Google Maps script loading timeout, falling back to manual input",
        );
        setIsLoading(false);
        setIsGoogleMapsLoaded(false);
        setBillingError(true);
        resolve();
      }, 10000); // 10 second timeout

      // Clear timeout if script loads successfully
      const originalInitGoogleMaps = window.initGoogleMaps;
      window.initGoogleMaps = () => {
        clearTimeout(timeout);
        if (originalInitGoogleMaps) originalInitGoogleMaps();
      };

      document.head.appendChild(script);
    });
  };

  const initializeAutocomplete = () => {
    if (
      !inputRef.current ||
      !window.google ||
      !window.google.maps ||
      !window.google.maps.places
    ) {
      console.log("Google Maps not ready for autocomplete initialization");
      return;
    }

    try {
      console.log("Initializing Google Places Autocomplete...");

      // Create autocomplete instance
      autocompleteRef.current = new window.google.maps.places.Autocomplete(
        inputRef.current,
        {
          types: ["address"],
          componentRestrictions: { country: "us" }, // Restrict to US addresses
          fields: [
            "address_components",
            "formatted_address",
            "geometry",
            "place_id",
            "name",
          ],
        },
      );

      console.log("Google Places Autocomplete initialized successfully");

      // Listen for place selection
      autocompleteRef.current.addListener("place_changed", () => {
        const place = autocompleteRef.current?.getPlace();
        console.log("Place selected:", place);

        if (place && place.formatted_address) {
          onChange(place.formatted_address, place);
        }
      });

      // Listen for autocomplete errors
      autocompleteRef.current.addListener("error", (error: any) => {
        console.error("Google Places Autocomplete error:", error);
        if (
          error &&
          (error.code === "BILLING_NOT_ENABLED" ||
            error.message?.includes("billing") ||
            error.message?.includes("BillingNotEnabledMapError"))
        ) {
          setBillingError(true);
        }
      });
    } catch (error: any) {
      console.error("Error initializing Google Places Autocomplete:", error);
      if (
        error.message?.includes("billing") ||
        error.message?.includes("BillingNotEnabledMapError")
      ) {
        setBillingError(true);
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    // Check for Google Maps authentication errors
    window.gm_authFailure = () => {
      console.error("Google Maps authentication failed - check API key");
      setIsLoading(false);
      setBillingError(true);
    };

    // Check for billing errors
    window.gm_authFailure = () => {
      console.error("Google Maps billing not enabled");
      setIsLoading(false);
      setBillingError(true);
    };

    loadGoogleMapsScript().catch((error) => {
      console.warn("Google Maps unavailable, using manual input:", error);
      console.error("Google Maps error details:", {
        message: error.message,
        stack: error.stack,
        apiKey: GOOGLE_MAPS_API_KEY?.substring(0, 10) + "...",
      });
      setBillingError(true);
      setIsLoading(false);
    });

    // Global error handler for Google Maps
    window.addEventListener("error", (event) => {
      if (
        event.message &&
        (event.message.includes("BillingNotEnabledMapError") ||
          event.message.includes("billing"))
      ) {
        console.error("Google Maps billing error detected");
        setBillingError(true);
        setIsLoading(false);
      }
    });

    // Cleanup
    return () => {
      if (window.gm_authFailure) {
        delete window.gm_authFailure;
      }
    };
  }, []);

  useEffect(() => {
    if (isGoogleMapsLoaded && !autocompleteRef.current) {
      initializeAutocomplete();
    }
  }, [isGoogleMapsLoaded]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (autocompleteRef.current) {
        window.google?.maps?.event?.clearInstanceListeners(
          autocompleteRef.current,
        );
      }
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
  };

  const handleInputFocus = () => {
    // Re-initialize autocomplete if needed
    if (isGoogleMapsLoaded && !autocompleteRef.current) {
      initializeAutocomplete();
    }
  };

  return (
    <div className="relative">
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={value}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          placeholder={placeholder}
          disabled={disabled}
          className={cn("pl-10", className)}
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {!isGoogleMapsLoaded && !isLoading && (
        <div className="mt-1 text-xs text-muted-foreground">
          {!GOOGLE_MAPS_API_KEY ? (
            <>📍 Manual address entry (Google Maps API key not configured)</>
          ) : billingError ? (
            <div className="text-amber-600">
              ⚠️ Google Maps requires billing to be enabled. Manual address
              entry only.
              <br />
              <a
                href="https://console.cloud.google.com/project/_/billing/enable"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-amber-800"
              >
                Enable billing on Google Cloud
              </a>
            </div>
          ) : (
            <>⚠️ Google Maps not available. Manual address entry only.</>
          )}
        </div>
      )}
    </div>
  );
};

export default GooglePlacesAutocomplete;
