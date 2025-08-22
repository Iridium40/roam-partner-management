// Direct Supabase API calls to bypass client hanging issues
const SUPABASE_URL = import.meta.env.VITE_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY;

interface AuthResponse {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  expires_at?: number;
  refresh_token?: string;
  user?: {
    id: string;
    email: string;
    [key: string]: any;
  };
  session?: any; // May be present in some responses
}

interface ProviderRecord {
  id: string;
  user_id: string;
  business_id: string;
  location_id: string;
  first_name: string;
  last_name: string;
  email: string;
  provider_role: "provider" | "owner" | "dispatcher";
  is_active: boolean;
  [key: string]: any;
}

interface CustomerRecord {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  is_active: boolean;
  [key: string]: any;
}

class DirectSupabaseAPI {
  private baseURL: string;
  private apiKey: string;
  private accessToken: string | null = null;

  constructor() {
    this.baseURL = SUPABASE_URL;
    this.apiKey = SUPABASE_ANON_KEY;
  }

  private getHeaders(useAuthToken = false): Record<string, string> {
    const headers: Record<string, string> = {
      apikey: this.apiKey,
      "Content-Type": "application/json",
    };

    if (useAuthToken && this.accessToken) {
      headers["Authorization"] = `Bearer ${this.accessToken}`;
    } else {
      headers["Authorization"] = `Bearer ${this.apiKey}`;
    }

    return headers;
  }

  async signInWithPassword(
    email: string,
    password: string,
  ): Promise<AuthResponse> {
    const response = await fetch(
      `${this.baseURL}/auth/v1/token?grant_type=password`,
      {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({
          email,
          password,
        }),
      },
    );

    let responseText = "";
    try {
      responseText = await response.text();
    } catch (readError) {
      console.warn("Could not read response text:", readError);
      responseText = `HTTP ${response.status} - ${response.statusText}`;
    }

    if (!response.ok) {
      throw new Error(`Authentication failed: ${responseText}`);
    }

    let authData: AuthResponse;
    try {
      authData = JSON.parse(responseText);
    } catch (parseError) {
      throw new Error(`Invalid response format: ${responseText}`);
    }

    this.accessToken = authData.access_token;
    return authData;
  }

  async getProviderByUserId(userId: string): Promise<ProviderRecord | null> {
    const response = await fetch(
      `${this.baseURL}/rest/v1/providers?user_id=eq.${userId}&is_active=eq.true&select=id,user_id,business_id,location_id,first_name,last_name,email,provider_role,is_active`,
      {
        headers: this.getHeaders(true),
      },
    );

    const responseText = await response.text();

    if (!response.ok) {
      throw new Error(`Provider lookup failed: ${responseText}`);
    }

    let providers: ProviderRecord[];
    try {
      providers = JSON.parse(responseText);
    } catch (parseError) {
      throw new Error(`Invalid response format: ${responseText}`);
    }

    return providers.length > 0 ? providers[0] : null;
  }

  async signOut(): Promise<void> {
    if (!this.accessToken) return;

    try {
      await fetch(`${this.baseURL}/auth/v1/logout`, {
        method: "POST",
        headers: this.getHeaders(true),
      });
    } catch (error) {
      console.warn("Logout request failed:", error);
    } finally {
      this.accessToken = null;
    }
  }

  getCurrentUser(): { id: string; email: string } | null {
    // This would require parsing the JWT token
    // For now, we'll manage user state in the auth context
    return null;
  }

  async getSession(): Promise<{ user: { id: string; email: string } } | null> {
    try {
      // Check if we have a valid access token
      if (!this.accessToken) {
        console.log("No access token available for session check");
        return null;
      }

      const response = await fetch(`${this.baseURL}/auth/v1/user`, {
        headers: this.getHeaders(true),
      });

      if (!response.ok) {
        console.log(
          "Session check failed:",
          response.status,
          response.statusText,
        );
        // Clear invalid token
        this.accessToken = null;
        return null;
      }

      const user = await response.json();
      return { user };
    } catch (error) {
      console.log("Get session error:", error);
      // Clear potentially invalid token
      this.accessToken = null;
      return null;
    }
  }

  get currentAccessToken(): string | null {
    return this.accessToken;
  }

  set currentAccessToken(token: string | null) {
    this.accessToken = token;
  }

  // Storage operations using direct API
  async testBucketAccess(bucket: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.baseURL}/storage/v1/bucket/${bucket}`,
        {
          method: "GET",
          headers: {
            apikey: this.apiKey,
            Authorization: `Bearer ${this.accessToken || this.apiKey}`,
          },
        },
      );

      console.log("Bucket test response:", {
        status: response.status,
        statusText: response.statusText,
        bucket,
      });

      return response.ok;
    } catch (error) {
      console.error("Bucket test error:", error);
      return false;
    }
  }

  async uploadFile(
    bucket: string,
    path: string,
    file: File,
  ): Promise<{ path: string; publicUrl: string }> {
    // Debug logging before request
    console.log("Upload request debug:", {
      bucket,
      path,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      baseURL: this.baseURL,
      hasApiKey: !!this.apiKey,
      hasAccessToken: !!this.accessToken,
      accessTokenLength: this.accessToken?.length || 0,
    });

    const formData = new FormData();
    formData.append("", file);

    const requestHeaders = {
      apikey: this.apiKey,
      Authorization: `Bearer ${this.accessToken || this.apiKey}`,
      // Don't set Content-Type - let browser set it automatically for FormData
    };

    console.log("Request headers:", {
      ...requestHeaders,
      Authorization: this.accessToken
        ? `Bearer [TOKEN_${this.accessToken.substring(0, 10)}...]`
        : `Bearer [API_KEY_${this.apiKey.substring(0, 10)}...]`,
    });

    const response = await fetch(
      `${this.baseURL}/storage/v1/object/${bucket}/${path}`,
      {
        method: "POST",
        headers: requestHeaders,
        body: formData,
      },
    );

    // Log detailed debug information without consuming response body
    console.log("Upload response debug:", {
      status: response.status,
      statusText: response.statusText,
      url: `${this.baseURL}/storage/v1/object/${bucket}/${path}`,
      bucket,
      path,
      hasAuthToken: !!this.accessToken,
      headers: Object.fromEntries(response.headers.entries()),
    });

    if (!response.ok) {
      // For error cases, try to read response body safely
      let errorDetails = response.statusText || `HTTP ${response.status}`;
      let parsedError = null;

      try {
        if (response.body && !response.bodyUsed) {
          const errorText = await response.text();
          if (errorText) {
            try {
              parsedError = JSON.parse(errorText);
              errorDetails = errorText;
            } catch {
              errorDetails = errorText;
            }
          }
        }
      } catch (readError) {
        console.warn("Could not read error response body:", readError);
      }

      // Provide specific error messages based on status and content
      let userFriendlyMessage = `Upload failed (${response.status})`;

      if (response.status === 400) {
        if (errorDetails.includes("row-level security policy")) {
          userFriendlyMessage =
            "Access denied: You don't have permission to upload files to this location. Please contact support.";
        } else if (errorDetails.includes("violates foreign key constraint")) {
          userFriendlyMessage =
            "Upload failed: Invalid business or profile reference. Please try refreshing the page.";
        } else if (errorDetails.includes("File too large")) {
          userFriendlyMessage =
            "Upload failed: File is too large. Please choose a smaller file.";
        } else {
          userFriendlyMessage = `Upload failed: Invalid request. ${parsedError?.message || errorDetails}`;
        }
      } else if (response.status === 401) {
        userFriendlyMessage =
          "Upload failed: You are not authorized. Please sign in again.";
      } else if (response.status === 403) {
        userFriendlyMessage =
          "Upload failed: Access forbidden. Please check your permissions.";
      } else if (response.status === 413) {
        userFriendlyMessage =
          "Upload failed: File is too large. Please choose a smaller file.";
      } else if (response.status === 422) {
        userFriendlyMessage = "Upload failed: Invalid file type or format.";
      } else {
        userFriendlyMessage = `Upload failed: ${parsedError?.message || errorDetails}`;
      }

      console.error("Upload error details:", {
        status: response.status,
        statusText: response.statusText,
        bucket,
        path,
        errorDetails,
        parsedError,
      });

      throw new Error(userFriendlyMessage);
    }

    // For success cases, try to parse response body
    let result = { Key: null };
    try {
      if (response.body && !response.bodyUsed) {
        const responseText = await response.text();
        if (responseText) {
          result = JSON.parse(responseText);
        }
      }
    } catch (parseError) {
      console.warn("Could not parse upload response:", parseError);
      // Use default result object if parsing fails
    }

    // Get public URL
    const publicUrl = `${this.baseURL}/storage/v1/object/public/${bucket}/${path}`;

    return {
      path: result.Key || path,
      publicUrl,
    };
  }

  async deleteFile(bucket: string, path: string): Promise<void> {
    const response = await fetch(
      `${this.baseURL}/storage/v1/object/${bucket}/${path}`,
      {
        method: "DELETE",
        headers: {
          apikey: this.apiKey,
          Authorization: `Bearer ${this.accessToken || this.apiKey}`,
        },
      },
    );

    // Read response text once for consistent handling
    const responseText = await response.text();

    if (!response.ok) {
      console.warn(`Delete failed: ${responseText}`);
      // Don't throw error for delete failures, just warn
    }
  }

  async updateProviderImage(
    providerId: string,
    imageUrl: string | null,
  ): Promise<void> {
    const response = await fetch(
      `${this.baseURL}/rest/v1/providers?id=eq.${providerId}`,
      {
        method: "PATCH",
        headers: {
          apikey: this.apiKey,
          Authorization: `Bearer ${this.accessToken || this.apiKey}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({ image_url: imageUrl }),
      },
    );

    // Read response text once and use it for both success and error cases
    const responseText = await response.text();

    if (!response.ok) {
      throw new Error(`Database update failed: ${responseText}`);
    }
    // Success case - responseText is empty due to Prefer: return=minimal
  }

  async updateProviderBannerImage(
    providerId: string,
    bannerImageUrl: string | null,
  ): Promise<void> {
    const response = await fetch(
      `${this.baseURL}/rest/v1/providers?id=eq.${providerId}`,
      {
        method: "PATCH",
        headers: {
          apikey: this.apiKey,
          Authorization: `Bearer ${this.accessToken || this.apiKey}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({ cover_image_url: bannerImageUrl }),
      },
    );

    // Read response text once and use it for both success and error cases
    const responseText = await response.text();

    if (!response.ok) {
      throw new Error(`Database update failed: ${responseText}`);
    }
    // Success case - responseText is empty due to Prefer: return=minimal
  }

  async updateBusinessCoverImage(
    businessId: string,
    coverImageUrl: string | null,
  ): Promise<void> {
    const response = await fetch(
      `${this.baseURL}/rest/v1/business_profiles?id=eq.${businessId}`,
      {
        method: "PATCH",
        headers: {
          apikey: this.apiKey,
          Authorization: `Bearer ${this.accessToken || this.apiKey}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({ cover_image_url: coverImageUrl }),
      },
    );

    // Read response text once and use it for both success and error cases
    const responseText = await response.text();

    if (!response.ok) {
      throw new Error(`Database update failed: ${responseText}`);
    }
    // Success case - responseText is empty due to Prefer: return=minimal
  }

  async updateBusinessProfile(
    businessId: string,
    updateData: any,
  ): Promise<void> {
    const response = await fetch(
      `${this.baseURL}/rest/v1/business_profiles?id=eq.${businessId}`,
      {
        method: "PATCH",
        headers: {
          apikey: this.apiKey,
          Authorization: `Bearer ${this.accessToken || this.apiKey}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify(updateData),
      },
    );

    // Read response text once and use it for both success and error cases
    let responseText = "";
    try {
      responseText = await response.text();
    } catch (readError) {
      console.warn("Could not read response text:", readError);
      responseText = `HTTP ${response.status} - ${response.statusText}`;
    }

    if (!response.ok) {
      // Parse response text to get detailed error info
      let errorDetails = responseText;
      try {
        const errorJson = JSON.parse(responseText);
        if (errorJson.message) {
          errorDetails = errorJson.message;
        } else if (errorJson.error) {
          errorDetails = errorJson.error;
        } else if (errorJson.hint) {
          errorDetails = errorJson.hint;
        }
      } catch (parseError) {
        // responseText is not JSON, use as-is
      }

      console.error("Business profile update failed:", {
        status: response.status,
        statusText: response.statusText,
        responseText: responseText,
        errorDetails: errorDetails,
        updateData: JSON.stringify(updateData, null, 2),
        url: `${this.baseURL}/rest/v1/business_profiles?id=eq.${businessId}`,
      });
      throw new Error(
        `Failed to update business profile: HTTP ${response.status} - ${errorDetails}`,
      );
    }
    // Success case - responseText is empty due to Prefer: return=minimal
  }

  // Customer authentication methods
  async signUpWithPassword(
    email: string,
    password: string,
  ): Promise<AuthResponse> {
    const response = await fetch(`${this.baseURL}/auth/v1/signup`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({
        email,
        password,
      }),
    });

    let responseText = "";
    try {
      responseText = await response.text();
    } catch (readError) {
      console.warn("Could not read response text:", readError);
      responseText = `HTTP ${response.status} - ${response.statusText}`;
    }

    if (!response.ok) {
      throw new Error(`Registration failed: ${responseText}`);
    }

    let authData: AuthResponse;
    try {
      authData = JSON.parse(responseText);
    } catch (parseError) {
      throw new Error(`Invalid response format: ${responseText}`);
    }

    // Only set access token if one is provided (may not be present with email confirmation)
    if (authData.access_token) {
      this.accessToken = authData.access_token;
    }

    return authData;
  }

  async getCustomerByUserId(userId: string): Promise<CustomerRecord | null> {
    const response = await fetch(
      `${this.baseURL}/rest/v1/customers?user_id=eq.${userId}&is_active=eq.true&select=id,user_id,first_name,last_name,email,phone,is_active`,
      {
        headers: this.getHeaders(true),
      },
    );

    let responseText = "";
    try {
      responseText = await response.text();
    } catch (readError) {
      console.warn("Could not read response text:", readError);
      responseText = `HTTP ${response.status} - ${response.statusText}`;
    }

    if (!response.ok) {
      throw new Error(`Customer lookup failed: ${responseText}`);
    }

    let customers: CustomerRecord[];
    try {
      customers = JSON.parse(responseText);
    } catch (parseError) {
      throw new Error(`Invalid response format: ${responseText}`);
    }

    return customers.length > 0 ? customers[0] : null;
  }

  async createCustomerProfile(customerData: {
    user_id: string;
    email: string;
    first_name: string;
    last_name: string;
    phone: string | null;
  }): Promise<CustomerRecord> {
    const response = await fetch(`${this.baseURL}/rest/v1/customers`, {
      method: "POST",
      headers: {
        apikey: this.apiKey,
        Authorization: `Bearer ${this.accessToken || this.apiKey}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        ...customerData,
        is_active: true,
        total_bookings: 0,
        total_spent: 0,
        loyalty_points: 0,
        preferred_communication: "email",
      }),
    });

    let responseText = "";
    try {
      responseText = await response.text();
    } catch (readError) {
      console.warn("Could not read response text:", readError);
      responseText = `HTTP ${response.status} - ${response.statusText}`;
    }

    if (!response.ok) {
      throw new Error(`Customer profile creation failed: ${responseText}`);
    }

    let customers: CustomerRecord[];
    try {
      customers = JSON.parse(responseText);
    } catch (parseError) {
      throw new Error(`Invalid response format: ${responseText}`);
    }

    if (customers.length === 0) {
      throw new Error("No customer profile returned after creation");
    }

    return customers[0];
  }

  async uploadCustomerAvatar(
    customerId: string,
    file: File,
  ): Promise<{ path: string; publicUrl: string }> {
    const fileExt = file.name.split(".").pop();
    const fileName = `${customerId}-${Date.now()}.${fileExt}`;
    const filePath = `avatar-customer-user/${fileName}`;

    const formData = new FormData();
    formData.append("", file);

    const response = await fetch(
      `${this.baseURL}/storage/v1/object/roam-file-storage/${filePath}`,
      {
        method: "POST",
        headers: {
          apikey: this.apiKey,
          Authorization: `Bearer ${this.accessToken || this.apiKey}`,
        },
        body: formData,
      },
    );

    // Read response text once and handle both success and error cases
    const responseText = await response.text();

    if (!response.ok) {
      throw new Error(`Avatar upload failed: ${responseText}`);
    }

    // Get public URL
    const publicUrl = `${this.baseURL}/storage/v1/object/public/roam-file-storage/${filePath}`;

    return {
      path: filePath,
      publicUrl,
    };
  }

  async updateCustomerProfile(
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
  ): Promise<void> {
    // Validate Supabase configuration
    if (!this.baseURL || !this.apiKey) {
      throw new Error(
        "Supabase configuration is incomplete. Please check your API URL and keys.",
      );
    }

    console.log("DirectSupabase updateCustomerProfile: Starting update", {
      customerId,
      updateData,
      baseURL: this.baseURL,
      hasApiKey: !!this.apiKey,
      hasAccessToken: !!this.accessToken,
      tokenLength: this.accessToken ? this.accessToken.length : 0,
      userAgent: navigator.userAgent,
      online: navigator.onLine,
    });

    // Add connection retry logic for transient network issues
    const performRequestWithRetry = async (
      url: string,
      options: RequestInit,
      maxRetries = 2,
    ) => {
      let lastError;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(
            `DirectSupabase: Attempt ${attempt}/${maxRetries} for ${url}`,
          );

          const response = await fetch(url, options);
          return response;
        } catch (error: any) {
          lastError = error;
          console.warn(
            `DirectSupabase: Attempt ${attempt} failed:`,
            error.message,
          );

          // Check for connection issues
          if (
            error.message?.includes("ERR_CONNECTION_CLOSED") ||
            error.message?.includes("Failed to fetch") ||
            error.message?.includes("ERR_NETWORK")
          ) {
            console.log(
              `DirectSupabase: Network error detected, retrying in ${attempt * 1000}ms...`,
            );

            if (attempt < maxRetries) {
              // Wait before retry
              await new Promise((resolve) =>
                setTimeout(resolve, attempt * 1000),
              );
              continue;
            }
          }

          // For non-network errors or final attempt, throw immediately
          throw error;
        }
      }

      throw lastError;
    };

    // Skip table access test for now due to potential connection issues
    // Instead, proceed directly to checking if record exists
    console.log(
      "DirectSupabase updateCustomerProfile: Skipping table access test, proceeding to record check...",
    );

    // Skip user verification check since auth.users table may not be accessible via REST API
    // Instead, let the foreign key constraint handle validation during insert/update
    console.log(
      "DirectSupabase updateCustomerProfile: Proceeding with customer profile operation...",
    );

    // Now check if a record exists for this user
    console.log(
      "DirectSupabase updateCustomerProfile: Checking if record exists...",
    );

    let checkResponse;
    try {
      checkResponse = await performRequestWithRetry(
        `${this.baseURL}/rest/v1/customer_profiles?user_id=eq.${customerId}&select=user_id`,
        {
          method: "GET",
          headers: {
            apikey: this.apiKey,
            Authorization: `Bearer ${this.accessToken || this.apiKey}`,
            "Content-Type": "application/json",
          },
        },
      );
    } catch (networkError: any) {
      console.error(
        "DirectSupabase updateCustomerProfile: Network error during record check:",
        networkError,
      );
      throw new Error(
        `Connection failed to Supabase. Please check your internet connection and try again. Error: ${networkError.message}`,
      );
    }

    const checkText = await checkResponse.text();
    console.log("DirectSupabase updateCustomerProfile: Check response", {
      status: checkResponse.status,
      responseText: checkText,
    });

    let recordExists = false;
    if (checkResponse.ok) {
      try {
        const records = JSON.parse(checkText);
        recordExists = Array.isArray(records) && records.length > 0;
        console.log(
          "DirectSupabase updateCustomerProfile: Record exists:",
          recordExists,
        );
      } catch (parseError) {
        console.log(
          "DirectSupabase updateCustomerProfile: Check parse error:",
          parseError,
        );
      }
    }

    // Try the operation with anon key first, then with user token if that fails
    let response;
    let authMethod = "anon";

    const tryOperation = async (useUserToken = false) => {
      const authToken =
        useUserToken && this.accessToken ? this.accessToken : this.apiKey;
      const authHeader = `Bearer ${authToken}`;

      console.log(
        `DirectSupabase updateCustomerProfile: Trying with ${useUserToken ? "user token" : "anon key"}`,
      );

      const headers = {
        apikey: this.apiKey,
        Authorization: authHeader,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      };

      if (recordExists) {
        // Update existing record
        console.log(
          "DirectSupabase updateCustomerProfile: Updating existing record...",
        );
        return await performRequestWithRetry(
          `${this.baseURL}/rest/v1/customer_profiles?user_id=eq.${customerId}`,
          {
            method: "PATCH",
            headers,
            body: JSON.stringify(updateData),
          },
        );
      } else {
        // Create new record
        console.log(
          "DirectSupabase updateCustomerProfile: Creating new record...",
        );
        return await performRequestWithRetry(
          `${this.baseURL}/rest/v1/customer_profiles`,
          {
            method: "POST",
            headers,
            body: JSON.stringify({
              user_id: customerId,
              ...updateData,
              is_active: true,
              email_notifications: true,
              sms_notifications: true,
              push_notifications: true,
              marketing_emails: false,
              email_verified: false,
              phone_verified: false,
            }),
          },
        );
      }
    };

    // Function to safely read response text
    const safeReadResponseText = async (resp: Response): Promise<string> => {
      try {
        if (resp.body === null) {
          return `HTTP ${resp.status} - ${resp.statusText}`;
        }

        const text = await resp.text();

        // If text is empty, return status info
        if (!text || text.trim() === "") {
          return `HTTP ${resp.status} - ${resp.statusText}`;
        }

        return text;
      } catch (readError: any) {
        console.warn("Could not read response text:", readError);
        return `HTTP ${resp.status} - ${resp.statusText} (read error: ${readError.message})`;
      }
    };

    // Function to try operation and read response safely
    const tryOperationWithResponse = async (
      useUserToken = false,
    ): Promise<{ response: Response; text: string }> => {
      const resp = await tryOperation(useUserToken);
      const text = await safeReadResponseText(resp);
      return { response: resp, text };
    };

    // Try with anon key first
    let result = await tryOperationWithResponse(false);
    response = result.response;
    let responseText = result.text;

    // If anon key fails with auth/permission error, try with user token
    if (!response.ok && (response.status === 401 || response.status === 403)) {
      if (this.accessToken) {
        console.log(
          "DirectSupabase updateCustomerProfile: Anon key failed, trying with user token...",
        );
        authMethod = "user";
        // Get fresh response with user token
        result = await tryOperationWithResponse(true);
        response = result.response;
        responseText = result.text;
      } else {
        console.log(
          "DirectSupabase updateCustomerProfile: No user token available for fallback",
        );
      }
    }

    console.log("DirectSupabase updateCustomerProfile: Response", {
      status: response.status,
      statusText: response.statusText,
      responseText,
      responseTextType: typeof responseText,
      responseTextLength: responseText?.length,
      ok: response.ok,
      operation: recordExists ? "UPDATE" : "CREATE",
      authMethod: authMethod,
      customerId: customerId,
      updateData: updateData,
    });

    if (!response.ok) {
      // Handle authentication errors specifically
      if (response.status === 401) {
        console.error(
          "DirectSupabase updateCustomerProfile: Authentication failed",
        );
        this.accessToken = null; // Clear invalid token
        throw new Error("Authentication failed. Please sign in again.");
      }

      // Handle table not found errors
      if (
        responseText.includes('relation "customer_profiles" does not exist')
      ) {
        console.error(
          "DirectSupabase updateCustomerProfile: customer_profiles table does not exist",
        );
        throw new Error(
          "Customer profiles table does not exist in the database. Please contact support.",
        );
      }

      // Check for permission errors
      if (
        responseText.includes("permission denied") ||
        responseText.includes("RLS")
      ) {
        console.error(
          "DirectSupabase updateCustomerProfile: Permission denied or RLS policy issue",
        );
        throw new Error(
          "Permission denied: Unable to access customer profiles. Please contact support.",
        );
      }

      // Handle HTTP 409 Conflict specifically
      if (response.status === 409) {
        // Ensure responseText is a string for proper error handling
        let errorMessage;
        try {
          if (typeof responseText === "string") {
            errorMessage = responseText;
          } else if (responseText && typeof responseText === "object") {
            // Try to extract meaningful error from object
            errorMessage =
              responseText.message ||
              responseText.error ||
              responseText.details ||
              JSON.stringify(responseText);
          } else {
            errorMessage = `HTTP ${response.status} - ${response.statusText}`;
          }
        } catch (stringifyError) {
          console.warn("Error processing response text:", stringifyError);
          errorMessage = `HTTP ${response.status} - ${response.statusText}`;
        }

        console.error(
          "DirectSupabase updateCustomerProfile: HTTP 409 Conflict detected",
          {
            originalResponseText: responseText,
            responseTextType: typeof responseText,
            processedErrorMessage: errorMessage,
            updateData,
            customerId,
            recordExists,
          },
        );

        // Check for specific constraint violations
        if (
          errorMessage.includes("user_id") &&
          errorMessage.includes("foreign key")
        ) {
          throw new Error(
            `User account (${customerId}) is no longer valid in the authentication system. Please sign in again.`,
          );
        } else if (
          errorMessage.includes("unique") ||
          errorMessage.includes("duplicate")
        ) {
          throw new Error(
            `A customer profile already exists for this user. Please refresh the page and try again.`,
          );
        } else if (
          errorMessage.includes("violates") &&
          errorMessage.includes("constraint")
        ) {
          throw new Error(
            `Database constraint violation: ${errorMessage}. This may indicate a data integrity issue.`,
          );
        } else {
          throw new Error(
            `Database conflict occurred: ${errorMessage}. Please try again or contact support.`,
          );
        }
      }

      // Handle other errors with detailed information
      const operation = recordExists ? "update" : "create";
      console.error(
        `DirectSupabase updateCustomerProfile: Failed to ${operation} record`,
        {
          status: response.status,
          responseText,
          updateData,
          customerId,
        },
      );

      const errorMsg =
        typeof responseText === "string"
          ? responseText
          : responseText
            ? JSON.stringify(responseText)
            : response.statusText || `HTTP ${response.status}`;

      throw new Error(
        `Failed to ${operation} customer profile: HTTP ${response.status} - ${errorMsg}`,
      );
    } else {
      const operation = recordExists ? "updated" : "created";
      console.log(
        `DirectSupabase updateCustomerProfile: Record ${operation} successfully`,
      );
    }
  }

  async createCustomerProfileRecord(
    customerId: string,
    profileData: {
      first_name?: string;
      last_name?: string;
      email?: string;
      phone?: string | null;
      date_of_birth?: string | null;
      bio?: string | null;
      image_url?: string | null;
    },
  ): Promise<void> {
    console.log(
      "DirectSupabase createCustomerProfileRecord: Starting creation",
      {
        customerId,
        profileData,
        hasAccessToken: !!this.accessToken,
      },
    );

    // Try with anon key for customer_profiles table
    console.log(
      "DirectSupabase createCustomerProfileRecord: Using anon key...",
    );
    const response = await fetch(`${this.baseURL}/rest/v1/customer_profiles`, {
      method: "POST",
      headers: {
        apikey: this.apiKey,
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        user_id: customerId,
        ...profileData,
        is_active: true,
        email_notifications: true,
        sms_notifications: true,
        push_notifications: true,
        marketing_emails: false,
        email_verified: false,
        phone_verified: false,
      }),
    });

    let responseText = "";
    try {
      responseText = await response.text();
    } catch (readError) {
      console.warn("Could not read response text:", readError);
      responseText = `HTTP ${response.status} - ${response.statusText}`;
    }

    console.log("DirectSupabase createCustomerProfileRecord: Response", {
      status: response.status,
      statusText: response.statusText,
      responseText,
      ok: response.ok,
    });

    if (!response.ok) {
      // Handle authentication errors specifically
      if (response.status === 401) {
        console.error(
          "DirectSupabase createCustomerProfileRecord: Authentication failed",
        );
        this.accessToken = null; // Clear invalid token
        throw new Error("Authentication failed. Please sign in again.");
      }
      throw new Error(
        `Customer profile creation failed: HTTP ${response.status} - ${responseText}`,
      );
    } else {
      console.log(
        "DirectSupabase createCustomerProfileRecord: Creation successful",
      );
    }
  }
}

export const directSupabaseAPI = new DirectSupabaseAPI();
