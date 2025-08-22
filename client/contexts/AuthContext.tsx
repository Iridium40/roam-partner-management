import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { User } from "@supabase/supabase-js";
import { toast } from "../hooks/use-toast";

console.log('🔥 AuthContext.tsx file is being loaded...');

import type {
  AuthCustomer,
} from "../lib/database.types";

interface AuthContextType {
  customer: AuthCustomer | null;
  loading: boolean;
  signInCustomer: (email: string, password: string) => Promise<void>;
  signUpCustomer: (customerData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
  }) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithGoogleIdToken: (idToken: string, nonce: string) => Promise<void>;
  signInWithApple: () => Promise<void>;
  resendVerificationEmail: (email: string) => Promise<void>;
  updateCustomerProfile: (profileData: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    dateOfBirth?: string;
    bio?: string;
    imageUrl?: string;
  }) => Promise<void>;
  uploadCustomerAvatar: (file: File) => Promise<string>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isCustomer: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  console.log('🚀 AuthProvider component is mounting...');
  const [customer, setCustomer] = useState<AuthCustomer | null>(null);
  const [loading, setLoading] = useState(true);

  const clearStoredData = () => {
    localStorage.removeItem("roam_customer");
    localStorage.removeItem("roam_access_token");
    localStorage.removeItem("roam_user_type");
  };

  useEffect(() => {
    // Try to restore session from localStorage first
    const initializeAuth = async () => {
      try {
        console.log("AuthContext: Initializing with session restoration...");

        // Check if we have stored session data
        const storedCustomer = localStorage.getItem("roam_customer");
        const storedToken = localStorage.getItem("roam_access_token");

        if (storedCustomer && storedToken) {
          console.log("AuthContext: Found stored session and token");

          // Restore the access token to the directSupabaseAPI
          const { directSupabaseAPI } = await import("../lib/directSupabase");
          directSupabaseAPI.currentAccessToken = storedToken;

          const customerData = JSON.parse(storedCustomer);
          console.log("🔐 AuthContext: Customer session restored from localStorage", customerData);
          
          // If user_id is missing from stored data, clear localStorage and fetch fresh data
          if (!customerData.user_id) {
            console.log("🔐 AuthContext: user_id missing from localStorage, clearing and fetching fresh data...");
            clearStoredData();
            // Continue to fresh session fetch below
          } else {
            setCustomer(customerData);
            setLoading(false);
            return;
          }
        }

        // If no stored session, try to get current session from Supabase
        try {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (session?.user) {
            console.log("Session user found, checking for customer profile", session.user.id);

            const { data: customerProfile, error: customerError } = await supabase
              .from("customer_profiles")
              .select("id, user_id, email, first_name, last_name, phone, image_url")
              .eq("user_id", session.user.id)
              .single();

            console.log('Customer profile query result:', { customerProfile, customerError });

            if (customerProfile) {
              const customerData = {
                id: customerProfile.id,
                user_id: customerProfile.user_id, // Add user_id for foreign key relationships
                email: customerProfile.email,
                customer_id: customerProfile.id,
                first_name: customerProfile.first_name,
                last_name: customerProfile.last_name,
                phone: customerProfile.phone,
                image_url: customerProfile.image_url,
              };
              
              console.log('Customer data structure:', customerData);

              setCustomer(customerData);
              localStorage.setItem(
                "roam_customer",
                JSON.stringify(customerData),
              );
              localStorage.setItem("roam_user_type", "customer");
              console.log(
                "AuthContext: Customer session restored successfully",
              );
            } else {
              // For OAuth users without existing customer profile, create one
              if (session.user.app_metadata?.provider) {
                console.log(
                  "AuthContext: OAuth user without profile, creating customer profile...",
                );
                await createCustomerProfileFromOAuth(session.user);
              } else {
                console.log(
                  "AuthContext: No customer profile found, clearing session",
                );
                clearStoredData();
              }
            }
          } else {
            console.log(
              "AuthContext: No active session, clearing stored data if any",
            );
            clearStoredData();
          }
        } catch (sessionError) {
          console.log(
            "AuthContext: Error during session restoration:",
            sessionError,
          );
          // Clear potentially corrupted stored data
          clearStoredData();
        }
      } catch (error) {
        console.error("AuthContext: Error during initialization:", error);
      } finally {
        setLoading(false);
      }
    };
    
    console.log('🔐 AuthContext: useEffect triggered, initializing auth...');
    initializeAuth();
  }, []);

  const signInCustomer = async (email: string, password: string) => {
    setLoading(true);
    try {
      console.log("AuthContext signInCustomer: Starting authentication...");

      // Use standard Supabase client for authentication
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (authError) {
        console.error("AuthContext signInCustomer: Auth error:", authError);

        // Provide user-friendly error messages
        if (authError.message === "Invalid login credentials") {
          throw new Error("Invalid email or password");
        } else if (authError.message.includes("Email not confirmed")) {
          throw new Error(
            "Please check your email and click the confirmation link before signing in.",
          );
        } else if (authError.message.includes("Too many requests")) {
          throw new Error(
            "Too many login attempts. Please wait a few minutes before trying again.",
          );
        } else {
          throw new Error(`Authentication failed: ${authError.message}`);
        }
      }

      if (!authData.user) {
        console.error("AuthContext signInCustomer: No user returned");
        throw new Error("Authentication failed - no user returned");
      }

      console.log(
        "AuthContext signInCustomer: Auth successful, fetching customer profile...",
      );

      // Fetch or create customer profile
      const { data: customerProfile, error: profileError } = await supabase
        .from("customer_profiles")
        .select("*")
        .eq("user_id", authData.user.id)
        .single();

      if (profileError && profileError.code !== "PGRST116") {
        // PGRST116 is "not found" error
        console.error(
          "AuthContext signInCustomer: Error fetching customer profile:",
          profileError,
        );
        throw new Error("Failed to fetch customer profile");
      }

      let customerData;
      if (!customerProfile) {
        // Create customer profile if it doesn't exist
        console.log("AuthContext signInCustomer: Creating customer profile...");
        const emailParts = authData.user.email?.split("@")[0] || "";
        const nameParts = emailParts.split(".");

        const newProfile = {
          user_id: authData.user.id,
          email: authData.user.email || "",
          first_name: nameParts[0] || "Customer",
          last_name: nameParts[1] || "",
          phone: authData.user.phone || "",
        };

        const { data: createdProfile, error: createError } = await supabase
          .from("customer_profiles")
          .insert(newProfile)
          .select()
          .single();

        if (createError) {
          console.error(
            "AuthContext signInCustomer: Error creating customer profile:",
            createError,
          );
          throw new Error("Failed to create customer profile");
        }

        customerData = {
          id: createdProfile.id,
          user_id: createdProfile.user_id,
          email: createdProfile.email,
          customer_id: createdProfile.id,
          first_name: createdProfile.first_name,
          last_name: createdProfile.last_name,
          phone: createdProfile.phone,
          image_url: null,
        };
      } else {
        customerData = {
          id: customerProfile.id,
          user_id: customerProfile.user_id,
          email: customerProfile.email,
          customer_id: customerProfile.id,
          first_name: customerProfile.first_name,
          last_name: customerProfile.last_name,
          phone: customerProfile.phone,
          image_url: customerProfile.image_url,
        };
      }

      setCustomer(customerData);
      localStorage.setItem("roam_customer", JSON.stringify(customerData));
      localStorage.setItem(
        "roam_access_token",
        authData.session?.access_token || "",
      );
      localStorage.setItem("roam_user_type", "customer");

      console.log(
        "AuthContext signInCustomer: Customer state updated and persisted successfully",
      );
    } catch (error) {
      console.error("AuthContext signInCustomer: Error:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signUpCustomer = async (customerData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
  }) => {
    setLoading(true);
    try {
      console.log("AuthContext signUpCustomer: Starting registration...");

      // First, sign up the user with Supabase Auth
      const { data: authData, error: authError } =
        await supabase.auth.signUp({
          email: customerData.email,
          password: customerData.password,
          options: {
            data: {
              first_name: customerData.firstName,
              last_name: customerData.lastName,
              phone: customerData.phone,
            },
          },
        });

      if (authError) {
        console.error("AuthContext signUpCustomer: Auth error:", authError);
        if (authError.message.includes("User already registered")) {
          throw new Error(
            "An account with this email already exists. Please sign in instead.",
          );
        } else if (authError.message.includes("Password should be")) {
          throw new Error(
            "Password must be at least 6 characters long and contain at least one uppercase letter, one lowercase letter, and one number.",
          );
        } else {
          throw new Error(`Registration failed: ${authError.message}`);
        }
      }

      if (!authData.user) {
        console.error("AuthContext signUpCustomer: No user returned");
        throw new Error("Registration failed - no user returned");
      }

      console.log(
        "AuthContext signUpCustomer: Auth successful, creating customer profile...",
      );

      // Create customer profile
      const newProfile = {
        user_id: authData.user.id,
        email: customerData.email,
        first_name: customerData.firstName,
        last_name: customerData.lastName,
        phone: customerData.phone || "",
      };

      const { data: createdProfile, error: createError } = await supabase
        .from("customer_profiles")
        .insert(newProfile)
        .select()
        .single();

      if (createError) {
        console.error(
          "AuthContext signUpCustomer: Error creating customer profile:",
          createError,
        );
        // If profile creation fails, we should clean up the auth user
        await supabase.auth.signOut();
        throw new Error("Failed to create customer profile");
      }

      // If registration is successful and user is immediately confirmed
      if (authData.session) {
        const finalCustomerData = {
          id: createdProfile.id,
          user_id: createdProfile.user_id,
          email: createdProfile.email,
          customer_id: createdProfile.id,
          first_name: createdProfile.first_name,
          last_name: createdProfile.last_name,
          phone: createdProfile.phone,
          image_url: null,
        };

        setCustomer(finalCustomerData);
        localStorage.setItem("roam_customer", JSON.stringify(finalCustomerData));
        localStorage.setItem(
          "roam_access_token",
          authData.session.access_token,
        );
        localStorage.setItem("roam_user_type", "customer");
      }

      console.log(
        "AuthContext signUpCustomer: Customer registration completed successfully",
      );
      
      // Show success message
      toast({
        title: "Registration Successful",
        description: authData.session 
          ? "Welcome! Your account has been created."
          : "Please check your email and click the confirmation link to complete your registration.",
      });

    } catch (error) {
      console.error("AuthContext signUpCustomer: Error:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      console.log("AuthContext: Starting Google OAuth sign-in...");

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/home`,
        },
      });

      if (error) {
        console.error("AuthContext: Google OAuth error:", error);
        throw new Error(`Google sign-in failed: ${error.message}`);
      }

      console.log("AuthContext: Google OAuth initiated successfully");
      // The actual sign-in will be handled by the redirect callback
    } catch (error) {
      console.error("AuthContext: Google sign-in error:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogleIdToken = async (idToken: string, nonce: string) => {
    setLoading(true);
    try {
      console.log("AuthContext: Starting Google ID token sign-in...");

      const { data: authData, error: authError } =
        await supabase.auth.signInWithIdToken({
          provider: "google",
          token: idToken,
          nonce,
        });

      if (authError) {
        console.error("AuthContext: Google ID token error:", authError);
        throw new Error(`Google sign-in failed: ${authError.message}`);
      }

      if (!authData.user) {
        throw new Error("No user data received from Google");
      }

      // Handle customer profile creation/retrieval
      await handleOAuthUser(authData.user);

      console.log("AuthContext: Google ID token sign-in successful");
    } catch (error) {
      console.error("AuthContext: Google ID token sign-in error:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signInWithApple = async () => {
    setLoading(true);
    try {
      console.log("AuthContext: Starting Apple OAuth sign-in...");

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "apple",
        options: {
          redirectTo: `${window.location.origin}/home`,
        },
      });

      if (error) {
        console.error("AuthContext: Apple OAuth error:", error);
        throw new Error(`Apple sign-in failed: ${error.message}`);
      }

      console.log("AuthContext: Apple OAuth initiated successfully");
      // The actual sign-in will be handled by the redirect callback
    } catch (error) {
      console.error("AuthContext: Apple sign-in error:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthUser = async (user: User) => {
    // Check if customer profile exists
    const { data: customerProfile, error: profileError } = await supabase
      .from("customer_profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (profileError && profileError.code !== "PGRST116") {
      throw new Error("Failed to fetch customer profile");
    }

    let customerData;
    if (!customerProfile) {
      // Create customer profile for OAuth user
      await createCustomerProfileFromOAuth(user);
      
      // Fetch the newly created profile
      const { data: newProfile } = await supabase
        .from("customer_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      customerData = {
        id: newProfile.id,
        user_id: newProfile.user_id,
        email: newProfile.email,
        customer_id: newProfile.id,
        first_name: newProfile.first_name,
        last_name: newProfile.last_name,
        phone: newProfile.phone || "",
        image_url: newProfile.image_url,
      };
    } else {
      customerData = {
        id: customerProfile.id,
        user_id: customerProfile.user_id,
        email: customerProfile.email,
        customer_id: customerProfile.id,
        first_name: customerProfile.first_name,
        last_name: customerProfile.last_name,
        phone: customerProfile.phone || "",
        image_url: customerProfile.image_url,
      };
    }

    setCustomer(customerData);
    localStorage.setItem("roam_customer", JSON.stringify(customerData));
    localStorage.setItem("roam_user_type", "customer");
  };

  const createCustomerProfileFromOAuth = async (user: User) => {
    console.log("AuthContext: Creating customer profile from OAuth user...");

    const fullName = user.user_metadata?.full_name || user.user_metadata?.name || "";
    const nameParts = fullName.split(" ");
    const firstName = nameParts[0] || "Customer";
    const lastName = nameParts.slice(1).join(" ") || "";

    const newProfile = {
      user_id: user.id,
      email: user.email || "",
      first_name: firstName,
      last_name: lastName,
      phone: user.phone || "",
      image_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
    };

    const { data: createdProfile, error: createError } = await supabase
      .from("customer_profiles")
      .insert(newProfile)
      .select()
      .single();

    if (createError) {
      console.error("Error creating OAuth customer profile:", createError);
      throw new Error("Failed to create customer profile");
    }

    return createdProfile;
  };

  const resendVerificationEmail = async (email: string) => {
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
      });

      if (error) {
        throw new Error(`Failed to resend verification email: ${error.message}`);
      }

      toast({
        title: "Verification Email Sent",
        description: "Please check your email for the verification link.",
      });
    } catch (error) {
      console.error("Error resending verification email:", error);
      throw error;
    }
  };

  const updateCustomerProfile = async (profileData: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    dateOfBirth?: string;
    bio?: string;
    imageUrl?: string;
  }) => {
    if (!customer) {
      throw new Error("No customer logged in");
    }

    try {
      const updateData = {
        first_name: profileData.firstName,
        last_name: profileData.lastName,
        email: profileData.email,
        phone: profileData.phone,
        date_of_birth: profileData.dateOfBirth || null,
        bio: profileData.bio || null,
        image_url: profileData.imageUrl || null,
      };

      const { data: updatedProfile, error } = await supabase
        .from("customer_profiles")
        .update(updateData)
        .eq("id", customer.id)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update profile: ${error.message}`);
      }

      // Update local state
      const updatedCustomerData = {
        ...customer,
        first_name: updatedProfile.first_name,
        last_name: updatedProfile.last_name,
        email: updatedProfile.email,
        phone: updatedProfile.phone,
        image_url: updatedProfile.image_url,
      };

      setCustomer(updatedCustomerData);
      localStorage.setItem("roam_customer", JSON.stringify(updatedCustomerData));

      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      });
    } catch (error) {
      console.error("Error updating customer profile:", error);
      throw error;
    }
  };

  const uploadCustomerAvatar = async (file: File): Promise<string> => {
    if (!customer) {
      throw new Error("No customer logged in");
    }

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${customer.id}.${fileExt}`;
      const filePath = `customer_avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("customer-avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        throw new Error(`Failed to upload avatar: ${uploadError.message}`);
      }

      const { data: urlData } = supabase.storage
        .from("customer-avatars")
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (error) {
      console.error("Error uploading customer avatar:", error);
      throw error;
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      console.log("AuthContext: Starting sign out...");

      // Clear local state first
      setCustomer(null);
      clearStoredData();

      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("AuthContext: Sign out error:", error);
        // Don't throw error here, as we've already cleared local state
      }

      console.log("AuthContext: Sign out completed successfully");
    } catch (error) {
      console.error("AuthContext: Sign out error:", error);
      // Don't throw error, just log it
    } finally {
      setLoading(false);
    }
  };

  const refreshUser = async () => {
    if (!customer) return;

    try {
      const { data: customerProfile, error } = await supabase
        .from("customer_profiles")
        .select("*")
        .eq("id", customer.id)
        .single();

      if (error) {
        console.error("Error refreshing customer profile:", error);
        return;
      }

      const updatedCustomerData = {
        id: customerProfile.id,
        user_id: customerProfile.user_id,
        email: customerProfile.email,
        customer_id: customerProfile.id,
        first_name: customerProfile.first_name,
        last_name: customerProfile.last_name,
        phone: customerProfile.phone,
        image_url: customerProfile.image_url,
      };

      setCustomer(updatedCustomerData);
      localStorage.setItem("roam_customer", JSON.stringify(updatedCustomerData));
    } catch (error) {
      console.error("Error refreshing user:", error);
    }
  };

  const isCustomer = !!customer;
  const isAuthenticated = isCustomer;

  return (
    <AuthContext.Provider
      value={{
        customer,
        loading,
        signInCustomer,
        signUpCustomer,
        signInWithGoogle,
        signInWithGoogleIdToken,
        signInWithApple,
        resendVerificationEmail,
        updateCustomerProfile,
        uploadCustomerAvatar,
        signOut,
        refreshUser,
        isCustomer,
        isAuthenticated,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
