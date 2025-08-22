// Edge Function implementation with fallback to REST API
export const updateCustomerProfileViaEdgeFunction = async (
  baseURL: string,
  apiKey: string,
  accessToken: string | null,
  customerId: string,
  updateData: {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string | null;
    date_of_birth?: string | null;
    bio?: string | null;
    image_url?: string | null;
  },
): Promise<void> => {
  console.log("Attempting customer profile update", {
    customerId,
    updateData,
    hasAccessToken: !!accessToken,
  });

  // First, try the Edge Function approach
  try {
    console.log("Trying Edge Function approach...");
    const response = await fetch(
      `${baseURL}/functions/v1/update-customer-profile`,
      {
        method: "POST",
        headers: {
          apikey: apiKey,
          Authorization: `Bearer ${accessToken || apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: customerId,
          ...updateData,
        }),
      },
    );

    const responseText = await response.text();

    console.log("Edge Function response", {
      status: response.status,
      statusText: response.statusText,
      responseText,
      ok: response.ok,
    });

    if (!response.ok) {
      let errorMessage;
      try {
        const errorData = JSON.parse(responseText);
        errorMessage = errorData.error || errorData.message || responseText;
      } catch {
        errorMessage =
          responseText || `HTTP ${response.status} - ${response.statusText}`;
      }

      // Handle specific error types
      if (response.status === 401) {
        throw new Error("Authentication failed. Please sign in again.");
      } else if (response.status === 409) {
        throw new Error(
          `Database conflict occurred: ${errorMessage}. Please try again or contact support.`,
        );
      } else {
        throw new Error(`Failed to update customer profile: ${errorMessage}`);
      }
    }

    console.log("Successfully updated customer profile via Edge Function");
    return; // Success, exit early
  } catch (edgeFunctionError: any) {
    console.warn(
      "Edge Function failed, falling back to REST API:",
      edgeFunctionError.message,
    );

    // If it's a network error (Failed to fetch), try the fallback
    if (
      edgeFunctionError.message?.includes("Failed to fetch") ||
      edgeFunctionError.message?.includes("ERR_NETWORK") ||
      edgeFunctionError.message?.includes("TypeError")
    ) {
      console.log("Using REST API fallback approach...");

      // Fallback to REST API approach
      try {
        // First check if record exists
        const checkResponse = await fetch(
          `${baseURL}/rest/v1/customer_profiles?user_id=eq.${customerId}&select=user_id`,
          {
            method: "GET",
            headers: {
              apikey: apiKey,
              Authorization: `Bearer ${accessToken || apiKey}`,
              "Content-Type": "application/json",
            },
          },
        );

        const checkText = await checkResponse.text();
        let recordExists = false;

        if (checkResponse.ok) {
          try {
            const records = JSON.parse(checkText);
            recordExists = Array.isArray(records) && records.length > 0;
          } catch (parseError) {
            console.warn("Error parsing check response:", parseError);
          }
        }

        // Update or create record
        const method = recordExists ? "PATCH" : "POST";
        const url = recordExists
          ? `${baseURL}/rest/v1/customer_profiles?user_id=eq.${customerId}`
          : `${baseURL}/rest/v1/customer_profiles`;

        const body = recordExists
          ? updateData
          : {
              user_id: customerId,
              ...updateData,
              is_active: true,
              email_notifications: true,
              sms_notifications: true,
              push_notifications: true,
              marketing_emails: false,
              email_verified: false,
              phone_verified: false,
            };

        const restResponse = await fetch(url, {
          method,
          headers: {
            apikey: apiKey,
            Authorization: `Bearer ${accessToken || apiKey}`,
            "Content-Type": "application/json",
            Prefer: "return=minimal",
          },
          body: JSON.stringify(body),
        });

        if (!restResponse.ok) {
          const restResponseText = await restResponse.text();
          throw new Error(
            `REST API failed: HTTP ${restResponse.status} - ${restResponseText}`,
          );
        }

        console.log(
          "Successfully updated customer profile via REST API fallback",
        );
        return; // Success
      } catch (restError: any) {
        console.error("REST API fallback also failed:", restError);
        throw new Error(
          `Both Edge Function and REST API failed. Edge Function: ${edgeFunctionError.message}, REST API: ${restError.message}`,
        );
      }
    } else {
      // If it's not a network error, re-throw the original Edge Function error
      throw edgeFunctionError;
    }
  }
};
