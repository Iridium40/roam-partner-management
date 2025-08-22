/**
 * Safely parse a fetch response, handling both JSON and non-JSON responses
 * without causing "body stream already read" errors
 */
export async function safeParseResponse(response: Response): Promise<any> {
  const contentType = response.headers.get("content-type") || "";
  const status = response.status;

  console.log(`Response - Status: ${status}, Content-Type: ${contentType}`);

  if (contentType.includes("application/json")) {
    try {
      const result = await response.json();
      return { success: true, data: result, status };
    } catch (parseError) {
      console.error("JSON parsing failed:", parseError);
      throw new Error(`Server returned invalid JSON (Status: ${status})`);
    }
  } else {
    // Not JSON, read as text for debugging
    try {
      const text = await response.text();
      console.error("Non-JSON response received:", text);
      throw new Error(
        `Server returned ${status} with non-JSON content: ${contentType}`,
      );
    } catch (readError) {
      console.error("Failed to read response:", readError);
      throw new Error(`Could not read server response (Status: ${status})`);
    }
  }
}

/**
 * Enhanced fetch wrapper that safely handles responses
 */
export async function safeFetch(url: string, options?: RequestInit) {
  try {
    const response = await fetch(url, options);
    const { data } = await safeParseResponse(response);

    if (!response.ok) {
      throw new Error(
        data.error || `HTTP ${response.status}: ${response.statusText}`,
      );
    }

    return data;
  } catch (error) {
    console.error(`Fetch error for ${url}:`, error);
    throw error;
  }
}

/**
 * Safe JSON parsing for responses that might not be JSON
 */
export async function parseResponseSafely(response: Response) {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return await response.json();
  } else {
    const text = await response.text();
    console.warn("Expected JSON but received:", text);
    throw new Error("Server returned non-JSON response");
  }
}
