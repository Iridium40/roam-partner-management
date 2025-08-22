import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  LogOut,
  Calendar,
  DollarSign,
  Star,
  Users,
  Crown,
  TrendingUp,
  Clock,
  MapPin,
  Phone,
  Mail,
  Edit,
  Plus,
  Settings,
  Bell,
  ChevronRight,
  CheckCircle,
  XCircle,
  AlertCircle,
  BarChart3,
  MessageCircle,
  Camera,
  Smartphone,
  Building,
  Search,
  Eye,
  Video,
  Download,
  Upload,
  Shield,
  Share2,
  Copy,
  ExternalLink,
  Move,
  RotateCcw,
  Stethoscope,
  Scissors,
  Dumbbell,
  Home,
  Heart,
  Zap,
  Brain,
  Activity,
  Briefcase,
  Palette,
  Wrench,
  Hash,
  ChevronDown,
  User,
  Menu,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import ConversationChat from "@/components/ConversationChat";
import ConversationsList from "@/components/ConversationsList";
import useRealtimeBookings from "@/hooks/useRealtimeBookings";
import RealtimeBookingNotifications from "@/components/RealtimeBookingNotifications";
import BookingStatusIndicator, {
  RealtimeStatusUpdate,
} from "@/components/BookingStatusIndicator";
import type { Provider, Booking, BusinessProfile } from "@/lib/database.types";

// Service category and subcategory types for database integration
interface ServiceCategory {
  id: string;
  service_category_type: string;
  description: string;
  is_active: boolean;
  image_url?: string;
  sort_order?: number;
}

interface ServiceSubcategory {
  id: string;
  category_id: string;
  service_subcategory_type: string;
  description: string;
  is_active: boolean;
  image_url?: string;
  category?: ServiceCategory;
}

export default function ProviderDashboard() {
  const { user, signOut, isOwner, isDispatcher, isProvider } = useAuth();
  const { toast } = useToast();
  const [isAvailable, setIsAvailable] = useState(true);
  const [provider, setProvider] = useState<Provider | null>(null);
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [businessMetrics, setBusinessMetrics] = useState({
    activeLocations: 0,
    teamMembers: 0,
    servicesOffered: 0,
  });

  // Real-time booking updates for providers
  const { isConnected, refreshBookings } = useRealtimeBookings({
    userId: user?.id,
    userType: "provider",
    onStatusChange: (bookingUpdate) => {
      // Update the specific booking in our local state
      setBookings((prev) =>
        prev.map((booking) =>
          booking.id === bookingUpdate.id
            ? {
                ...booking,
                status: bookingUpdate.status,
                updated_at: bookingUpdate.updated_at,
              }
            : booking,
        ),
      );
    },
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("bookings");
  const [activeBookingTab, setActiveBookingTab] = useState("today");
  const [selectedLocationFilter, setSelectedLocationFilter] = useState<string>("all");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [locations, setLocations] = useState<any[]>([]);
  const [allProviders, setAllProviders] = useState<any[]>([]);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showTaxInfoModal, setShowTaxInfoModal] = useState(false);
  const [taxInfo, setTaxInfo] = useState({
    legalBusinessName: "",
    taxId: "",
    taxIdType: "EIN",
    businessEntityType: "LLC",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    zipCode: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
  });

  // Staff Management State
  const [staffMembers, setStaffMembers] = useState<any[]>([]);
  const [showEditStaffModal, setShowEditStaffModal] = useState(false);
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any>(null);
  const [staffRoleFilter, setStaffRoleFilter] = useState("all");
  const [staffVerificationFilter, setStaffVerificationFilter] = useState("all");
  const [staffActiveFilter, setStaffActiveFilter] = useState("all");
  const [staffActiveTab, setStaffActiveTab] = useState("overview");
  const [availableServices, setAvailableServices] = useState<any[]>([]);
  const [availableAddons, setAvailableAddons] = useState<any[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);

  // Services management state
  const [servicesActiveTab, setServicesActiveTab] = useState("my-services");
  const [servicesSearchQuery, setServicesSearchQuery] = useState("");
  const [servicesCategory, setServicesCategory] = useState("All Categories");
  const [myServices, setMyServices] = useState<any[]>([]);
  const [availableCatalogServices, setAvailableCatalogServices] = useState<any[]>([]);
  const [serviceAddons, setServiceAddons] = useState<any[]>([]);
  const [availableAddonsByService, setAvailableAddonsByService] = useState<any>({});
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<string>>(new Set());

  // Service editing state
  const [showEditServiceModal, setShowEditServiceModal] = useState(false);
  const [editingService, setEditingService] = useState<any>(null);
  const [serviceForm, setServiceForm] = useState({
    business_price: '',
    delivery_type: 'business_location'
  });

  // Availability editing state
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const [editingProviderId, setEditingProviderId] = useState<string | null>(null);
  const [availabilityForm, setAvailabilityForm] = useState({
    monday: { enabled: false, start_time: '09:00', end_time: '17:00', location_type: 'both' },
    tuesday: { enabled: false, start_time: '09:00', end_time: '17:00', location_type: 'both' },
    wednesday: { enabled: false, start_time: '09:00', end_time: '17:00', location_type: 'both' },
    thursday: { enabled: false, start_time: '09:00', end_time: '17:00', location_type: 'both' },
    friday: { enabled: false, start_time: '09:00', end_time: '17:00', location_type: 'both' },
    saturday: { enabled: false, start_time: '09:00', end_time: '17:00', location_type: 'both' },
    sunday: { enabled: false, start_time: '09:00', end_time: '17:00', location_type: 'both' }
  });
  const [bookingPreferences, setBookingPreferences] = useState({
    max_bookings_per_day: 8,
    slot_duration_minutes: 60,
    buffer_time_minutes: 15,
    min_advance_hours: 2,
    auto_accept_bookings: false,
    allow_cancellation: true,
    cancellation_window_hours: 24
  });
  const [inheritBusinessHours, setInheritBusinessHours] = useState(false);
  const [businessHours, setBusinessHours] = useState<any>(null);

  // Function to clear sample data and force refresh when business is connected
  const clearSampleDataAndRefresh = () => {
    setStaffMembers([]);
    setMyServices([]);
    setAvailableServices([]);
    setMyAddons([]);
    setAvailableAddons([]);
    // Reload data from database
    if (business?.id) {
      loadStaffData();
      loadProviderAvailability();
    }
  };


  // Function to toggle service description visibility
  const toggleServiceDescription = (serviceId: string) => {
    setExpandedDescriptions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(serviceId)) {
        newSet.delete(serviceId);
      } else {
        newSet.add(serviceId);
      }
      return newSet;
    });
  };

  // Share Business Profile modal state
  const [showShareProfileModal, setShowShareProfileModal] = useState(false);

  // Booking Details modal state
  const [showBookingDetailsModal, setShowBookingDetailsModal] = useState(false);
  const [selectedBookingDetails, setSelectedBookingDetails] = useState<any>(null);

  // Edit Staff Form State
  const [editStaffForm, setEditStaffForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    provider_role: "provider",
    location_id: "home_office",
    experience_years: "",
    verification_status: "pending",
    background_check_status: "pending",
    business_managed: false,
    is_active: true,
    assigned_services: [] as any[],
    assigned_addons: [] as any[],
  });

  // Messages State
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [messageLoading, setMessageLoading] = useState(false);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

  // Business Settings State
  const [businessSettings, setBusinessSettings] = useState({
    business_name: "",
    business_type: "Small Business",
    verification_status: "approved",
    featured_business_status: "FEATURED BUSINESS",
    contact_email: "",
    business_phone: "",
    website_url: "",
    cover_image_url: "",
    logo_url: "",
    business_hours: {
      monday: { open: "8:00 AM", close: "5:00 PM" },
      tuesday: { open: "8:00 AM", close: "5:00 PM" },
      wednesday: { open: "8:00 AM", close: "5:00 PM" },
      thursday: { open: "8:00 AM", close: "5:00 PM" },
      friday: { open: "8:00 AM", close: "5:00 PM" },
      saturday: { open: "9:00 AM", close: "5:00 PM" },
      sunday: { closed: true }
    }
  });
  const [serviceCategories, setServiceCategories] = useState<string[]>([]);
  const [serviceSpecializations, setServiceSpecializations] = useState<string[]>([]);
  const [businessDocuments, setBusinessDocuments] = useState<any[]>([]);
  const [coverImageUploading, setCoverImageUploading] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [documentUploading, setDocumentUploading] = useState(false);
  const [editingBusinessHours, setEditingBusinessHours] = useState(false);
  const [originalBusinessHours, setOriginalBusinessHours] = useState<any>({});

  // Profile State
  const [profileData, setProfileData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    professional_bio: "",
    date_of_birth: "",
    years_of_experience: "",
    verification_status: "approved",
    background_check_status: "approved",
    cover_image_url: "",
    profile_image_url: "",
  });
  const [profileCoverUploading, setProfileCoverUploading] = useState(false);
  const [profilePhotoUploading, setProfilePhotoUploading] = useState(false);

  // Business Locations State
  const [businessLocations, setBusinessLocations] = useState<any[]>([]);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState<any>(null);
  const [locationFormData, setLocationFormData] = useState({
    location_name: "",
    address_line1: "",
    address_line2: "",
    city: "",
    state: "",
    postal_code: "",
    country: "US",
    mobile_service_radius: "",
    is_primary: false,
    offers_mobile_services: false,
    is_active: true
  });

  const navigate = useNavigate();

  // Get today's date for filtering
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  // Helper function to get booking counts
  const getBookingCounts = () => {
    const todayBookings = bookings.filter(booking => 
      booking.booking_date === todayStr
    );
    
    const upcomingBookings = bookings.filter(booking => 
      new Date(booking.booking_date) > today && 
      !["cancelled", "declined", "no_show"].includes(booking.booking_status)
    );
    
    const completedBookings = bookings.filter(booking => 
      booking.booking_status === "completed"
    );

    return {
      today: todayBookings.length,
      upcoming: upcomingBookings.length,
      completed: completedBookings.length,
    };
  };

  // Filter bookings based on active tab
  const getFilteredBookings = () => {
    let filtered = bookings;

    switch (activeBookingTab) {
      case "today":
        filtered = bookings.filter(booking => booking.booking_date === todayStr);
        break;
      case "upcoming":
        filtered = bookings.filter(booking => 
          new Date(booking.booking_date) > today && 
          !["cancelled", "declined", "no_show"].includes(booking.booking_status)
        );
        break;
      case "completed":
        filtered = bookings.filter(booking => booking.booking_status === "completed");
        break;
      default:
        filtered = bookings;
    }

    // Apply additional filters
    if (selectedLocationFilter !== "all") {
      filtered = filtered.filter(booking => booking.location_id === selectedLocationFilter);
    }

    if (selectedStatusFilter !== "all") {
      filtered = filtered.filter(booking => booking.booking_status === selectedStatusFilter);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(booking =>
        booking.booking_reference?.toLowerCase().includes(query) ||
        booking.customer_profiles?.first_name?.toLowerCase().includes(query) ||
        booking.customer_profiles?.last_name?.toLowerCase().includes(query) ||
        booking.customer_profiles?.email?.toLowerCase().includes(query) ||
        booking.guest_name?.toLowerCase().includes(query) ||
        booking.services?.name?.toLowerCase().includes(query)
      );
    }

    return filtered.sort((a, b) => {
      // Sort by date and time
      const dateA = new Date(`${a.booking_date} ${a.start_time}`);
      const dateB = new Date(`${b.booking_date} ${b.start_time}`);
      return dateA.getTime() - dateB.getTime();
    });
  };

  // Status badge configuration
  const getStatusBadge = (status: string) => {
    const configs = {
      pending: { label: "Pending", className: "bg-orange-100 text-orange-800 border-orange-300" },
      confirmed: { label: "Confirmed", className: "bg-green-100 text-green-800 border-green-300" },
      in_progress: { label: "In Progress", className: "bg-blue-100 text-blue-800 border-blue-300" },
      completed: { label: "Completed", className: "bg-emerald-100 text-emerald-800 border-emerald-300" },
      cancelled: { label: "Cancelled", className: "bg-red-100 text-red-800 border-red-300" },
      declined: { label: "Declined", className: "bg-gray-100 text-gray-800 border-gray-300" },
      no_show: { label: "No Show", className: "bg-yellow-100 text-yellow-800 border-yellow-300" },
    };
    return configs[status] || { label: status, className: "bg-gray-100 text-gray-800 border-gray-300" };
  };

  // Handle booking status changes
  const acceptBooking = async (bookingId: string) => {
    try {
      const { error } = await supabase
        .from("bookings")
        .update({ booking_status: "confirmed" })
        .eq("id", bookingId);

      if (error) throw error;

      setBookings(prev =>
        prev.map(booking =>
          booking.id === bookingId
            ? { ...booking, booking_status: "confirmed" as any }
            : booking
        )
      );

      toast({
        title: "Booking Accepted",
        description: "The booking has been confirmed successfully.",
        variant: "default",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to accept booking",
        variant: "destructive",
      });
    }
  };

  const declineBooking = async (bookingId: string, reason?: string) => {
    try {
      const { error } = await supabase
        .from("bookings")
        .update({ 
          booking_status: "declined",
          cancellation_reason: reason 
        })
        .eq("id", bookingId);

      if (error) throw error;

      setBookings(prev =>
        prev.map(booking =>
          booking.id === bookingId
            ? { ...booking, booking_status: "declined" as any }
            : booking
        )
      );

      toast({
        title: "Booking Declined",
        description: "The booking has been declined.",
        variant: "default",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to decline booking",
        variant: "destructive",
      });
    }
  };

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, [user]);

  // Effect to clear sample data when business context is available
  useEffect(() => {
    if (business?.id && staffMembers.some(staff => staff.is_sample_data)) {
      console.log('Business context available, clearing sample data and refreshing');
      clearSampleDataAndRefresh();
    }
  }, [business?.id]);

  const loadInitialData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError("");

      // Load provider profile
      const { data: providerData, error: providerError } = await supabase
        .from("providers")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (providerError) throw providerError;

      setProvider(providerData);

      // Load business profile
      if (providerData.business_id) {
        const { data: businessData, error: businessError } = await supabase
          .from("business_profiles")
          .select("*")
          .eq("id", providerData.business_id)
          .single();

        if (businessError) throw businessError;
        setBusiness(businessData);

        // Load bookings
        const { data: bookingsData, error: bookingsError } = await supabase
          .from("bookings")
          .select(`
            *,
            services (*),
            customer_profiles (*),
            providers (*),
            business_locations (*)
          `)
          .eq("business_id", providerData.business_id)
          .order("booking_date", { ascending: true });

        if (bookingsError) throw bookingsError;

        // Enhanced sample booking data for demonstration
        const enhancedBookings = [
          {
            id: "1",
            booking_date: "2025-08-19",
            start_time: "12:00:00",
            booking_status: "confirmed",
            total_amount: 115,
            services: { name: "Weight Loss" },
            customer_profiles: {
              first_name: "Alan",
              last_name: "Smith",
              email: "alan.smith@healthness.com"
            },
            assigned_provider: "Alan Smith",
            reference_number: "BK250JRB001",
            service_location: "customer_location",
            duration: 60
          },
          {
            id: "2",
            booking_date: "2025-08-28",
            start_time: "09:00:00",
            booking_status: "pending",
            total_amount: 138,
            services: { name: "Hair Blowout" },
            customer_profiles: {
              first_name: "Alan",
              last_name: "Smith",
              email: "alan.smith@healthness.com"
            },
            assigned_provider: "unassigned",
            reference_number: "BK250UJR001",
            service_location: "home_office",
            duration: 90
          }
        ];

        // Use enhanced sample data if no real bookings exist
        setBookings(bookingsData?.length ? bookingsData : enhancedBookings);

        // Load locations
        const { data: locationsData, error: locationsError } = await supabase
          .from("business_locations")
          .select("*")
          .eq("business_id", providerData.business_id)
          .eq("is_active", true);

        if (locationsError) throw locationsError;
        setLocations(locationsData || []);

        // Load staff data for staff management
        await loadStaffData();

        // Load provider availability data
        await loadProviderAvailability();

        // Load conversations data
        loadConversationsData();

        // Initialize business settings with real data
        initializeBusinessSettings();

        // Initialize business locations
        await initializeBusinessLocations();

        // Initialize profile data
        await initializeProfileData();

        // Initialize services data
        await initializeServicesData();
      }
    } catch (error: any) {
      console.error(safeErrorLog("Error loading data", error, { userId: user?.id }));
      setError(error.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const initializeProfileData = async () => {
    if (!user) return;

    try {
      // Load real provider data from the database
      const { data: providerData, error } = await supabase
        .from('providers')
        .select(`
          id,
          first_name,
          last_name,
          email,
          phone,
          bio,
          image_url,
          date_of_birth,
          experience_years,
          verification_status,
          background_check_status,
          cover_image_url
        `)
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error(safeErrorLog('Error loading provider data', error, { userId: user?.id }));
        // Fall back to user data from auth context
        setProfileData({
          first_name: user.first_name || "Provider",
          last_name: user.last_name || "",
          email: user.email || "",
          phone: "",
          professional_bio: "",
          date_of_birth: "",
          years_of_experience: "",
          verification_status: "pending",
          background_check_status: "under_review",
          cover_image_url: "",
          profile_image_url: "",
        });
        return;
      }

      // Map provider data to profile state
      setProfileData({
        first_name: providerData.first_name || "",
        last_name: providerData.last_name || "",
        email: providerData.email || "",
        phone: providerData.phone || "",
        professional_bio: providerData.bio || "",
        date_of_birth: providerData.date_of_birth || "",
        years_of_experience: providerData.experience_years?.toString() || "",
        verification_status: providerData.verification_status || "pending",
        background_check_status: providerData.background_check_status || "under_review",
        cover_image_url: providerData.cover_image_url || "",
        profile_image_url: providerData.image_url || "",
      });

      console.log('Provider profile data loaded successfully');
    } catch (error) {
      console.error(safeErrorLog('Error initializing profile data', error, { userId: user?.id }));
    }
  };

  // Utility function to safely serialize errors for logging
  const safeErrorLog = (context, error, additionalData = {}) => {
    try {
      const errorInfo = {
        context,
        message: error?.message || 'Unknown error',
        name: error?.name || 'UnknownError',
        type: typeof error,
        stack: error?.stack?.split('\n').slice(0, 3).join('\n'),
        ...additionalData
      };

      // If it's an object, try to extract meaningful info
      if (typeof error === 'object' && error !== null) {
        errorInfo.objectKeys = Object.keys(error);
        errorInfo.serialized = JSON.stringify(error, Object.getOwnPropertyNames(error), 2);
      }

      return JSON.stringify(errorInfo, null, 2);
    } catch (serializationError) {
      return JSON.stringify({
        context,
        error: 'Failed to serialize error',
        originalErrorType: typeof error,
        serializationError: serializationError.message,
        fallbackString: String(error),
        ...additionalData
      }, null, 2);
    }
  };

  const initializeServicesData = async () => {
    if (!user?.id) {
      console.warn('No user ID available for services data initialization');
      return;
    }

    try {
      // Verify we have a valid session before making API calls
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session) {
        console.warn('No valid session found, skipping services data initialization');
        toast({
          title: "Authentication Required",
          description: "Please log in to load services data",
          variant: "destructive",
        });
        return;
      }
      // Get the provider's business_id
      console.log('Fetching provider for user_id:', user.id);

      const { data: providerData, error: providerError } = await supabase
        .from('providers')
        .select('business_id')
        .eq('user_id', user.id)
        .single();

      if (providerError || !providerData?.business_id) {
        console.error(safeErrorLog('Error fetching provider data in initializeServicesData', providerError, { userId: user?.id }));
        return;
      }

      const businessId = providerData.business_id;
      console.log('Business data:', { businessId, providerData });

      if (!businessId) {
        console.error('No business_id found!');
        toast({
          title: "Error",
          description: "No business ID found for provider",
          variant: "destructive",
        });
        return;
      }

      console.log('Testing network connectivity...');
      try {
        const testResponse = await fetch('https://httpbin.org/get');
        console.log('Network test successful, status:', testResponse.status);
      } catch (networkError) {
        console.error(safeErrorLog('Network connectivity issue', networkError));
      }

      console.log('Calling edge function for business_id:', businessId);

      // Call the edge function to get eligible services and addons
      console.log('Calling edge function with business_id:', businessId);

      // Call the updated edge function
      console.log('Calling updated edge function for business_id:', businessId);

      // In your frontend code
      const fetchEligibleServices = async (businessId) => {
        const supabaseUrl = 'https://vssomyuyhicaxsgiaupo.supabase.co';
        const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzc29teXV5aGljYXhzZ2lhdXBvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NTM3MTUsImV4cCI6MjA2OTAyOTcxNX0.c4JrNgMGsrCaFP2VrF4pL6iUG8Ub8Hkcrm5345r7KHs';

        console.log('Attempting edge function call for business_id:', businessId);

        const controller = new AbortController();
        let timeoutId = null; // Declare outside try block for catch access

        try {
          timeoutId = setTimeout(() => controller.abort(), 5000); // Further reduced timeout to 5 seconds

          const response = await fetch(
            `${supabaseUrl}/functions/v1/get-business-eligible-services?business_id=${businessId}`,
            {
              headers: {
                'Authorization': `Bearer ${anonKey}`,
                'Content-Type': 'application/json'
              },
              signal: controller.signal
            }
          );

          clearTimeout(timeoutId);
          console.log('Edge function response received:', {
            status: response.status,
            statusText: response.statusText,
            ok: response.ok,
            bodyUsed: response.bodyUsed,
            headers: Object.fromEntries(response.headers.entries())
          });

          let data;
          let errorDetails = 'No error details available';

          // Create response clones upfront to avoid "body already used" errors
          let responseForText = null;
          let responseForJson = null;

          try {
            responseForText = response.clone();
            responseForJson = response.clone();
          } catch (cloneError) {
            console.warn('Could not clone response, proceeding without clones');
          }

          // Handle response based on status
          if (!response.ok) {
            try {
              // Try to get error details from cloned response
              if (responseForText) {
                errorDetails = await responseForText.text();
                if (!errorDetails || !errorDetails.trim()) {
                  errorDetails = `HTTP ${response.status} ${response.statusText} - Empty response body`;
                }
              } else {
                errorDetails = `HTTP ${response.status} ${response.statusText} - Could not read response body`;
              }
            } catch (readError) {
              errorDetails = `HTTP ${response.status} ${response.statusText} - Failed to read response: ${readError.message}`;
            }

            const errorResponse = {
              status: response.status,
              statusText: response.statusText,
              details: errorDetails,
              headers: Object.fromEntries(response.headers.entries())
            };
            console.error(safeErrorLog('Edge function error response', errorResponse, { url: response.url }));

            const errorMsg = `Edge function failed with ${response.status} ${response.statusText}: ${errorDetails}`;
            throw new Error(errorMsg);
          }

          // Handle successful response
          try {
            if (responseForJson) {
              data = await responseForJson.json();
            } else {
              data = await response.json();
            }

            if (!data) {
              throw new Error('Received empty response data');
            }
          } catch (parseError) {
            console.error('Failed to parse successful response as JSON:', parseError.message);

            // Try to get response as text for debugging
            try {
              if (responseForText && !responseForText.bodyUsed) {
                const responseText = await responseForText.text();
                console.error('Response text:', responseText.substring(0, 500));
              } else {
                console.error('Could not read response text for debugging - body already used');
              }
            } catch (e) {
              console.error('Error reading response text for debugging:', e.message);
            }

            throw new Error(`Edge function returned success but invalid JSON: ${parseError.message}`);
          }

          console.log('Edge function data received successfully:', {
            hasServices: !!data.eligible_services,
            servicesCount: data.eligible_services?.length || 0,
            hasAddons: !!data.eligible_addons,
            addonsCount: data.eligible_addons?.length || 0,
            hasServiceAddonMap: !!data.service_addon_map
          });
          return data;
        } catch (error) {
          // Ensure timeout is cleared even in error cases
          if (timeoutId) {
            clearTimeout(timeoutId);
          }

          if (error.name === 'AbortError') {
            console.error("Edge function call timed out after 5 seconds");
            throw new Error("Edge function timeout - server may be overloaded");
          } else if (error instanceof TypeError && (error.message.includes('fetch') || error.message.includes('Failed to fetch'))) {
            console.error("Network error calling edge function:", error.message);
            throw new Error(`Network error: ${error.message}`);
          } else if (error.message && (error.message.includes('body stream already read') || error.message.includes('body stream is locked') || error.message.includes('Response body already consumed'))) {
            console.error("Response stream error:", error.message);
            throw new Error(`Response stream error: ${error.message}`);
          } else if (error.message && error.message.includes('Invalid JSON')) {
            console.error("JSON parsing error:", error.message);
            throw new Error(`Edge function response parsing error: ${error.message}`);
          } else if (error.message && error.message.includes('500')) {
            console.error("Server error from edge function:", error.message);
            throw new Error(`Server error: ${error.message}`);
          } else {
            console.error(safeErrorLog("Edge function call failed", error, { businessId }));
            throw new Error(`Edge function call failed: ${error.message || 'Unknown error'}`);
          }
        }
      };

      let edgeData = null;
      let useEdgeFunction = false; // Disabled due to persistent 500 errors from edge function

      // TODO: Re-enable edge function when fixed
      // The edge function needs to be updated to use 'base_price' correctly
      // in the services table query. Once fixed, change useEdgeFunction back to true.

      if (!useEdgeFunction) {
        console.log('Edge function disabled - using direct database queries');
        console.log('Reason: Edge function returns 500 errors, likely due to schema mismatch with base_price column');
        console.log('Solution: Update edge function to use base_price column correctly');
      }

      try {
        edgeData = await fetchEligibleServices(businessId);
        console.log('Edge function response:', edgeData);
        console.log('Edge function eligible_services:', edgeData.eligible_services);
        console.log('Edge function eligible_addons:', edgeData.eligible_addons);

        console.log('Edge function successful:', {
          services: edgeData.service_count,
          addons: edgeData.addon_count,
          serviceAddonMap: Object.keys(edgeData.service_addon_map || {}).length,
          eligibleServicesLength: edgeData.eligible_services?.length || 0,
          eligibleAddonsLength: edgeData.eligible_addons?.length || 0
        });
      } catch (fetchError) {
        console.error(safeErrorLog('Edge function call failed, using fallback queries', fetchError, { businessId }));
        useEdgeFunction = false;
        edgeData = null;

        // Determine appropriate user message based on error type
        let toastMessage = "Using backup method to load services data";
        if (fetchError.message.includes('timeout')) {
          toastMessage = "Server response slow, using backup data loading";
        } else if (fetchError.message.includes('500')) {
          toastMessage = "Server temporarily unavailable, using backup method";
          // For 500 errors, immediately proceed to fallback without retry
          console.log('500 error detected, proceeding directly to fallback queries');
        } else if (fetchError.message.includes('Network error')) {
          toastMessage = "Network issue detected, using backup data loading";
        } else if (fetchError.message.includes('body stream')) {
          toastMessage = "Server communication issue, using backup method";
          console.log('Response stream error detected, proceeding to fallback');
        } else if (fetchError.message.includes('column') && fetchError.message.includes('does not exist')) {
          toastMessage = "Service catalog temporarily unavailable, using backup method";
          console.log('Schema mismatch in edge function detected, proceeding to fallback');
        }

        // Show user-friendly toast for edge function failures (only for non-500 errors to avoid spam)
        if (!fetchError.message.includes('500')) {
          toast({
            title: "Service data loading",
            description: toastMessage,
            variant: "default"
          });
        }
      }

      // If edge function failed or returned no data, use fallback
      if (!useEdgeFunction || !edgeData) {
        console.log('Edge function failed, attempting fallback queries...');

        try {
          // Fallback to direct Supabase queries
          console.log('Using fallback queries to get services and addons for business:', businessId);

          // For fallback, we need to get both configured services and all available services
          // Get configured services (services this business already has)
          const { data: configuredServices, error: configuredError } = await supabase
            .from('services')
            .select(`
              id, name, description, min_price, duration_minutes, image_url,
              business_services!inner(business_price, delivery_type, is_active),
              service_subcategories(
                service_subcategory_type,
                service_categories(service_category_type)
              )
            `)
            .eq('business_services.business_id', businessId)
            .eq('is_active', true);

          // Get all available services for the business to choose from
          const { data: allServices, error: allServicesError } = await supabase
            .from('services')
            .select(`
              id, name, description, min_price, duration_minutes, image_url,
              service_subcategories(
                service_subcategory_type,
                service_categories(service_category_type)
              )
            `)
            .eq('is_active', true);

          const { data: fallbackAddons, error: addonsError } = await supabase
            .from('service_addons')
            .select('id, name, description, image_url')
            .eq('is_active', true);

          // Validate query results
          if (configuredError) {
            console.error(safeErrorLog('Error fetching configured services', configuredError, { businessId }));
            throw new Error(`Database error fetching configured services: ${configuredError.message || 'Unknown database error'}`);
          }

          if (allServicesError) {
            console.error(safeErrorLog('Error fetching all services', allServicesError, { businessId }));
            throw new Error(`Database error fetching available services: ${allServicesError.message || 'Unknown database error'}`);
          }

          if (addonsError) {
            console.error(safeErrorLog('Error fetching addons', addonsError, { businessId }));
            throw new Error(`Database error fetching addons: ${addonsError.message || 'Unknown database error'}`);
          }

          console.log('Fallback query results:', {
            configuredServices: configuredServices?.length || 0,
            allServices: allServices?.length || 0,
            addons: fallbackAddons?.length || 0
          });

        // Combine configured and available services into eligible_services format
        const allEligibleServices = [
          // Add configured services with business-specific pricing
          ...(configuredServices?.map(service => ({
            id: service.id,
            name: service.name,
            description: service.description,
            min_price: service.business_services[0]?.business_price || service.min_price,
            duration_minutes: service.duration_minutes,
            image_url: service.image_url,
            is_active: true,
            subcategory_id: null,
            service_subcategories: {
              service_subcategory_type: 'general'
            },
            is_configured: true,
            business_price: service.business_services[0]?.business_price,
            delivery_type: service.business_services[0]?.delivery_type
          })) || []),
          // Add other available services (that aren't configured)
          ...(allServices?.filter(service =>
            !configuredServices?.some(configured => configured.id === service.id)
          ).map(service => ({
            id: service.id,
            name: service.name,
            description: service.description,
            min_price: service.min_price,
            duration_minutes: service.duration_minutes,
            image_url: service.image_url,
            is_active: true,
            subcategory_id: null,
            service_subcategories: {
              service_subcategory_type: 'general'
            },
            is_configured: false
          })) || [])
        ];

        edgeData = {
          business_id: businessId,
          eligible_services: allEligibleServices,
          eligible_addons: fallbackAddons?.map(addon => ({
            id: addon.id,
            name: addon.name,
            description: addon.description,
            image_url: addon.image_url,
            is_active: true
          })) || [],
          service_addon_map: {},
          service_count: allEligibleServices.length || 0,
          addon_count: fallbackAddons?.length || 0
        };

        console.log('Successfully loaded data using fallback method');
        console.log('Fallback edgeData:', {
          business_id: edgeData.business_id,
          service_count: edgeData.service_count,
          addon_count: edgeData.addon_count,
          eligible_services_length: edgeData.eligible_services?.length
        });

          toast({
            title: "Services Loaded",
            description: "Data loaded successfully using backup method.",
            variant: "default",
          });
        } catch (fallbackError) {
          console.error(safeErrorLog('Fallback queries also failed', fallbackError, { businessId }));
          // Use minimal default data to prevent app crash
          edgeData = {
            business_id: businessId,
            eligible_services: [],
            eligible_addons: [],
            service_addon_map: {},
            service_count: 0,
            addon_count: 0
          };
          toast({
            title: "Data Loading Error",
            description: "Unable to load services data. Please refresh the page.",
            variant: "destructive",
          });
        }
      }

      // Final safety check
      if (!edgeData) {
        console.error('No data available from edge function or fallback');
        edgeData = {
          business_id: businessId,
          eligible_services: [],
          eligible_addons: [],
          service_addon_map: {},
          service_count: 0,
          addon_count: 0
        };
      }

      // Get current business services to determine what's configured vs available
      const { data: currentBusinessServices, error: businessServicesError } = await supabase
        .from('business_services')
        .select('service_id, business_price, is_active, delivery_type')
        .eq('business_id', businessId);

      if (businessServicesError) {
        console.error(safeErrorLog('Error fetching current business services', businessServicesError, { businessId }));
        // Continue with empty business services rather than returning
        toast({
          title: "Warning",
          description: "Could not load business service configuration. Some features may be limited.",
          variant: "destructive",
        });
      }

      const currentServiceIds = (currentBusinessServices && !businessServicesError)
        ? currentBusinessServices.map(bs => bs.service_id)
        : [];
      const currentServicesMap = new Map(
        (currentBusinessServices && !businessServicesError)
          ? currentBusinessServices.map(bs => [bs.service_id, bs])
          : []
      );

      console.log('Current business services from DB:', currentBusinessServices);
      console.log('Current service IDs:', currentServiceIds);

      // Transform eligible services into "My Services" (configured) and "Available Services"
      const myServices = [];
      const availableServices = [];

      for (const service of edgeData.eligible_services || []) {
        // Check if service is configured (either from edge function or fallback logic)
        const isConfigured = service.is_configured !== undefined ? service.is_configured : currentServiceIds.includes(service.id);

        if (isConfigured) {
          // This service is configured for the business
          const businessServiceData = currentServicesMap.get(service.id);
          myServices.push({
            id: service.id,
            name: service.name,
            category: service.service_subcategories?.service_categories?.service_category_type || service.service_subcategories?.service_subcategory_type || 'General',
            category_type: service.service_subcategories?.service_subcategory_type || 'general',
            description: service.description || '',
            duration: service.duration_minutes || 60,
            price: service.business_price || businessServiceData?.business_price || service.min_price,
            base_price: service.min_price,
            bookings: 0, // TODO: Calculate from bookings table
            revenue: 0, // TODO: Calculate from bookings table
            rating: 0, // TODO: Calculate from reviews
            reviews: 0, // TODO: Calculate from reviews
            is_mobile: (service.delivery_type || businessServiceData?.delivery_type) === 'customer_location' || (service.delivery_type || businessServiceData?.delivery_type) === 'both_locations',
            is_location: (service.delivery_type || businessServiceData?.delivery_type) === 'business_location' || (service.delivery_type || businessServiceData?.delivery_type) === 'both_locations',
            is_featured: false,
            is_active: businessServiceData?.is_active !== false,
            service_id: service.id,
            image_url: service.image_url
          });
        } else {
          // This service is available but not configured
          availableServices.push({
            id: service.id,
            name: service.name,
            category: service.service_subcategories?.service_categories?.service_category_type || service.service_subcategories?.service_subcategory_type || 'General',
            category_type: service.service_subcategories?.service_subcategory_type || 'general',
            description: service.description || '',
            duration: service.duration_minutes || 60,
            price: service.min_price,
            cert_required: false,
            popular: false,
            image_url: service.image_url
          });
        }
      }

      console.log('Final myServices:', myServices);
      console.log('Final availableServices:', availableServices);

      setMyServices(myServices);
      setAvailableCatalogServices(availableServices);

      // Handle addons - get current business addons
      const { data: currentBusinessAddons, error: businessAddonsError } = await supabase
        .from('business_addons')
        .select('addon_id, custom_price, is_available')
        .eq('business_id', businessId);

      if (businessAddonsError) {
        console.error(safeErrorLog('Error fetching current business addons', businessAddonsError, { businessId }));
        setServiceAddons([]);
        setAvailableAddonsByService({});
        return;
      }

      const currentAddonIds = currentBusinessAddons?.map(ba => ba.addon_id) || [];
      const currentAddonsMap = new Map(
        currentBusinessAddons?.map(ba => [ba.addon_id, ba]) || []
      );

      // Transform configured addons
      const configuredAddons = [];
      const availableAddons = [];

      for (const addon of edgeData.eligible_addons || []) {
        if (currentAddonIds.includes(addon.id)) {
          const businessAddonData = currentAddonsMap.get(addon.id);
          configuredAddons.push({
            id: addon.id,
            addon_id: addon.id,
            name: addon.name,
            description: addon.description || '',
            image_url: addon.image_url,
            price: businessAddonData?.custom_price || 0,
            duration: 10,
            popular: false,
            compatible_services: [],
            is_available: businessAddonData?.is_available !== false
          });
        } else {
          availableAddons.push({
            id: addon.id,
            name: addon.name,
            description: addon.description || '',
            image_url: addon.image_url,
            is_recommended: false,
            compatible_service_id: null,
            compatible_service_name: 'Compatible Services'
          });
        }
      }

      setServiceAddons(configuredAddons);

      // Group available addons by service using the service_addon_map
      const availableAddonsByService = {};

      if (edgeData.service_addon_map) {
        for (const [serviceId, addonIds] of Object.entries(edgeData.service_addon_map)) {
          // Find the service name from myServices or availableServices
          const service = myServices.find(s => s.service_id === serviceId) ||
                         availableServices.find(s => s.id === serviceId);

          if (service) {
            const serviceAddons = addonIds
              .map(addonId => availableAddons.find(addon => addon.id === addonId))
              .filter(Boolean); // Remove any undefined addons

            if (serviceAddons.length > 0) {
              availableAddonsByService[serviceId] = {
                serviceName: service.name,
                addons: serviceAddons.map(addon => ({
                  ...addon,
                  compatible_service_id: serviceId,
                  compatible_service_name: service.name
                }))
              };
            }
          }
        }
      }

      // If no service-specific mapping, fall back to general grouping
      if (Object.keys(availableAddonsByService).length === 0 && availableAddons.length > 0) {
        availableAddonsByService['general'] = {
          serviceName: 'Your Services',
          addons: availableAddons
        };
      }

      setAvailableAddonsByService(availableAddonsByService);

      console.log('Services and addons loaded successfully:', {
        myServices: myServices.length,
        availableServices: availableServices.length,
        configuredAddons: configuredAddons.length,
        availableAddons: availableAddons.length
      });

    } catch (error) {
      console.error(safeErrorLog('Error initializing services data', error, { userId: user?.id }));

      // Set empty state to prevent app crash
      setMyServices([]);
      setAvailableServices([]);
      setMyAddons([]);
      setAvailableAddons([]);

      toast({
        title: "Services Data Error",
        description: `Failed to load services data: ${error.message}. Please refresh the page or contact support if the issue persists.`,
        variant: "destructive",
      });
    }
  };

  const initializeBusinessSettings = async () => {
    if (!user) return;

    try {
      // Get provider's business_id first
      const { data: providerData, error: providerError } = await supabase
        .from('providers')
        .select('business_id')
        .eq('user_id', user.id)
        .single();

      if (providerError) {
        console.error('Error fetching provider:', providerError);
        return;
      }

      if (!providerData?.business_id) {
        console.error('No business_id found for provider');
        return;
      }

      // Fetch business profile data
      const { data: businessData, error: businessError } = await supabase
        .from('business_profiles')
        .select(`
          business_name,
          business_type,
          verification_status,
          contact_email,
          phone,
          website_url,
          cover_image_url,
          logo_url,
          business_hours,
          is_featured,
          service_categories,
          service_subcategories
        `)
        .eq('id', providerData.business_id)
        .single();

      if (businessError) {
        console.error('Error fetching business profile:', businessError);
        return;
      }

      // Map business hours format
      const mappedBusinessHours: any = {};
      if (businessData.business_hours) {
        const hours = businessData.business_hours as any;
        Object.keys(hours).forEach(day => {
          const dayKey = day.toLowerCase();
          if (hours[day] && hours[day].open && hours[day].close) {
            mappedBusinessHours[dayKey] = {
              open: formatTime(hours[day].open),
              close: formatTime(hours[day].close)
            };
          } else {
            mappedBusinessHours[dayKey] = { closed: true };
          }
        });
      }

      // Add Sunday if not present
      if (!mappedBusinessHours.sunday) {
        mappedBusinessHours.sunday = { closed: true };
      }

      setBusinessSettings({
        business_name: businessData.business_name || "",
        business_type: mapBusinessTypeFromDb(businessData.business_type || "small_business"),
        verification_status: businessData.verification_status || "pending",
        featured_business_status: businessData.is_featured ? "FEATURED BUSINESS" : "STANDARD",
        contact_email: businessData.contact_email || "",
        business_phone: businessData.phone || "",
        website_url: businessData.website_url || "",
        cover_image_url: businessData.cover_image_url || "",
        logo_url: businessData.logo_url || "",
        business_hours: mappedBusinessHours
      });

      // Set service categories and subcategories
      setServiceCategories(businessData.service_categories || []);
      setServiceSpecializations(businessData.service_subcategories || []);

    } catch (error) {
      console.error(safeErrorLog('Error initializing business settings', error, { userId: user?.id }));
      toast({
        title: "Error",
        description: "Failed to load business data.",
        variant: "destructive",
      });
    }
  };

  // Helper function to format time
  const formatTime = (time24: string) => {
    if (!time24) return "";
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  // Helper function to convert 12-hour time to 24-hour format
  const convertTo24Hour = (time12: string) => {
    if (!time12) return "";
    const [time, period] = time12.split(' ');
    const [hours, minutes] = time.split(':');
    let hour = parseInt(hours);

    if (period === 'PM' && hour !== 12) {
      hour += 12;
    } else if (period === 'AM' && hour === 12) {
      hour = 0;
    }

    return `${hour.toString().padStart(2, '0')}:${minutes}`;
  };

  // Helper function to convert database business type to camelCase
  const mapBusinessTypeFromDb = (dbValue: string) => {
    const mapping: { [key: string]: string } = {
      'independent': 'independent',
      'small_business': 'smallBusiness',
      'franchise': 'franchise',
      'enterprise': 'enterprise',
      'other': 'other'
    };
    return mapping[dbValue] || dbValue;
  };

  // Helper function to convert camelCase business type to database format
  const mapBusinessTypeToDb = (camelValue: string) => {
    const mapping: { [key: string]: string } = {
      'independent': 'independent',
      'smallBusiness': 'small_business',
      'franchise': 'franchise',
      'enterprise': 'enterprise',
      'other': 'other'
    };
    return mapping[camelValue] || camelValue;
  };

  // Helper function to generate time options for business hours
  const generateTimeOptions = () => {
    const times = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
        const ampm = hour < 12 ? 'AM' : 'PM';
        const minuteStr = minute === 0 ? '00' : minute.toString();
        times.push(`${hour12}:${minuteStr} ${ampm}`);
      }
    }
    return times;
  };

  // Helper function to format camelCase text into readable labels
  const formatServiceLabel = (camelCaseText: string) => {
    // Split camelCase and capitalize each word
    return camelCaseText
      .replace(/([A-Z])/g, ' $1') // Add space before capital letters
      .replace(/^./, str => str.toUpperCase()) // Capitalize first letter
      .trim(); // Remove any leading/trailing spaces
  };

  // Helper function to format time from 24-hour to 12-hour format
  const formatDisplayTime = (time24: string): string => {
    if (!time24) return '';

    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;

    return `${hour12}:${minutes} ${ampm}`;
  };

  // Service categories with their display labels
  const serviceCategoriesData = [
    { value: 'beauty', label: 'Beauty' },
    { value: 'fitness', label: 'Fitness' },
    { value: 'therapy', label: 'Therapy' },
    { value: 'healthcare', label: 'Healthcare' }
  ];

  // Service specializations with their display labels
  const serviceSpecializationsData = [
    { value: 'sprayTan', label: 'Spray Tan' },
    { value: 'yogaInstructor', label: 'Yoga Instructor' },
    { value: 'massageTherapy', label: 'Massage Therapy' },
    { value: 'physician', label: 'Physician' },
    { value: 'hairMakeup', label: 'Hair & Makeup' },
    { value: 'ivTherapy', label: 'IV Therapy' },
    { value: 'nursePractitioner', label: 'Nurse Practitioner' },
    { value: 'personalTraining', label: 'Personal Training' },
    { value: 'injectables', label: 'Injectables' },
    { value: 'pilates', label: 'Pilates' },
    { value: 'chiropractor', label: 'Chiropractor' },
    { value: 'healthCoach', label: 'Health Coach' }
  ];

  // Business Locations Functions
  const initializeBusinessLocations = async () => {
    if (!user?.id) return;

    try {
      // Get the provider's business_id
      const { data: providerData, error: providerError } = await supabase
        .from('providers')
        .select('business_id')
        .eq('user_id', user.id)
        .single();

      if (providerError || !providerData?.business_id) {
        console.error('Error fetching provider data:', providerError);
        return;
      }

      // Fetch business locations
      const { data: locationsData, error: locationsError } = await supabase
        .from('business_locations')
        .select('*')
        .eq('business_id', providerData.business_id)
        .order('is_primary', { ascending: false });

      if (locationsError) {
        console.error('Error fetching business locations:', locationsError);
        return;
      }

      setBusinessLocations(locationsData || []);
    } catch (error) {
      console.error('Error initializing business locations:', error);
    }
  };

  const handleAddLocation = () => {
    setEditingLocation(null);
    setLocationFormData({
      location_name: "",
      address_line1: "",
      address_line2: "",
      city: "",
      state: "",
      postal_code: "",
      country: "US",
      mobile_service_radius: "",
      is_primary: businessLocations.length === 0, // First location is primary by default
      offers_mobile_services: false,
      is_active: true
    });
    setShowLocationModal(true);
  };

  const handleEditLocation = (location: any) => {
    setEditingLocation(location);
    setLocationFormData({
      location_name: location.location_name || "",
      address_line1: location.address_line1 || "",
      address_line2: location.address_line2 || "",
      city: location.city || "",
      state: location.state || "",
      postal_code: location.postal_code || "",
      country: location.country || "US",
      mobile_service_radius: location.mobile_service_radius?.toString() || "",
      is_primary: location.is_primary || false,
      offers_mobile_services: location.offers_mobile_services || false,
      is_active: location.is_active !== false
    });
    setShowLocationModal(true);
  };

  const handleSaveLocation = async () => {
    if (!user?.id) return;

    try {
      // Get the provider's business_id
      const { data: providerData, error: providerError } = await supabase
        .from('providers')
        .select('business_id')
        .eq('user_id', user.id)
        .single();

      if (providerError || !providerData?.business_id) {
        console.error('Error fetching provider data:', providerError);
        return;
      }

      const locationData = {
        business_id: providerData.business_id,
        location_name: locationFormData.location_name,
        address_line1: locationFormData.address_line1,
        address_line2: locationFormData.address_line2,
        city: locationFormData.city,
        state: locationFormData.state,
        postal_code: locationFormData.postal_code,
        country: locationFormData.country,
        mobile_service_radius: locationFormData.mobile_service_radius ? parseInt(locationFormData.mobile_service_radius) : null,
        is_primary: locationFormData.is_primary,
        offers_mobile_services: locationFormData.offers_mobile_services,
        is_active: locationFormData.is_active
      };

      if (editingLocation) {
        // Update existing location
        const { error: updateError } = await supabase
          .from('business_locations')
          .update(locationData)
          .eq('id', editingLocation.id);

        if (updateError) {
          console.error('Error updating location:', updateError);
          toast({
            title: "Error",
            description: "Failed to update location.",
            variant: "destructive",
          });
          return;
        }
      } else {
        // Create new location
        const { error: insertError } = await supabase
          .from('business_locations')
          .insert([locationData]);

        if (insertError) {
          console.error('Error creating location:', insertError);
          toast({
            title: "Error",
            description: "Failed to create location.",
            variant: "destructive",
          });
          return;
        }
      }

      // If this is set as primary, update other locations to not be primary
      if (locationFormData.is_primary && !editingLocation?.is_primary) {
        await supabase
          .from('business_locations')
          .update({ is_primary: false })
          .eq('business_id', providerData.business_id)
          .neq('id', editingLocation?.id || '');
      }

      toast({
        title: "Success",
        description: `Location ${editingLocation ? 'updated' : 'created'} successfully.`,
        variant: "default",
      });

      setShowLocationModal(false);
      await initializeBusinessLocations(); // Refresh the list
    } catch (error) {
      console.error('Error saving location:', error);
      toast({
        title: "Error",
        description: "Failed to save location.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteLocation = async (locationId: string) => {
    if (!confirm('Are you sure you want to delete this location?')) return;

    try {
      const { error } = await supabase
        .from('business_locations')
        .delete()
        .eq('id', locationId);

      if (error) {
        console.error('Error deleting location:', error);
        toast({
          title: "Error",
          description: "Failed to delete location.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Location deleted successfully.",
        variant: "default",
      });

      await initializeBusinessLocations(); // Refresh the list
    } catch (error) {
      console.error('Error deleting location:', error);
      toast({
        title: "Error",
        description: "Failed to delete location.",
        variant: "destructive",
      });
    }
  };

  const loadConversationsData = () => {
    // Sample conversation data matching the screenshot
    const sampleConversations = [
      {
        id: "conv-1",
        customer: {
          name: "Sarah Johnson",
          avatar: null,
          rating: 5,
          total_bookings: 8,
          total_spent: 1040,
          since: "Oct 2023",
          preferences: [
            "Prefers light pressure massages",
            "Likes lavender aromatherapy",
            "Usually books weekend appointments"
          ]
        },
        service: "Swedish Massage",
        last_message: "Thank you for the amazing massage! When can I book again?",
        last_message_time: "8 minutes ago",
        status: 'active',
        needs_response: true,
        unread_count: 2,
        messages: [
          {
            id: "1",
            content: "Hi! I just finished my Swedish massage and it was incredible! Thank you so much.",
            sender: "customer",
            time: "2:30 PM"
          },
          {
            id: "2",
            content: "So glad you enjoyed it! Sarah is amazing at what she does. We'd love to have you back anytime.",
            sender: "provider",
            time: "2:57 PM"
          },
          {
            id: "3",
            content: "When can I book again? I'm thinking next week sometime.",
            sender: "customer",
            time: "2:58 PM"
          },
          {
            id: "4",
            content: "Also, do you have any availability for the aromatherapy facial? My friend Emily recommended it!",
            sender: "customer",
            time: "2:58 PM"
          }
        ]
      },
      {
        id: "conv-2",
        customer: {
          name: "Michael Chen",
          avatar: null,
          rating: 4.8,
          total_bookings: 12,
          total_spent: 2100,
          since: "Aug 2023",
          preferences: [
            "Prefers deep tissue massage",
            "Regular customer, books monthly",
            "Usually brings portable massage table"
          ]
        },
        service: "Deep Tissue Massage",
        last_message: "Can we reschedule tomorrow's appointment to 3 PM instead of 2 PM?",
        last_message_time: "12 minutes ago",
        status: 'active',
        needs_response: true,
        unread_count: 1,
        messages: [
          {
            id: "1",
            content: "Can we reschedule tomorrow's appointment to 3 PM instead of 2 PM?",
            sender: "customer",
            time: "12 minutes ago"
          }
        ]
      },
      {
        id: "conv-3",
        customer: {
          name: "Emily Rodriguez",
          avatar: null,
          rating: 5,
          total_bookings: 3,
          total_spent: 450,
          since: "Dec 2023",
          preferences: [
            "New customer",
            "Interested in aromatherapy",
            "Prefers weekend appointments"
          ]
        },
        service: "Aromatherapy Facial",
        last_message: "Perfect! See you then 😊",
        last_message_time: "1 hour ago",
        status: 'active',
        needs_response: false,
        unread_count: 0,
        messages: [
          {
            id: "1",
            content: "Perfect! See you then 😊",
            sender: "customer",
            time: "1 hour ago"
          }
        ]
      },
      {
        id: "conv-4",
        customer: {
          name: "David Kim",
          avatar: null,
          rating: 4.9,
          total_bookings: 6,
          total_spent: 890,
          since: "Sep 2023",
          preferences: [
            "Regular customer",
            "Prefers mobile services",
            "Usually books evening appointments"
          ]
        },
        service: "Mobile Massage",
        last_message: "Could you bring the portable massage table?",
        last_message_time: "2 hours ago",
        status: 'active',
        needs_response: false,
        unread_count: 0,
        messages: [
          {
            id: "1",
            content: "Could you bring the portable massage table?",
            sender: "customer",
            time: "2 hours ago"
          }
        ]
      }
    ];

    setConversations(sampleConversations);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate("/provider-portal");
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  // Staff Management Functions
  const loadStaffData = async () => {
    if (!business?.id) {
      // Add sample data for demonstration with proper UUID format
      setStaffMembers([
        {
          id: "00000000-0000-0000-0000-000000000001", // Sample UUID for dispatcher
          first_name: "Dispatcher",
          last_name: "Roam",
          email: "dispatcher@roamyourbestlife.com",
          phone: "5044117011",
          provider_role: "dispatcher",
          location_id: "",
          verification_status: "verified",
          background_check_status: "approved",
          business_managed: false,
          is_active: true,
          experience_years: 5,
          image_url: null,
          is_sample_data: true, // Flag to identify sample data
        },
        {
          id: "00000000-0000-0000-0000-000000000002", // Sample UUID for provider
          first_name: "Provider",
          last_name: "Roam",
          email: "provider@roamyourbestlife.com",
          phone: "5044117012",
          provider_role: "provider",
          location_id: "",
          verification_status: "verified",
          background_check_status: "approved",
          business_managed: true,
          is_active: true,
          experience_years: 7,
          image_url: null,
          is_sample_data: true, // Flag to identify sample data
        }
      ]);
      return;
    }

    try {
      setStaffLoading(true);

      // Load staff members
      const { data: staffData, error: staffError } = await supabase
        .from("providers")
        .select(`
          *,
          business_locations (*)
        `)
        .eq("business_id", business.id);

      if (staffError) throw staffError;
      setStaffMembers(staffData || []);

      // Load available services for assignment
      const { data: servicesData, error: servicesError } = await supabase
        .from("services")
        .select("*")
        .eq("is_active", true);

      if (servicesError) throw servicesError;
      setAvailableServices(servicesData || []);

      // Load available addons for assignment
      const { data: addonsData, error: addonsError } = await supabase
        .from("service_addons")
        .select("*")
        .eq("is_active", true);

      if (addonsError) throw addonsError;
      setAvailableAddons(addonsData || []);

    } catch (error: any) {
      console.error("Error loading staff data:", error);
      toast({
        title: "Error",
        description: "Failed to load staff data",
        variant: "destructive",
      });
    } finally {
      setStaffLoading(false);
    }
  };

  const getFilteredStaff = () => {
    let filtered = staffMembers;

    if (staffRoleFilter !== "all") {
      filtered = filtered.filter(staff => staff.provider_role === staffRoleFilter);
    }

    if (staffVerificationFilter !== "all") {
      filtered = filtered.filter(staff => staff.verification_status === staffVerificationFilter);
    }

    if (staffActiveFilter !== "all") {
      const isActive = staffActiveFilter === "active";
      filtered = filtered.filter(staff => staff.is_active === isActive);
    }

    return filtered;
  };

  const openEditStaffModal = (staff: any) => {
    setEditingStaff(staff);
    setEditStaffForm({
      first_name: staff.first_name || "",
      last_name: staff.last_name || "",
      email: staff.email || "",
      phone: staff.phone || "",
      provider_role: staff.provider_role || "provider",
      location_id: staff.location_id ? staff.location_id : "home_office",
      experience_years: staff.experience_years?.toString() || "",
      verification_status: staff.verification_status || "pending",
      background_check_status: staff.background_check_status || "pending",
      business_managed: staff.business_managed || false,
      is_active: staff.is_active || true,
      assigned_services: [], // TODO: Load assigned services
      assigned_addons: [], // TODO: Load assigned addons
    });
    setShowEditStaffModal(true);
  };

  const saveStaffMember = async () => {
    if (!editingStaff) return;

    try {
      // Convert "home_office" back to null for database storage
      const locationId = editStaffForm.location_id === "home_office" ? null : editStaffForm.location_id;

      const { error } = await supabase
        .from("providers")
        .update({
          first_name: editStaffForm.first_name,
          last_name: editStaffForm.last_name,
          email: editStaffForm.email,
          phone: editStaffForm.phone,
          provider_role: editStaffForm.provider_role,
          location_id: locationId,
          experience_years: editStaffForm.experience_years ? parseInt(editStaffForm.experience_years) : null,
          verification_status: editStaffForm.verification_status,
          background_check_status: editStaffForm.background_check_status,
          business_managed: editStaffForm.business_managed,
          is_active: editStaffForm.is_active,
        })
        .eq("id", editingStaff.id);

      if (error) throw error;

      toast({
        title: "Staff Updated",
        description: "Staff member has been updated successfully.",
        variant: "default",
      });

      setShowEditStaffModal(false);
      setEditingStaff(null);
      loadStaffData(); // Refresh the list
    } catch (error: any) {
      console.error("Error updating staff:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update staff member",
        variant: "destructive",
      });
    }
  };

  // Provider Availability Functions
  const loadProviderAvailability = async () => {
    if (!user?.id) return;

    // Skip if no business context (using sample data)
    if (!business?.id) {
      console.log('No business context, skipping provider availability loading');
      return;
    }

    try {
      // Get the provider's business_id
      const { data: providerData, error: providerError } = await supabase
        .from('providers')
        .select('business_id')
        .eq('user_id', user.id)
        .single();

      if (providerError || !providerData?.business_id) {
        console.error(safeErrorLog('Error fetching provider data for availability', providerError, { userId: user?.id }));
        return;
      }

      const businessId = providerData.business_id;

      // Fetch provider availability data
      const { data: availabilityData, error: availabilityError } = await supabase
        .from('provider_availability')
        .select(`
          *,
          providers!inner(id, first_name, last_name, email, provider_role, is_active)
        `)
        .eq('business_id', businessId)
        .eq('is_active', true)
        .order('day_of_week', { ascending: true });

      if (availabilityError) {
        console.error(safeErrorLog('Error fetching provider availability', availabilityError, { businessId }));
        return;
      }

      // Fetch booking preferences
      const { data: preferencesData, error: preferencesError } = await supabase
        .from('provider_booking_preferences')
        .select(`
          *,
          providers!inner(id, first_name, last_name)
        `)
        .eq('providers.business_id', businessId);

      if (preferencesError) {
        console.error(safeErrorLog('Error fetching booking preferences', preferencesError, { businessId }));
      }

      // Process the data to group by provider
      const providerAvailabilityMap = new Map();

      availabilityData?.forEach(availability => {
        const providerId = availability.provider_id;
        const provider = availability.providers;

        if (!providerAvailabilityMap.has(providerId)) {
          providerAvailabilityMap.set(providerId, {
            id: providerId,
            name: `${provider.first_name} ${provider.last_name}`,
            email: provider.email,
            role: provider.provider_role,
            is_active: provider.is_active,
            availability: [],
            preferences: null
          });
        }

        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayName = availability.day_of_week !== null ? dayNames[availability.day_of_week] : 'Custom';

        providerAvailabilityMap.get(providerId).availability.push({
          id: availability.id,
          day: dayName,
          day_of_week: availability.day_of_week,
          schedule_type: availability.schedule_type,
          start_time: availability.start_time,
          end_time: availability.end_time,
          start_date: availability.start_date,
          end_date: availability.end_date,
          max_bookings_per_slot: availability.max_bookings_per_slot,
          slot_duration_minutes: availability.slot_duration_minutes,
          buffer_time_minutes: availability.buffer_time_minutes,
          location_type: availability.location_type,
          is_blocked: availability.is_blocked,
          block_reason: availability.block_reason,
          notes: availability.notes
        });
      });

      // Add preferences to providers
      preferencesData?.forEach(pref => {
        const providerId = pref.provider_id;
        if (providerAvailabilityMap.has(providerId)) {
          providerAvailabilityMap.get(providerId).preferences = {
            min_advance_hours: pref.min_advance_hours,
            max_advance_days: pref.max_advance_days,
            auto_accept_bookings: pref.auto_accept_bookings,
            max_bookings_per_day: pref.max_bookings_per_day,
            allow_cancellation: pref.allow_cancellation,
            cancellation_window_hours: pref.cancellation_window_hours
          };
        }
      });

      // Convert map to array and update state
      const providersWithAvailability = Array.from(providerAvailabilityMap.values());

      // Update the staff members state with availability data
      setStaffMembers(prev => {
        return prev.map(staff => {
          const availabilityData = providersWithAvailability.find(p => p.id === staff.id);
          if (availabilityData) {
            return {
              ...staff,
              availability: availabilityData.availability,
              preferences: availabilityData.preferences
            };
          }
          return staff;
        });
      });

      console.log('Provider availability loaded:', providersWithAvailability);

    } catch (error) {
      console.error(safeErrorLog('Error loading provider availability', error, { userId: user?.id }));
    }
  };

  // Availability Editing Functions
  const openAvailabilityEditor = (provider: any) => {
    // Check if this is sample data
    if (provider.is_sample_data) {
      toast({
        title: "Demo Mode",
        description: "This is demonstration data. Connect a real business to edit schedules.",
        variant: "default",
      });
      return;
    }

    setEditingProviderId(provider.id);

    // Initialize form with existing availability data or default business hours
    const hasExistingAvailability = provider.availability && provider.availability.length > 0;
    const initialForm = {
      monday: { enabled: !hasExistingAvailability, start_time: '09:00', end_time: '17:00', location_type: 'both' },
      tuesday: { enabled: !hasExistingAvailability, start_time: '09:00', end_time: '17:00', location_type: 'both' },
      wednesday: { enabled: !hasExistingAvailability, start_time: '09:00', end_time: '17:00', location_type: 'both' },
      thursday: { enabled: !hasExistingAvailability, start_time: '09:00', end_time: '17:00', location_type: 'both' },
      friday: { enabled: !hasExistingAvailability, start_time: '09:00', end_time: '17:00', location_type: 'both' },
      saturday: { enabled: false, start_time: '09:00', end_time: '17:00', location_type: 'both' },
      sunday: { enabled: false, start_time: '09:00', end_time: '17:00', location_type: 'both' }
    };

    // Map day names to form keys
    const dayMapping = {
      1: 'monday', 2: 'tuesday', 3: 'wednesday', 4: 'thursday',
      5: 'friday', 6: 'saturday', 0: 'sunday'
    };

    // Populate form with existing availability
    if (provider.availability) {
      provider.availability.forEach((avail: any) => {
        if (avail.schedule_type === 'weekly_recurring' && avail.day_of_week !== null) {
          const dayKey = dayMapping[avail.day_of_week as keyof typeof dayMapping];
          if (dayKey) {
            initialForm[dayKey as keyof typeof initialForm] = {
              enabled: true,
              start_time: avail.start_time?.slice(0, 5) || '09:00',
              end_time: avail.end_time?.slice(0, 5) || '17:00',
              location_type: avail.location_type || 'both'
            };
          }
        }
      });
    }

    setAvailabilityForm(initialForm);

    // Reset inheritance state
    setInheritBusinessHours(false);
    setBusinessHours(null);

    // Load existing preferences
    if (provider.preferences) {
      setBookingPreferences({
        max_bookings_per_day: provider.preferences.max_bookings_per_day || 8,
        slot_duration_minutes: 60, // Default, can be made configurable
        buffer_time_minutes: 15,    // Default, can be made configurable
        min_advance_hours: provider.preferences.min_advance_hours || 2,
        auto_accept_bookings: provider.preferences.auto_accept_bookings || false,
        allow_cancellation: provider.preferences.allow_cancellation || true,
        cancellation_window_hours: provider.preferences.cancellation_window_hours || 24
      });
    }

    setShowAvailabilityModal(true);
  };

  const saveProviderAvailability = async () => {
    if (!editingProviderId || !user?.id) return;

    // Check if we're trying to save sample data
    const provider = staffMembers.find(s => s.id === editingProviderId);
    if (provider?.is_sample_data) {
      toast({
        title: "Demo Mode",
        description: "Cannot save changes to demonstration data. Connect a real business to edit schedules.",
        variant: "destructive",
      });
      return;
    }

    // Additional safety check for proper UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(editingProviderId)) {
      console.error('Invalid provider ID format:', editingProviderId);
      toast({
        title: "Error",
        description: "Invalid provider ID. Please refresh and try again.",
        variant: "destructive",
      });
      return;
    }

    // Ensure we have a business context
    if (!business?.id) {
      toast({
        title: "Setup Required",
        description: "Business setup is required before managing schedules.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Get provider's business_id
      const { data: providerData, error: providerError } = await supabase
        .from('providers')
        .select('business_id')
        .eq('id', editingProviderId)
        .single();

      if (providerError || !providerData?.business_id) {
        console.error(safeErrorLog('Error fetching provider business_id', providerError, { providerId: editingProviderId }));
        toast({
          title: "Error",
          description: "Failed to get provider information",
          variant: "destructive",
        });
        return;
      }

      const businessId = providerData.business_id;

      // Delete existing availability for this provider
      const { error: deleteError } = await supabase
        .from('provider_availability')
        .delete()
        .eq('provider_id', editingProviderId)
        .eq('schedule_type', 'weekly_recurring');

      if (deleteError) {
        console.error(safeErrorLog('Error deleting existing availability', deleteError, { providerId: editingProviderId }));
        toast({
          title: "Error",
          description: "Failed to update availability",
          variant: "destructive",
        });
        return;
      }

      // Create new availability records
      const dayMapping = {
        monday: 1, tuesday: 2, wednesday: 3, thursday: 4,
        friday: 5, saturday: 6, sunday: 0
      };

      const newAvailabilityRecords = [];

      Object.entries(availabilityForm).forEach(([day, config]) => {
        if (config.enabled) {
          newAvailabilityRecords.push({
            provider_id: editingProviderId,
            business_id: businessId,
            schedule_type: 'weekly_recurring',
            day_of_week: dayMapping[day as keyof typeof dayMapping],
            start_time: config.start_time,
            end_time: config.end_time,
            location_type: config.location_type,
            max_bookings_per_slot: 1,
            slot_duration_minutes: bookingPreferences.slot_duration_minutes,
            buffer_time_minutes: bookingPreferences.buffer_time_minutes,
            is_active: true,
            is_blocked: false,
            notes: inheritBusinessHours ? 'Inherited from business hours' : null,
            created_by: user.id
          });
        }
      });

      if (newAvailabilityRecords.length > 0) {
        const { error: insertError } = await supabase
          .from('provider_availability')
          .insert(newAvailabilityRecords);

        if (insertError) {
          console.error(safeErrorLog('Error inserting new availability', insertError, { providerId: editingProviderId }));
          toast({
            title: "Error",
            description: "Failed to save availability",
            variant: "destructive",
          });
          return;
        }
      }

      // Update or insert booking preferences
      const { error: preferencesError } = await supabase
        .from('provider_booking_preferences')
        .upsert({
          provider_id: editingProviderId,
          min_advance_hours: bookingPreferences.min_advance_hours,
          max_advance_days: 30, // Default
          auto_accept_bookings: bookingPreferences.auto_accept_bookings,
          auto_accept_within_hours: 24, // Default
          allow_cancellation: bookingPreferences.allow_cancellation,
          cancellation_window_hours: bookingPreferences.cancellation_window_hours,
          notify_new_booking: true, // Default
          notify_cancellation: true, // Default
          notify_reminder_hours: 2, // Default
          prefer_consecutive_bookings: false, // Default
          min_break_between_bookings: bookingPreferences.buffer_time_minutes,
          max_bookings_per_day: bookingPreferences.max_bookings_per_day,
          updated_at: new Date().toISOString()
        });

      if (preferencesError) {
        console.error(safeErrorLog('Error updating booking preferences', preferencesError, { providerId: editingProviderId }));
        // Don't return here, availability was saved successfully
      }

      toast({
        title: "Success",
        description: "Availability updated successfully",
        variant: "default",
      });

      setShowAvailabilityModal(false);
      setEditingProviderId(null);

      // Reload availability data
      await loadProviderAvailability();

    } catch (error) {
      console.error(safeErrorLog('Error saving provider availability', error, { providerId: editingProviderId }));
      toast({
        title: "Error",
        description: "Failed to save availability",
        variant: "destructive",
      });
    }
  };

  // Load business hours and apply them to the availability form
  const loadAndApplyBusinessHours = async () => {
    if (!business?.id) return;

    try {
      const { data: businessData, error: businessError } = await supabase
        .from('business_profiles')
        .select('business_hours')
        .eq('id', business.id)
        .single();

      if (businessError || !businessData?.business_hours) {
        console.error(safeErrorLog('Error fetching business hours', businessError, { businessId: business.id }));
        toast({
          title: "Error",
          description: "Could not load business hours",
          variant: "destructive",
        });
        return;
      }

      const hours = businessData.business_hours;
      setBusinessHours(hours);

      // Map business hours to availability form
      const dayMapping = {
        monday: 'monday',
        tuesday: 'tuesday',
        wednesday: 'wednesday',
        thursday: 'thursday',
        friday: 'friday',
        saturday: 'saturday',
        sunday: 'sunday'
      };

      const newAvailabilityForm = { ...availabilityForm };

      Object.entries(dayMapping).forEach(([businessDay, formDay]) => {
        const dayHours = hours[businessDay];
        if (dayHours && dayHours.open && dayHours.close) {
          newAvailabilityForm[formDay as keyof typeof newAvailabilityForm] = {
            enabled: dayHours.is_open || false,
            start_time: dayHours.open || '09:00',
            end_time: dayHours.close || '17:00',
            location_type: 'both'
          };
        } else {
          newAvailabilityForm[formDay as keyof typeof newAvailabilityForm] = {
            enabled: false,
            start_time: '09:00',
            end_time: '17:00',
            location_type: 'both'
          };
        }
      });

      setAvailabilityForm(newAvailabilityForm);
      setInheritBusinessHours(true);

      toast({
        title: "Business Hours Applied",
        description: "Provider availability updated to match business hours",
        variant: "default",
      });

    } catch (error) {
      console.error(safeErrorLog('Error loading business hours', error, { businessId: business?.id }));
      toast({
        title: "Error",
        description: "Failed to load business hours",
        variant: "destructive",
      });
    }
  };

  // Check if current user can edit a provider's availability
  const canEditProviderAvailability = (provider: any): boolean => {
    if (!user) return false;

    // Get current user's role from the staff members data
    const currentUserStaff = staffMembers.find(staff => staff.user_id === user.id);
    const currentUserRole = currentUserStaff?.provider_role;

    // Owners and dispatchers can edit anyone's availability
    if (currentUserRole === 'owner' || currentUserRole === 'dispatcher') {
      return true;
    }

    // Providers can only edit their own availability
    if (currentUserRole === 'provider' && provider.user_id === user.id) {
      return true;
    }

    // Fallback: if no role is found but user exists, allow editing (for admin users)
    if (!currentUserRole && user?.id) {
      return true;
    }

    return false;
  };

  // Check if current user can set inheritance from business hours (owners and dispatchers only)
  const canSetInheritBusinessHours = (): boolean => {
    if (!user) return false;

    const currentUserStaff = staffMembers.find(staff => staff.user_id === user.id);
    const currentUserRole = currentUserStaff?.provider_role;

    return currentUserRole === 'owner' || currentUserRole === 'dispatcher';
  };

  // Sync all provider schedules that inherit from business hours
  const syncInheritedSchedules = async () => {
    if (!business?.id || !canSetInheritBusinessHours()) return;

    try {
      // Get all providers who have inherited schedules
      const { data: inheritedAvailability, error: inheritedError } = await supabase
        .from('provider_availability')
        .select('provider_id')
        .eq('business_id', business.id)
        .eq('notes', 'Inherited from business hours')
        .eq('schedule_type', 'weekly_recurring');

      if (inheritedError || !inheritedAvailability || inheritedAvailability.length === 0) {
        console.log('No inherited schedules found to sync');
        return;
      }

      const providerIds = [...new Set(inheritedAvailability.map(avail => avail.provider_id))];

      // Load current business hours
      const { data: businessData, error: businessError } = await supabase
        .from('business_profiles')
        .select('business_hours')
        .eq('id', business.id)
        .single();

      if (businessError || !businessData?.business_hours) {
        console.error('Could not load business hours for sync');
        return;
      }

      const hours = businessData.business_hours;

      // For each provider with inherited schedule, update their availability
      for (const providerId of providerIds) {
        // Delete existing inherited availability
        await supabase
          .from('provider_availability')
          .delete()
          .eq('provider_id', providerId)
          .eq('business_id', business.id)
          .eq('schedule_type', 'weekly_recurring')
          .eq('notes', 'Inherited from business hours');

        // Create new availability based on current business hours
        const dayMapping = {
          monday: 1, tuesday: 2, wednesday: 3, thursday: 4,
          friday: 5, saturday: 6, sunday: 0
        };

        const newAvailabilityRecords = [];

        Object.entries(dayMapping).forEach(([businessDay, dbDay]) => {
          const dayHours = hours[businessDay];
          if (dayHours && dayHours.is_open && dayHours.open && dayHours.close) {
            newAvailabilityRecords.push({
              provider_id: providerId,
              business_id: business.id,
              schedule_type: 'weekly_recurring',
              day_of_week: dbDay,
              start_time: dayHours.open,
              end_time: dayHours.close,
              location_type: 'both',
              max_bookings_per_slot: 1,
              slot_duration_minutes: 60,
              buffer_time_minutes: 15,
              is_active: true,
              is_blocked: false,
              notes: 'Inherited from business hours',
              created_by: user?.id
            });
          }
        });

        if (newAvailabilityRecords.length > 0) {
          await supabase
            .from('provider_availability')
            .insert(newAvailabilityRecords);
        }
      }

      console.log(`Synced inherited schedules for ${providerIds.length} providers`);

      // Reload availability data to show updated schedules
      await loadProviderAvailability();

    } catch (error) {
      console.error(safeErrorLog('Error syncing inherited schedules', error, { businessId: business?.id }));
    }
  };

  // Service Management Functions
  const addServiceToBusiness = async (service: any) => {
    if (!business?.id || !user?.id) return;

    try {
      const { error } = await supabase
        .from('business_services')
        .insert({
          business_id: business.id,
          service_id: service.id,
          business_price: service.base_price, // Start with the base price as default
          delivery_type: 'business_location', // Default delivery type
          is_active: true
        });

      if (error) throw error;

      toast({
        title: "Service Added",
        description: `${service.name} has been added to your services.`,
      });

      // Refresh services data
      await initializeServicesData();
    } catch (error) {
      console.error('Error adding service to business:', error);
      toast({
        title: "Error",
        description: "Failed to add service. Please try again.",
        variant: "destructive",
      });
    }
  };

  const removeServiceFromBusiness = async (serviceId: string, serviceName: string) => {
    if (!business?.id || !confirm(`Are you sure you want to remove "${serviceName}" from your services?`)) return;

    try {
      const { error } = await supabase
        .from('business_services')
        .delete()
        .eq('business_id', business.id)
        .eq('service_id', serviceId);

      if (error) throw error;

      toast({
        title: "Service Removed",
        description: `${serviceName} has been removed from your services.`,
      });

      // Refresh services data
      await initializeServicesData();
    } catch (error) {
      console.error('Error removing service from business:', error);
      toast({
        title: "Error",
        description: "Failed to remove service. Please try again.",
        variant: "destructive",
      });
    }
  };

  const openEditServiceModal = (service: any) => {
    setEditingService(service);
    setServiceForm({
      business_price: service.price.toString(),
      delivery_type: service.is_mobile && service.is_location ? 'both_locations'
                   : service.is_mobile ? 'customer_location'
                   : 'business_location'
    });
    setShowEditServiceModal(true);
  };

  const saveServiceEdits = async () => {
    if (!editingService || !business?.id) return;

    try {
      const businessPrice = parseFloat(serviceForm.business_price);

      if (isNaN(businessPrice) || businessPrice < editingService.base_price) {
        toast({
          title: "Invalid Price",
          description: `Business price must be at least $${editingService.base_price} (service minimum).`,
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('business_services')
        .update({
          business_price: businessPrice,
          delivery_type: serviceForm.delivery_type
        })
        .eq('business_id', business.id)
        .eq('service_id', editingService.service_id);

      if (error) throw error;

      toast({
        title: "Service Updated",
        description: `${editingService.name} has been updated successfully.`,
      });

      setShowEditServiceModal(false);
      setEditingService(null);

      // Refresh services data
      await initializeServicesData();
    } catch (error) {
      console.error('Error updating service:', error);
      toast({
        title: "Error",
        description: "Failed to update service. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Messages Functions
  const selectConversation = (conversation: any) => {
    setSelectedConversation(conversation);
    setSelectedConversationId(conversation.id);
    loadMessages(conversation.id);
  };

  const loadMessages = (conversationId: string) => {
    // Find the conversation and load its messages
    const conversation = conversations.find(c => c.id === conversationId);
    if (conversation) {
      setMessages(conversation.messages || []);
      // Mark as read
      setConversations(prev =>
        prev.map(c =>
          c.id === conversationId
            ? { ...c, unread_count: 0, needs_response: false }
            : c
        )
      );
    }
  };

  const sendMessage = () => {
    if (!newMessage.trim() || !selectedConversation) return;

    const message = {
      id: Date.now().toString(),
      content: newMessage,
      sender: 'provider',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, message]);
    setNewMessage("");

    // Update conversation with new message
    setConversations(prev =>
      prev.map(c =>
        c.id === selectedConversation.id
          ? {
              ...c,
              last_message: newMessage,
              last_message_time: "Just now",
              needs_response: false
            }
          : c
      )
    );

    toast({
      title: "Message Sent",
      description: "Your message has been sent successfully.",
      variant: "default",
    });
  };

  const openBookingDetails = (booking: any) => {
    setSelectedBookingDetails(booking);
    setShowBookingDetailsModal(true);
  };

  const openMessageFromBooking = (bookingId: string, customerId: string) => {
    // Find or create conversation for this booking/customer
    let conversation = conversations.find(c => c.booking_id === bookingId);

    if (!conversation) {
      // Create new conversation if none exists
      const booking = bookings.find(b => b.id === bookingId);
      if (booking) {
        conversation = {
          id: `conversation-${bookingId}`,
          booking_id: bookingId,
          customer: {
            name: booking.customer_profiles?.first_name
              ? `${booking.customer_profiles.first_name} ${booking.customer_profiles.last_name}`
              : booking.guest_name || "Customer",
            avatar: booking.customer_profiles?.image_url,
            rating: 5,
            total_bookings: 8,
            total_spent: 1040,
            since: "Oct 2023",
            preferences: [
              "Prefers light pressure massages",
              "Likes lavender aromatherapy",
              "Usually books weekend appointments"
            ]
          },
          service: booking.services?.name || "Service",
          last_message: "Hi! I just finished my session and it was incredible! Thank you so much.",
          last_message_time: "2:30 PM",
          status: 'active',
          needs_response: false,
          unread_count: 0,
          messages: [
            {
              id: "1",
              content: "Hi! I just finished my session and it was incredible! Thank you so much.",
              sender: "customer",
              time: "2:30 PM"
            }
          ]
        };
        setConversations(prev => [conversation, ...prev]);
      }
    }

    if (conversation) {
      setActiveTab("messages");
      setTimeout(() => {
        selectConversation(conversation);
      }, 100);
    }
  };

  const bookingCounts = getBookingCounts();
  const filteredBookings = getFilteredBookings();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-roam-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-foreground/60">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation - Clean Design */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-3">
              <img
                src="https://cdn.builder.io/api/v1/image/assets%2Fa42b6f9ec53e4654a92af75aad56d14f%2F38446bf6c22b453fa45caf63b0513e21?format=webp&width=800"
                alt="ROAM"
                className="h-8 w-auto"
              />
              <span className="text-lg font-semibold text-gray-900">Partner Management</span>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center space-x-8">
              <button
                onClick={() => setActiveTab("dashboard")}
                className={`text-sm font-medium px-3 py-2 rounded-lg ${activeTab === "dashboard" ? "bg-gray-100 text-gray-900" : "text-gray-600 hover:text-gray-900"}`}
              >
                Dashboard
              </button>
              <button
                onClick={() => setActiveTab("bookings")}
                className={`text-sm font-medium px-3 py-2 rounded-lg ${activeTab === "bookings" ? "bg-gray-100 text-gray-900" : "text-gray-600 hover:text-gray-900"}`}
              >
                Bookings
              </button>
              <button
                onClick={() => setActiveTab("messages")}
                className={`text-sm font-medium px-3 py-2 rounded-lg ${activeTab === "messages" ? "bg-gray-100 text-gray-900" : "text-gray-600 hover:text-gray-900"}`}
              >
                Messages
              </button>
              <button
                onClick={() => setActiveTab("services")}
                className={`text-sm font-medium px-3 py-2 rounded-lg ${activeTab === "services" ? "bg-gray-100 text-gray-900" : "text-gray-600 hover:text-gray-900"}`}
              >
                Services
              </button>
              <button
                onClick={() => setActiveTab("staff")}
                className={`text-sm font-medium px-3 py-2 rounded-lg ${activeTab === "staff" ? "bg-gray-100 text-gray-900" : "text-gray-600 hover:text-gray-900"}`}
              >
                Staff
              </button>
              <button
                onClick={() => setActiveTab("financials")}
                className={`text-sm font-medium px-3 py-2 rounded-lg ${activeTab === "financials" ? "bg-gray-100 text-gray-900" : "text-gray-600 hover:text-gray-900"}`}
              >
                Financials
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm">
              <Bell className="w-4 h-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="flex items-center space-x-2">
                  <Settings className="w-4 h-4" />
                  <span className="hidden sm:inline">Settings</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setActiveTab("profile")}>
                  <User className="w-4 h-4 mr-2" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab("business-settings")}>
                  <Building className="w-4 h-4 mr-2" />
                  Business Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="lg:hidden"
            >
              <Menu className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="px-6 py-8">
        {activeTab === "bookings" && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900">Booking Management</h1>
              <p className="text-sm text-gray-600">Manage your appointments and customer bookings</p>
            </div>

            {/* Stats Cards */}
            <div className="hidden md:grid grid-cols-3 gap-6">
              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Today's Bookings</p>
                    <p className="text-3xl font-bold text-gray-900">{bookingCounts.today}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Upcoming</p>
                    <p className="text-3xl font-bold text-gray-900">{bookingCounts.upcoming}</p>
                  </div>
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Clock className="w-6 h-6 text-orange-600" />
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Completed</p>
                    <p className="text-3xl font-bold text-gray-900">{bookingCounts.completed}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </Card>
            </div>

            {/* Booking Tabs */}
            <Tabs value={activeBookingTab} onValueChange={setActiveBookingTab} className="space-y-6">
              <TabsList className="grid w-full max-w-md grid-cols-3">
                <TabsTrigger value="today">Today ({bookingCounts.today})</TabsTrigger>
                <TabsTrigger value="upcoming">Upcoming ({bookingCounts.upcoming})</TabsTrigger>
                <TabsTrigger value="completed">Completed ({bookingCounts.completed})</TabsTrigger>
              </TabsList>

              {/* Booking List */}
              <div className="space-y-4">
                {filteredBookings.length > 0 ? (
                  filteredBookings.map((booking) => {
                    const statusConfig = getStatusBadge(booking.booking_status);
                    
                    return (
                      <Card key={booking.id} className="p-3 sm:p-4 hover:shadow-md transition-shadow border-l-2 border-l-blue-500">
                        {/* Main Row - Compact Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 space-y-2 sm:space-y-0">
                          <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate">
                                {booking.services?.name || "Weight Loss"}
                              </h3>
                              <div className="flex flex-wrap items-center gap-1 sm:gap-3 text-xs text-gray-600">
                                <span>{booking.booking_date || "8/19/2025"}</span>
                                <span>{booking.start_time || "12:00"}</span>
                                <span className="flex items-center space-x-1">
                                  <Hash className="w-3 h-3" />
                                  <span>{booking.reference_number || `BK${Math.random().toString(36).substr(2, 4).toUpperCase()}`}</span>
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between sm:justify-end space-x-2 sm:space-x-3 flex-shrink-0">
                            <Badge
                              variant="outline"
                              className={`${statusConfig.className} px-1.5 sm:px-2 py-0.5 text-xs`}
                            >
                              {booking.booking_status === "confirmed" ? "��" :
                               booking.booking_status === "pending" ? "⏳" : "❓"}
                            </Badge>
                            <div className="text-right">
                              <p className="text-base sm:text-lg font-bold text-gray-900">
                                ${booking.total_amount || "115"}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Customer Row - Without Avatar */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 space-y-2 sm:space-y-0">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 text-sm truncate">
                              Customer: {booking.customer_profiles?.first_name && booking.customer_profiles?.last_name
                                ? `${booking.customer_profiles.first_name} ${booking.customer_profiles.last_name}`
                                : booking.guest_name || "Alan Smith"}
                            </p>
                            <div className="flex items-center space-x-2 text-xs text-gray-600">
                              <MapPin className="w-3 h-3" />
                              <span className="truncate">
                                {booking.service_location === "customer_location" ? "Customer Location" : "Business Location"}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-1 flex-shrink-0">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-6 sm:h-7 px-2 text-xs text-blue-600 border-blue-200 hover:bg-blue-50 whitespace-nowrap"
                              onClick={() => openBookingDetails(booking)}
                            >
                              <span className="hidden sm:inline">More Details</span>
                              <span className="sm:hidden">Details</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 sm:h-7 sm:w-7 p-0 text-blue-600"
                              onClick={() => openMessageFromBooking(booking.id, booking.customer_profiles?.id || booking.guest_name)}
                            >
                              <MessageCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Provider Assignment Row - Compact */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 bg-gray-50 p-2 rounded space-y-2 sm:space-y-0">
                          <div className="flex items-center space-x-2">
                            <Users className="w-3 h-3 text-gray-600" />
                            <span className="text-xs font-medium text-gray-700">Provider:</span>
                          </div>
                          <Select
                            value={booking.assigned_provider || "unassigned"}
                            onValueChange={(value) => {
                              toast({
                                title: "Provider Assigned",
                                description: `Booking assigned to ${value === "unassigned" ? "Unassigned" : value}`,
                              });
                            }}
                          >
                            <SelectTrigger className="w-full sm:w-32 h-7 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="unassigned">Unassigned</SelectItem>
                              <SelectItem value="Alan Smith">Alan Smith</SelectItem>
                              <SelectItem value="Sarah Johnson">Sarah Johnson</SelectItem>
                              <SelectItem value="Emily Rodriguez">Emily Rodriguez</SelectItem>
                              <SelectItem value="Michael Chen">Michael Chen</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Actions Row - Only for pending bookings */}
                        {booking.booking_status === "pending" && (
                          <div className="flex items-center justify-center space-x-2 pt-2 border-t">
                            <Button
                              size="sm"
                              onClick={() => acceptBooking(booking.id)}
                              className="bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-1 text-xs h-6 sm:h-7 flex-1 sm:flex-none"
                            >
                              Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => declineBooking(booking.id)}
                              className="border-red-300 text-red-600 hover:bg-red-50 px-3 sm:px-4 py-1 text-xs h-6 sm:h-7 flex-1 sm:flex-none"
                            >
                              Decline
                            </Button>
                          </div>
                        )}
                      </Card>
                    );
                  })
                ) : (
                  <Card className="p-12 text-center">
                    <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No bookings found</h3>
                    <p className="text-gray-600">
                      {activeBookingTab === "today" 
                        ? "No bookings scheduled for today"
                        : activeBookingTab === "upcoming"
                        ? "No upcoming bookings"
                        : "No completed bookings"
                      }
                    </p>
                  </Card>
                )}
              </div>
            </Tabs>
          </div>
        )}

        {/* Financial Management Section */}
        {activeTab === "financials" && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Financial Management</h1>
                <p className="text-sm text-gray-600">Track earnings, platform fees, and manage payouts</p>
              </div>
              <div className="flex items-center space-x-3">
                <Select defaultValue="30">
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">Last 7 days</SelectItem>
                    <SelectItem value="30">Last 30 days</SelectItem>
                    <SelectItem value="90">Last 90 days</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  onClick={() => setShowTaxInfoModal(true)}
                  className="flex items-center space-x-2"
                >
                  <Building className="w-4 h-4" />
                  <span>Tax Info</span>
                </Button>
                <Button variant="outline" className="flex items-center space-x-2">
                  <Download className="w-4 h-4" />
                  <span>Export Report</span>
                </Button>
              </div>
            </div>

            {/* Stripe Connect Status */}
            <Card className="p-4 bg-green-50 border-green-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-green-900">Stripe Connect Active</p>
                    <p className="text-sm text-green-700">Your payment processing is set up and working normally</p>
                  </div>
                </div>
                <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                  Verified
                </Badge>
              </div>
            </Card>

            {/* Revenue Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Today's Revenue</p>
                    <p className="text-2xl font-bold text-gray-900">$1,022</p>
                    <p className="text-xs text-gray-500">$1,247 gross</p>
                  </div>
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-green-600" />
                  </div>
                </div>
                <div className="mt-2 flex items-center space-x-1">
                  <TrendingUp className="w-3 h-3 text-green-600" />
                  <span className="text-xs text-green-600">+12%</span>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Platform Fees (15%)</p>
                    <p className="text-2xl font-bold text-gray-900">$187</p>
                    <p className="text-xs text-gray-500">15.0% of gross</p>
                  </div>
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Clock className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">Standard rate</p>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Monthly Revenue</p>
                    <p className="text-2xl font-bold text-gray-900">$15,129</p>
                    <p className="text-xs text-gray-500">147 bookings</p>
                  </div>
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-purple-600" />
                  </div>
                </div>
                <div className="mt-2 flex items-center space-x-1">
                  <TrendingUp className="w-3 h-3 text-green-600" />
                  <span className="text-xs text-green-600">+8%</span>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Available Balance</p>
                    <p className="text-2xl font-bold text-gray-900">$2,450</p>
                    <p className="text-xs text-gray-500">Ready for payout</p>
                  </div>
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Briefcase className="w-5 h-5 text-orange-600" />
                  </div>
                </div>
                <p className="text-xs text-blue-600 mt-2">Auto payout: Weekly</p>
              </Card>
            </div>

            {/* Financial Tabs */}
            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList className="grid w-full max-w-2xl grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="transactions">Transactions</TabsTrigger>
                <TabsTrigger value="payouts">Payouts</TabsTrigger>
                <TabsTrigger value="fees">Platform Fees</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Revenue Breakdown */}
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Breakdown (Last 30 Days)</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">Gross Revenue</p>
                          <p className="text-sm text-gray-600">Total customer payments</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">$18,450</p>
                          <p className="text-sm text-gray-600">100%</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-blue-600">Platform Fees</p>
                          <p className="text-sm text-gray-600">15% platform commission</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-blue-600">-$2,768</p>
                          <p className="text-sm text-gray-600">-15%</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-orange-600">Processing Fees</p>
                          <p className="text-sm text-gray-600">Stripe payment processing</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-orange-600">-$553</p>
                          <p className="text-sm text-gray-600">-3%</p>
                        </div>
                      </div>

                      <div className="border-t pt-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-gray-900">Net Revenue</p>
                            <p className="text-sm text-gray-600">Your take-home earnings</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-bold text-green-600">$15,129</p>
                            <p className="text-sm text-gray-600">82%</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>

                  {/* Performance Summary */}
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Summary</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="text-gray-600">Average Booking Value</p>
                        <p className="font-semibold text-gray-900">$126</p>
                      </div>

                      <div className="flex items-center justify-between">
                        <p className="text-gray-600">Monthly Growth</p>
                        <div className="flex items-center space-x-2">
                          <div className="w-16 h-2 bg-green-200 rounded-full overflow-hidden">
                            <div className="w-3/4 h-full bg-green-500"></div>
                          </div>
                          <span className="text-green-600 font-semibold">+18%</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <p className="text-gray-600">Revenue Goal</p>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">$15,129 / $20,000</p>
                          <div className="w-24 h-2 bg-purple-200 rounded-full overflow-hidden mt-1">
                            <div className="w-3/4 h-full bg-purple-500"></div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2 pt-4 border-t">
                        <h4 className="font-medium text-gray-900">Quick Stats</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-600">Total Customers</p>
                            <p className="font-semibold text-gray-900">89</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Repeat Rate</p>
                            <p className="font-semibold text-gray-900">67%</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Avg Rating</p>
                            <p className="font-semibold text-gray-900">4.8 ⭐</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Reviews</p>
                            <p className="font-semibold text-gray-900">134</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>
              </TabsContent>

              {/* Transactions Tab */}
              <TabsContent value="transactions" className="space-y-6">
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-gray-900">Recent Transactions</h3>
                    <Button variant="outline" size="sm">
                      <Download className="w-4 h-4 mr-2" />
                      Export
                    </Button>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-12 bg-green-500 rounded-full"></div>
                        <div>
                          <p className="font-semibold text-gray-900">Sarah Johnson</p>
                          <p className="text-sm text-gray-600">Swedish Massage</p>
                          <p className="text-xs text-gray-500">2024-01-15</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">$110.5</p>
                        <p className="text-xs text-gray-500">$130 gross - $19.5 fee</p>
                        <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300 mt-1">
                          completed
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-12 bg-green-500 rounded-full"></div>
                        <div>
                          <p className="font-semibold text-gray-900">Michael Chen</p>
                          <p className="text-sm text-gray-600">Deep Tissue Massage</p>
                          <p className="text-xs text-gray-500">2024-01-15</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">$161.5</p>
                        <p className="text-xs text-gray-500">$190 gross - $28.5 fee</p>
                        <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300 mt-1">
                          completed
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-12 bg-green-500 rounded-full"></div>
                        <div>
                          <p className="font-semibold text-gray-900">Emily Rodriguez</p>
                          <p className="text-sm text-gray-600">Aromatherapy Facial</p>
                          <p className="text-xs text-gray-500">2024-01-15</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">$89.25</p>
                        <p className="text-xs text-gray-500">$105 gross - $15.75 fee</p>
                        <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300 mt-1">
                          completed
                        </Badge>
                      </div>
                    </div>
                  </div>
                </Card>
              </TabsContent>

              {/* Payouts Tab */}
              <TabsContent value="payouts" className="space-y-6">
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-gray-900">Payout History</h3>
                    <Button variant="outline" size="sm">
                      <Download className="w-4 h-4 mr-2" />
                      Export
                    </Button>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Briefcase className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">Bank Transfer</p>
                          <p className="text-sm text-gray-600">2024-01-10</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold text-gray-900">$2,156.75</p>
                        <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                          completed
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Briefcase className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">Bank Transfer</p>
                          <p className="text-sm text-gray-600">2024-01-03</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold text-gray-900">$1,892.3</p>
                        <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                          completed
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Briefcase className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">Bank Transfer</p>
                          <p className="text-sm text-gray-600">2023-12-27</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold text-gray-900">$2,344.5</p>
                        <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                          completed
                        </Badge>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Payout Info */}
                <Card className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Payout Settings</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-gray-600 mb-2">Stripe Connect</p>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                            Connected
                          </Badge>
                          <span className="text-sm text-gray-600">•••• •��•• •••• 4532</span>
                        </div>
                      </div>

                      <div>
                        <p className="text-sm text-gray-600 mb-2">Plaid Link</p>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                            Verified
                          </Badge>
                          <span className="text-sm text-gray-600">Bank verification</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-gray-600 mb-2">Transfer Speed</p>
                        <p className="font-semibold text-gray-900">Instant</p>
                      </div>

                      <Button className="w-full">
                        <Settings className="w-4 h-4 mr-2" />
                        Manage Payout
                      </Button>
                    </div>
                  </div>
                </Card>
              </TabsContent>

              {/* Platform Fees Tab */}
              <TabsContent value="fees" className="space-y-6">
                <Card className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-6">Platform Fee Structure</h3>

                  <div className="space-y-6">
                    {/* ROAM Platform Commission */}
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <h4 className="font-semibold text-blue-900 mb-2">ROAM Platform Commission</h4>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-blue-800">Commission Rate</p>
                        <p className="font-semibold text-blue-900">15%</p>
                      </div>
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm text-blue-800">This Month's Fees</p>
                        <p className="font-semibold text-blue-900">$2,768</p>
                      </div>
                      <p className="text-xs text-blue-700">
                        Platform fee includes: customer acquisition, marketing, payment processing coordination, customer support, and technology platform maintenance.
                      </p>
                    </div>

                    {/* Payment Processing Fees */}
                    <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                      <h4 className="font-semibold text-orange-900 mb-2">Payment Processing Fees</h4>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-orange-800">Stripe Processing</p>
                        <p className="font-semibold text-orange-900">2.9% + 30¢</p>
                      </div>
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm text-orange-800">This Month's Processing Fees</p>
                        <p className="font-semibold text-orange-900">$553</p>
                      </div>
                      <p className="text-xs text-orange-700">
                        Standard Stripe processing fees for secure payment handling, fraud protection, and instant transfers.
                      </p>
                    </div>

                    {/* Net Revenue Summary */}
                    <div className="p-4 bg-gray-900 text-white rounded-lg">
                      <h4 className="font-semibold mb-4">Net Revenue Summary</h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-gray-300">Gross Revenue</p>
                          <p className="font-semibold">$18,450</p>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-gray-300">Less: Platform Fees (15%)</p>
                          <p className="font-semibold">-$2,768</p>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-gray-300">Less: Processing Fees (-3%)</p>
                          <p className="font-semibold">-$553</p>
                        </div>
                        <div className="border-t border-gray-700 pt-3">
                          <div className="flex items-center justify-between">
                            <p className="font-semibold">Your Net Revenue</p>
                            <p className="text-xl font-bold text-green-400">$15,129</p>
                          </div>
                          <p className="text-xs text-gray-400 mt-1">82% of gross revenue</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Staff Management Section */}
        {activeTab === "staff" && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Staff Management</h1>
                <p className="text-gray-600">Manage your team members, roles, and permissions</p>
              </div>
              <Button
                onClick={() => setShowAddStaffModal(true)}
                className="bg-gray-900 hover:bg-gray-800 text-white flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Add Staff Member</span>
              </Button>
            </div>

            {/* Staff Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Staff</p>
                    <p className="text-2xl font-bold text-gray-900">{staffMembers.length}</p>
                  </div>
                  <Users className="w-8 h-8 text-blue-500" />
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Owners</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {staffMembers.filter(s => s.provider_role === 'owner').length}
                    </p>
                  </div>
                  <Crown className="w-8 h-8 text-purple-500" />
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Dispatchers</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {staffMembers.filter(s => s.provider_role === 'dispatcher').length}
                    </p>
                  </div>
                  <Calendar className="w-8 h-8 text-blue-500" />
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Providers</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {staffMembers.filter(s => s.provider_role === 'provider').length}
                    </p>
                  </div>
                  <User className="w-8 h-8 text-green-500" />
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Active</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {staffMembers.filter(s => s.is_active).length}
                    </p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
              </Card>
            </div>

            {/* Navigation Tabs */}
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setStaffActiveTab("overview")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  staffActiveTab === "overview"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Staff Overview ({staffMembers.length})
              </button>
              <button
                onClick={() => setStaffActiveTab("performance")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  staffActiveTab === "performance"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Performance
              </button>
              <button
                onClick={() => setStaffActiveTab("scheduling")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  staffActiveTab === "scheduling"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Scheduling
              </button>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search staff by name or email..."
                  className="pl-10"
                />
              </div>
              <Select value={staffRoleFilter} onValueChange={setStaffRoleFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="owner">Owner</SelectItem>
                  <SelectItem value="dispatcher">Dispatcher</SelectItem>
                  <SelectItem value="provider">Provider</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Staff Overview Tab */}
            {staffActiveTab === "overview" && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {getFilteredStaff().map((staff) => (
                  <Card key={staff.id} className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={staff.image_url} />
                          <AvatarFallback className="bg-blue-500 text-white">
                            {staff.first_name?.charAt(0)}{staff.last_name?.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {staff.first_name} {staff.last_name}
                          </h3>
                          <div className="flex items-center space-x-1">
                            <Badge
                              className={
                                staff.provider_role === 'owner' ? 'bg-purple-100 text-purple-700' :
                                staff.provider_role === 'dispatcher' ? 'bg-blue-100 text-blue-700' :
                                'bg-green-100 text-green-700'
                              }
                            >
                              {staff.provider_role === 'owner' ? 'Business Owner' :
                               staff.provider_role === 'dispatcher' ? 'Dispatcher' :
                               'Service Provider'}
                            </Badge>
                            <Badge
                              className={staff.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}
                            >
                              {staff.is_active ? 'active' : 'inactive'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>

                    <p className="text-sm text-gray-600 mb-4">
                      {staff.provider_role === 'owner' ? 'Founder and lead wellness practitioner with 10+ years experience' :
                       staff.provider_role === 'dispatcher' ? 'Experienced scheduling coordinator ensuring smooth operations' :
                       'Licensed esthetician specializing in skincare treatments'}
                    </p>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-sm text-gray-600">
                        <Phone className="w-4 h-4 mr-2" />
                        {staff.phone || '(555) 123-4567'}
                      </div>
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">Specializations:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          <Badge variant="outline" className="text-xs">Business Management</Badge>
                          <Badge variant="outline" className="text-xs">Swedish Massage</Badge>
                          <span className="text-xs text-gray-500">+1 more</span>
                        </div>
                      </div>
                    </div>

                    {staff.provider_role === 'provider' && (
                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Bookings</span>
                          <span className="font-medium">156</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Rating</span>
                          <div className="flex items-center space-x-1">
                            <Star className="w-4 h-4 text-yellow-500 fill-current" />
                            <span className="font-medium">4.8</span>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center space-x-2">
                      <div className="flex items-center text-xs text-green-600">
                        <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                        Accepting bookings
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditStaffModal(staff)}
                        className="w-full"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* Performance Tab */}
            {staffActiveTab === "performance" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Staff Performance Overview */}
                  <Card className="p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-6">Staff Performance Overview</h2>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="font-medium text-gray-900">Emily Rodriguez</h3>
                          <p className="text-sm text-gray-600">156 bookings completed</p>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center space-x-1">
                            <Star className="w-4 h-4 text-yellow-500 fill-current" />
                            <span className="font-medium">4.8</span>
                          </div>
                          <p className="text-sm text-gray-600">$16,800</p>
                        </div>
                      </div>

                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="font-medium text-gray-900">Alex Thompson</h3>
                          <p className="text-sm text-gray-600">89 bookings completed</p>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center space-x-1">
                            <Star className="w-4 h-4 text-yellow-500 fill-current" />
                            <span className="font-medium">4.9</span>
                          </div>
                          <p className="text-sm text-gray-600">$8,700</p>
                        </div>
                      </div>
                    </div>
                  </Card>

                  {/* Team Metrics */}
                  <Card className="p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-6">Team Metrics</h2>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Total Team Revenue</span>
                        <span className="text-2xl font-bold text-gray-900">$53,920</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Average Team Rating</span>
                        <span className="text-2xl font-bold text-gray-900">4.8</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Total Bookings</span>
                        <span className="text-2xl font-bold text-gray-900">479</span>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            )}

            {/* Scheduling Tab */}
            {staffActiveTab === "scheduling" && (
              <div className="space-y-6">
                <Card className="p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-6">Team Availability Overview</h2>

                  {staffMembers.filter(staff => staff.is_active).length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No Active Providers</h3>
                      <p className="text-gray-600">Add staff members to see their availability schedules.</p>
                    </div>
                  ) : (
                    <div className="space-y-8">
                      {staffMembers.filter(staff => staff.is_active).map((staff) => (
                        <div key={staff.id}>
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-3">
                              <Avatar className="w-10 h-10">
                                <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white">
                                  {staff.first_name?.charAt(0)}{staff.last_name?.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <h3 className="font-medium text-gray-900">
                                  {staff.first_name} {staff.last_name}
                                </h3>
                                <p className="text-sm text-gray-600 capitalize">
                                  {staff.provider_role?.replace('_', ' ')}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              {staff.preferences && (
                                <div className="text-xs text-gray-500 text-right mr-2">
                                  <div>Max {staff.preferences.max_bookings_per_day}/day</div>
                                  <div>{staff.preferences.auto_accept_bookings ? 'Auto-accept' : 'Manual review'}</div>
                                </div>
                              )}
                              <Badge className={staff.availability && staff.availability.length > 0
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-700"}>
                                {staff.availability && staff.availability.length > 0 ? 'Available' : 'No Schedule'}
                              </Badge>
                              {(() => {
                                const canEdit = canEditProviderAvailability(staff);
                                console.log(`Button render check for ${staff.first_name} ${staff.last_name}:`, canEdit);
                                return canEdit;
                              })() && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openAvailabilityEditor(staff)}
                                  className="h-7 px-2 text-xs"
                                >
                                  <Edit className="w-3 h-3 mr-1" />
                                  {staff.availability && staff.availability.length > 0 ? 'Edit Schedule' : 'Set Schedule'}
                                </Button>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-7 gap-2">
                            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((dayName, dayIndex) => {
                              // Find availability for this day (dayIndex: 0=Monday, 6=Sunday, but database uses 0=Sunday, 6=Saturday)
                              // Convert: UI Monday(0) = DB Monday(1), UI Sunday(6) = DB Sunday(0)
                              const dbDayOfWeek = dayIndex === 6 ? 0 : dayIndex + 1;
                              const dayAvailability = staff.availability?.filter(avail =>
                                avail.schedule_type === 'weekly_recurring' && avail.day_of_week === dbDayOfWeek
                              ) || [];

                              const hasAvailability = dayAvailability.length > 0;
                              const isBlocked = dayAvailability.some(avail => avail.is_blocked);

                              return (
                                <div key={dayName} className="text-center">
                                  <div className="text-sm font-medium text-gray-600 mb-2">
                                    {dayName.slice(0, 3)}
                                  </div>
                                  <div className={`p-3 rounded text-xs min-h-[60px] flex flex-col justify-center ${
                                    isBlocked
                                      ? 'bg-red-100 text-red-700'
                                      : hasAvailability
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-gray-200 text-gray-500'
                                  }`}>
                                    {isBlocked ? (
                                      <div>
                                        <div className="font-medium">Blocked</div>
                                        <div className="text-xs opacity-75">
                                          {dayAvailability.find(a => a.is_blocked)?.block_reason || 'Unavailable'}
                                        </div>
                                      </div>
                                    ) : hasAvailability ? (
                                      dayAvailability.map((avail, idx) => (
                                        <div key={idx} className="mb-1 last:mb-0">
                                          <div className="font-medium text-xs">
                                            {formatDisplayTime(avail.start_time)}
                                          </div>
                                          <div className="text-xs opacity-75">
                                            {formatDisplayTime(avail.end_time)}
                                          </div>
                                          {avail.location_type !== 'both' && (
                                            <div className="text-xs opacity-50 mt-1">
                                              {avail.location_type === 'mobile' ? '📱' : '🏢'}
                                            </div>
                                          )}
                                        </div>
                                      ))
                                    ) : (
                                      <div className="text-xs">Off</div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Additional info */}
                          {staff.availability && staff.availability.length > 0 && (
                            <div className="mt-3 text-xs text-gray-500 grid grid-cols-1 md:grid-cols-3 gap-2">
                              <div className="flex items-center space-x-1">
                                {staff.availability.some((avail: any) => avail.notes === 'Inherited from business hours') ? (
                                  <>
                                    <Building className="w-3 h-3" />
                                    <span>Inherited from business hours</span>
                                  </>
                                ) : (
                                  <>
                                    <span>📅 {staff.availability.length} schedule{staff.availability.length !== 1 ? 's' : ''} configured</span>
                                  </>
                                )}
                              </div>
                              {staff.preferences && (
                                <>
                                  <div>
                                    ⏰ {staff.preferences.min_advance_hours}h advance booking
                                  </div>
                                  <div>
                                    🚫 {staff.preferences.cancellation_window_hours}h cancellation window
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>
            )}
          </div>
        )}

        {/* Messages Section */}
        {activeTab === "messages" && (
          <div className="space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Customer Communications</h1>
              <p className="text-sm text-gray-600">Manage conversations and customer relationships</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Active Conversations</p>
                    <p className="text-3xl font-bold text-gray-900">{conversations.filter(c => c.status === 'active').length}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <MessageCircle className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Pending Responses</p>
                    <p className="text-3xl font-bold text-orange-600">{conversations.filter(c => c.needs_response).length}</p>
                  </div>
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Clock className="w-6 h-6 text-orange-600" />
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Avg Response Time</p>
                    <p className="text-3xl font-bold text-green-600">12min</p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </Card>
            </div>

            {/* Main Conversations Interface */}
            <div className="grid grid-cols-12 gap-6 h-[600px]">
              {/* Conversations List */}
              <Card className="col-span-4 p-4 overflow-hidden flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Conversations</h2>
                  <div className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-sm">
                    {conversations.length}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2">
                  {conversations.map((conversation) => (
                    <div
                      key={conversation.id}
                      onClick={() => selectConversation(conversation)}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedConversation?.id === conversation.id
                          ? 'bg-blue-50 border-blue-200 border'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={conversation.customer.avatar} />
                            <AvatarFallback>
                              {conversation.customer.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <p className="font-semibold text-gray-900 truncate">
                                {conversation.customer.name}
                              </p>
                              {conversation.unread_count > 0 && (
                                <div className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                                  {conversation.unread_count}
                                </div>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 truncate">{conversation.last_message}</p>
                            <p className="text-xs text-gray-500">{conversation.last_message_time}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-1">
                          {conversation.service && (
                            <Phone className="w-4 h-4 text-green-600" />
                          )}
                          {conversation.needs_response && (
                            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Messages Thread */}
              <Card className="col-span-5 p-0 overflow-hidden flex flex-col">
                {selectedConversation ? (
                  <>
                    {/* Conversation Header */}
                    <div className="p-4 border-b bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={selectedConversation.customer.avatar} />
                            <AvatarFallback>
                              {selectedConversation.customer.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="font-semibold text-gray-900">{selectedConversation.customer.name}</h3>
                            <div className="flex items-center space-x-2 text-sm text-gray-600">
                              <div className="flex items-center space-x-1">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                <span>SMS</span>
                              </div>
                              <span>{selectedConversation.service}</span>
                            </div>
                          </div>
                        </div>
                        <Button variant="outline" size="sm">
                          <Phone className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${message.sender === 'provider' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                              message.sender === 'provider'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-900'
                            }`}
                          >
                            <p className="text-sm">{message.content}</p>
                            <p className={`text-xs mt-1 ${
                              message.sender === 'provider' ? 'text-blue-100' : 'text-gray-500'
                            }`}>
                              {message.time}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Message Input */}
                    <div className="p-4 border-t">
                      <div className="flex items-center space-x-2">
                        <Input
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          placeholder="Type your message..."
                          className="flex-1"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              sendMessage();
                            }
                          }}
                        />
                        <Button
                          onClick={sendMessage}
                          disabled={!newMessage.trim() || messageLoading}
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-gray-500">
                    <div className="text-center">
                      <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Select a conversation to start messaging</p>
                    </div>
                  </div>
                )}
              </Card>

              {/* Customer Profile */}
              <Card className="col-span-3 p-4 overflow-hidden flex flex-col">
                {selectedConversation ? (
                  <div className="space-y-6">
                    <div className="text-center">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Customer Profile</h3>
                      <Avatar className="w-16 h-16 mx-auto mb-3">
                        <AvatarImage src={selectedConversation.customer.avatar} />
                        <AvatarFallback className="bg-green-100 text-green-600">
                          {selectedConversation.customer.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <h4 className="font-semibold text-gray-900">{selectedConversation.customer.name}</h4>
                      <div className="flex items-center justify-center space-x-1 mt-2">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${i < selectedConversation.customer.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                          />
                        ))}
                        <span className="text-sm text-gray-600 ml-1">{selectedConversation.customer.rating} rating</span>
                      </div>
                    </div>

                    {/* Recent Booking */}
                    <div className="space-y-2">
                      <h4 className="font-medium text-gray-900 flex items-center space-x-2">
                        <Calendar className="w-4 h-4" />
                        <span>Recent Booking</span>
                      </h4>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="font-medium text-gray-900">{selectedConversation.service}</p>
                        <p className="text-sm text-gray-600">2024-01-15</p>
                      </div>
                    </div>

                    {/* Booking History */}
                    <div className="space-y-2">
                      <h4 className="font-medium text-gray-900">Booking History</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Total Bookings</span>
                          <span className="font-medium">{selectedConversation.customer.total_bookings}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Total Spent</span>
                          <span className="font-medium">${selectedConversation.customer.total_spent}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Customer Since</span>
                          <span className="font-medium">{selectedConversation.customer.since}</span>
                        </div>
                      </div>
                    </div>

                    {/* Preferences */}
                    <div className="space-y-2">
                      <h4 className="font-medium text-gray-900">Preferences</h4>
                      <div className="space-y-1 text-sm text-gray-600">
                        {selectedConversation.customer.preferences.map((pref, index) => (
                          <div key={index} className="flex items-start space-x-1">
                            <span>•</span>
                            <span>{pref}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-2 pt-4 border-t">
                      <Button variant="outline" className="w-full justify-start">
                        <Calendar className="w-4 h-4 mr-2" />
                        View Bookings
                      </Button>
                      <Button variant="outline" className="w-full justify-start">
                        <Phone className="w-4 h-4 mr-2" />
                        Call Customer
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-gray-500">
                    <div className="text-center">
                      <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Select a conversation to view customer profile</p>
                    </div>
                  </div>
                )}
              </Card>
            </div>
          </div>
        )}

        {/* Business Settings Section */}
        {activeTab === "business-settings" && (
          <div className="space-y-8">
            {/* Header */}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Business Management</h1>
            </div>

            {/* Business Cover Image */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Business Cover Image</h2>
              <div className="relative">
                <div className="w-full h-48 bg-gray-200 rounded-lg overflow-hidden">
                  {businessSettings.cover_image_url ? (
                    <img
                      src={businessSettings.cover_image_url}
                      alt="Business Cover"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center">
                      <img
                        src="https://cdn.builder.io/api/v1/image/assets%2Fa42b6f9ec53e4654a92af75aad56d14f%2F6b0da6fa6fe24a01ba3e9a73698554a2?format=webp&width=800"
                        alt="Business Cover"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="absolute top-4 right-4">
                    <Button
                      size="sm"
                      variant="outline"
                      className="bg-white/90 hover:bg-white"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex justify-center space-x-4 mt-4">
                  <Button
                    variant="outline"
                    disabled={coverImageUploading}
                    onClick={() => document.getElementById('cover-upload')?.click()}
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Change Cover
                  </Button>
                  <Button
                    variant="outline"
                    className="text-red-600 border-red-300 hover:bg-red-50"
                    onClick={() => setBusinessSettings({...businessSettings, cover_image_url: ""})}
                  >
                    Remove
                  </Button>
                  <input
                    id="cover-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      // Handle cover image upload
                      const file = e.target.files?.[0];
                      if (file) {
                        // Simulate upload
                        setCoverImageUploading(true);
                        setTimeout(() => {
                          setCoverImageUploading(false);
                          toast({
                            title: "Cover Image Updated",
                            description: "Your business cover image has been updated.",
                            variant: "default",
                          });
                        }, 1000);
                      }
                    }}
                  />
                </div>
                <p className="text-center text-sm text-gray-600 mt-2">
                  Upload a cover image for your business profile (max 10MB). Recommended size: 1200x400px
                </p>
              </div>
            </Card>

            {/* Business Details */}
            <Card className="p-6">
              <div className="flex items-center space-x-2 mb-4">
                <Building className="w-5 h-5 text-gray-600" />
                <h2 className="text-lg font-semibold text-gray-900">Business Details</h2>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="font-medium text-gray-900 mb-4">Basic Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="businessName">Business Name *</Label>
                      <Input
                        id="businessName"
                        value={businessSettings.business_name}
                        onChange={(e) => setBusinessSettings({...businessSettings, business_name: e.target.value})}
                        placeholder="Smith Health & Wellness"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="businessType">Business Type</Label>
                      <Select
                        value={businessSettings.business_type}
                        onValueChange={(value) => setBusinessSettings({...businessSettings, business_type: value})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="independent">Independent</SelectItem>
                          <SelectItem value="smallBusiness">Small Business</SelectItem>
                          <SelectItem value="franchise">Franchise</SelectItem>
                          <SelectItem value="enterprise">Enterprise</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="verificationStatus">Verification Status</Label>
                      <Select
                        value={businessSettings.verification_status}
                        onValueChange={(value) => setBusinessSettings({...businessSettings, verification_status: value})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="approved">Approved</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="featuredStatus">Featured Business Status</Label>
                      <div className="flex items-center space-x-2">
                        <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
                          ��� FEATURED BUSINESS
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-600">
                        Featured businesses appear prominently on the homepage and get increased visibility to customers.
                        (Status controlled by ROAM)
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Service Categories */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Service Categories</h2>

              <div className="space-y-6">
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Business Service Categories</h3>
                  <p className="text-sm text-gray-600 mb-4">Main categories of services your business offers (read-only)</p>
                  <p className="text-sm text-blue-600 mb-4">
                    <strong>Note:</strong> Service categories are controlled by ROAM. If you need approval for additional service categories, please contact ROAM at provider.support@roamyourbestlife.com
                  </p>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {serviceCategoriesData.map((category) => (
                      <div key={category.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={category.value}
                          checked={serviceCategories.includes(category.value)}
                          disabled
                        />
                        <Label htmlFor={category.value} className="text-orange-600">{category.label}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Service Specializations</h3>
                  <p className="text-sm text-gray-600 mb-4">Specific services and specializations your business provides (read-only)</p>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {serviceSpecializationsData.map((specialization) => (
                      <div key={specialization.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={specialization.value}
                          checked={serviceSpecializations.includes(specialization.value)}
                          disabled
                        />
                        <Label htmlFor={specialization.value} className="text-orange-600">{specialization.label}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            {/* Contact Information */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="contactEmail">Contact Email</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    value={businessSettings.contact_email}
                    onChange={(e) => setBusinessSettings({...businessSettings, contact_email: e.target.value})}
                    placeholder="alan@smithhealthwellness.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="businessPhone">Business Phone</Label>
                  <Input
                    id="businessPhone"
                    value={businessSettings.business_phone}
                    onChange={(e) => setBusinessSettings({...businessSettings, business_phone: e.target.value})}
                    placeholder="5044717014"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="websiteUrl">Website URL</Label>
                  <Input
                    id="websiteUrl"
                    value={businessSettings.website_url}
                    onChange={(e) => setBusinessSettings({...businessSettings, website_url: e.target.value})}
                    placeholder="https://www.wellsmith.com"
                  />
                </div>
              </div>
            </Card>

            {/* Business Logo */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Business Logo</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Current Logo</h3>
                  <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
                    {businessSettings.logo_url ? (
                      <img
                        src={businessSettings.logo_url}
                        alt="Business Logo"
                        className="w-full h-full object-contain rounded-lg"
                      />
                    ) : (
                      <div className="text-center">
                        <Building className="w-8 h-8 text-gray-400 mx-auto mb-1" />
                        <p className="text-xs text-gray-500">No logo</p>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Logo Management</h3>
                  <div className="space-y-3">
                    <Button
                      variant="outline"
                      disabled={logoUploading}
                      onClick={() => document.getElementById('logo-upload')?.click()}
                      className="w-full"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Change Logo
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full text-red-600 border-red-300 hover:bg-red-50"
                      onClick={() => setBusinessSettings({...businessSettings, logo_url: ""})}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Remove Logo
                    </Button>
                    <input
                      id="logo-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setLogoUploading(true);
                          setTimeout(() => {
                            setLogoUploading(false);
                            toast({
                              title: "Logo Updated",
                              description: "Your business logo has been updated.",
                              variant: "default",
                            });
                          }, 1000);
                        }
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-600 mt-3">
                    Upload a business logo (max 5MB). Recommended size: 200x200px or larger.
                  </p>
                </div>
              </div>
            </Card>

            {/* Business Hours */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Business Hours</h2>

              <div className="space-y-4">
                {Object.entries(businessSettings.business_hours).map(([day, hours]) => (
                  <div key={day} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                    <div className="font-medium text-gray-900 capitalize w-24">
                      {day}
                    </div>

                    {editingBusinessHours ? (
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`${day}-closed`}
                            checked={hours.closed || false}
                            onCheckedChange={(checked) => {
                              const updatedHours = { ...businessSettings.business_hours };
                              if (checked) {
                                updatedHours[day] = { closed: true };
                              } else {
                                updatedHours[day] = { open: "8:00 AM", close: "5:00 PM" };
                              }
                              setBusinessSettings({ ...businessSettings, business_hours: updatedHours });
                            }}
                          />
                          <Label htmlFor={`${day}-closed`} className="text-sm">Closed</Label>
                        </div>

                        {!hours.closed && (
                          <>
                            <div className="flex items-center space-x-2">
                              <Label className="text-sm font-medium">Open:</Label>
                              <Select
                                value={hours.open || "8:00 AM"}
                                onValueChange={(value) => {
                                  const updatedHours = { ...businessSettings.business_hours };
                                  updatedHours[day] = { ...updatedHours[day], open: value };
                                  setBusinessSettings({ ...businessSettings, business_hours: updatedHours });
                                }}
                              >
                                <SelectTrigger className="w-24">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {generateTimeOptions().map(time => (
                                    <SelectItem key={time} value={time}>{time}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="flex items-center space-x-2">
                              <Label className="text-sm font-medium">Close:</Label>
                              <Select
                                value={hours.close || "5:00 PM"}
                                onValueChange={(value) => {
                                  const updatedHours = { ...businessSettings.business_hours };
                                  updatedHours[day] = { ...updatedHours[day], close: value };
                                  setBusinessSettings({ ...businessSettings, business_hours: updatedHours });
                                }}
                              >
                                <SelectTrigger className="w-24">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {generateTimeOptions().map(time => (
                                    <SelectItem key={time} value={time}>{time}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="flex-1 text-right text-gray-600">
                        {hours.closed ? (
                          <span>Closed</span>
                        ) : (
                          <span>{hours.open} – {hours.close}</span>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                <div className="flex space-x-2 mt-4">
                  {editingBusinessHours ? (
                    <>
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          // Restore original values
                          setBusinessSettings({ ...businessSettings, business_hours: originalBusinessHours });
                          setEditingBusinessHours(false);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        className="flex-1 bg-roam-blue hover:bg-roam-blue/90"
                        onClick={async () => {
                          if (!user) return;

                          try {
                            // Get provider's business_id first
                            const { data: providerData, error: providerError } = await supabase
                              .from('providers')
                              .select('business_id')
                              .eq('user_id', user.id)
                              .single();

                            if (providerError || !providerData?.business_id) {
                              throw new Error('Failed to find business profile');
                            }

                            // Convert business hours format for database
                            const businessHours: any = {};
                            Object.keys(businessSettings.business_hours).forEach(day => {
                              const dayData = businessSettings.business_hours[day];
                              if (dayData.closed) {
                                // Skip closed days - don't include them in the database
                                return;
                              } else {
                                businessHours[day.charAt(0).toUpperCase() + day.slice(1)] = {
                                  open: convertTo24Hour(dayData.open),
                                  close: convertTo24Hour(dayData.close)
                                };
                              }
                            });

                            // Update only business hours
                            const { error: updateError } = await supabase
                              .from('business_profiles')
                              .update({
                                business_hours: businessHours
                              })
                              .eq('id', providerData.business_id);

                            if (updateError) {
                              throw updateError;
                            }

                            setEditingBusinessHours(false);
                            toast({
                              title: "Business Hours Updated",
                              description: "Your business hours have been saved.",
                              variant: "default",
                            });
                          } catch (error) {
                            console.error('Error saving business hours:', error);
                            toast({
                              title: "Error",
                              description: "Failed to save business hours. Please try again.",
                              variant: "destructive",
                            });
                          }
                        }}
                      >
                        Save Hours
                      </Button>
                      {canSetInheritBusinessHours() && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={syncInheritedSchedules}
                          className="ml-2"
                        >
                          <Building className="w-4 h-4 mr-1" />
                          Sync Provider Schedules
                        </Button>
                      )}
                    </>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        // Backup current values before editing
                        setOriginalBusinessHours({ ...businessSettings.business_hours });
                        setEditingBusinessHours(true);
                      }}
                    >
                      <Clock className="w-4 h-4 mr-2" />
                      Edit Hours
                    </Button>
                  )}
                </div>
              </div>
            </Card>

            {/* Business Documents */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Business Documents</h2>
                <Button variant="outline" size="sm">
                  <Upload className="w-4 h-4 mr-2" />
                  Add Document
                </Button>
              </div>

              <p className="text-sm text-gray-600 mb-6">
                View and download documents you submitted during the business verification process.
              </p>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Shield className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Liability Insurance</p>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span>File Name: Screenshot 2024-08-13 at 4:18 PM</span>
                        <span>Size: 287.22 KB</span>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span>Submitted: 8/15/2025</span>
                        <span>Status Updated: Not reviewed</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
                      Pending Review
                    </Badge>
                    <Button variant="outline" size="sm">
                      <Download className="w-4 h-4 mr-2" />
                      View
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <User className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Drivers License</p>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span>File Name: Screenshot 2025-07-24 at 6:26 PM.png</span>
                        <span>Size: 310.73 KB</span>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span>Submitted: 7/31/2025</span>
                        <span>Status Updated: 8/1/2025</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className="bg-green-100 text-green-800 border-green-300">
                      Approved
                    </Badge>
                    <Button variant="outline" size="sm">
                      <Download className="w-4 h-4 mr-2" />
                      View
                    </Button>
                  </div>
                </div>
              </div>
            </Card>

            {/* Business Locations Section */}
            <Card className="p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Business Locations</h2>
                  <p className="text-gray-600">Manage your business locations and service areas</p>
                </div>
                <Button
                  onClick={handleAddLocation}
                  className="bg-gray-900 hover:bg-gray-800 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Location
                </Button>
              </div>

              <div className="space-y-4">
                {businessLocations.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>No locations added yet.</p>
                    <p className="text-sm">Add your first business location to get started.</p>
                  </div>
                ) : (
                  businessLocations.map((location) => (
                    <Card key={location.id} className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h3 className="font-semibold text-gray-900">
                              {location.location_name || 'Unnamed Location'}
                            </h3>
                            {location.is_primary && (
                              <Badge className="bg-blue-100 text-blue-700 text-xs">
                                Primary
                              </Badge>
                            )}
                            {!location.is_active && (
                              <Badge variant="outline" className="text-xs text-gray-500">
                                Inactive
                              </Badge>
                            )}
                          </div>

                          <div className="text-sm text-gray-600 space-y-1">
                            <p>
                              {[location.address_line1, location.address_line2].filter(Boolean).join(', ')}
                            </p>
                            <p>
                              {[location.city, location.state, location.postal_code].filter(Boolean).join(', ')}
                            </p>
                            {location.offers_mobile_services && (
                              <p className="text-blue-600">
                                ���� Mobile services available
                                {location.mobile_service_radius && ` (${location.mobile_service_radius} mile radius)`}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditLocation(location)}
                          >
                            ✏️ Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 border-red-300 hover:bg-red-50"
                            onClick={() => handleDeleteLocation(location.id)}
                          >
                            🗑️ Delete
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end">
              <Button
                size="lg"
                className="bg-roam-blue hover:bg-roam-blue/90"
                onClick={async () => {
                  if (!user) return;

                  try {
                    // Get provider's business_id first
                    const { data: providerData, error: providerError } = await supabase
                      .from('providers')
                      .select('business_id')
                      .eq('user_id', user.id)
                      .single();

                    if (providerError || !providerData?.business_id) {
                      throw new Error('Failed to find business profile');
                    }

                    // Convert business hours format
                    const businessHours: any = {};
                    Object.keys(businessSettings.business_hours).forEach(day => {
                      const dayData = businessSettings.business_hours[day];
                      if (dayData.closed) {
                        // For closed days, we might want to store null or skip
                        return;
                      } else {
                        businessHours[day.charAt(0).toUpperCase() + day.slice(1)] = {
                          open: convertTo24Hour(dayData.open),
                          close: convertTo24Hour(dayData.close)
                        };
                      }
                    });

                    // Update business profile
                    const { error: updateError } = await supabase
                      .from('business_profiles')
                      .update({
                        business_name: businessSettings.business_name,
                        business_type: mapBusinessTypeToDb(businessSettings.business_type),
                        contact_email: businessSettings.contact_email,
                        phone: businessSettings.business_phone,
                        website_url: businessSettings.website_url,
                        business_hours: businessHours,
                        cover_image_url: businessSettings.cover_image_url,
                        logo_url: businessSettings.logo_url
                      })
                      .eq('id', providerData.business_id);

                    if (updateError) {
                      throw updateError;
                    }

                    toast({
                      title: "Business Settings Saved",
                      description: "Your business settings have been updated successfully.",
                      variant: "default",
                    });
                  } catch (error) {
                    console.error('Error saving business settings:', error);
                    toast({
                      title: "Error",
                      description: "Failed to save business settings. Please try again.",
                      variant: "destructive",
                    });
                  }
                }}
              >
                Save Changes
              </Button>
            </div>
          </div>
        )}

        {/* Profile Section */}
        {activeTab === "profile" && (
          <div className="space-y-8">
            {/* Profile Information */}
            <Card className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Profile Information</h2>

              {/* Cover Image */}
              <div className="mb-8">
                <h3 className="font-semibold text-gray-900 mb-4">Cover Image</h3>
                <div className="relative">
                  <div className="w-full h-32 bg-gradient-to-r from-teal-400 to-teal-600 rounded-lg overflow-hidden">
                    {profileData.cover_image_url ? (
                      <img
                        src={profileData.cover_image_url}
                        alt="Profile Cover"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-r from-teal-400 to-teal-600"></div>
                    )}
                    <div className="absolute top-4 right-4">
                      <Button
                        size="sm"
                        variant="outline"
                        className="bg-white/90 hover:bg-white"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex justify-center space-x-4 mt-4">
                    <Button
                      variant="outline"
                      disabled={profileCoverUploading}
                      onClick={() => document.getElementById('profile-cover-upload')?.click()}
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      Change Cover
                    </Button>
                    <Button
                      variant="outline"
                      className="text-red-600 border-red-300 hover:bg-red-50"
                      onClick={() => setProfileData({...profileData, cover_image_url: ""})}
                    >
                      Remove
                    </Button>
                    <input
                      id="profile-cover-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setProfileCoverUploading(true);
                          setTimeout(() => {
                            setProfileCoverUploading(false);
                            toast({
                              title: "Cover Image Updated",
                              description: "Your profile cover image has been updated.",
                              variant: "default",
                            });
                          }, 1000);
                        }
                      }}
                    />
                  </div>
                  <p className="text-center text-sm text-gray-600 mt-2">
                    Upload a cover image for your profile (max 10MB). Recommended size: 800x200px
                  </p>
                </div>
              </div>

              {/* Profile Photo and Contact Information */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Profile Photo */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-4">Profile Photo</h3>
                  <div className="flex flex-col items-center">
                    <Avatar className="w-32 h-32 mb-4">
                      <AvatarImage src={profileData.profile_image_url} />
                      <AvatarFallback className="bg-teal-100 text-teal-600 text-2xl">
                        {profileData.first_name?.[0]}{profileData.last_name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={profilePhotoUploading}
                        onClick={() => document.getElementById('profile-photo-upload')?.click()}
                      >
                        <Camera className="w-4 h-4 mr-2" />
                        Change Photo
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 border-red-300 hover:bg-red-50"
                        onClick={() => setProfileData({...profileData, profile_image_url: ""})}
                      >
                        Remove
                      </Button>
                    </div>
                    <input
                      id="profile-photo-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setProfilePhotoUploading(true);
                          setTimeout(() => {
                            setProfilePhotoUploading(false);
                            toast({
                              title: "Profile Photo Updated",
                              description: "Your profile photo has been updated.",
                              variant: "default",
                            });
                          }, 1000);
                        }
                      }}
                    />
                    <p className="text-xs text-gray-600 mt-2 text-center">
                      Upload a professional photo (max 5MB)
                    </p>
                  </div>
                </div>

                {/* Contact Information */}
                <div className="lg:col-span-2">
                  <h3 className="font-semibold text-gray-900 mb-4">Contact Information</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name *</Label>
                        <Input
                          id="firstName"
                          value={profileData.first_name}
                          onChange={(e) => setProfileData({...profileData, first_name: e.target.value})}
                          placeholder="Owner"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name *</Label>
                        <Input
                          id="lastName"
                          value={profileData.last_name}
                          onChange={(e) => setProfileData({...profileData, last_name: e.target.value})}
                          placeholder="Roam"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="emailAddress">Email Address *</Label>
                      <Input
                        id="emailAddress"
                        type="email"
                        value={profileData.email}
                        onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                        placeholder="owner@roamyourbestlife.com"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phoneNumber">Phone Number</Label>
                      <Input
                        id="phoneNumber"
                        value={profileData.phone}
                        onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                        placeholder="5044174544"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="professionalBio">Professional Bio</Label>
                      <Textarea
                        id="professionalBio"
                        value={profileData.professional_bio}
                        onChange={(e) => setProfileData({...profileData, professional_bio: e.target.value})}
                        placeholder="Owner Prime"
                        rows={3}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Professional Details */}
            <Card className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Professional Details</h2>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="dateOfBirth">Date of Birth</Label>
                    <div className="relative">
                      <Input
                        id="dateOfBirth"
                        type="date"
                        value={profileData.date_of_birth}
                        onChange={(e) => setProfileData({...profileData, date_of_birth: e.target.value})}
                        className="pr-10"
                      />
                      <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="yearsOfExperience">Years of Experience</Label>
                    <Input
                      id="yearsOfExperience"
                      type="number"
                      value={profileData.years_of_experience}
                      onChange={(e) => setProfileData({...profileData, years_of_experience: e.target.value})}
                      placeholder="12"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-gray-700">Verification Status</Label>
                    <div className="flex items-center">
                      <Badge className="bg-red-100 text-red-800 border-red-300 px-3 py-1">
                        {profileData.verification_status === "approved" ? "Approved" : "Pending"}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-700">Background Check</Label>
                    <div className="flex items-center">
                      <Badge className="bg-green-100 text-green-800 border-green-300 px-3 py-1">
                        {profileData.background_check_status === "approved" ? "Approved" : "Pending"}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end">
              <Button
                size="lg"
                className="bg-roam-blue hover:bg-roam-blue/90"
                onClick={async () => {
                  if (!user) {
                    toast({
                      title: "Error",
                      description: "No user session found. Please sign in again.",
                      variant: "destructive",
                    });
                    return;
                  }

                  try {
                    // Update provider data in the database
                    const { error } = await supabase
                      .from('providers')
                      .update({
                        first_name: profileData.first_name,
                        last_name: profileData.last_name,
                        email: profileData.email,
                        phone: profileData.phone,
                        bio: profileData.professional_bio,
                        date_of_birth: profileData.date_of_birth || null,
                        experience_years: profileData.years_of_experience ? parseInt(profileData.years_of_experience) : null,
                        image_url: profileData.profile_image_url || null,
                        cover_image_url: profileData.cover_image_url || null,
                      })
                      .eq('user_id', user.id);

                    if (error) {
                      console.error('Error updating profile:', error);
                      toast({
                        title: "Error",
                        description: "Failed to update profile. Please try again.",
                        variant: "destructive",
                      });
                      return;
                    }

                    toast({
                      title: "Profile Updated",
                      description: "Your profile has been updated successfully.",
                      variant: "default",
                    });
                  } catch (error) {
                    console.error('Error saving profile:', error);
                    toast({
                      title: "Error",
                      description: "An unexpected error occurred. Please try again.",
                      variant: "destructive",
                    });
                  }
                }}
              >
                Save Changes
              </Button>
            </div>
          </div>
        )}

        {/* Services Section */}
        {activeTab === "services" && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Service Catalog</h1>
                <p className="text-gray-600">Manage your services from 400+ platform offerings</p>
              </div>
              <Button className="bg-gray-900 hover:bg-gray-800 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Add Service
              </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Services</p>
                    <p className="text-2xl font-bold text-gray-900">{myServices.length}</p>
                  </div>
                  <BarChart3 className="w-8 h-8 text-blue-500" />
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Active Services</p>
                    <p className="text-2xl font-bold text-gray-900">{myServices.filter(s => s.is_active).length}</p>
                  </div>
                  <Eye className="w-8 h-8 text-green-500" />
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Add-ons Configured</p>
                    <p className="text-2xl font-bold text-gray-900">{serviceAddons.filter(a => a.is_available).length}</p>
                  </div>
                  <Star className="w-8 h-8 text-purple-500" />
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Available to Add</p>
                    <p className="text-2xl font-bold text-orange-600">{availableCatalogServices.length}</p>
                  </div>
                  <Plus className="w-8 h-8 text-orange-500" />
                </div>
              </Card>
            </div>

            {/* Navigation Tabs */}
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setServicesActiveTab("my-services")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  servicesActiveTab === "my-services"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                My Services ({myServices.length})
              </button>
              <button
                onClick={() => setServicesActiveTab("add-services")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  servicesActiveTab === "add-services"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Add Services ({availableCatalogServices.length})
              </button>
              <button
                onClick={() => setServicesActiveTab("manage-addons")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  servicesActiveTab === "manage-addons"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Manage Add-ons
              </button>
              <button
                onClick={() => setServicesActiveTab("performance")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  servicesActiveTab === "performance"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Performance
              </button>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search services..."
                  className="pl-10"
                  value={servicesSearchQuery}
                  onChange={(e) => setServicesSearchQuery(e.target.value)}
                />
              </div>
              <Select value={servicesCategory} onValueChange={setServicesCategory}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All Categories">All Categories</SelectItem>
                  <SelectItem value="Wellness & Massage">Wellness & Massage</SelectItem>
                  <SelectItem value="Beauty & Skincare">Beauty & Skincare</SelectItem>
                  <SelectItem value="Fitness & Training">Fitness & Training</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* My Services Tab */}
            {servicesActiveTab === "my-services" && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myServices.length === 0 ? (
                  <div className="col-span-full">
                    <Card className="p-8 text-center">
                      <p className="text-gray-500 mb-4">No services added yet</p>
                      <p className="text-sm text-gray-400">Add services from the catalog to start accepting bookings</p>
                    </Card>
                  </div>
                ) : (
                  myServices.map((service) => (
                    <Card key={service.id} className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-semibold text-gray-900">{service.name}</h3>
                          {service.is_featured && <Star className="w-4 h-4 text-yellow-500 fill-current" />}
                          {service.is_active && <Eye className="w-4 h-4 text-green-500" />}
                        </div>
                      </div>

                      <p className="text-sm text-gray-600 mb-3">{service.category}</p>

                      {/* Description with toggle */}
                      <div className="mb-4">
                        {expandedDescriptions.has(service.id) && (
                          <p className="text-sm text-gray-700 mb-2">{service.description}</p>
                        )}
                        <button
                          onClick={() => toggleServiceDescription(service.id)}
                          className="flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-800 transition-colors"
                        >
                          <span>{expandedDescriptions.has(service.id) ? 'Hide Description' : 'Show Description'}</span>
                          <ChevronDown
                            className={`w-3 h-3 transition-transform ${
                              expandedDescriptions.has(service.id) ? 'rotate-180' : ''
                            }`}
                          />
                        </button>
                      </div>

                      <div className="flex items-center space-x-4 text-sm text-gray-600 mb-4">
                        <span>�� {service.duration} min</span>
                        <span>💰 ${service.price}</span>
                      </div>

                      <div className="flex items-center space-x-2 mb-4">
                        {service.is_mobile && (
                          <Badge variant="outline" className="text-xs">
                            📱 mobile
                          </Badge>
                        )}
                        {service.is_location && (
                          <Badge variant="outline" className="text-xs">
                            �� location
                          </Badge>
                        )}
                      </div>

                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm text-gray-600">Bookings: <span className="font-medium">{service.bookings}</span></p>
                          <p className="text-sm text-gray-600">Revenue: <span className="font-medium">${service.revenue.toLocaleString()}</span></p>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center space-x-1">
                            <Star className="w-4 h-4 text-yellow-500 fill-current" />
                            <span className="text-sm font-medium">{service.rating}</span>
                            <span className="text-sm text-gray-500">({service.reviews} reviews)</span>
                          </div>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditServiceModal(service)}
                            >
                              ✏️ Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => removeServiceFromBusiness(service.service_id || service.id, service.name)}
                            >
                              🗑️ Remove
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            )}

            {/* Add Services Tab */}
            {servicesActiveTab === "add-services" && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {availableCatalogServices.length === 0 ? (
                  <div className="col-span-full">
                    <Card className="p-8 text-center">
                      <p className="text-gray-500 mb-4">No services available to add</p>
                      <p className="text-sm text-gray-400">
                        Services become available when your business has the required subcategories configured
                      </p>
                    </Card>
                  </div>
                ) : (
                  availableCatalogServices.map((service) => (
                    <Card key={service.id} className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <h3 className="font-semibold text-gray-900">{service.name}</h3>
                        {service.popular && (
                          <Badge className="bg-purple-100 text-purple-700 text-xs">
                            Popular
                          </Badge>
                        )}
                        {service.cert_required && (
                          <Badge variant="outline" className="text-xs text-orange-600 border-orange-600">
                            Cert Required
                          </Badge>
                        )}
                      </div>

                      <p className="text-sm text-gray-600 mb-3">{service.category}</p>

                      {/* Description with toggle */}
                      <div className="mb-4">
                        {expandedDescriptions.has(service.id) && (
                          <p className="text-sm text-gray-700 mb-2">{service.description}</p>
                        )}
                        <button
                          onClick={() => toggleServiceDescription(service.id)}
                          className="flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-800 transition-colors"
                        >
                          <span>{expandedDescriptions.has(service.id) ? 'Hide Description' : 'Show Description'}</span>
                          <ChevronDown
                            className={`w-3 h-3 transition-transform ${
                              expandedDescriptions.has(service.id) ? 'rotate-180' : ''
                            }`}
                          />
                        </button>
                      </div>

                      <div className="flex items-center space-x-4 text-sm text-gray-600 mb-4">
                        <span>⏱ {service.duration} min</span>
                        <span>���� ${service.price} suggested</span>
                      </div>

                      <Button
                        className="w-full bg-gray-900 hover:bg-gray-800 text-white"
                        onClick={() => addServiceToBusiness(service)}
                      >
                        + Add to My Services
                      </Button>
                    </Card>
                  ))
                )}
              </div>
            )}

            {/* Manage Add-ons Tab */}
            {servicesActiveTab === "manage-addons" && (
              <div className="space-y-8">
                {/* Header */}
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Manage Service Add-ons</h2>
                    <p className="text-gray-600">Configure add-ons for your services to increase revenue</p>
                  </div>
                  <Button className="bg-gray-900 hover:bg-gray-800 text-white">
                    + Request Custom Add-on
                  </Button>
                </div>

                {/* Configured Add-ons Section */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Configured Add-ons</h3>
                  <div className="space-y-4">
                    {serviceAddons.length === 0 ? (
                      <Card className="p-6 text-center">
                        <p className="text-gray-500 mb-2">No add-ons configured yet</p>
                        <p className="text-sm text-gray-400">Configure add-ons below to start offering them to customers</p>
                      </Card>
                    ) : (
                      serviceAddons.map((addon) => (
                        <Card key={addon.id} className="p-6">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <h4 className="font-semibold text-gray-900">{addon.name}</h4>
                                <Badge className={`text-xs ${addon.is_available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                  {addon.is_available ? 'Active' : 'Inactive'}
                                </Badge>
                              </div>
                              <p className="text-gray-600 mb-3">{addon.description}</p>
                              <div className="flex items-center space-x-4 text-sm text-gray-600">
                                <span>💰 ${addon.price}</span>
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              <Button variant="outline" size="sm">
                                ���️ Edit
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-600 border-red-300 hover:bg-red-50"
                              >
                                🗑️ Remove
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))
                    )}
                  </div>
                </div>

                {/* Available Add-ons Section */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Available Add-ons</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    These add-ons are compatible with your current services. Configure pricing to offer them to customers.
                  </p>

                  {Object.keys(availableAddonsByService).length === 0 ? (
                    <Card className="p-6 text-center">
                      <p className="text-gray-500 mb-2">No add-ons available</p>
                      <p className="text-sm text-gray-400">
                        Add-ons become available when you add services that support them
                      </p>
                    </Card>
                  ) : (
                    <div className="space-y-6">
                      {Object.entries(availableAddonsByService).map(([serviceId, serviceData]: [string, any]) => (
                        <Card key={serviceId} className="p-6">
                          <h4 className="font-semibold text-gray-900 mb-4">
                            For Service: {serviceData.serviceName}
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {serviceData.addons.map((addon: any) => (
                              <Card key={addon.id} className="p-4 border-gray-200">
                                <div className="flex justify-between items-start">
                                  <div className="flex-1">
                                    <div className="flex items-center space-x-2 mb-2">
                                      <h5 className="font-medium text-gray-900">{addon.name}</h5>
                                      {addon.is_recommended && (
                                        <Badge className="bg-blue-100 text-blue-700 text-xs">
                                          Recommended
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-sm text-gray-600 mb-3">{addon.description}</p>
                                    {addon.image_url && (
                                      <div className="w-16 h-16 bg-gray-100 rounded mb-3">
                                        <img
                                          src={addon.image_url}
                                          alt={addon.name}
                                          className="w-full h-full object-cover rounded"
                                        />
                                      </div>
                                    )}
                                  </div>
                                  <Button
                                    size="sm"
                                    className="bg-gray-900 hover:bg-gray-800 text-white ml-4"
                                    onClick={() => {
                                      // TODO: Open pricing modal for this add-on
                                      toast({
                                        title: "Configure Add-on",
                                        description: `Configure pricing for ${addon.name}`,
                                        variant: "default",
                                      });
                                    }}
                                  >
                                    + Configure
                                  </Button>
                                </div>
                              </Card>
                            ))}
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Performance Tab */}
            {servicesActiveTab === "performance" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Service Performance */}
                  <Card className="p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-6">Service Performance</h2>
                    <div className="space-y-4">
                      {myServices.map((service) => (
                        <div key={service.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                          <div>
                            <h3 className="font-medium text-gray-900">{service.name}</h3>
                            <p className="text-sm text-gray-600">{service.bookings} bookings this month</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-gray-900">${service.revenue.toLocaleString()}</p>
                            <div className="flex items-center space-x-1">
                              <Star className="w-3 h-3 text-yellow-500 fill-current" />
                              <span className="text-sm text-gray-600">{service.rating}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>

                  {/* Revenue by Category */}
                  <Card className="p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-6">Revenue by Category</h2>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                        <div>
                          <h3 className="font-medium text-gray-900">Wellness & Massage</h3>
                          <p className="text-sm text-gray-600">62 bookings</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">$9,740</p>
                          <p className="text-sm text-green-600">68% of total</p>
                        </div>
                      </div>

                      <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                        <div>
                          <h3 className="font-medium text-gray-900">Beauty & Skincare</h3>
                          <p className="text-sm text-gray-600">22 bookings</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">$2,310</p>
                          <p className="text-sm text-blue-600">19% of total</p>
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Dashboard Section */}
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            {/* Welcome Header */}
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  Welcome back, Sarah Johnson! 👋
                </h1>
                <p className="text-gray-600">Here's how Wellness Harmony Spa is performing today</p>
              </div>
              <div className="flex items-center space-x-4">
                <Button
                  variant="outline"
                  className="flex items-center space-x-2"
                  onClick={() => setShowShareProfileModal(true)}
                >
                  <Share2 className="w-4 h-4" />
                  <span>Share Profile</span>
                </Button>
                <div className="text-right text-sm text-gray-500">
                  8/19/2025 • 12:19 PM
                </div>
              </div>
            </div>

            {/* Top Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-gray-600">Today's Earnings</p>
                  <DollarSign className="w-4 h-4 text-green-500" />
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-gray-900">$1,060</p>
                  <p className="text-xs text-gray-500">8 out platform fee (15%)</p>
                  <div className="flex items-center space-x-1">
                    <TrendingUp className="w-3 h-3 text-green-500" />
                    <span className="text-xs text-green-600">+12%</span>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-gray-600">Today's Bookings</p>
                  <Calendar className="w-4 h-4 text-blue-500" />
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-gray-900">6</p>
                  <p className="text-xs text-gray-500">5 total, 2 upcoming</p>
                  <div className="flex items-center space-x-1">
                    <TrendingUp className="w-3 h-3 text-green-500" />
                    <span className="text-xs text-green-600">+8%</span>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-gray-600">Profile Views</p>
                  <Eye className="w-4 h-4 text-purple-500" />
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-gray-900">156</p>
                  <p className="text-xs text-gray-500">Customer app visibility</p>
                  <div className="flex items-center space-x-1">
                    <TrendingUp className="w-3 h-3 text-green-500" />
                    <span className="text-xs text-green-600">+15%</span>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-gray-600">Customer Rating</p>
                  <Star className="w-4 h-4 text-yellow-500" />
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-gray-900">4.8</p>
                  <p className="text-xs text-gray-500">Customer response</p>
                  <div className="flex items-center space-x-1">
                    <TrendingUp className="w-3 h-3 text-green-500" />
                    <span className="text-xs text-green-600">+0.2</span>
                  </div>
                </div>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Service Management & Performance */}
              <div className="lg:col-span-2 space-y-6">
                {/* Service Catalog Management */}
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-2">
                      <BarChart3 className="w-5 h-5 text-gray-700" />
                      <h2 className="text-xl font-bold text-gray-900">Service Catalog Management</h2>
                    </div>
                    <Button
                      className="bg-gray-900 hover:bg-gray-800 text-white"
                      onClick={() => setActiveTab("services")}
                    >
                      Manage Services
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="flex items-center space-x-3 p-4 bg-green-50 rounded-lg">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Active Services</p>
                        <p className="text-2xl font-bold text-gray-900">23</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Plus className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Available to Add</p>
                        <p className="text-2xl font-bold text-gray-900">377</p>
                      </div>
                    </div>
                  </div>

                  {/* Top Performing Services */}
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-4">Top Performing Services</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">Swedish Massage</p>
                          <p className="text-sm text-gray-600">34 bookings this month</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">$4,080</p>
                          <p className="text-sm text-green-600">+12%</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">Deep Tissue Massage</p>
                          <p className="text-sm text-gray-600">28 bookings this month</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">$5,040</p>
                          <p className="text-sm text-green-600">+8%</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">Personal Training</p>
                          <p className="text-sm text-gray-600">22 bookings this month</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">$2,200</p>
                          <p className="text-sm text-green-600">+15%</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">Aromatherapy Facial</p>
                          <p className="text-sm text-gray-600">18 bookings this month</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">$1,890</p>
                          <p className="text-sm text-green-600">+6%</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Today's Schedule */}
                <Card className="p-6">
                  <div className="flex items-center space-x-2 mb-6">
                    <Calendar className="w-5 h-5 text-gray-700" />
                    <h2 className="text-xl font-bold text-gray-900">Today's Schedule</h2>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">Sarah Johnson</p>
                        <p className="text-sm text-gray-600">Swedish Massage (60 min)</p>
                        <p className="text-xs text-gray-500">Provider: Emily Rodriguez</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">2:00 PM</p>
                        <div className="flex items-center space-x-2">
                          <Badge className="bg-gray-900 text-white text-xs">Mobile</Badge>
                          <span className="text-sm text-gray-600">$120</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">Michael Chen</p>
                        <p className="text-sm text-gray-600">Deep Tissue Massage (90 min)</p>
                        <p className="text-xs text-gray-500">Provider: Michael Chen</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">4:30 PM</p>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className="text-xs">Location</Badge>
                          <span className="text-sm text-gray-600">$180</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">Emily Rodriguez</p>
                        <p className="text-sm text-gray-600">Personal Training (60 min)</p>
                        <p className="text-xs text-gray-500">Provider: Alex Thompson</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">11:00 AM</p>
                        <div className="flex items-center space-x-2">
                          <Badge className="bg-gray-900 text-white text-xs">Mobile</Badge>
                          <span className="text-sm text-gray-600">$100</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Right Column - Quick Actions & Active Conversations */}
              <div className="space-y-6">
                {/* Quick Actions */}
                <Card className="p-6">
                  <h2 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h2>
                  <div className="space-y-3">
                    <button
                      onClick={() => setActiveTab("services")}
                      className="w-full flex items-center space-x-3 p-3 text-left hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <BarChart3 className="w-5 h-5 text-gray-600" />
                      <span className="text-sm font-medium text-gray-900">Manage Services</span>
                    </button>

                    <button
                      onClick={() => setActiveTab("staff")}
                      className="w-full flex items-center space-x-3 p-3 text-left hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <Users className="w-5 h-5 text-gray-600" />
                      <span className="text-sm font-medium text-gray-900">Manage Staff</span>
                    </button>

                    <button
                      onClick={() => setActiveTab("messages")}
                      className="w-full flex items-center space-x-3 p-3 text-left hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <MessageCircle className="w-5 h-5 text-gray-600" />
                      <span className="text-sm font-medium text-gray-900">Customer Messages</span>
                    </button>

                    <button
                      onClick={() => setActiveTab("financials")}
                      className="w-full flex items-center space-x-3 p-3 text-left hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <DollarSign className="w-5 h-5 text-gray-600" />
                      <span className="text-sm font-medium text-gray-900">View Financials</span>
                    </button>

                    <button
                      onClick={() => setShowShareProfileModal(true)}
                      className="w-full flex items-center space-x-3 p-3 text-left hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <Share2 className="w-5 h-5 text-gray-600" />
                      <span className="text-sm font-medium text-gray-900">Share Profile</span>
                    </button>
                  </div>
                </Card>

                {/* Active Conversations */}
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <MessageCircle className="w-5 h-5 text-gray-700" />
                      <h2 className="text-lg font-bold text-gray-900">Active Conversations</h2>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="bg-blue-100 text-blue-700">LT</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">Lisa Thompson</p>
                        <p className="text-sm text-gray-600">About appointment time...</p>
                      </div>
                      <div className="text-right">
                        <Badge className="bg-red-100 text-red-700 text-xs">2</Badge>
                        <p className="text-xs text-gray-500 mt-1">5m ago</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="bg-green-100 text-green-700">DK</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">David Kim</p>
                        <p className="text-sm text-gray-600">Requesting service add-on</p>
                      </div>
                      <div className="text-right">
                        <Badge className="bg-red-100 text-red-700 text-xs">1</Badge>
                        <p className="text-xs text-gray-500 mt-1">12m ago</p>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setActiveTab("messages")}
                    className="w-full text-center text-sm text-blue-600 hover:text-blue-700 mt-4 p-2"
                  >
                    View All Messages
                  </button>
                </Card>

                {/* This Month Stats */}
                <Card className="p-6">
                  <h2 className="text-lg font-bold text-gray-900 mb-4">This Month</h2>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Total Revenue</span>
                      <span className="font-semibold text-gray-900">$18,450</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Completed Bookings</span>
                      <span className="font-semibold text-gray-900">147</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">New Customers</span>
                      <span className="font-semibold text-gray-900">23</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Avg Rating</span>
                      <div className="flex items-center space-x-1">
                        <span className="font-semibold text-gray-900">4.8</span>
                        <Star className="w-3 h-3 text-yellow-500 fill-current" />
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        )}

        {/* Other tabs content */}
        {!["bookings", "financials", "staff", "messages", "business-settings", "profile", "services", "dashboard"].includes(activeTab) && (
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Section
            </h2>
            <p className="text-gray-600">This section is under development.</p>
          </div>
        )}
      </main>

      {/* Edit Staff Member Modal */}
      <Dialog open={showEditStaffModal} onOpenChange={setShowEditStaffModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Edit Staff Member</DialogTitle>
          </DialogHeader>

          <div className="space-y-8">
            {/* Staff Member Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Staff Member Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={editStaffForm.first_name}
                    onChange={(e) => setEditStaffForm({ ...editStaffForm, first_name: e.target.value })}
                    placeholder="Provider"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={editStaffForm.last_name}
                    onChange={(e) => setEditStaffForm({ ...editStaffForm, last_name: e.target.value })}
                    placeholder="Roam"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={editStaffForm.email}
                    onChange={(e) => setEditStaffForm({ ...editStaffForm, email: e.target.value })}
                    placeholder="provider@roamyourbestlife.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone *</Label>
                  <Input
                    id="phone"
                    value={editStaffForm.phone}
                    onChange={(e) => setEditStaffForm({ ...editStaffForm, phone: e.target.value })}
                    placeholder="5044117011"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="providerRole">Provider Role</Label>
                  <Select
                    value={editStaffForm.provider_role}
                    onValueChange={(value) => setEditStaffForm({ ...editStaffForm, provider_role: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="owner">Owner</SelectItem>
                      <SelectItem value="dispatcher">Dispatcher</SelectItem>
                      <SelectItem value="provider">Provider</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Location (Optional)</Label>
                  <Select
                    value={editStaffForm.location_id}
                    onValueChange={(value) => setEditStaffForm({ ...editStaffForm, location_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="home_office">Home Office (Primary)</SelectItem>
                      {locations.map((location) => (
                        <SelectItem key={location.id} value={location.id}>
                          {location.location_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="experience">Experience (Years)</Label>
                  <Input
                    id="experience"
                    type="number"
                    value={editStaffForm.experience_years}
                    onChange={(e) => setEditStaffForm({ ...editStaffForm, experience_years: e.target.value })}
                    placeholder="7"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="verificationStatus">Verification Status</Label>
                  <Select
                    value={editStaffForm.verification_status}
                    onValueChange={(value) => setEditStaffForm({ ...editStaffForm, verification_status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="verified">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="backgroundCheck">Background Check</Label>
                  <Select
                    value={editStaffForm.background_check_status}
                    onValueChange={(value) => setEditStaffForm({ ...editStaffForm, background_check_status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-4 md:col-span-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="businessManaged"
                      checked={editStaffForm.business_managed}
                      onCheckedChange={(checked) => setEditStaffForm({ ...editStaffForm, business_managed: !!checked })}
                    />
                    <Label htmlFor="businessManaged">Business Managed</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="active"
                      checked={editStaffForm.is_active}
                      onCheckedChange={(checked) => setEditStaffForm({ ...editStaffForm, is_active: !!checked })}
                    />
                    <Label htmlFor="active">Active</Label>
                  </div>
                </div>
              </div>
            </div>

            {/* Service & Addon Assignment */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Service & Addon Assignment</h3>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Services */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Services</h4>

                  {/* Currently Assigned Services */}
                  <div className="mb-4">
                    <p className="text-sm text-green-600 mb-2">Currently Assigned Services</p>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-sm">Swedish Massage</span>
                        <span className="text-xs text-gray-500">$200</span>
                        <Button variant="outline" size="sm" className="text-red-600 border-red-300 hover:bg-red-50">
                          Remove
                        </Button>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-sm">Deep Tissue Massage</span>
                        <span className="text-xs text-gray-500">$250</span>
                        <Button variant="outline" size="sm" className="text-red-600 border-red-300 hover:bg-red-50">
                          Remove
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Available to Assign */}
                  <div>
                    <p className="text-sm text-blue-600 mb-2">Available to Assign</p>
                    <p className="text-xs text-gray-500 mb-2">No business services available for assignment</p>
                  </div>
                </div>

                {/* Addons */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Addons</h4>

                  {/* Currently Assigned Addons */}
                  <div className="mb-4">
                    <p className="text-sm text-green-600 mb-2">Currently Assigned Addons</p>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-sm">Hot Stones</span>
                        <Button variant="outline" size="sm" className="text-red-600 border-red-300 hover:bg-red-50">
                          Remove
                        </Button>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-sm">Hot Oils</span>
                        <Button variant="outline" size="sm" className="text-red-600 border-red-300 hover:bg-red-50">
                          Remove
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Available to Assign */}
                  <div>
                    <p className="text-sm text-blue-600 mb-2">Available to Assign</p>
                    <p className="text-xs text-gray-500 mb-2">No business addons available for assignment</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end space-x-4 pt-6 border-t">
              <Button
                variant="outline"
                onClick={() => setShowEditStaffModal(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={saveStaffMember}
                className="bg-roam-blue hover:bg-roam-blue/90"
              >
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Tax Information Modal */}
      <Dialog open={showTaxInfoModal} onOpenChange={setShowTaxInfoModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Tax Information</DialogTitle>
          </DialogHeader>

          <div className="space-y-8">
            {/* Business Tax Registration */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Business Tax Registration</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="legalBusinessName">Legal Business Name *</Label>
                  <Input
                    id="legalBusinessName"
                    value={taxInfo.legalBusinessName}
                    onChange={(e) => setTaxInfo({ ...taxInfo, legalBusinessName: e.target.value })}
                    placeholder="ROAM SPA LLC"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="taxId">Tax ID (EIN/SSN) *</Label>
                  <Input
                    id="taxId"
                    value={taxInfo.taxId}
                    onChange={(e) => setTaxInfo({ ...taxInfo, taxId: e.target.value })}
                    placeholder="1-9814565"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="taxIdType">Tax ID Type *</Label>
                  <Select
                    value={taxInfo.taxIdType}
                    onValueChange={(value) => setTaxInfo({ ...taxInfo, taxIdType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EIN">EIN (Employer Identification Number)</SelectItem>
                      <SelectItem value="SSN">SSN (Social Security Number)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="businessEntityType">Business Entity Type *</Label>
                  <Select
                    value={taxInfo.businessEntityType}
                    onValueChange={(value) => setTaxInfo({ ...taxInfo, businessEntityType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LLC">LLC</SelectItem>
                      <SelectItem value="Corporation">Corporation</SelectItem>
                      <SelectItem value="Partnership">Partnership</SelectItem>
                      <SelectItem value="Sole Proprietorship">Sole Proprietorship</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contactName">Tax Contact Name *</Label>
                  <Input
                    id="contactName"
                    value={taxInfo.contactName}
                    onChange={(e) => setTaxInfo({ ...taxInfo, contactName: e.target.value })}
                    placeholder="Jeffery Smith"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contactEmail">Tax Contact Email *</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    value={taxInfo.contactEmail}
                    onChange={(e) => setTaxInfo({ ...taxInfo, contactEmail: e.target.value })}
                    placeholder="alan@roamyourbestlife.com"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="contactPhone">Tax Contact Phone</Label>
                  <Input
                    id="contactPhone"
                    value={taxInfo.contactPhone}
                    onChange={(e) => setTaxInfo({ ...taxInfo, contactPhone: e.target.value })}
                    placeholder="5044117014"
                  />
                </div>
              </div>
            </div>

            {/* Tax Mailing Address */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Tax Mailing Address</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="addressLine1">Address Line 1 *</Label>
                  <Input
                    id="addressLine1"
                    value={taxInfo.addressLine1}
                    onChange={(e) => setTaxInfo({ ...taxInfo, addressLine1: e.target.value })}
                    placeholder="318 Cannonball Lane"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="addressLine2">Address Line 2</Label>
                  <Input
                    id="addressLine2"
                    value={taxInfo.addressLine2}
                    onChange={(e) => setTaxInfo({ ...taxInfo, addressLine2: e.target.value })}
                    placeholder="Apt, suite, etc."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    value={taxInfo.city}
                    onChange={(e) => setTaxInfo({ ...taxInfo, city: e.target.value })}
                    placeholder="Holt Beach"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="state">State *</Label>
                  <Input
                    id="state"
                    value={taxInfo.state}
                    onChange={(e) => setTaxInfo({ ...taxInfo, state: e.target.value })}
                    placeholder="Florida"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="zipCode">ZIP Code *</Label>
                  <Input
                    id="zipCode"
                    value={taxInfo.zipCode}
                    onChange={(e) => setTaxInfo({ ...taxInfo, zipCode: e.target.value })}
                    placeholder="32401"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end space-x-4 pt-6 border-t">
              <Button
                variant="outline"
                onClick={() => setShowTaxInfoModal(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  // Save tax info logic here
                  toast({
                    title: "Tax Information Saved",
                    description: "Your tax information has been updated successfully.",
                    variant: "default",
                  });
                  setShowTaxInfoModal(false);
                }}
                className="bg-roam-blue hover:bg-roam-blue/90"
              >
                Save Tax Info
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Share Business Profile Modal */}
      <Dialog open={showShareProfileModal} onOpenChange={setShowShareProfileModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Share Your Business Profile</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Business Profile Preview */}
            <div className="bg-gray-50 p-6 rounded-lg">
              <div className="flex items-center space-x-4 mb-4">
                <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">R</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Wellness Harmony Spa</h3>
                      <p className="text-gray-600">Premium wellness services</p>
                    </div>
                    <div className="flex items-center space-x-1 bg-green-100 px-3 py-1 rounded-full">
                      <Star className="w-4 h-4 text-green-600 fill-current" />
                      <span className="text-sm font-medium text-green-700">4.8 Rating</span>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-gray-700">
                Your customers will see your business profile, services, availability, and can book
                appointments directly through the ROAM app.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* QR Code Section */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center">
                    <div className="w-3 h-3 bg-gray-600 rounded-sm"></div>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">QR Code</h3>
                </div>

                {/* QR Code Placeholder */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <div className="w-48 h-48 mx-auto bg-white border-2 border-gray-200 rounded-lg flex items-center justify-center">
                    <div className="grid grid-cols-8 gap-1 w-32 h-32">
                      {/* QR Code Pattern Simulation */}
                      {Array.from({ length: 64 }).map((_, i) => (
                        <div
                          key={i}
                          className={`w-2 h-2 ${
                            Math.random() > 0.5 ? 'bg-black' : 'bg-white'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <p className="text-sm text-gray-600 text-center">
                  Customers can scan this QR code to view your business
                </p>
              </div>

              {/* Direct Link Section */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <ExternalLink className="w-5 h-5 text-gray-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Direct Link</h3>
                </div>

                <div>
                  <Label htmlFor="businessUrl" className="text-sm font-medium text-gray-700 mb-2 block">
                    Your Business URL
                  </Label>
                  <div className="flex">
                    <Input
                      id="businessUrl"
                      value="https://roam-app.com/business/wellness-harmony-spa"
                      readOnly
                      className="flex-1 font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="ml-2"
                      onClick={() => {
                        navigator.clipboard.writeText("https://roam-app.com/business/wellness-harmony-spa");
                        toast({
                          title: "Link Copied",
                          description: "Business URL has been copied to clipboard.",
                        });
                      }}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    className="flex items-center justify-center space-x-2"
                    onClick={() => {
                      if (navigator.share) {
                        navigator.share({
                          title: 'Wellness Harmony Spa',
                          text: 'Book wellness services with Wellness Harmony Spa',
                          url: 'https://roam-app.com/business/wellness-harmony-spa'
                        });
                      } else {
                        toast({
                          title: "Share Feature",
                          description: "Share functionality not available on this device.",
                        });
                      }
                    }}
                  >
                    <Share2 className="w-4 h-4" />
                    <span>Share</span>
                  </Button>

                  <Button
                    variant="outline"
                    className="flex items-center justify-center space-x-2"
                    onClick={() => {
                      window.open("https://roam-app.com/business/wellness-harmony-spa", "_blank");
                    }}
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Preview</span>
                  </Button>
                </div>

                {/* Marketing Ideas */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center space-x-2 mb-3">
                    <div className="w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center">
                      <span className="text-xs">💡</span>
                    </div>
                    <h4 className="font-medium text-gray-900">Marketing Ideas</h4>
                  </div>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li className="flex items-start space-x-2">
                      <span className="text-blue-600 mt-0.5">•</span>
                      <span>Add QR code to business cards</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="text-blue-600 mt-0.5">•</span>
                      <span>Share link on social media</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="text-blue-600 mt-0.5">•</span>
                      <span>Display QR code at your location</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="text-blue-600 mt-0.5">���</span>
                      <span>Include in email signatures</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Close Button */}
            <div className="flex justify-end pt-6">
              <Button
                className="bg-gray-900 hover:bg-gray-800 text-white px-8"
                onClick={() => setShowShareProfileModal(false)}
              >
                Done
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manage Locations Modal */}
      <Dialog open={showLocationModal} onOpenChange={setShowLocationModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              {editingLocation ? 'Edit Location' : 'Add Location'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Location Name */}
            <div>
              <Label htmlFor="locationName" className="text-sm font-medium text-gray-700">
                Location Name *
              </Label>
              <Input
                id="locationName"
                value={locationFormData.location_name}
                onChange={(e) => setLocationFormData({
                  ...locationFormData,
                  location_name: e.target.value
                })}
                placeholder="Main Office, Second Location, etc."
                className="mt-1"
                required
              />
            </div>

            {/* Address Line 1 */}
            <div>
              <Label htmlFor="addressLine1" className="text-sm font-medium text-gray-700">
                Address Line 1 *
              </Label>
              <Input
                id="addressLine1"
                value={locationFormData.address_line1}
                onChange={(e) => setLocationFormData({
                  ...locationFormData,
                  address_line1: e.target.value
                })}
                placeholder="123 Main Street"
                className="mt-1"
                required
              />
            </div>

            {/* Address Line 2 */}
            <div>
              <Label htmlFor="addressLine2" className="text-sm font-medium text-gray-700">
                Address Line 2
              </Label>
              <Input
                id="addressLine2"
                value={locationFormData.address_line2}
                onChange={(e) => setLocationFormData({
                  ...locationFormData,
                  address_line2: e.target.value
                })}
                placeholder="Apt, suite, unit, etc."
                className="mt-1"
              />
            </div>

            {/* City and State */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="city" className="text-sm font-medium text-gray-700">
                  City *
                </Label>
                <Input
                  id="city"
                  value={locationFormData.city}
                  onChange={(e) => setLocationFormData({
                    ...locationFormData,
                    city: e.target.value
                  })}
                  placeholder="Santa Rosa"
                  className="mt-1"
                  required
                />
              </div>
              <div>
                <Label htmlFor="state" className="text-sm font-medium text-gray-700">
                  State
                </Label>
                <Input
                  id="state"
                  value={locationFormData.state}
                  onChange={(e) => setLocationFormData({
                    ...locationFormData,
                    state: e.target.value
                  })}
                  placeholder="CA"
                  className="mt-1"
                />
              </div>
            </div>

            {/* Postal Code and Country */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="postalCode" className="text-sm font-medium text-gray-700">
                  Postal Code
                </Label>
                <Input
                  id="postalCode"
                  value={locationFormData.postal_code}
                  onChange={(e) => setLocationFormData({
                    ...locationFormData,
                    postal_code: e.target.value
                  })}
                  placeholder="95401"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="country" className="text-sm font-medium text-gray-700">
                  Country
                </Label>
                <Input
                  id="country"
                  value={locationFormData.country}
                  onChange={(e) => setLocationFormData({
                    ...locationFormData,
                    country: e.target.value
                  })}
                  placeholder="US"
                  className="mt-1"
                />
              </div>
            </div>

            {/* Mobile Service Radius */}
            <div>
              <Label htmlFor="mobileRadius" className="text-sm font-medium text-gray-700">
                Mobile Service Radius (miles)
              </Label>
              <Input
                id="mobileRadius"
                type="number"
                value={locationFormData.mobile_service_radius}
                onChange={(e) => setLocationFormData({
                  ...locationFormData,
                  mobile_service_radius: e.target.value
                })}
                placeholder="25"
                className="mt-1"
              />
            </div>

            {/* Checkboxes */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isPrimary"
                  checked={locationFormData.is_primary}
                  onCheckedChange={(checked) => setLocationFormData({
                    ...locationFormData,
                    is_primary: checked as boolean
                  })}
                />
                <Label htmlFor="isPrimary" className="text-sm font-medium text-gray-700">
                  Primary Location
                </Label>
                <p className="text-xs text-gray-500">(Only one primary location allowed)</p>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="offersMobile"
                  checked={locationFormData.offers_mobile_services}
                  onCheckedChange={(checked) => setLocationFormData({
                    ...locationFormData,
                    offers_mobile_services: checked as boolean
                  })}
                />
                <Label htmlFor="offersMobile" className="text-sm font-medium text-gray-700">
                  Offers Mobile Services
                </Label>
                <p className="text-xs text-gray-500">Services can be provided at customer locations</p>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isActive"
                  checked={locationFormData.is_active}
                  onCheckedChange={(checked) => setLocationFormData({
                    ...locationFormData,
                    is_active: checked as boolean
                  })}
                />
                <Label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                  Active Location
                </Label>
                <p className="text-xs text-gray-500">Location is currently operational</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-6">
              <Button
                variant="outline"
                onClick={() => setShowLocationModal(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveLocation}
                className="bg-gray-900 hover:bg-gray-800 text-white"
              >
                <MapPin className="w-4 h-4 mr-2" />
                {editingLocation ? 'Update Location' : 'Add Location'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Booking Details Modal */}
      <Dialog open={showBookingDetailsModal} onOpenChange={setShowBookingDetailsModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              Booking Details
            </DialogTitle>
          </DialogHeader>

          {selectedBookingDetails && (
            <div className="space-y-6">
              {/* Service Information */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {selectedBookingDetails.services?.name || "Weight Loss"}
                  </h3>
                  <Badge
                    variant="outline"
                    className={`${getStatusBadge(selectedBookingDetails.booking_status).className} px-3 py-1`}
                  >
                    {getStatusBadge(selectedBookingDetails.booking_status).label}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Date:</span>
                    <span className="ml-2 font-medium">{selectedBookingDetails.booking_date || "8/19/2025"}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Time:</span>
                    <span className="ml-2 font-medium">{selectedBookingDetails.start_time || "12:00:00"}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Amount:</span>
                    <span className="ml-2 font-bold text-lg">${selectedBookingDetails.total_amount || "115"}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Reference:</span>
                    <span className="ml-2 font-mono text-xs">{selectedBookingDetails.reference_number || `BK${Math.random().toString(36).substr(2, 6).toUpperCase()}`}</span>
                  </div>
                </div>
              </div>

              {/* Customer Information */}
              <div className="border rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                  <Users className="w-4 h-4 mr-2" />
                  Customer Information
                </h4>
                <div className="flex items-center space-x-4">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={selectedBookingDetails.customer_profiles?.image_url} />
                    <AvatarFallback className="bg-blue-100 text-blue-700">
                      {selectedBookingDetails.customer_profiles?.first_name?.charAt(0) ||
                       selectedBookingDetails.guest_name?.charAt(0) || "A"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">
                      {selectedBookingDetails.customer_profiles?.first_name && selectedBookingDetails.customer_profiles?.last_name
                        ? `${selectedBookingDetails.customer_profiles.first_name} ${selectedBookingDetails.customer_profiles.last_name}`
                        : selectedBookingDetails.guest_name || "Alan Smith"}
                    </p>
                    <p className="text-sm text-gray-600">
                      {selectedBookingDetails.customer_profiles?.email || "alan.smith@healthness.com"}
                    </p>
                    <p className="text-sm text-gray-600">
                      {selectedBookingDetails.customer_profiles?.phone || selectedBookingDetails.guest_phone || "(555) 123-4567"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Assigned Provider */}
              <div className="border rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                  <Users className="w-4 h-4 mr-2" />
                  Assigned Provider
                </h4>
                <div className="flex items-center space-x-4">
                  <Avatar className="w-12 h-12">
                    <AvatarFallback className="bg-green-100 text-green-700">
                      {selectedBookingDetails.assigned_provider?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">
                      {selectedBookingDetails.assigned_provider || "Unassigned"}
                    </p>
                    <p className="text-sm text-gray-600">
                      {selectedBookingDetails.assigned_provider ? "Service Provider" : "No provider assigned yet"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Location Information */}
              <div className="border rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                  <MapPin className="w-4 h-4 mr-2" />
                  Service Location
                </h4>
                <div className="space-y-2">
                  <p className="font-medium text-gray-900">
                    {selectedBookingDetails.service_location === "customer_location" ? "Customer Location" : "Business Location"}
                  </p>
                  <p className="text-sm text-gray-600">
                    {selectedBookingDetails.service_location === "customer_location"
                      ? "412 Main Street, Santa Rosa, FL 32459"
                      : "123 Office Lane Long SW Unit A, Next Beach..."
                    }
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between pt-4 border-t">
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openMessageFromBooking(selectedBookingDetails.id, selectedBookingDetails.customer_profiles?.id || selectedBookingDetails.guest_name)}
                    className="flex items-center space-x-2"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Message Customer</span>
                  </Button>
                  <Button variant="outline" size="sm" className="flex items-center space-x-2">
                    <Phone className="w-4 h-4" />
                    <span>Call</span>
                  </Button>
                  <Button variant="outline" size="sm" className="flex items-center space-x-2">
                    <MapPin className="w-4 h-4" />
                    <span>Navigate</span>
                  </Button>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setShowBookingDetailsModal(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Service Modal */}
      <Dialog open={showEditServiceModal} onOpenChange={setShowEditServiceModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Business Service</DialogTitle>
            <DialogDescription>
              {editingService?.name}
              <br />
              <span className="text-sm text-gray-500">
                Minimum price: ${editingService?.base_price}
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div>
              <Label htmlFor="business_price">Business Price ($)</Label>
              <Input
                id="business_price"
                type="number"
                step="0.01"
                min={editingService?.base_price || 0}
                value={serviceForm.business_price}
                onChange={(e) => setServiceForm(prev => ({ ...prev, business_price: e.target.value }))}
                className="mt-1"
              />
              <p className="text-sm text-gray-500 mt-1">
                Must be at least ${editingService?.base_price} (service minimum)
              </p>
            </div>

            <div>
              <Label htmlFor="delivery_type">Delivery Type</Label>
              <Select
                value={serviceForm.delivery_type}
                onValueChange={(value) => setServiceForm(prev => ({ ...prev, delivery_type: value }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="business_location">Business Location</SelectItem>
                  <SelectItem value="customer_location">Customer Location</SelectItem>
                  <SelectItem value="both_locations">Both Locations</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowEditServiceModal(false);
                  setEditingService(null);
                }}
              >
                Cancel
              </Button>
              <Button onClick={saveServiceEdits}>
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Availability Editing Modal */}
      <Dialog open={showAvailabilityModal} onOpenChange={setShowAvailabilityModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              Edit Availability Schedule
            </DialogTitle>
            <DialogDescription>
              Configure weekly availability and booking preferences
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Weekly Schedule */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Weekly Schedule</h3>
                {canSetInheritBusinessHours() && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadAndApplyBusinessHours}
                    className="flex items-center space-x-2"
                  >
                    <Building className="w-4 h-4" />
                    <span>Use Business Hours</span>
                  </Button>
                )}
              </div>

              {inheritBusinessHours && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Building className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-900">
                        Schedule inherited from business hours
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setInheritBusinessHours(false)}
                      className="h-7 px-2 text-xs text-blue-600 border-blue-300 hover:bg-blue-100"
                    >
                      Customize
                    </Button>
                  </div>
                  <p className="text-xs text-blue-700 mt-1">
                    Changes to business hours will automatically apply to this provider's availability.
                  </p>
                </div>
              )}

              <div className="space-y-4">
                {Object.entries(availabilityForm).map(([day, config]) => (
                  <div key={day} className="flex items-center space-x-4 p-4 border rounded-lg">
                    <div className="flex items-center space-x-2 w-24">
                      <input
                        type="checkbox"
                        checked={config.enabled}
                        onChange={(e) => setAvailabilityForm(prev => ({
                          ...prev,
                          [day]: { ...prev[day as keyof typeof prev], enabled: e.target.checked }
                        }))}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label className="font-medium text-gray-900 capitalize">
                        {day}
                      </label>
                    </div>

                    {config.enabled && (
                      <>
                        <div className="flex items-center space-x-2">
                          <Label className="text-sm text-gray-600">From:</Label>
                          <Input
                            type="time"
                            value={config.start_time}
                            onChange={(e) => setAvailabilityForm(prev => ({
                              ...prev,
                              [day]: { ...prev[day as keyof typeof prev], start_time: e.target.value }
                            }))}
                            className="w-24"
                          />
                        </div>

                        <div className="flex items-center space-x-2">
                          <Label className="text-sm text-gray-600">To:</Label>
                          <Input
                            type="time"
                            value={config.end_time}
                            onChange={(e) => setAvailabilityForm(prev => ({
                              ...prev,
                              [day]: { ...prev[day as keyof typeof prev], end_time: e.target.value }
                            }))}
                            className="w-24"
                          />
                        </div>

                        <div className="flex items-center space-x-2">
                          <Label className="text-sm text-gray-600">Location:</Label>
                          <select
                            value={config.location_type}
                            onChange={(e) => setAvailabilityForm(prev => ({
                              ...prev,
                              [day]: { ...prev[day as keyof typeof prev], location_type: e.target.value as 'mobile' | 'business' | 'both' }
                            }))}
                            className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="both">Both</option>
                            <option value="business">Business Only</option>
                            <option value="mobile">Mobile Only</option>
                          </select>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Booking Preferences */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Booking Preferences</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="maxBookingsPerDay">Max Bookings Per Day</Label>
                  <Input
                    id="maxBookingsPerDay"
                    type="number"
                    min="1"
                    max="20"
                    value={bookingPreferences.max_bookings_per_day}
                    onChange={(e) => setBookingPreferences(prev => ({
                      ...prev,
                      max_bookings_per_day: parseInt(e.target.value) || 8
                    }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="slotDuration">Slot Duration (minutes)</Label>
                  <select
                    id="slotDuration"
                    value={bookingPreferences.slot_duration_minutes}
                    onChange={(e) => setBookingPreferences(prev => ({
                      ...prev,
                      slot_duration_minutes: parseInt(e.target.value)
                    }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={30}>30 minutes</option>
                    <option value={45}>45 minutes</option>
                    <option value={60}>60 minutes</option>
                    <option value={90}>90 minutes</option>
                    <option value={120}>120 minutes</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bufferTime">Buffer Time (minutes)</Label>
                  <select
                    id="bufferTime"
                    value={bookingPreferences.buffer_time_minutes}
                    onChange={(e) => setBookingPreferences(prev => ({
                      ...prev,
                      buffer_time_minutes: parseInt(e.target.value)
                    }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={0}>No buffer</option>
                    <option value={5}>5 minutes</option>
                    <option value={10}>10 minutes</option>
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="minAdvanceHours">Minimum Advance Booking (hours)</Label>
                  <Input
                    id="minAdvanceHours"
                    type="number"
                    min="0"
                    max="168"
                    value={bookingPreferences.min_advance_hours}
                    onChange={(e) => setBookingPreferences(prev => ({
                      ...prev,
                      min_advance_hours: parseInt(e.target.value) || 2
                    }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cancellationWindow">Cancellation Window (hours)</Label>
                  <Input
                    id="cancellationWindow"
                    type="number"
                    min="0"
                    max="168"
                    value={bookingPreferences.cancellation_window_hours}
                    onChange={(e) => setBookingPreferences(prev => ({
                      ...prev,
                      cancellation_window_hours: parseInt(e.target.value) || 24
                    }))}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="autoAccept"
                    checked={bookingPreferences.auto_accept_bookings}
                    onChange={(e) => setBookingPreferences(prev => ({
                      ...prev,
                      auto_accept_bookings: e.target.checked
                    }))}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <Label htmlFor="autoAccept">Auto-accept bookings</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="allowCancellation"
                    checked={bookingPreferences.allow_cancellation}
                    onChange={(e) => setBookingPreferences(prev => ({
                      ...prev,
                      allow_cancellation: e.target.checked
                    }))}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <Label htmlFor="allowCancellation">Allow customer cancellations</Label>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-6 border-t">
            <Button variant="outline" onClick={() => setShowAvailabilityModal(false)}>
              Cancel
            </Button>
            <Button onClick={saveProviderAvailability}>
              Save Schedule
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
