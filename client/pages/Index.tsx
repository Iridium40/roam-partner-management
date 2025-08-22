import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import ShareModal from "@/components/ShareModal";
import { FavoriteButton } from "@/components/FavoriteButton";
import { AnnouncementPopup } from "@/components/AnnouncementPopup";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MapPin,
  Clock,
  Shield,
  Star,
  Search,
  Calendar,
  Heart,
  Scissors,
  Dumbbell,
  Home,
  Stethoscope,
  Hand,
  Filter,
  Users,
  BookOpen,
  ChevronRight,
  Smartphone,
  Building,
  Video,
  QrCode,
  Share2,
  ChevronLeft,
  TrendingUp,
  Tag,
  Percent,
  X,
  Car,
  Menu,
  Activity,
  Brain,
  Eye,
  Palette,
  Wrench,
  Briefcase,
} from "lucide-react";
import { Link } from "react-router-dom";
import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useFavorites } from "@/hooks/useFavorites";
import { CustomerAuthModal } from "@/components/CustomerAuthModal";
import GoogleOneTap from "@/components/GoogleOneTap";
import { Header } from "@/components/Header";
import { supabase } from "@/lib/supabase";

export default function Index() {
  const { customer, isCustomer, signOut } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedDelivery, setSelectedDelivery] = useState("all");
  const [currentServiceSlide, setCurrentServiceSlide] = useState(0);
  const [currentPopularSlide, setCurrentPopularSlide] = useState(0);
  const [currentPromotionSlide, setCurrentPromotionSlide] = useState(0);
  const [currentBusinessSlide, setCurrentBusinessSlide] = useState(0);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<any>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<"signin" | "signup">(
    "signin",
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<string>>(
    new Set(),
  );

  // Database-driven state
  const [featuredServices, setFeaturedServices] = useState<any[]>([]);
  const [popularServices, setPopularServices] = useState<any[]>([]);
  const [featuredBusinesses, setFeaturedBusinesses] = useState<any[]>([]);
  const [promotions, setPromotions] = useState<any[]>([]);

  // Category icon mapping function
  const getCategoryIcon = (category: string) => {
    const cat = category.toLowerCase();

    if (
      cat.includes("healthcare") ||
      cat.includes("medical") ||
      cat.includes("health")
    ) {
      return Stethoscope;
    }
    if (
      cat.includes("beauty") ||
      cat.includes("wellness") ||
      cat.includes("spa")
    ) {
      return Scissors;
    }
    if (
      cat.includes("fitness") ||
      cat.includes("gym") ||
      cat.includes("workout")
    ) {
      return Dumbbell;
    }
    if (
      cat.includes("home") ||
      cat.includes("cleaning") ||
      cat.includes("repair")
    ) {
      return Home;
    }
    if (cat.includes("business") || cat.includes("professional")) {
      return Briefcase;
    }
    if (cat.includes("automotive") || cat.includes("car")) {
      return Car;
    }
    if (cat.includes("technology") || cat.includes("tech")) {
      return Smartphone;
    }

    // Default icon
    return Building;
  };

  // Category color mapping function - consistent with filter cards
  const getCategoryColor = (category: string) => {
    const cat = category.toLowerCase();

    if (
      cat.includes("beauty") ||
      cat.includes("wellness") ||
      cat.includes("spa")
    ) {
      return "bg-gradient-to-r from-pink-500 to-rose-500";
    }
    if (
      cat.includes("fitness") ||
      cat.includes("gym") ||
      cat.includes("workout")
    ) {
      return "bg-gradient-to-r from-orange-500 to-red-500";
    }
    if (
      cat.includes("therapy") ||
      cat.includes("therapeutic") ||
      cat.includes("massage")
    ) {
      return "bg-gradient-to-r from-green-500 to-emerald-500";
    }
    if (
      cat.includes("healthcare") ||
      cat.includes("medical") ||
      cat.includes("health")
    ) {
      return "bg-gradient-to-r from-blue-500 to-cyan-500";
    }

    // Default gradient
    return "bg-gradient-to-r from-gray-500 to-gray-600";
  };
  const [loading, setLoading] = useState(true);

  const handleBusinessShare = (business: any) => {
    setSelectedProvider(business);
    setShareModalOpen(true);
  };

  const handleSignIn = () => {
    setAuthModalTab("signin");
    setAuthModalOpen(true);
  };

  const handleSignUp = () => {
    setAuthModalTab("signup");
    setAuthModalOpen(true);
  };

  const handleMyBookings = () => {
    if (isCustomer) {
      // Navigate to my bookings
      window.location.href = "/my-bookings";
    } else {
      // Show sign in modal
      handleSignIn();
    }
  };

  const toggleDescription = (serviceId: string) => {
    setExpandedDescriptions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(serviceId)) {
        newSet.delete(serviceId);
      } else {
        newSet.add(serviceId);
      }
      return newSet;
    });
  };

  const getDisplayDescription = (description: string, serviceId: string) => {
    const isExpanded = expandedDescriptions.has(serviceId);
    if (description.length <= 200 || isExpanded) {
      return description;
    }
    return description.substring(0, 200) + "...";
  };

  const formatSavings = (promotion: any) => {
    if (!promotion.savingsType || !promotion.savingsAmount) return null;

    if (promotion.savingsType === "percentage") {
      const maxAmount = promotion.savingsMaxAmount
        ? ` (max $${promotion.savingsMaxAmount})`
        : "";
      return `${promotion.savingsAmount}% OFF${maxAmount}`;
    } else if (promotion.savingsType === "fixed_amount") {
      return `$${promotion.savingsAmount} OFF`;
    }

    return null;
  };

  // Fetch real data from Supabase
  useEffect(() => {
    const fetchData = async (retryCount = 0) => {
      try {
        setLoading(true);

        // Fetch featured services using is_featured flag
        const featuredServicesResponse = await supabase
          .from("services")
          .select(
            `
            id,
            name,
            description,
            min_price,
            duration_minutes,
            image_url,
            is_active,
            is_featured,
            service_subcategories!inner (
              id,
              service_subcategory_type,
              description,
              service_categories!inner (
                id,
                service_category_type
              )
            )
          `,
          )
          .eq("is_active", true)
          .eq("is_featured", true);

        const { data: featuredServicesData, error: featuredError } =
          featuredServicesResponse;

        console.log("Featured services query result:", {
          featuredServicesData,
          featuredError,
        });

        if (!featuredError && featuredServicesData) {
          const transformedFeatured = featuredServicesData.map(
            (service: any) => ({
              id: service.id,
              title: service.name,
              category:
                service.service_subcategories?.service_categories
                  ?.service_category_type || "General",
              image:
                service.image_url ||
                "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=500&h=300&fit=crop",
              description:
                service.description || "Professional featured service",
              price: `$${service.min_price || 50}`,
              rating: 4.8, // Default rating
              duration: `${service.duration_minutes || 60} min`,
            }),
          );
          console.log("Transformed featured services:", transformedFeatured);
          setFeaturedServices(transformedFeatured);
        }

        // Fetch popular services using is_popular flag
        const popularServicesResponse = await supabase
          .from("services")
          .select(
            `
            id,
            name,
            description,
            min_price,
            duration_minutes,
            image_url,
            is_active,
            is_popular,
            service_subcategories!inner (
              id,
              service_subcategory_type,
              description,
              service_categories!inner (
                id,
                service_category_type
              )
            )
          `,
          )
          .eq("is_active", true)
          .eq("is_popular", true)
          .limit(6);

        const { data: popularServicesData, error: popularError } =
          popularServicesResponse;

        console.log("Popular services query result:", {
          popularServicesData,
          popularError,
        });

        if (!popularError && popularServicesData) {
          const transformedPopular = popularServicesData.map(
            (service: any) => ({
              id: service.id,
              title: service.name,
              category:
                service.service_subcategories?.service_categories
                  ?.service_category_type || "General",
              image:
                service.image_url ||
                "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=500&h=300&fit=crop",
              description:
                service.description || "Popular professional service",
              price: `$${service.min_price || 50}`,
              rating: 4.9, // Default rating
              duration: `${service.duration_minutes || 60} min`,
              bookings: `${Math.floor(Math.random() * 50) + 10} bookings this month`, // Dynamic booking count
              availability: `${Math.floor(Math.random() * 8) + 1} slots available`, // Dynamic availability
            }),
          );
          console.log("Transformed popular services:", transformedPopular);
          setPopularServices(transformedPopular);
        }

        // Fetch featured businesses
        const businessesResponse = await supabase
          .from("business_profiles")
          .select(
            `
            id,
            business_name,
            business_type,
            logo_url,
            image_url,
            cover_image_url,
            verification_status,
            service_categories,
            is_active,
            is_featured,
            business_locations (
              location_name,
              city,
              state
            )
          `,
          )
          .eq("is_featured", true)
          .limit(12);

        const { data: businessesData, error: businessesError } =
          businessesResponse;

        // Check for authentication errors
        const authErrors = [
          featuredServicesResponse,
          popularServicesResponse,
          businessesResponse,
        ].filter((response) => response.status === 401);

        if (authErrors.length > 0 && retryCount === 0) {
          console.log("JWT token expired, refreshing session...");
          const { data: refreshData, error: refreshError } =
            await supabase.auth.refreshSession();

          if (refreshError) {
            console.error("Token refresh failed:", refreshError);
            // For the index page, we can continue without authentication
            console.log("Continuing without authentication for public content");
          } else if (refreshData?.session) {
            console.log("Session refreshed successfully, retrying...");
            return await fetchData(1);
          }
        }

        console.log("Featured businesses query result:", {
          businessesData,
          businessesError,
        });

        if (!businessesError && businessesData) {
          const transformedBusinesses = businessesData.map((business: any) => ({
            id: business.id,
            name: business.business_name,
            description: `Professional ${business.business_type.replace("_", " ")} services`,
            type: business.business_type,
            rating: 4.8, // Default rating
            reviews: Math.floor(Math.random() * 200) + 50, // Random review count
            deliveryTypes: ["mobile", "business_location", "virtual"],
            price: "Starting at $100",
            image:
              business.logo_url ||
              business.image_url ||
              "/api/placeholder/80/80",
            cover_image_url: business.cover_image_url,
            specialties: business.service_categories || [
              "Professional Service",
              "Quality Care",
              "Experienced",
            ],
            location: business.business_locations?.city
              ? `${business.business_locations.city}, ${business.business_locations.state}`
              : "Florida",
            verification_status: business.verification_status,
            is_featured: business.is_featured,
            years_in_business: 5, // Default years
          }));
          console.log(
            "Transformed featured businesses:",
            transformedBusinesses,
          );
          setFeaturedBusinesses(transformedBusinesses);
        }

        // Fetch active promotions with business and service information
        const promotionsResponse = await supabase
          .from("promotions")
          .select(
            `
            id,
            title,
            description,
            start_date,
            end_date,
            is_active,
            created_at,
            business_id,
            image_url,
            promo_code,
            savings_type,
            savings_amount,
            savings_max_amount,
            service_id,
            business_profiles (
              id,
              business_name,
              logo_url,
              business_type
            ),
            services (
              id,
              name,
              min_price
            )
          `,
          )
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(6);

        const { data: promotionsData, error: promotionsError } =
          promotionsResponse;

        if (!promotionsError && promotionsData) {
          const currentDate = new Date();
          currentDate.setHours(0, 0, 0, 0); // Set to start of day for accurate comparison

          const transformedPromotions = promotionsData
            .filter((promotion: any) => {
              // Filter out promotions with expired end dates
              if (promotion.end_date) {
                const endDate = new Date(promotion.end_date);
                endDate.setHours(23, 59, 59, 999); // Set to end of day
                return endDate >= currentDate;
              }
              // Keep promotions without end dates (ongoing promotions)
              return true;
            })
            .map((promotion: any) => ({
              id: promotion.id,
              title: promotion.title,
              description: promotion.description || "Limited time offer",
              startDate: promotion.start_date,
              endDate: promotion.end_date,
              isActive: promotion.is_active,
              createdAt: promotion.created_at,
              businessId: promotion.business_id,
              imageUrl: promotion.image_url,
              promoCode: promotion.promo_code,
              savingsType: promotion.savings_type,
              savingsAmount: promotion.savings_amount,
              savingsMaxAmount: promotion.savings_max_amount,
              serviceId: promotion.service_id,
              business: promotion.business_profiles
                ? {
                    id: promotion.business_profiles.id,
                    name: promotion.business_profiles.business_name,
                    logo: promotion.business_profiles.logo_url,
                    type: promotion.business_profiles.business_type,
                  }
                : null,
              service: promotion.services
                ? {
                    id: promotion.services.id,
                    name: promotion.services.name,
                    minPrice: promotion.services.min_price,
                  }
                : null,
            }));
          console.log(
            "Transformed promotions (expired filtered):",
            transformedPromotions,
          );

          setPromotions(transformedPromotions);
        }
      } catch (error: any) {
        console.error("Error fetching data:", error);

        // Check if this is a JWT expiration error and we haven't retried yet
        if (
          (error.message?.includes("JWT") ||
            error.message?.includes("401") ||
            error.status === 401) &&
          retryCount === 0
        ) {
          console.log("JWT error detected, attempting token refresh...");
          try {
            const { data: refreshData, error: refreshError } =
              await supabase.auth.refreshSession();

            if (!refreshError && refreshData?.session) {
              console.log("Session refreshed, retrying data fetch...");
              return await fetchData(1);
            }
          } catch (refreshError) {
            console.error("Token refresh failed:", refreshError);
          }

          // For index page, continue even if refresh fails since it has public content
          console.log("Continuing with public content after auth error");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const serviceCategories = [
    {
      id: "beauty",
      icon: Scissors,
      name: "Beauty & Wellness",
      count: "150+ providers",
      color: "from-pink-500 to-rose-500",
      description: "Hair, nails, skincare, and beauty treatments",
    },
    {
      id: "fitness",
      icon: Dumbbell,
      name: "Fitness",
      count: "80+ trainers",
      color: "from-orange-500 to-red-500",
      description: "Personal trainers, yoga, and fitness coaching",
    },
    {
      id: "therapy",
      icon: Hand,
      name: "Therapy",
      count: "120+ therapists",
      color: "from-green-500 to-emerald-500",
      description: "Therapeutic massage and bodywork",
    },
    {
      id: "healthcare",
      icon: Stethoscope,
      name: "Healthcare",
      count: "90+ specialists",
      color: "from-blue-500 to-cyan-500",
      description: "Medical services and health consultations",
    },
  ];

  // Use real promotions data from database
  const promotionalDeals = promotions;

  const deliveryIcons = {
    mobile: Car,
    business: Building,
    virtual: Video,
  };

  const getDeliveryBadge = (type: string) => {
    const config = {
      mobile: { label: "Mobile", color: "bg-green-100 text-green-800" },
      business: { label: "Business", color: "bg-blue-100 text-blue-800" },
      virtual: { label: "Virtual", color: "bg-purple-100 text-purple-800" },
    };
    return (
      config[type as keyof typeof config] || {
        label: type,
        color: "bg-gray-100 text-gray-800",
      }
    );
  };

  // Category mapping for filtering services - maps UI category IDs to database service_category_type enum values
  const categoryMapping = {
    beauty: ["beauty"],
    fitness: ["fitness"],
    therapy: ["therapy"],
    healthcare: ["healthcare"],
  };

  // Filter services based on selected category, search query, and delivery type
  const getFilteredServices = (services: any[]) => {
    return services.filter((service: any) => {
      // Category filter
      let categoryMatch = true;
      if (selectedCategory !== "all") {
        const categoryKeywords =
          categoryMapping[selectedCategory as keyof typeof categoryMapping] ||
          [];
        const serviceCategory = service.category?.toLowerCase() || "";
        const serviceTitle = service.title?.toLowerCase() || "";

        categoryMatch = categoryKeywords.some(
          (keyword) =>
            serviceCategory.includes(keyword.toLowerCase()) ||
            serviceTitle.includes(keyword.toLowerCase()),
        );
      }

      // Search query filter
      let searchMatch = true;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const serviceTitle = service.title?.toLowerCase() || "";
        const serviceCategory = service.category?.toLowerCase() || "";
        const serviceDescription = service.description?.toLowerCase() || "";

        searchMatch =
          serviceTitle.includes(query) ||
          serviceCategory.includes(query) ||
          serviceDescription.includes(query);
      }

      // Delivery type filter (services don't have delivery type data in current structure)
      // This would need to be added to service data structure to work properly
      let deliveryMatch = true;
      if (selectedDelivery !== "all") {
        // For now, we'll assume all services support all delivery types
        // In a real implementation, this would check service.deliveryTypes array
        deliveryMatch = true;
      }

      return categoryMatch && searchMatch && deliveryMatch;
    });
  };

  // Get filtered services
  const filteredFeaturedServices = getFilteredServices(featuredServices);
  const filteredPopularServices = getFilteredServices(popularServices);

  // Handle category selection
  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setCurrentServiceSlide(0); // Reset carousel to first slide when category changes
  };

  // Reset carousel when filters change
  useEffect(() => {
    setCurrentServiceSlide(0);
  }, [selectedCategory, searchQuery, selectedDelivery]);

  // Featured Services: paginate into pages of 2 for desktop, 1 for mobile
  const servicePages = useMemo(() => {
    const pages: any[][] = [];
    // Always paginate by 2 cards per page (will show 1 on mobile, 2 on desktop)
    for (let i = 0; i < filteredFeaturedServices.length; i += 2) {
      pages.push(filteredFeaturedServices.slice(i, i + 2));
    }
    return pages;
  }, [filteredFeaturedServices]);

  const nextServiceSlide = () => {
    const maxPage = Math.max(0, servicePages.length - 1);
    setCurrentServiceSlide((prev) => Math.min(prev + 1, maxPage));
  };

  const prevServiceSlide = () => {
    setCurrentServiceSlide((prev) => Math.max(prev - 1, 0));
  };

  // Most Popular Services: paginate into pages of 3
  const popularPages = useMemo(() => {
    const pages: any[][] = [];
    for (let i = 0; i < filteredPopularServices.length; i += 2) {
      pages.push(filteredPopularServices.slice(i, i + 2));
    }
    return pages;
  }, [filteredPopularServices]);

  const nextPopularSlide = () => {
    const maxPage = Math.max(0, popularPages.length - 1);
    setCurrentPopularSlide((prev) => Math.min(prev + 1, maxPage));
  };

  const prevPopularSlide = () => {
    setCurrentPopularSlide((prev) => Math.max(prev - 1, 0));
  };

  // Old promotions pagination logic (kept for existing database promotions if needed)
  const promotionPages = useMemo(() => {
    const pages: any[][] = [];
    for (let i = 0; i < promotionalDeals.length; i += 3) {
      pages.push(promotionalDeals.slice(i, i + 3));
    }
    return pages;
  }, [promotionalDeals]);

  const nextPromotionSlide = () => {
    const maxSlide = Math.max(0, promotionalDeals.length - 1);
    setCurrentPromotionSlide((prev) => Math.min(prev + 1, maxSlide));
  };

  const prevPromotionSlide = () => {
    setCurrentPromotionSlide((prev) => Math.max(prev - 1, 0));
  };

  const nextBusinessSlide = () => {
    const maxPage = Math.max(0, businessPages.length - 1);
    setCurrentBusinessSlide((prev) => Math.min(prev + 1, maxPage));
  };

  const prevBusinessSlide = () => {
    setCurrentBusinessSlide((prev) => Math.max(prev - 1, 0));
  };

  const filteredBusinesses = featuredBusinesses.filter((business) => {
    const matchesSearch =
      searchQuery === "" ||
      business.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      business.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      business.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      business.specialties.some((s) =>
        s.toLowerCase().includes(searchQuery.toLowerCase()),
      );

    const matchesCategory =
      selectedCategory === "all" ||
      business.type.toLowerCase().includes(selectedCategory) ||
      business.specialties.some((s) =>
        s.toLowerCase().includes(selectedCategory),
      );
    const matchesDelivery =
      selectedDelivery === "all" ||
      business.deliveryTypes.includes(selectedDelivery);

    return matchesSearch && matchesCategory && matchesDelivery;
  });

  // Featured Businesses: paginate into pages of 3
  const businessPages = useMemo(() => {
    const pages: any[][] = [];
    for (let i = 0; i < filteredBusinesses.length; i += 3) {
      pages.push(filteredBusinesses.slice(i, i + 3));
    }
    return pages;
  }, [filteredBusinesses]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-roam-light-blue/10">
      {/* Announcement Popup */}
      <AnnouncementPopup isCustomer={isCustomer} />
      {/* Google One Tap - only show when not authenticated */}
      {/* Google One Tap - enabled for Google OAuth */}
      {!isCustomer && import.meta.env.VITE_GOOGLE_CLIENT_ID && (
        <GoogleOneTap
          clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}
          onSuccess={() => {
            console.log("Google One Tap sign-in successful");
          }}
          onError={(error) => {
            console.error("Google One Tap error:", error);
          }}
        />
      )}
      <Header />

      {/* Hero Section with Search */}
      <section className="py-20 lg:py-32 relative overflow-hidden">
        {/* Background Video */}
        <div className="absolute inset-0 w-full h-full overflow-hidden">
          <iframe
            src="https://www.youtube.com/embed/Z0A84Ev5Waw?autoplay=1&mute=1&loop=1&playlist=Z0A84Ev5Waw&controls=0&showinfo=0&rel=0&modestbranding=1&playsinline=1&vq=hd1080"
            className="absolute inset-0 w-full h-full"
            style={{
              filter: "brightness(0.7)",
              pointerEvents: "none",
              width: "100vw",
              height: "100vh",
              objectFit: "cover",
              objectPosition: "center",
              transform: "scale(1.1)",
            }}
            frameBorder="0"
            allow="autoplay; encrypted-media"
            title="Background Video"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-roam-blue/10 via-black/5 to-roam-yellow/10 pointer-events-none"></div>
        </div>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-4xl mx-auto text-center mb-12">
            <div className="mb-6">
              <img
                src="https://cdn.builder.io/api/v1/image/assets%2Fa42b6f9ec53e4654a92af75aad56d14f%2F98c77fcac42745ca81f9db3fb7f4e366?format=webp&width=800"
                alt="ROAM Logo"
                className="mx-auto h-24 sm:h-32 lg:h-40 w-auto drop-shadow-lg"
              />
            </div>
            <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto leading-relaxed drop-shadow-md">
              Florida's premier on-demand services marketplace. Connecting
              customers with verified professionals for premium services
              delivered anywhere.
            </p>
            <div className="flex justify-center">
              <div className="inline-flex items-center gap-3 bg-gradient-to-r from-roam-blue/20 via-roam-light-blue/20 to-roam-yellow/20 px-6 py-2 rounded-full backdrop-blur-sm border border-white/20">
                <div className="w-2 h-2 rounded-full bg-white animate-pulse"></div>
                <span className="text-sm font-medium text-white uppercase tracking-wider">
                  Discover Services
                </span>
                <div className="w-2 h-2 rounded-full bg-roam-yellow animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Service Categories */}
      <section className="py-12 bg-background/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Elegant Header Section */}
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Browse by{" "}
              <span className="bg-gradient-to-r from-roam-blue to-roam-light-blue bg-clip-text text-transparent">
                Category
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Find the perfect service for your needs from our curated selection
              of professional providers
            </p>
          </div>

          {/* Mobile Category Dropdown - Enhanced */}
          <div className="md:hidden mb-12">
            <div className="relative">
              <Select
                value={selectedCategory}
                onValueChange={handleCategorySelect}
              >
                <SelectTrigger className="w-full h-16 bg-white border-0 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300 ring-1 ring-gray-100 focus:ring-2 focus:ring-roam-blue/50">
                  <div className="flex items-center gap-4 px-2">
                    <div className="w-12 h-12 bg-gradient-to-br from-roam-blue to-roam-light-blue rounded-2xl flex items-center justify-center flex-shrink-0">
                      {selectedCategory === "all" ? (
                        <Filter className="w-6 h-6 text-white" />
                      ) : (
                        serviceCategories.find(
                          (cat) => cat.id === selectedCategory,
                        )?.icon && (
                          <div className="w-6 h-6 flex items-center justify-center">
                            {React.createElement(
                              serviceCategories.find(
                                (cat) => cat.id === selectedCategory,
                              )!.icon,
                              { className: "w-6 h-6 text-white" },
                            )}
                          </div>
                        )
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-semibold text-gray-900 text-lg">
                        {selectedCategory === "all"
                          ? "All Categories"
                          : serviceCategories.find(
                              (cat) => cat.id === selectedCategory,
                            )?.name ||
                            (selectedCategory === "therapy"
                              ? "Therapy"
                              : selectedCategory === "fitness"
                                ? "Fitness"
                                : selectedCategory === "beauty"
                                  ? "Beauty"
                                  : selectedCategory)}
                      </div>
                      <div className="text-sm text-gray-500">
                        Tap to change category
                      </div>
                    </div>
                  </div>
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-0 shadow-2xl">
                  <SelectItem value="all" className="rounded-xl m-1">
                    <div className="flex items-center gap-3 py-2">
                      <div className="w-10 h-10 bg-gradient-to-br from-gray-500 to-gray-600 rounded-xl flex items-center justify-center">
                        <Filter className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <div className="font-medium">All Categories</div>
                        <div className="text-xs text-gray-500">
                          Browse everything
                        </div>
                      </div>
                    </div>
                  </SelectItem>
                  {serviceCategories.map((category) => (
                    <SelectItem
                      key={category.id}
                      value={category.id}
                      className="rounded-xl m-1"
                    >
                      <div className="flex items-center gap-3 py-2">
                        <div
                          className={`w-10 h-10 bg-gradient-to-br ${category.color} rounded-xl flex items-center justify-center`}
                        >
                          <category.icon className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <div className="font-medium">
                            {category.id === "therapy"
                              ? "Therapy"
                              : category.id === "fitness"
                                ? "Fitness"
                                : category.id === "beauty"
                                  ? "Beauty"
                                  : category.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {category.description}
                          </div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Desktop Category Cards - Enhanced */}
          <div className="hidden md:grid grid-cols-2 lg:grid-cols-5 gap-8 mb-16">
            {/* All Categories Option */}
            <div
              className={`group cursor-pointer transition-all duration-500 hover:-translate-y-4 ${
                selectedCategory === "all" ? "scale-105" : ""
              }`}
              onClick={() => handleCategorySelect("all")}
            >
              <div
                className={`relative overflow-hidden rounded-3xl bg-white shadow-xl hover:shadow-2xl transition-all duration-500 ${
                  selectedCategory === "all"
                    ? "ring-4 ring-roam-blue/30 bg-gradient-to-br from-roam-blue/5 to-roam-light-blue/5"
                    : ""
                }`}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-gray-500/10 via-transparent to-gray-600/5"></div>
                <div className="relative p-8 text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-gray-500 to-gray-600 rounded-3xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-lg">
                    <Filter className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-lg font-bold mb-3 text-gray-900 group-hover:text-roam-blue transition-colors">
                    All Categories
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Browse all available services
                  </p>
                  {selectedCategory === "all" && (
                    <div className="absolute top-4 right-4">
                      <div className="w-3 h-3 bg-roam-blue rounded-full"></div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {serviceCategories.map((category) => (
              <div
                key={category.id}
                className={`group cursor-pointer transition-all duration-500 hover:-translate-y-4 ${
                  selectedCategory === category.id ? "scale-105" : ""
                }`}
                onClick={() => handleCategorySelect(category.id)}
              >
                <div
                  className={`relative overflow-hidden rounded-3xl bg-white shadow-xl hover:shadow-2xl transition-all duration-500 ${
                    selectedCategory === category.id
                      ? "ring-4 ring-roam-blue/30 bg-gradient-to-br from-roam-blue/5 to-roam-light-blue/5"
                      : ""
                  }`}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-transparent opacity-50"></div>
                  <div className="relative p-8 text-center">
                    <div
                      className={`w-20 h-20 bg-gradient-to-br ${category.color} rounded-3xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-lg`}
                    >
                      <category.icon className="w-10 h-10 text-white" />
                    </div>
                    <h3 className="text-lg font-bold mb-3 text-gray-900 group-hover:text-roam-blue transition-colors">
                      {category.id === "therapy"
                        ? "Therapy"
                        : category.id === "fitness"
                          ? "Fitness"
                          : category.id === "beauty"
                            ? "Beauty"
                            : category.name}
                    </h3>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {category.description}
                    </p>
                    {selectedCategory === category.id && (
                      <div className="absolute top-4 right-4">
                        <div className="w-3 h-3 bg-roam-blue rounded-full"></div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Enhanced Search and Filter Section */}
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  Find Your Perfect Service
                </h3>
                <p className="text-gray-600">
                  Search and filter to discover exactly what you need
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Enhanced Search Input */}
                <div className="md:col-span-2">
                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-roam-blue/20 to-roam-light-blue/20 rounded-2xl blur-sm group-focus-within:blur-0 transition-all duration-300"></div>
                    <div className="relative bg-white rounded-2xl border border-gray-200 group-focus-within:border-roam-blue/50 transition-all duration-300">
                      <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 group-focus-within:text-roam-blue transition-colors" />
                      <Input
                        type="search"
                        placeholder="Search for services, treatments, or providers..."
                        className="pl-12 pr-4 h-14 border-0 rounded-2xl text-lg placeholder:text-gray-400 focus:ring-0 focus:border-0 bg-transparent"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Enhanced Delivery Type Filter */}
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-roam-yellow/20 to-roam-light-blue/20 rounded-2xl blur-sm group-focus-within:blur-0 transition-all duration-300"></div>
                  <div className="relative">
                    <Select
                      value={selectedDelivery}
                      onValueChange={setSelectedDelivery}
                    >
                      <SelectTrigger className="h-14 border-0 rounded-2xl bg-white border border-gray-200 group-focus-within:border-roam-blue/50 transition-all text-lg">
                        <SelectValue placeholder="Delivery Type" />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-0 shadow-2xl">
                        <SelectItem value="all" className="rounded-xl m-1">
                          <div className="flex items-center gap-3 py-2">
                            <div className="w-10 h-10 bg-gradient-to-br from-gray-500 to-gray-600 rounded-xl flex items-center justify-center">
                              <Filter className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <div className="font-medium">All Types</div>
                              <div className="text-xs text-gray-500">
                                Any delivery method
                              </div>
                            </div>
                          </div>
                        </SelectItem>
                        <SelectItem value="mobile" className="rounded-xl m-1">
                          <div className="flex items-center gap-3 py-2">
                            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                              <Car className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <div className="font-medium">Mobile</div>
                              <div className="text-xs text-gray-500">
                                Provider comes to you
                              </div>
                            </div>
                          </div>
                        </SelectItem>
                        <SelectItem value="business" className="rounded-xl m-1">
                          <div className="flex items-center gap-3 py-2">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                              <Building className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <div className="font-medium">Business</div>
                              <div className="text-xs text-gray-500">
                                Visit business location
                              </div>
                            </div>
                          </div>
                        </SelectItem>
                        <SelectItem value="virtual" className="rounded-xl m-1">
                          <div className="flex items-center gap-3 py-2">
                            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                              <Video className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <div className="font-medium">Virtual</div>
                              <div className="text-xs text-gray-500">
                                Online consultation
                              </div>
                            </div>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Enhanced Active Filters Display */}
              {(selectedCategory !== "all" ||
                selectedDelivery !== "all" ||
                searchQuery) && (
                <div className="mt-8 p-6 bg-gradient-to-r from-roam-blue/5 to-roam-light-blue/5 rounded-2xl border border-roam-blue/10">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Filter className="w-4 h-4 text-roam-blue" />
                      Active filters:
                    </span>
                    {selectedCategory !== "all" && (
                      <Badge
                        variant="secondary"
                        className="bg-roam-blue text-white cursor-pointer hover:bg-roam-blue/90 px-4 py-2 rounded-full font-medium transition-all hover:scale-105"
                        onClick={() => handleCategorySelect("all")}
                      >
                        {serviceCategories.find(
                          (cat) => cat.id === selectedCategory,
                        )?.name || selectedCategory}
                        <X className="w-4 h-4 ml-2" />
                      </Badge>
                    )}
                    {selectedDelivery !== "all" && (
                      <Badge
                        variant="secondary"
                        className="bg-roam-light-blue text-white cursor-pointer hover:bg-roam-light-blue/90 px-4 py-2 rounded-full font-medium transition-all hover:scale-105"
                        onClick={() => setSelectedDelivery("all")}
                      >
                        {selectedDelivery === "mobile"
                          ? "Mobile"
                          : selectedDelivery === "business"
                            ? "Business"
                            : selectedDelivery === "virtual"
                              ? "Virtual"
                              : selectedDelivery}
                        <X className="w-4 h-4 ml-2" />
                      </Badge>
                    )}
                    {searchQuery && (
                      <Badge
                        variant="secondary"
                        className="bg-roam-yellow text-gray-900 cursor-pointer hover:bg-roam-yellow/90 px-4 py-2 rounded-full font-medium transition-all hover:scale-105"
                        onClick={() => setSearchQuery("")}
                      >
                        "{searchQuery}"
                        <X className="w-4 h-4 ml-2" />
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-gray-600 hover:text-roam-blue hover:bg-white/50 px-4 py-2 rounded-full font-medium transition-all"
                      onClick={() => {
                        setSelectedCategory("all");
                        setSelectedDelivery("all");
                        setSearchQuery("");
                      }}
                    >
                      Clear all filters
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Featured Services Carousel */}
      <section className="py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold">
              Featured <span className="text-roam-blue">Services</span>
            </h2>
            <p className="text-lg text-foreground/70 mt-4">
              Discover our most popular and highly-rated services
            </p>
          </div>

          {filteredFeaturedServices.length > 0 ? (
            <div className="relative overflow-hidden">
              {/* Navigation Arrows */}
              {filteredFeaturedServices.length > 1 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={prevServiceSlide}
                    disabled={currentServiceSlide === 0}
                    className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-white/90 border-roam-blue text-roam-blue hover:bg-roam-blue hover:text-white shadow-lg disabled:opacity-50"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={nextServiceSlide}
                    disabled={
                      currentServiceSlide >= filteredFeaturedServices.length - 1
                    }
                    className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-white/90 border-roam-blue text-roam-blue hover:bg-roam-blue hover:text-white shadow-lg disabled:opacity-50"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </>
              )}
              <div className="overflow-hidden">
                <div
                  className="flex transition-transform duration-300 ease-in-out"
                  style={{
                    transform: `translateX(-${currentServiceSlide * 100}%)`,
                  }}
                >
                  {filteredFeaturedServices.map((service, serviceIndex) => (
                    <div
                      key={`service-${service.id}`}
                      className="w-full flex-none px-4"
                    >
                      <Card
                        key={service.id}
                        className="hover:shadow-xl transition-all duration-300 cursor-pointer border-border/50 hover:border-roam-light-blue/50 overflow-hidden w-full"
                      >
                        <div className="relative h-64">
                          <img
                            src={service.image}
                            alt={service.title}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-4 left-4">
                            <Badge
                              className={`${getCategoryColor(service.category)} text-white border-0`}
                              icon={getCategoryIcon(service.category)}
                            >
                              {service.category}
                            </Badge>
                          </div>
                          <div className="absolute top-4 right-4 flex gap-2">
                            <FavoriteButton
                              type="service"
                              itemId={service.id}
                              size="sm"
                              variant="ghost"
                              className="bg-white/90 hover:bg-white"
                            />
                            <Badge
                              variant="secondary"
                              className="bg-white/90 text-gray-800"
                            >
                              <Star className="w-3 h-3 mr-1 text-roam-warning fill-current" />
                              {service.rating}
                            </Badge>
                          </div>
                        </div>
                        <CardContent className="p-6">
                          <h3 className="text-xl font-semibold mb-2">
                            {service.title}
                          </h3>
                          <div className="mb-4">
                            <p className="text-foreground/70">
                              {getDisplayDescription(
                                service.description,
                                service.id,
                              )}
                            </p>
                            {service.description.length > 200 && (
                              <button
                                onClick={() => toggleDescription(service.id)}
                                className="md:hidden text-roam-blue text-sm font-medium hover:underline mt-1"
                              >
                                {expandedDescriptions.has(service.id)
                                  ? "Show less"
                                  : "Read more"}
                              </button>
                            )}
                          </div>
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                              <span className="text-2xl font-bold text-roam-blue">
                                Starting at {service.price}
                              </span>
                            </div>
                            <Badge
                              variant="outline"
                              className="border-roam-blue text-roam-blue"
                            >
                              {service.duration}
                            </Badge>
                          </div>
                          <Button
                            asChild
                            className="w-full bg-roam-blue hover:bg-roam-blue/90"
                          >
                            <Link to={`/book-service/${service.id}`}>
                              <Calendar className="w-4 h-4 mr-2" />
                              Book This Service
                            </Link>
                          </Button>
                        </CardContent>
                      </Card>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                No Featured Services Found
              </h3>
              <p className="text-foreground/60 mb-4">
                No featured services match the selected category. Try selecting
                a different category.
              </p>
              <Button
                onClick={() => handleCategorySelect("all")}
                variant="outline"
                className="border-roam-blue text-roam-blue hover:bg-roam-blue hover:text-white"
              >
                View All Services
              </Button>
            </div>
          )}

          {/* Carousel indicators - only show when there are multiple pages */}
          {servicePages.length > 1 && (
            <div className="flex justify-center mt-6 gap-2">
              {servicePages.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentServiceSlide(index)}
                  className={`w-3 h-3 rounded-full transition-colors ${
                    index === currentServiceSlide
                      ? "bg-roam-blue"
                      : "bg-gray-300"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Special Promotions */}
      <section className="py-12 bg-background/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-4">
              <span className="text-roam-blue">Special</span>&nbsp;Promotions
            </h2>
            <p className="text-lg text-foreground/70">
              Limited-time offers on your favorite services
            </p>
          </div>

          {promotionalDeals.length > 0 ? (
            <div className="relative">
              {/* Navigation Arrows */}
              {promotionPages.length > 1 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={prevPromotionSlide}
                    disabled={currentPromotionSlide === 0}
                    className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-white/90 border-roam-blue text-roam-blue hover:bg-roam-blue hover:text-white shadow-lg disabled:opacity-50"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={nextPromotionSlide}
                    disabled={currentPromotionSlide >= promotionPages.length - 1}
                    className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-white/90 border-roam-blue text-roam-blue hover:text-white shadow-lg disabled:opacity-50"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </>
              )}
              <div className="overflow-hidden">
                <div
                  className="flex transition-transform duration-300 ease-in-out"
                  style={{
                    transform: `translateX(-${currentPromotionSlide * 100}%)`,
                  }}
                >
                  {promotionPages.map((page, pageIndex) => (
                    <div
                      key={`promotion-page-${pageIndex}`}
                      className="flex gap-6 w-full flex-none px-4"
                    >
                      {page.map((promotion) => (
                        <Card
                          key={promotion.id}
                          className="group hover:shadow-2xl transition-all duration-500 hover:-translate-y-3 border-0 shadow-xl bg-white overflow-hidden rounded-3xl flex-shrink-0 w-full md:w-[calc(50%-12px)]"
                        >
                          {/* Hero Image Section */}
                          <div className="relative h-64 bg-gradient-to-br from-roam-yellow/20 via-roam-light-blue/10 to-roam-blue/5 overflow-hidden">
                            {promotion.imageUrl ? (
                              <img
                                src={promotion.imageUrl}
                                alt={promotion.title}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                              />
                            ) : (
                              <div className="flex items-center justify-center h-full">
                                {promotion.business && promotion.business.logo ? (
                                  <div className="flex flex-col items-center space-y-3">
                                    <div className="w-20 h-20 rounded-2xl overflow-hidden bg-white shadow-xl border-4 border-white">
                                      <img
                                        src={promotion.business.logo}
                                        alt={promotion.business.name}
                                        className="w-full h-full object-cover"
                                      />
                                    </div>
                                    <h3 className="text-lg font-bold text-roam-blue">
                                      {promotion.business.name}
                                    </h3>
                                  </div>
                                ) : (
                                  <div className="flex flex-col items-center space-y-3">
                                    <div className="w-20 h-20 rounded-2xl bg-roam-yellow/20 flex items-center justify-center">
                                      <Tag className="w-10 h-10 text-roam-blue" />
                                    </div>
                                    <h3 className="text-xl font-bold text-roam-blue">
                                      SPECIAL OFFER
                                    </h3>
                                  </div>
                                )}
                              </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent"></div>

                            {/* Floating Action Button */}
                            <div className="absolute top-4 right-4">
                              <FavoriteButton
                                type="promotion"
                                itemId={promotion.id}
                                size="sm"
                                variant="ghost"
                                className="w-10 h-10 rounded-full bg-white/95 hover:bg-white shadow-lg border-0 text-gray-600 hover:text-red-500 hover:scale-110 transition-all backdrop-blur-sm"
                              />
                            </div>

                            {/* Savings Badge - Bottom Right */}
                            {formatSavings(promotion) && (
                              <div className="absolute bottom-4 right-4">
                                <div className="bg-red-500 text-white px-4 py-2 rounded-2xl shadow-lg font-bold text-lg">
                                  {formatSavings(promotion)}
                                </div>
                              </div>
                            )}

                            {/* End Date Badge - Bottom Left */}
                            {promotion.endDate && (
                              <div className="absolute bottom-4 left-4">
                                <div className="bg-white/95 text-roam-blue px-3 py-1.5 rounded-full shadow-lg font-medium text-sm backdrop-blur-sm">
                                  <Clock className="w-4 h-4 mr-1 inline" />
                                  Ends {new Date(promotion.endDate).toLocaleDateString()}
                                </div>
                              </div>
                            )}
                          </div>

                          <CardContent className="p-6">
                            {/* Promotion Title & Service Info */}
                            <div className="mb-4">
                              <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-roam-blue transition-colors">
                                {promotion.title}
                              </h3>
                              {promotion.service && (
                                <span className="inline-block px-3 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                                  {promotion.service.name}
                                </span>
                              )}
                            </div>

                            {/* Description */}
                            <p className="text-gray-600 text-sm leading-relaxed line-clamp-2 mb-4">
                              {promotion.description}
                            </p>

                            {/* Business Info */}
                            {promotion.business && (
                              <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                                <Building className="w-4 h-4 text-roam-blue" />
                                <span>{promotion.business.name}</span>
                              </div>
                            )}

                            {/* Claim Button */}
                            <Button
                              asChild
                              className="w-full bg-gradient-to-r from-roam-blue to-roam-light-blue hover:from-roam-blue/90 hover:to-roam-light-blue/90 text-white font-semibold py-3 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]"
                            >
                              <Link
                                to={(() => {
                                  const baseParams = `promotion=${promotion.id}&promo_code=${promotion.promoCode}`;

                                  // If promotion has both business and service, start the booking flow
                                  if (promotion.business && promotion.service) {
                                    return `/book-service/${promotion.service.id}?${baseParams}&business_id=${promotion.business.id}`;
                                  }
                                  // If only business, go to business profile
                                  else if (promotion.business) {
                                    return `/business/${promotion.business.id}?${baseParams}`;
                                  }
                                  // If only service, start service booking flow
                                  else if (promotion.service) {
                                    return `/book-service/${promotion.service.id}?${baseParams}`;
                                  }
                                  // Default fallback
                                  else {
                                    return `/services?${baseParams}`;
                                  }
                                })()}
                              >
                                <Tag className="w-4 h-4 mr-2" />
                                {promotion.business && promotion.service
                                  ? "Claim Offer"
                                  : promotion.business
                                    ? "Book with Business"
                                    : promotion.service
                                      ? "Book This Service"
                                      : "Claim Offer"}
                              </Link>
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              {/* Carousel indicators - only show when there are multiple pages */}
              {promotionPages.length > 1 && (
                <div className="flex justify-center mt-6 gap-2">
                  {promotionPages.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentPromotionSlide(index)}
                      className={`w-3 h-3 rounded-full transition-colors ${
                        index === currentPromotionSlide
                          ? "bg-roam-blue"
                          : "bg-gray-300 hover:bg-gray-400"
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <Tag className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground/60 mb-2">
                No Active Promotions
              </h3>
              <p className="text-foreground/50">
                Check back soon for exciting deals and offers!
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Popular Services */}
      <section className="py-12 bg-background/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-4">
              Most <span className="text-roam-blue">Popular Services</span>
            </h2>
            <p className="text-lg text-foreground/70">
              Trending services in your area this month
            </p>
          </div>

          {filteredPopularServices.length > 0 ? (
            <div className="relative">
              {/* Navigation Arrows */}
              {popularPages.length > 1 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={prevPopularSlide}
                    disabled={currentPopularSlide === 0}
                    className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-white/90 border-roam-blue text-roam-blue hover:bg-roam-blue hover:text-white shadow-lg disabled:opacity-50"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={nextPopularSlide}
                    disabled={currentPopularSlide >= popularPages.length - 1}
                    className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-white/90 border-roam-blue text-roam-blue hover:text-white shadow-lg disabled:opacity-50"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </>
              )}
              <div className="overflow-hidden">
                <div
                  className="flex transition-transform duration-300 ease-in-out"
                  style={{
                    transform: `translateX(-${currentPopularSlide * 100}%)`,
                  }}
                >
                  {popularPages.map((page, pageIndex) => (
                    <div
                      key={`popular-page-${pageIndex}`}
                      className="flex gap-6 w-full flex-none px-4"
                    >
                      {page.map((service) => (
                        <Card
                          key={service.id}
                          className="group hover:shadow-2xl transition-all duration-500 hover:-translate-y-3 border-0 shadow-xl bg-white overflow-hidden rounded-3xl flex-shrink-0 w-full md:w-[calc(50%-12px)]"
                        >
                          {/* Hero Image Section */}
                          <div className="relative h-64 bg-gradient-to-br from-roam-blue/20 via-roam-light-blue/10 to-roam-yellow/5 overflow-hidden">
                            <img
                              src={service.image}
                              alt={service.title}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent"></div>

                            {/* Floating Action Button */}
                            <div className="absolute top-4 right-4">
                              <FavoriteButton
                                type="service"
                                itemId={service.id}
                                size="sm"
                                variant="ghost"
                                className="w-10 h-10 rounded-full bg-white/95 hover:bg-white shadow-lg border-0 text-gray-600 hover:text-red-500 hover:scale-110 transition-all backdrop-blur-sm"
                              />
                            </div>

                            {/* Rating Badge - Bottom Right */}
                            <div className="absolute bottom-4 right-4 bg-white/95 backdrop-blur-sm rounded-full px-3 py-1 shadow-lg">
                              <div className="flex items-center gap-1">
                                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                <span className="text-sm font-medium text-gray-900">
                                  {service.rating}
                                </span>
                              </div>
                            </div>

                            {/* Price Badge - Bottom Left */}
                            <div className="absolute bottom-4 left-4">
                              <div className="bg-roam-blue text-white px-4 py-2 rounded-2xl shadow-lg font-bold text-lg">
                                Starting at {service.price}
                              </div>
                            </div>
                          </div>

                          <CardContent className="p-6">
                            {/* Service Title & Category */}
                            <div className="mb-4">
                              <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-roam-blue transition-colors">
                                {service.title}
                              </h3>
                              <span className="inline-block px-3 py-1 text-xs font-medium bg-roam-blue/10 text-roam-blue rounded-full">
                                {service.category}
                              </span>
                            </div>

                            {/* Description */}
                            <p className="text-gray-600 text-sm leading-relaxed line-clamp-2 mb-4">
                              {service.description}
                            </p>

                            {/* Stats Row */}
                            <div className="flex items-center gap-1 text-sm text-gray-600 mb-4">
                              <Clock className="w-4 h-4 text-roam-blue" />
                              <span>{service.duration}</span>
                            </div>

                            {/* Book Button */}
                            <Button
                              asChild
                              className="w-full bg-gradient-to-r from-roam-blue to-roam-light-blue hover:from-roam-blue/90 hover:to-roam-light-blue/90 text-white font-semibold py-3 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]"
                            >
                              <Link to={`/book-service/${service.id}`}>
                                <Calendar className="w-4 h-4 mr-2" />
                                Book Now
                              </Link>
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              {/* Carousel indicators - only show when there are multiple pages */}
              {popularPages.length > 1 && (
                <div className="flex justify-center mt-6 gap-2">
                  {popularPages.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentPopularSlide(index)}
                      className={`w-3 h-3 rounded-full transition-colors ${
                        index === currentPopularSlide
                          ? "bg-roam-blue"
                          : "bg-gray-300 hover:bg-gray-400"
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">
                No popular services available at the moment.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Featured Businesses */}
      <section className="py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold">
              Featured <span className="text-roam-blue">Businesses</span>
            </h2>
            <p className="text-lg text-foreground/70 mt-4">
              Trusted and verified businesses providing exceptional services
            </p>
          </div>

          {filteredBusinesses.length > 0 ? (
            <div className="relative overflow-hidden">
              {/* Navigation Arrows */}
              {businessPages.length > 1 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={prevBusinessSlide}
                    disabled={currentBusinessSlide === 0}
                    className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-white/90 border-roam-blue text-roam-blue hover:bg-roam-blue hover:text-white shadow-lg disabled:opacity-50"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={nextBusinessSlide}
                    disabled={currentBusinessSlide >= businessPages.length - 1}
                    className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-white/90 border-roam-blue text-roam-blue hover:bg-roam-blue hover:text-white shadow-lg disabled:opacity-50"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </>
              )}
              <div className="overflow-hidden">
                <div
                  className="flex transition-transform duration-300 ease-in-out"
                  style={{
                    transform: `translateX(-${currentBusinessSlide * 100}%)`,
                  }}
                >
                  {businessPages.map((page, pageIndex) => (
                    <div
                      key={`businesses-page-${pageIndex}`}
                      className="flex gap-6 w-full flex-none px-4"
                    >
                      {page.map((business) => (
                        <Card
                          key={business.id}
                          className="group hover:shadow-2xl transition-all duration-500 hover:-translate-y-3 border-0 shadow-xl bg-white overflow-hidden rounded-3xl flex-shrink-0 w-full sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)]"
                        >
                          <CardContent className="p-0">
                            {/* Hero Cover Section */}
                            <div
                              className="relative h-64 bg-gradient-to-br from-roam-blue/20 via-roam-light-blue/10 to-roam-yellow/5"
                              style={{
                                backgroundImage: business.cover_image_url
                                  ? `url(${business.cover_image_url})`
                                  : undefined,
                                backgroundSize: "cover",
                                backgroundPosition: "center",
                                backgroundRepeat: "no-repeat",
                              }}
                            >
                              {/* Cover overlay */}
                              {business.cover_image_url && (
                                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent"></div>
                              )}

                              {/* Action Buttons - Top Right */}
                              <div className="absolute top-4 right-4 flex items-center gap-2 z-20">
                                <FavoriteButton
                                  type="business"
                                  itemId={business.id}
                                  size="sm"
                                  variant="ghost"
                                  className="w-10 h-10 rounded-full bg-white/95 hover:bg-white shadow-lg border-0 text-gray-600 hover:text-red-500 hover:scale-110 transition-all backdrop-blur-sm"
                                />
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="w-10 h-10 rounded-full bg-white/95 hover:bg-white shadow-lg border-0 text-gray-600 hover:text-roam-blue hover:scale-110 transition-all backdrop-blur-sm"
                                  onClick={() => handleBusinessShare(business)}
                                >
                                  <Share2 className="w-4 h-4" />
                                </Button>
                              </div>

                              {/* Business Logo - Overlapping */}
                              <div className="absolute -bottom-8 left-6 z-20">
                                <div className="w-16 h-16 bg-white rounded-2xl shadow-xl flex items-center justify-center overflow-hidden border-4 border-white group-hover:scale-110 transition-transform duration-300">
                                  {business.image &&
                                  business.image !==
                                    "/api/placeholder/80/80" ? (
                                    <img
                                      src={business.image}
                                      alt={business.name}
                                      className="w-full h-full object-cover rounded-xl"
                                    />
                                  ) : (
                                    <Building className="w-8 h-8 text-roam-blue" />
                                  )}
                                </div>
                              </div>

                              {/* Rating Badge - Overlapping */}
                              <div className="absolute -bottom-4 right-6 z-20">
                                <div className="flex items-center gap-1 bg-white px-3 py-2 rounded-full shadow-xl border border-gray-100">
                                  <Star className="w-4 h-4 text-roam-warning fill-current" />
                                  <span className="font-bold text-sm text-gray-900">
                                    {business.rating}
                                  </span>
                                  <span className="text-xs text-gray-600 font-medium">
                                    ({business.reviews})
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Content Section */}
                            <div className="px-6 pt-12 pb-6 space-y-6">
                              {/* Business Name */}
                              <div>
                                <h3 className="font-bold text-xl text-gray-900 group-hover:text-roam-blue transition-colors leading-tight mb-1">
                                  {business.name}
                                </h3>
                              </div>

                              {/* Specialties */}
                              <div className="space-y-3">
                                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                  Specialties
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                  {business.specialties
                                    .slice(0, 4)
                                    .map((specialty, index) => {
                                      // Convert to camel case
                                      const camelCaseSpecialty = specialty
                                        .split(" ")
                                        .map(
                                          (word) =>
                                            word.charAt(0).toUpperCase() +
                                            word.slice(1).toLowerCase(),
                                        )
                                        .join(" ");

                                      return (
                                        <span
                                          key={specialty}
                                          className="px-3 py-1.5 text-xs font-medium bg-gradient-to-r from-roam-blue/8 to-roam-light-blue/8 text-roam-blue rounded-lg border border-roam-blue/15 hover:border-roam-blue/25 transition-colors"
                                        >
                                          {camelCaseSpecialty}
                                        </span>
                                      );
                                    })}
                                  {business.specialties.length > 4 && (
                                    <span className="px-3 py-1.5 text-xs font-medium bg-gray-50 text-gray-600 rounded-lg border border-gray-200">
                                      +{business.specialties.length - 4}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Action Buttons */}
                              <div className="flex gap-3 pt-2">
                                <Button
                                  asChild
                                  className="flex-1 bg-gradient-to-r from-roam-blue to-roam-light-blue hover:from-roam-blue/90 hover:to-roam-light-blue/90 text-white font-semibold py-3 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]"
                                >
                                  <Link
                                    to={`/business/${business.id}?tab=services`}
                                  >
                                    <Calendar className="w-4 h-4 mr-2" />
                                    Book
                                  </Link>
                                </Button>
                                <Button
                                  asChild
                                  variant="outline"
                                  className="flex-1 border-2 border-roam-blue/20 text-roam-blue hover:bg-roam-blue hover:text-white font-semibold py-3 rounded-2xl transition-all duration-300"
                                >
                                  <Link to={`/business/${business.id}`}>
                                    <BookOpen className="w-4 h-4 mr-2" />
                                    View
                                  </Link>
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              {/* Carousel indicators - only show when there are multiple pages */}
              {businessPages.length > 1 && (
                <div className="flex justify-center mt-6 gap-2">
                  {businessPages.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentBusinessSlide(index)}
                      className={`w-3 h-3 rounded-full transition-colors ${
                        index === currentBusinessSlide
                          ? "bg-roam-blue"
                          : "bg-gray-300 hover:bg-gray-400"
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <Card className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                No featured businesses found
              </h3>
              <p className="text-foreground/60 mb-4">
                No featured businesses match your search criteria. Try adjusting
                your search or browse all businesses.
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("all");
                  setSelectedDelivery("all");
                }}
                className="border-roam-blue text-roam-blue hover:bg-roam-blue hover:text-white"
              >
                Clear Filters
              </Button>
            </Card>
          )}

          {false && (
            <Card className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                No featured businesses found
              </h3>
              <p className="text-foreground/60 mb-4">
                No featured businesses match your search criteria. Try adjusting
                your search or browse all businesses.
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("all");
                  setSelectedDelivery("all");
                }}
                className="border-roam-blue text-roam-blue hover:bg-roam-blue hover:text-white"
              >
                Clear Filters
              </Button>
            </Card>
          )}
        </div>
      </section>

      {/* Quick Actions */}
      <section className="py-12 bg-gradient-to-r from-roam-blue to-roam-light-blue">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Book Your Service?
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Discover verified businesses and book premium services with trusted
            professionals across Florida.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              variant="secondary"
              className="bg-white text-roam-blue hover:bg-white/90 text-lg px-8 py-6"
              onClick={handleMyBookings}
            >
              <Calendar className="w-5 h-5 mr-2" />
              {isCustomer ? "View My Bookings" : "Sign In to Book"}
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-roam-blue text-roam-blue hover:bg-roam-blue hover:text-white text-lg px-8 py-6"
            >
              <Link to="/about">
                <Building className="w-5 h-5 mr-2" />
                Learn More
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Trust & Safety */}
      <section className="py-12 bg-background/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">
              Your Safety is Our{" "}
              <span className="text-roam-blue">Priority</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  Background Verified
                </h3>
                <p className="text-foreground/70">
                  All providers undergo comprehensive background checks and
                  identity verification.
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Star className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold mb-2">5-Star Quality</h3>
                <p className="text-foreground/70">
                  Only the highest-rated professionals with proven track records
                  join our platform.
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Heart className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  Satisfaction Guaranteed
                </h3>
                <p className="text-foreground/70">
                  Your satisfaction is guaranteed or we'll make it right, every
                  time.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Share Modal */}
      {selectedProvider && (
        <ShareModal
          isOpen={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
          providerName={selectedProvider.name}
          providerTitle={selectedProvider.type || selectedProvider.description}
          pageUrl={`${window.location.origin}/business/${selectedProvider.id}`}
        />
      )}

      {/* Customer Authentication Modal */}
      <CustomerAuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        defaultTab={authModalTab}
      />
    </div>
  );
}
