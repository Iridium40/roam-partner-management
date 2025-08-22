import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

interface BusinessInfoData {
  businessName: string;
  businessType:
    | "independent"
    | "small_business"
    | "franchise"
    | "enterprise"
    | "other";
  contactEmail: string;
  phone: string;
  serviceCategories: string[];
  serviceSubcategories: string[];
  businessHours: { [key: string]: { open: string; close: string } };
  businessAddress: {
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  website?: string;
  socialMedia?: any;
  businessDescription?: string;
  yearsExperience: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      userId,
      businessData,
    }: { userId: string; businessData: BusinessInfoData } = req.body;

    if (!userId || !businessData) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Validate required fields
    const requiredFields = [
      "businessName",
      "businessType",
      "contactEmail",
      "phone",
      "serviceCategories",
    ];
    for (const field of requiredFields) {
      if (!businessData[field as keyof BusinessInfoData]) {
        return res
          .status(400)
          .json({ error: `Missing required field: ${field}` });
      }
    }

    // Check if user exists
    let userData;
    try {
      const result = await supabase.auth.admin.getUserById(userId);
      userData = result.data;
      if (result.error) {
        console.error("Error fetching user:", result.error);
        return res.status(404).json({ error: "User not found" });
      }
    } catch (error) {
      console.error("User lookup error:", error);
      return res.status(400).json({ error: "Invalid user ID format" });
    }

    if (!userData.user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if business profile already exists for this user
    // Look through providers table to find business owned by this user
    const { data: existingProvider } = await supabase
      .from("providers")
      .select("business_id")
      .eq("user_id", userId)
      .eq("provider_role", "owner")
      .single();

    let existingBusiness = null;
    if (existingProvider) {
      const { data: businessData } = await supabase
        .from("business_profiles")
        .select("id")
        .eq("id", existingProvider.business_id)
        .single();
      existingBusiness = businessData;
    }

    let businessProfileData;

    if (existingBusiness) {
      // Update existing business profile
      const { data: updatedBusiness, error: updateError } = await supabase
        .from("business_profiles")
        .update({
          business_name: businessData.businessName,
          business_type: businessData.businessType,
          contact_email: businessData.contactEmail,
          phone: businessData.phone,
          business_hours: businessData.businessHours,
          website_url: businessData.website,
          social_media: businessData.socialMedia || [],
          business_description: businessData.businessDescription,
          setup_step: 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingBusiness.id)
        .select()
        .single();

      if (updateError) {
        console.error("Error updating business profile:", updateError);
        return res
          .status(500)
          .json({ error: "Failed to update business information" });
      }

      businessProfileData = updatedBusiness;

      // Handle service categories - update associations
      if (
        businessData.serviceCategories &&
        businessData.serviceCategories.length > 0
      ) {
        // First, remove existing service category associations
        await supabase
          .from("business_service_categories")
          .delete()
          .eq("business_id", existingBusiness.id);

        // Create new service category associations using category IDs
        const categoryInserts = businessData.serviceCategories.map(
          (categoryId) => ({
            business_id: existingBusiness.id,
            category_id: categoryId,
            is_active: true,
          }),
        );

        const { error: categoryError } = await supabase
          .from("business_service_categories")
          .insert(categoryInserts);

        if (categoryError) {
          console.error(
            "Error updating service category associations:",
            categoryError,
          );
          // Continue anyway - categories can be updated later
        }
      }

      // Handle service subcategories - update associations
      if (
        businessData.serviceSubcategories &&
        businessData.serviceSubcategories.length > 0
      ) {
        // First, remove existing service subcategory associations
        await supabase
          .from("business_service_subcategories")
          .delete()
          .eq("business_id", existingBusiness.id);

        // Create new service subcategory associations using subcategory IDs
        // First, fetch the subcategory details to get their category_ids
        const { data: subcategoryDetails, error: fetchError } = await supabase
          .from("service_subcategories")
          .select("id, category_id")
          .in("id", businessData.serviceSubcategories);

        if (fetchError) {
          console.error("Error fetching subcategory details:", fetchError);
        } else {
          const subcategoryInserts = subcategoryDetails.map((subcategory) => ({
            business_id: existingBusiness.id,
            category_id: subcategory.category_id,
            subcategory_id: subcategory.id,
            is_active: true,
          }));

          const { error: subcategoryError } = await supabase
            .from("business_service_subcategories")
            .insert(subcategoryInserts);

          if (subcategoryError) {
            console.error(
              "Error updating service subcategory associations:",
              subcategoryError,
            );
            // Continue anyway - subcategories can be updated later
          }
        }
      }
    } else {
      // Create new business profile
      const { data: newBusiness, error: createError } = await supabase
        .from("business_profiles")
        .insert({
          business_name: businessData.businessName,
          business_type: businessData.businessType,
          contact_email: businessData.contactEmail,
          phone: businessData.phone,
          business_hours: businessData.businessHours,
          website_url: businessData.website,
          social_media: businessData.socialMedia || [],
          business_description: businessData.businessDescription,
          verification_status: "pending",
          is_active: false,
          setup_step: 1,
          setup_completed: false,
        })
        .select()
        .single();

      if (createError) {
        console.error("Error creating business profile:", createError);
        return res
          .status(500)
          .json({ error: "Failed to create business profile" });
      }

      businessProfileData = newBusiness;

      // Handle service categories - create associations if they exist
      if (
        businessData.serviceCategories &&
        businessData.serviceCategories.length > 0
      ) {
        // Create new service category associations using category IDs
        const categoryInserts = businessData.serviceCategories.map(
          (categoryId) => ({
            business_id: businessProfileData.id,
            category_id: categoryId,
            is_active: true,
          }),
        );

        const { error: categoryError } = await supabase
          .from("business_service_categories")
          .insert(categoryInserts);

        if (categoryError) {
          console.error(
            "Error creating service category associations:",
            categoryError,
          );
          // Continue anyway - categories can be added later
        }
      }

      // Handle service subcategories - create associations if they exist
      if (
        businessData.serviceSubcategories &&
        businessData.serviceSubcategories.length > 0
      ) {
        // Create new service subcategory associations using subcategory IDs
        // First, fetch the subcategory details to get their category_ids
        const { data: subcategoryDetails, error: fetchError } = await supabase
          .from("service_subcategories")
          .select("id, category_id")
          .in("id", businessData.serviceSubcategories);

        if (fetchError) {
          console.error("Error fetching subcategory details:", fetchError);
        } else {
          const subcategoryInserts = subcategoryDetails.map((subcategory) => ({
            business_id: businessProfileData.id,
            category_id: subcategory.category_id,
            subcategory_id: subcategory.id,
            is_active: true,
          }));

          const { error: subcategoryError } = await supabase
            .from("business_service_subcategories")
            .insert(subcategoryInserts);

          if (subcategoryError) {
            console.error(
              "Error creating service subcategory associations:",
              subcategoryError,
            );
            // Continue anyway - subcategories can be added later
          }
        }
      }

      // Create default business location
      const { error: locationError } = await supabase
        .from("business_locations")
        .insert({
          business_id: businessProfileData.id,
          location_name: "Main Location",
          address_line1: businessData.businessAddress.addressLine1,
          address_line2: businessData.businessAddress.addressLine2,
          city: businessData.businessAddress.city,
          state: businessData.businessAddress.state,
          postal_code: businessData.businessAddress.postalCode,
          country: businessData.businessAddress.country,
          is_primary: true,
          is_active: true,
        });

      if (locationError) {
        console.error("Error creating business location:", locationError);
        // Continue anyway - location can be added later
      }

      // Create or update provider record
      // First check if a provider record exists for this user
      const { data: existingProvider, error: existingProviderError } =
        await supabase
          .from("providers")
          .select("*")
          .eq("user_id", userId)
          .single();

      let providerError = null;
      if (existingProvider) {
        // Get user info for names
        const userInfo = await supabase.auth.admin.getUserById(userId);
        const firstName =
          userInfo.data.user?.user_metadata?.first_name || "Provider";
        const lastName = userInfo.data.user?.user_metadata?.last_name || "";

        // Update existing provider record
        const { error: updateProviderError } = await supabase
          .from("providers")
          .update({
            business_id: businessProfileData.id,
            first_name: firstName,
            last_name: lastName,
            email: businessData.contactEmail,
            phone: businessData.phone,
            provider_role: "owner",
            verification_status: "pending",
            background_check_status: "under_review",
            is_active: false,
            business_managed: true,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId);

        providerError = updateProviderError;
        console.log("Updated existing provider record for user:", userId);
      } else {
        // Get user info for names
        const userInfo = await supabase.auth.admin.getUserById(userId);
        const firstName =
          userInfo.data.user?.user_metadata?.first_name || "Provider";
        const lastName = userInfo.data.user?.user_metadata?.last_name || "";

        // Create new provider record
        const { error: createProviderError } = await supabase
          .from("providers")
          .insert({
            user_id: userId,
            business_id: businessProfileData.id,
            first_name: firstName,
            last_name: lastName,
            email: businessData.contactEmail,
            phone: businessData.phone,
            provider_role: "owner",
            verification_status: "pending",
            background_check_status: "under_review",
            is_active: false,
            business_managed: true,
          });

        providerError = createProviderError;
        console.log("Created new provider record for user:", userId);
      }

      if (providerError) {
        console.error("Error creating/updating provider:", providerError);
        // This is actually critical - return error if provider relationship can't be established
        return res.status(500).json({
          error: "Failed to establish business ownership relationship",
          details: providerError.message,
        });
      }
    }

    // Update business address
    const { error: addressError } = await supabase
      .from("business_locations")
      .upsert(
        {
          business_id: businessProfileData.id,
          location_name: "Main Location",
          address_line1: businessData.businessAddress.addressLine1,
          address_line2: businessData.businessAddress.addressLine2,
          city: businessData.businessAddress.city,
          state: businessData.businessAddress.state,
          postal_code: businessData.businessAddress.postalCode,
          country: businessData.businessAddress.country,
          is_primary: true,
          is_active: true,
        },
        {
          onConflict: "business_id",
        },
      );

    if (addressError) {
      console.error("Error updating business address:", addressError);
    }

    // Validate businessProfileData before returning
    if (!businessProfileData || !businessProfileData.id) {
      console.error(
        "Business profile data is missing or invalid:",
        businessProfileData,
      );
      return res.status(500).json({
        error: "Failed to create or update business profile",
        details: "Business profile data is missing",
      });
    }

    console.log("Business profile operation successful:", {
      id: businessProfileData.id,
      name: businessProfileData.business_name,
      dataType: typeof businessProfileData,
      hasData: !!businessProfileData,
    });

    const responseData = {
      success: true,
      business: businessProfileData,
    };

    console.log("Sending response:", JSON.stringify(responseData, null, 2));

    return res.status(200).json(responseData);
  } catch (error) {
    console.error("Business info submission error:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
