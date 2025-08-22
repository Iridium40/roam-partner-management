export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      // Enhanced business profiles table
      business_profiles: {
        Row: {
          id: string;
          business_name: string;
          business_type: BusinessType;
          contact_email: string | null;
          phone: string | null;
          verification_status: VerificationStatus;
          stripe_connect_account_id: string | null;
          is_active: boolean;
          created_at: string;
          image_url: string | null;
          website_url: string | null;
          logo_url: string | null;
          cover_image_url: string | null;
          business_hours: Json;
          social_media: Json;
          verification_notes: string | null;
          rejection_reason: string | null;
          years_in_business: number | null;
          business_description: string | null;
          subscription_plan_id: string | null;
          subscription_status: SubscriptionStatus;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          setup_completed: boolean;
          setup_step: number;
          approved_at: string | null;
        };
        Insert: {
          id?: string;
          business_name: string;
          business_type: BusinessType;
          contact_email?: string | null;
          phone?: string | null;
          verification_status?: VerificationStatus;
          stripe_connect_account_id?: string | null;
          is_active?: boolean;
          created_at?: string;
          image_url?: string | null;
          website_url?: string | null;
          logo_url?: string | null;
          cover_image_url?: string | null;
          business_hours?: Json;
          social_media?: Json;
          verification_notes?: string | null;
          rejection_reason?: string | null;
          years_in_business?: number | null;
          business_description?: string | null;
          subscription_plan_id?: string | null;
          subscription_status?: SubscriptionStatus;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          setup_completed?: boolean;
          setup_step?: number;
          approved_at?: string | null;
        };
        Update: {
          id?: string;
          business_name?: string;
          business_type?: BusinessType;
          contact_email?: string | null;
          phone?: string | null;
          verification_status?: VerificationStatus;
          stripe_connect_account_id?: string | null;
          is_active?: boolean;
          created_at?: string;
          image_url?: string | null;
          website_url?: string | null;
          logo_url?: string | null;
          cover_image_url?: string | null;
          business_hours?: Json;
          social_media?: Json;
          verification_notes?: string | null;
          rejection_reason?: string | null;
          years_in_business?: number | null;
          business_description?: string | null;
          subscription_plan_id?: string | null;
          subscription_status?: SubscriptionStatus;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          setup_completed?: boolean;
          setup_step?: number;
          approved_at?: string | null;
        };
      };
      // Enhanced business locations
      business_locations: {
        Row: {
          id: string;
          business_id: string;
          location_name: string | null;
          address_line1: string | null;
          address_line2: string | null;
          city: string | null;
          state: string | null;
          postal_code: string | null;
          country: string | null;
          latitude: number | null;
          longitude: number | null;
          is_active: boolean;
          created_at: string;
          is_primary: boolean | null;
          offers_mobile_services: boolean | null;
          mobile_service_radius: number | null;
        };
        Insert: {
          id?: string;
          business_id: string;
          location_name?: string | null;
          address_line1?: string | null;
          address_line2?: string | null;
          city?: string | null;
          state?: string | null;
          postal_code?: string | null;
          country?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          is_active?: boolean;
          created_at?: string;
          is_primary?: boolean | null;
          offers_mobile_services?: boolean | null;
          mobile_service_radius?: number | null;
        };
        Update: {
          id?: string;
          business_id?: string;
          location_name?: string | null;
          address_line1?: string | null;
          address_line2?: string | null;
          city?: string | null;
          state?: string | null;
          postal_code?: string | null;
          country?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          is_active?: boolean;
          created_at?: string;
          is_primary?: boolean | null;
          offers_mobile_services?: boolean | null;
          mobile_service_radius?: number | null;
        };
      };
      // Enhanced providers table
      providers: {
        Row: {
          id: string;
          user_id: string | null;
          business_id: string;
          location_id: string;
          first_name: string;
          last_name: string;
          email: string;
          phone: string;
          bio: string | null;
          image_url: string | null;
          is_active: boolean;
          created_at: string;
          date_of_birth: string | null;
          experience_years: number | null;
          verification_status: ProviderVerificationStatus;
          background_check_status: BackgroundCheckStatus;
          total_bookings: number;
          completed_bookings: number;
          average_rating: number;
          total_reviews: number;
          provider_role: ProviderRole;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          business_id: string;
          location_id: string;
          first_name: string;
          last_name: string;
          email: string;
          phone: string;
          bio?: string | null;
          image_url?: string | null;
          is_active?: boolean;
          created_at?: string;
          date_of_birth?: string | null;
          experience_years?: number | null;
          verification_status?: ProviderVerificationStatus;
          background_check_status?: BackgroundCheckStatus;
          total_bookings?: number;
          completed_bookings?: number;
          average_rating?: number;
          total_reviews?: number;
          provider_role: ProviderRole;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          business_id?: string;
          location_id?: string;
          first_name?: string;
          last_name?: string;
          email?: string;
          phone?: string;
          bio?: string | null;
          image_url?: string | null;
          is_active?: boolean;
          created_at?: string;
          date_of_birth?: string | null;
          experience_years?: number | null;
          verification_status?: ProviderVerificationStatus;
          background_check_status?: BackgroundCheckStatus;
          total_bookings?: number;
          completed_bookings?: number;
          average_rating?: number;
          total_reviews?: number;
          provider_role?: ProviderRole;
        };
      };
      // Business services with custom pricing
      business_services: {
        Row: {
          id: string;
          business_id: string;
          service_id: string;
          business_price: number;
          is_active: boolean;
          created_at: string;
          delivery_type: DeliveryType | null;
        };
        Insert: {
          id?: string;
          business_id: string;
          service_id: string;
          business_price: number;
          is_active?: boolean;
          created_at?: string;
          delivery_type?: DeliveryType | null;
        };
        Update: {
          id?: string;
          business_id?: string;
          service_id?: string;
          business_price?: number;
          is_active?: boolean;
          created_at?: string;
          delivery_type?: DeliveryType | null;
        };
      };
      // Business add-ons
      business_addons: {
        Row: {
          id: string;
          business_id: string;
          addon_id: string;
          custom_price: number | null;
          is_available: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          addon_id: string;
          custom_price?: number | null;
          is_available?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          addon_id?: string;
          custom_price?: number | null;
          is_available?: boolean;
          created_at?: string;
        };
      };
      // Comprehensive booking system
      bookings: {
        Row: {
          id: string;
          customer_id: string | null;
          provider_id: string;
          service_id: string;
          booking_date: string;
          start_time: string;
          total_amount: number;
          created_at: string;
          service_fee: number;
          service_fee_charged: boolean;
          service_fee_charged_at: string | null;
          remaining_balance: number;
          remaining_balance_charged: boolean;
          remaining_balance_charged_at: string | null;
          cancellation_fee: number;
          refund_amount: number;
          cancelled_at: string | null;
          cancelled_by: string | null;
          cancellation_reason: string | null;
          guest_name: string | null;
          guest_email: string | null;
          guest_phone: string | null;
          customer_location_id: string | null;
          business_location_id: string | null;
          delivery_type: DeliveryType;
          payment_status: PaymentStatus;
          booking_status: BookingStatus;
          admin_notes: string | null;
          tip_eligible: boolean;
          tip_amount: number;
          tip_status: TipStatus;
          tip_requested_at: string | null;
          tip_deadline: string | null;
          booking_reference: string | null;
        };
        Insert: {
          id?: string;
          customer_id?: string | null;
          provider_id: string;
          service_id: string;
          booking_date: string;
          start_time: string;
          total_amount: number;
          created_at?: string;
          service_fee?: number;
          service_fee_charged?: boolean;
          service_fee_charged_at?: string | null;
          remaining_balance?: number;
          remaining_balance_charged?: boolean;
          remaining_balance_charged_at?: string | null;
          cancellation_fee?: number;
          refund_amount?: number;
          cancelled_at?: string | null;
          cancelled_by?: string | null;
          cancellation_reason?: string | null;
          guest_name?: string | null;
          guest_email?: string | null;
          guest_phone?: string | null;
          customer_location_id?: string | null;
          business_location_id?: string | null;
          delivery_type?: DeliveryType;
          payment_status?: PaymentStatus;
          booking_status?: BookingStatus;
          admin_notes?: string | null;
          tip_eligible?: boolean;
          tip_amount?: number;
          tip_status?: TipStatus;
          tip_requested_at?: string | null;
          tip_deadline?: string | null;
          booking_reference?: string | null;
        };
        Update: {
          id?: string;
          customer_id?: string | null;
          provider_id?: string;
          service_id?: string;
          booking_date?: string;
          start_time?: string;
          total_amount?: number;
          created_at?: string;
          service_fee?: number;
          service_fee_charged?: boolean;
          service_fee_charged_at?: string | null;
          remaining_balance?: number;
          remaining_balance_charged?: boolean;
          remaining_balance_charged_at?: string | null;
          cancellation_fee?: number;
          refund_amount?: number;
          cancelled_at?: string | null;
          cancelled_by?: string | null;
          cancellation_reason?: string | null;
          guest_name?: string | null;
          guest_email?: string | null;
          guest_phone?: string | null;
          customer_location_id?: string | null;
          business_location_id?: string | null;
          delivery_type?: DeliveryType;
          payment_status?: PaymentStatus;
          booking_status?: BookingStatus;
          admin_notes?: string | null;
          tip_eligible?: boolean;
          tip_amount?: number;
          tip_status?: TipStatus;
          tip_requested_at?: string | null;
          tip_deadline?: string | null;
          booking_reference?: string | null;
        };
      };
      // Booking actions audit trail
      booking_actions: {
        Row: {
          id: string;
          booking_id: string;
          action_type: string;
          performed_by_user_id: string | null;
          performed_for_provider_id: string | null;
          old_values: Json | null;
          new_values: Json | null;
          action_details: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          booking_id: string;
          action_type: string;
          performed_by_user_id?: string | null;
          performed_for_provider_id?: string | null;
          old_values?: Json | null;
          new_values?: Json | null;
          action_details?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          booking_id?: string;
          action_type?: string;
          performed_by_user_id?: string | null;
          performed_for_provider_id?: string | null;
          old_values?: Json | null;
          new_values?: Json | null;
          action_details?: Json | null;
          created_at?: string;
        };
      };
      // Business documents
      business_documents: {
        Row: {
          id: string;
          business_id: string;
          document_type: BusinessDocumentType;
          document_name: string;
          file_url: string;
          file_size_bytes: number | null;
          verification_status: DocumentVerificationStatus;
          verified_by: string | null;
          verified_at: string | null;
          rejection_reason: string | null;
          expiry_date: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          document_type: BusinessDocumentType;
          document_name: string;
          file_url: string;
          file_size_bytes?: number | null;
          verification_status?: DocumentVerificationStatus;
          verified_by?: string | null;
          verified_at?: string | null;
          rejection_reason?: string | null;
          expiry_date?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          document_type?: BusinessDocumentType;
          document_name?: string;
          file_url?: string;
          file_size_bytes?: number | null;
          verification_status?: DocumentVerificationStatus;
          verified_by?: string | null;
          verified_at?: string | null;
          rejection_reason?: string | null;
          expiry_date?: string | null;
          created_at?: string;
        };
      };
      // Calendar integrations
      provider_calendar_connections: {
        Row: {
          id: string;
          provider_id: string;
          calendar_type: CalendarType;
          access_token: string | null;
          refresh_token: string | null;
          calendar_id: string | null;
          sync_enabled: boolean;
          last_sync_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          provider_id: string;
          calendar_type: CalendarType;
          access_token?: string | null;
          refresh_token?: string | null;
          calendar_id?: string | null;
          sync_enabled?: boolean;
          last_sync_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          provider_id?: string;
          calendar_type?: CalendarType;
          access_token?: string | null;
          refresh_token?: string | null;
          calendar_id?: string | null;
          sync_enabled?: boolean;
          last_sync_at?: string | null;
          created_at?: string;
        };
      };
      // Push notifications
      push_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          subscription_data: Json;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          subscription_data: Json;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          subscription_data?: Json;
          user_agent?: string | null;
          created_at?: string;
        };
      };
      // Communication preferences
      user_communication_preferences: {
        Row: {
          id: string;
          user_id: string;
          sms_enabled: boolean;
          push_enabled: boolean;
          email_enabled: boolean;
          notification_types: Json;
          quiet_hours_start: string | null;
          quiet_hours_end: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          sms_enabled?: boolean;
          push_enabled?: boolean;
          email_enabled?: boolean;
          notification_types?: Json;
          quiet_hours_start?: string | null;
          quiet_hours_end?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          sms_enabled?: boolean;
          push_enabled?: boolean;
          email_enabled?: boolean;
          notification_types?: Json;
          quiet_hours_start?: string | null;
          quiet_hours_end?: string | null;
          created_at?: string;
        };
      };
      // Setup progress tracking
      business_setup_progress: {
        Row: {
          id: string;
          business_id: string;
          current_step: number;
          total_steps: number;
          business_profile_completed: boolean;
          locations_completed: boolean;
          services_pricing_completed: boolean;
          staff_setup_completed: boolean;
          integrations_completed: boolean;
          stripe_connect_completed: boolean;
          subscription_completed: boolean;
          go_live_completed: boolean;
          setup_started_at: string;
          setup_completed_at: string | null;
        };
        Insert: {
          id?: string;
          business_id: string;
          current_step?: number;
          total_steps?: number;
          business_profile_completed?: boolean;
          locations_completed?: boolean;
          services_pricing_completed?: boolean;
          staff_setup_completed?: boolean;
          integrations_completed?: boolean;
          stripe_connect_completed?: boolean;
          subscription_completed?: boolean;
          go_live_completed?: boolean;
          setup_started_at?: string;
          setup_completed_at?: string | null;
        };
        Update: {
          id?: string;
          business_id?: string;
          current_step?: number;
          total_steps?: number;
          business_profile_completed?: boolean;
          locations_completed?: boolean;
          services_pricing_completed?: boolean;
          staff_setup_completed?: boolean;
          integrations_completed?: boolean;
          stripe_connect_completed?: boolean;
          subscription_completed?: boolean;
          go_live_completed?: boolean;
          setup_started_at?: string;
          setup_completed_at?: string | null;
        };
      };
      // Services
      services: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          category_id: string | null;
          base_price: number;
          duration_minutes: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          category_id?: string | null;
          base_price: number;
          duration_minutes: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          category_id?: string | null;
          base_price?: number;
          duration_minutes?: number;
          is_active?: boolean;
          created_at?: string;
        };
      };
      // Service add-ons
      service_addons: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          image_url: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          image_url?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          image_url?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      // Service categories
      service_categories: {
        Row: {
          id: string;
          description: string | null;
          is_active: boolean;
          created_at: string;
          image_url: string | null;
          sort_order: number | null;
          service_category_type: string;
        };
        Insert: {
          id?: string;
          description?: string | null;
          is_active?: boolean;
          created_at?: string;
          image_url?: string | null;
          sort_order?: number | null;
          service_category_type: string;
        };
        Update: {
          id?: string;
          description?: string | null;
          is_active?: boolean;
          created_at?: string;
          image_url?: string | null;
          sort_order?: number | null;
          service_category_type?: string;
        };
      };
      // Service addon eligibility
      service_addon_eligibility: {
        Row: {
          id: string;
          service_id: string;
          addon_id: string;
          is_recommended: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          service_id: string;
          addon_id: string;
          is_recommended?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          service_id?: string;
          addon_id?: string;
          is_recommended?: boolean;
          created_at?: string;
        };
      };
      // Customer accounts
      customers: {
        Row: {
          id: string;
          user_id: string;
          first_name: string;
          last_name: string;
          email: string;
          phone: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          date_of_birth: string | null;
          profile_image_url: string | null;
          stripe_customer_id: string | null;
          total_bookings: number;
          total_spent: number;
          loyalty_points: number;
          preferred_communication: CustomerCommunicationPreference;
        };
        Insert: {
          id?: string;
          user_id: string;
          first_name: string;
          last_name: string;
          email: string;
          phone?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          date_of_birth?: string | null;
          profile_image_url?: string | null;
          stripe_customer_id?: string | null;
          total_bookings?: number;
          total_spent?: number;
          loyalty_points?: number;
          preferred_communication?: CustomerCommunicationPreference;
        };
        Update: {
          id?: string;
          user_id?: string;
          first_name?: string;
          last_name?: string;
          email?: string;
          phone?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          date_of_birth?: string | null;
          profile_image_url?: string | null;
          stripe_customer_id?: string | null;
          total_bookings?: number;
          total_spent?: number;
          loyalty_points?: number;
          preferred_communication?: CustomerCommunicationPreference;
        };
      };
      // Customer addresses
      customer_addresses: {
        Row: {
          id: string;
          customer_id: string;
          address_line1: string;
          address_line2: string | null;
          city: string;
          state: string;
          postal_code: string;
          country: string;
          latitude: number | null;
          longitude: number | null;
          is_default: boolean;
          address_type: CustomerAddressType;
          created_at: string;
        };
        Insert: {
          id?: string;
          customer_id: string;
          address_line1: string;
          address_line2?: string | null;
          city: string;
          state: string;
          postal_code: string;
          country: string;
          latitude?: number | null;
          longitude?: number | null;
          is_default?: boolean;
          address_type?: CustomerAddressType;
          created_at?: string;
        };
        Update: {
          id?: string;
          customer_id?: string;
          address_line1?: string;
          address_line2?: string | null;
          city?: string;
          state?: string;
          postal_code?: string;
          country?: string;
          latitude?: number | null;
          longitude?: number | null;
          is_default?: boolean;
          address_type?: CustomerAddressType;
          created_at?: string;
        };
      };
      // Announcements for customers, providers, and businesses
      announcements: {
        Row: {
          id: string;
          title: string;
          content: string;
          is_active: boolean;
          created_at: string;
          start_date: string | null;
          end_date: string | null;
          announcement_audience: Database["public"]["Enums"]["announcement_audience"] | null;
          announcement_type: Database["public"]["Enums"]["announcement_type"] | null;
        };
        Insert: {
          id?: string;
          title: string;
          content: string;
          is_active?: boolean;
          created_at?: string;
          start_date?: string | null;
          end_date?: string | null;
          announcement_audience?: Database["public"]["Enums"]["announcement_audience"] | null;
          announcement_type?: Database["public"]["Enums"]["announcement_type"] | null;
        };
        Update: {
          id?: string;
          title?: string;
          content?: string;
          is_active?: boolean;
          created_at?: string;
          start_date?: string | null;
          end_date?: string | null;
          announcement_audience?: Database["public"]["Enums"]["announcement_audience"] | null;
          announcement_type?: Database["public"]["Enums"]["announcement_type"] | null;
        };
      };
      // Provider Availability
      provider_availability: {
        Row: {
          id: string;
          provider_id: string;
          business_id: string;
          schedule_type: 'weekly_recurring' | 'specific_date' | 'date_range';
          day_of_week: number | null;
          start_date: string | null;
          end_date: string | null;
          start_time: string;
          end_time: string;
          max_bookings_per_slot: number;
          slot_duration_minutes: number;
          buffer_time_minutes: number;
          is_active: boolean;
          is_blocked: boolean;
          block_reason: string | null;
          allowed_services: string[] | null;
          location_type: 'mobile' | 'business' | 'both';
          service_location_id: string | null;
          override_price: number | null;
          notes: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          provider_id: string;
          business_id: string;
          schedule_type: 'weekly_recurring' | 'specific_date' | 'date_range';
          day_of_week?: number | null;
          start_date?: string | null;
          end_date?: string | null;
          start_time: string;
          end_time: string;
          max_bookings_per_slot?: number;
          slot_duration_minutes?: number;
          buffer_time_minutes?: number;
          is_active?: boolean;
          is_blocked?: boolean;
          block_reason?: string | null;
          allowed_services?: string[] | null;
          location_type?: 'mobile' | 'business' | 'both';
          service_location_id?: string | null;
          override_price?: number | null;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          provider_id?: string;
          business_id?: string;
          schedule_type?: 'weekly_recurring' | 'specific_date' | 'date_range';
          day_of_week?: number | null;
          start_date?: string | null;
          end_date?: string | null;
          start_time?: string;
          end_time?: string;
          max_bookings_per_slot?: number;
          slot_duration_minutes?: number;
          buffer_time_minutes?: number;
          is_active?: boolean;
          is_blocked?: boolean;
          block_reason?: string | null;
          allowed_services?: string[] | null;
          location_type?: 'mobile' | 'business' | 'both';
          service_location_id?: string | null;
          override_price?: number | null;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      // Provider Availability Exceptions
      provider_availability_exceptions: {
        Row: {
          id: string;
          provider_id: string;
          exception_date: string;
          exception_type: 'unavailable' | 'limited_hours' | 'different_location';
          start_time: string | null;
          end_time: string | null;
          max_bookings: number | null;
          service_location_id: string | null;
          reason: string;
          notes: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          provider_id: string;
          exception_date: string;
          exception_type?: 'unavailable' | 'limited_hours' | 'different_location';
          start_time?: string | null;
          end_time?: string | null;
          max_bookings?: number | null;
          service_location_id?: string | null;
          reason: string;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          provider_id?: string;
          exception_date?: string;
          exception_type?: 'unavailable' | 'limited_hours' | 'different_location';
          start_time?: string | null;
          end_time?: string | null;
          max_bookings?: number | null;
          service_location_id?: string | null;
          reason?: string;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      // Provider Booking Preferences
      provider_booking_preferences: {
        Row: {
          id: string;
          provider_id: string;
          min_advance_hours: number;
          max_advance_days: number;
          auto_accept_bookings: boolean;
          auto_accept_within_hours: number;
          allow_cancellation: boolean;
          cancellation_window_hours: number;
          notify_new_booking: boolean;
          notify_cancellation: boolean;
          notify_reminder_hours: number;
          prefer_consecutive_bookings: boolean;
          min_break_between_bookings: number;
          max_bookings_per_day: number;
          updated_at: string;
        };
        Insert: {
          id?: string;
          provider_id: string;
          min_advance_hours?: number;
          max_advance_days?: number;
          auto_accept_bookings?: boolean;
          auto_accept_within_hours?: number;
          allow_cancellation?: boolean;
          cancellation_window_hours?: number;
          notify_new_booking?: boolean;
          notify_cancellation?: boolean;
          notify_reminder_hours?: number;
          prefer_consecutive_bookings?: boolean;
          min_break_between_bookings?: number;
          max_bookings_per_day?: number;
          updated_at?: string;
        };
        Update: {
          id?: string;
          provider_id?: string;
          min_advance_hours?: number;
          max_advance_days?: number;
          auto_accept_bookings?: boolean;
          auto_accept_within_hours?: number;
          allow_cancellation?: boolean;
          cancellation_window_hours?: number;
          notify_new_booking?: boolean;
          notify_cancellation?: boolean;
          notify_reminder_hours?: number;
          prefer_consecutive_bookings?: boolean;
          min_break_between_bookings?: number;
          max_bookings_per_day?: number;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      business_type:
        | "independent"
        | "small_business"
        | "franchise"
        | "enterprise"
        | "other";
      provider_role: "owner" | "dispatcher" | "provider";
      verification_status:
        | "pending"
        | "under_review"
        | "approved"
        | "rejected"
        | "requires_more_info";
      provider_verification_status: "pending" | "approved" | "rejected";
      background_check_status: "under_review" | "passed" | "failed";
      document_verification_status: "pending" | "approved" | "rejected";
      subscription_status: "trial" | "active" | "past_due" | "cancelled";
      delivery_type: "business_location" | "mobile" | "virtual";
      payment_status: "pending" | "paid" | "failed" | "refunded";
      booking_status:
        | "pending"
        | "confirmed"
        | "in_progress"
        | "completed"
        | "cancelled";
      tip_status: "none" | "requested" | "paid" | "declined";
      calendar_type: "google" | "outlook" | "apple";
      customer_communication_preference: "email" | "sms" | "push" | "all";
      customer_address_type: "home" | "work" | "other";
      announcement_audience: "customer" | "provider" | "business" | "all";
      announcement_type: "info" | "promotion" | "maintenance" | "warning" | "update";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

// Type exports
export type BusinessType =
  | "independent"
  | "small_business"
  | "franchise"
  | "enterprise"
  | "other";
export type ProviderRole = "owner" | "dispatcher" | "provider";
export type VerificationStatus =
  | "pending"
  | "under_review"
  | "approved"
  | "rejected"
  | "requires_more_info";
export type ProviderVerificationStatus = "pending" | "approved" | "rejected";
export type BackgroundCheckStatus = "under_review" | "passed" | "failed";
export type DocumentVerificationStatus = "pending" | "verified" | "rejected" | "under_review";
export type BusinessDocumentType = 
  | "drivers_license"
  | "proof_of_address"
  | "liability_insurance"
  | "professional_license"
  | "professional_certificate"
  | "business_license";
export type SubscriptionStatus = "trial" | "active" | "past_due" | "cancelled";
export type DeliveryType = "business_location" | "mobile" | "virtual";
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";
export type BookingStatus =
  | "pending"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled";
export type TipStatus = "none" | "requested" | "paid" | "declined";
export type CalendarType = "google" | "outlook" | "apple";
export type CustomerCommunicationPreference = "email" | "sms" | "push" | "all";
export type CustomerAddressType = "home" | "work" | "other";

// Enhanced interfaces
export interface AuthUser {
  id: string;
  email: string;
  provider_id: string;
  business_id: string;
  location_id: string;
  provider_role: ProviderRole;
  first_name: string;
  last_name: string;
}

export interface AuthCustomer {
  id: string;
  user_id: string; // Add user_id for foreign key relationships
  email: string;
  customer_id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  image_url: string | null;
}

export interface BusinessRegistration {
  // Business Information
  business_name: string;
  business_type: BusinessType;
  contact_email: string;
  phone: string;
  website_url?: string;
  business_description: string;
  years_in_business: number;

  // Owner/Primary Contact
  owner_first_name: string;
  owner_last_name: string;
  owner_email: string;
  owner_phone: string;
  owner_date_of_birth: Date;

  // Business Address
  business_address: {
    address_line1: string;
    address_line2?: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
}

export interface SetupProgress {
  business_id: string;
  current_step: number;
  total_steps: number;
  steps_completed: {
    business_profile: boolean;
    business_locations: boolean;
    services_pricing: boolean;
    staff_setup: boolean;
    integrations: boolean;
    stripe_connect: boolean;
    subscription: boolean;
    go_live: boolean;
  };
  setup_completed_at?: Date;
}

export interface SubscriptionPlan {
  plan_id: string;
  plan_name: string;
  monthly_price: number;
  features: {
    max_providers: number;
    max_locations: number;
    advanced_analytics: boolean;
    priority_support: boolean;
    api_access: boolean;
  };
}

// Table type exports
export type BusinessProfile =
  Database["public"]["Tables"]["business_profiles"]["Row"];
export type BusinessLocation =
  Database["public"]["Tables"]["business_locations"]["Row"];
export type Provider = Database["public"]["Tables"]["providers"]["Row"];
export type BusinessService =
  Database["public"]["Tables"]["business_services"]["Row"];
export type BusinessAddon =
  Database["public"]["Tables"]["business_addons"]["Row"];
export type Booking = Database["public"]["Tables"]["bookings"]["Row"];
export type BookingAction =
  Database["public"]["Tables"]["booking_actions"]["Row"];
export type BusinessDocument =
  Database["public"]["Tables"]["business_documents"]["Row"];
export type CalendarConnection =
  Database["public"]["Tables"]["provider_calendar_connections"]["Row"];
export type PushSubscription =
  Database["public"]["Tables"]["push_subscriptions"]["Row"];
export type CommunicationPreferences =
  Database["public"]["Tables"]["user_communication_preferences"]["Row"];
export type BusinessSetupProgress =
  Database["public"]["Tables"]["business_setup_progress"]["Row"];
export type Service = Database["public"]["Tables"]["services"]["Row"];
export type ServiceAddon =
  Database["public"]["Tables"]["service_addons"]["Row"];
export type ServiceCategory =
  Database["public"]["Tables"]["service_categories"]["Row"];
export type ServiceAddonEligibility =
  Database["public"]["Tables"]["service_addon_eligibility"]["Row"];
export type Customer = Database["public"]["Tables"]["customers"]["Row"];
export type CustomerAddress =
  Database["public"]["Tables"]["customer_addresses"]["Row"];
export type Announcement = Database["public"]["Tables"]["announcements"]["Row"];
