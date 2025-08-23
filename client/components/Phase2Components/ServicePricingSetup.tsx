import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DollarSign,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Loader2,
  Info,
  Star,
  Clock,
  Users,
  Settings,
  Package
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

interface EligibleService {
  id: string;
  name: string;
  description: string;
  min_price: number;
  duration_minutes: number;
  image_url?: string;
  is_active: boolean;
  subcategory_id: string;
  service_subcategories?: {
    service_subcategory_type: string;
    service_categories?: {
      service_category_type: string;
    };
  };
  is_configured?: boolean;
  business_price?: number;
  delivery_type?: string;
}

interface BusinessService {
  id: string;
  business_id: string;
  service_id: string;
  business_price: number;
  is_active: boolean;
  delivery_type?: string;
}

interface EligibleAddon {
  id: string;
  name: string;
  description: string;
  image_url?: string;
  is_active: boolean;
}

interface BusinessAddon {
  id: string;
  business_id: string;
  addon_id: string;
  custom_price: number | null;
  is_available: boolean;
}

interface ServiceAddon {
  id: string;
  name: string;
  description: string;
  price: number;
  isActive: boolean;
  compatible_service_id?: string;
  compatible_service_name?: string;
}

interface ServicePricingData {
  business_services: BusinessService[];
  business_addons: BusinessAddon[];
  eligible_services: EligibleService[];
  eligible_addons: EligibleAddon[];
  service_addon_map: Record<string, string[]>;
  pricingModel: 'fixed'; // Fixed to 'fixed' only
  currency: 'USD'; // Fixed to 'USD' only
  taxRate: number;
  cancellationPolicy: string; // Will be set to platform policy
}

interface ServicePricingSetupProps {
  businessId: string;
  userId: string;
  onComplete: (data: ServicePricingData) => void;
  onBack?: () => void;
  initialData?: ServicePricingData;
  className?: string;
}

// Platform defaults - no longer configurable
const PLATFORM_PRICING_MODEL = 'fixed';
const PLATFORM_CURRENCY = 'USD';
const PLATFORM_CANCELLATION_POLICY = 'By using our platform, you agree to our cancellation policy. For details, visit our Terms of Service.';

// Initialize Supabase client
const supabase = createClient(
  process.env.VITE_PUBLIC_SUPABASE_URL!,
  process.env.VITE_PUBLIC_SUPABASE_ANON_KEY!
);

export default function ServicePricingSetup({
  businessId,
  userId,
  onComplete,
  onBack,
  initialData,
  className = ""
}: ServicePricingSetupProps) {
  const [pricingData, setPricingData] = useState<ServicePricingData>(
    initialData || {
      business_services: [],
      business_addons: [],
      eligible_services: [],
      eligible_addons: [],
      service_addon_map: {},
      pricingModel: PLATFORM_PRICING_MODEL,
      currency: PLATFORM_CURRENCY,
      taxRate: 0,
      cancellationPolicy: PLATFORM_CANCELLATION_POLICY,
    }
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddServiceModal, setShowAddServiceModal] = useState(false);
  const [showAddonModal, setShowAddonModal] = useState(false);
  const [editingService, setEditingService] = useState<EligibleService | null>(null);
  const [editingAddon, setEditingAddon] = useState<EligibleAddon | null>(null);
  const [selectedServiceForAddon, setSelectedServiceForAddon] = useState<string | null>(null);

  const updatePricingData = (field: keyof ServicePricingData, value: any) => {
    setPricingData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Fetch eligible services and addons for the business
  const fetchEligibleServices = async () => {
    try {
      setLoading(true);
      setError(null);

      // Call the edge function to get eligible services and addons
      const supabaseUrl = 'https://vssomyuyhicaxsgiaupo.supabase.co';
      const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzc29teXV5aGljYXhzZ2lhdXBvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NTM3MTUsImV4cCI6MjA2OTAyOTcxNX0.c4JrNgMGsrCaFP2VrF4pL6iUG8Ub8Hkcrm5345r7KHs';

      const response = await fetch(
        `${supabaseUrl}/functions/v1/get-business-eligible-services?business_id=${businessId}`,
        {
          headers: {
            'Authorization': `Bearer ${anonKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch eligible services: ${response.statusText}`);
      }

      const edgeData = await response.json();
      console.log('Eligible services data:', edgeData);

      // Get current business services and addons
      const { data: currentBusinessServices } = await supabase
        .from('business_services')
        .select('*')
        .eq('business_id', businessId);

      const { data: currentBusinessAddons } = await supabase
        .from('business_addons')
        .select('*')
        .eq('business_id', businessId);

      // Update pricing data with fetched information
      setPricingData(prev => ({
        ...prev,
        eligible_services: edgeData.eligible_services || [],
        eligible_addons: edgeData.eligible_addons || [],
        service_addon_map: edgeData.service_addon_map || {},
        business_services: currentBusinessServices || [],
        business_addons: currentBusinessAddons || [],
      }));

    } catch (error) {
      console.error('Error fetching eligible services:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch eligible services');
    } finally {
      setLoading(false);
    }
  };

  // Load eligible services on component mount
  useEffect(() => {
    fetchEligibleServices();
  }, [businessId]);

  // Add a service to business_services
  const addBusinessService = async (serviceId: string, businessPrice: number, deliveryType: string = 'customer_location') => {
    try {
      const { data, error } = await supabase
        .from('business_services')
        .insert({
          business_id: businessId,
          service_id: serviceId,
          business_price: businessPrice,
          is_active: true,
          delivery_type: deliveryType
        })
        .select()
        .single();

      if (error) throw error;

      // Update local state
      setPricingData(prev => ({
        ...prev,
        business_services: [...prev.business_services, data]
      }));

      return data;
    } catch (error) {
      console.error('Error adding business service:', error);
      setError(error instanceof Error ? error.message : 'Failed to add service');
      throw error;
    }
  };

  // Update a business service
  const updateBusinessService = async (serviceId: string, updates: Partial<BusinessService>) => {
    try {
      const { data, error } = await supabase
        .from('business_services')
        .update(updates)
        .eq('business_id', businessId)
        .eq('service_id', serviceId)
        .select()
        .single();

      if (error) throw error;

      // Update local state
      setPricingData(prev => ({
        ...prev,
        business_services: prev.business_services.map(bs => 
          bs.service_id === serviceId ? { ...bs, ...updates } : bs
        )
      }));

      return data;
    } catch (error) {
      console.error('Error updating business service:', error);
      setError(error instanceof Error ? error.message : 'Failed to update service');
      throw error;
    }
  };

  // Remove a business service
  const removeBusinessService = async (serviceId: string) => {
    try {
      const { error } = await supabase
        .from('business_services')
        .delete()
        .eq('business_id', businessId)
        .eq('service_id', serviceId);

      if (error) throw error;

      // Update local state
      setPricingData(prev => ({
        ...prev,
        business_services: prev.business_services.filter(bs => bs.service_id !== serviceId)
      }));
    } catch (error) {
      console.error('Error removing business service:', error);
      setError(error instanceof Error ? error.message : 'Failed to remove service');
      throw error;
    }
  };

  // Add an addon to business_addons
  const addBusinessAddon = async (addonId: string, customPrice: number | null = null) => {
    try {
      const { data, error } = await supabase
        .from('business_addons')
        .insert({
          business_id: businessId,
          addon_id: addonId,
          custom_price: customPrice,
          is_available: true
        })
        .select()
        .single();

      if (error) throw error;

      // Update local state
      setPricingData(prev => ({
        ...prev,
        business_addons: [...prev.business_addons, data]
      }));

      return data;
    } catch (error) {
      console.error('Error adding business addon:', error);
      setError(error instanceof Error ? error.message : 'Failed to add addon');
      throw error;
    }
  };

  // Update a business addon
  const updateBusinessAddon = async (addonId: string, updates: Partial<BusinessAddon>) => {
    try {
      const { data, error } = await supabase
        .from('business_addons')
        .update(updates)
        .eq('business_id', businessId)
        .eq('addon_id', addonId)
        .select()
        .single();

      if (error) throw error;

      // Update local state
      setPricingData(prev => ({
        ...prev,
        business_addons: prev.business_addons.map(ba => 
          ba.addon_id === addonId ? { ...ba, ...updates } : ba
        )
      }));

      return data;
    } catch (error) {
      console.error('Error updating business addon:', error);
      setError(error instanceof Error ? error.message : 'Failed to update addon');
      throw error;
    }
  };

  // Remove a business addon
  const removeBusinessAddon = async (addonId: string) => {
    try {
      const { error } = await supabase
        .from('business_addons')
        .delete()
        .eq('business_id', businessId)
        .eq('addon_id', addonId);

      if (error) throw error;

      // Update local state
      setPricingData(prev => ({
        ...prev,
        business_addons: prev.business_addons.filter(ba => ba.addon_id !== addonId)
      }));
    } catch (error) {
      console.error('Error removing business addon:', error);
      setError(error instanceof Error ? error.message : 'Failed to remove addon');
      throw error;
    }
  };

  const completionPercentage = () => {
    let completed = 0;
    const total = 2; // tax rate, at least one service (pricing model and currency are fixed)

    if (pricingData.taxRate >= 0) completed++;
    if (pricingData.business_services.length > 0) completed++;

    return Math.round((completed / total) * 100);
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      // Save service pricing data to database
      const response = await fetch('/api/onboarding/save-phase2-progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          businessId,
          userId,
          step: 'service_pricing',
          data: pricingData,
          completed: true
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save service pricing data');
      }

      // Call the onComplete callback
      onComplete(pricingData);
    } catch (error) {
      console.error('Error saving service pricing data:', error);
      setError(error instanceof Error ? error.message : 'Failed to save service pricing data');
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = () => {
    return completionPercentage() === 100;
  };

  return (
    <div className={`max-w-6xl mx-auto ${className}`}>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-roam-blue to-blue-600 rounded-full flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl text-roam-blue">
                Service Pricing & Addons
              </CardTitle>
              <p className="text-foreground/70">
                Configure your eligible services and addons with custom pricing
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Setup Progress</span>
              <span>{completionPercentage()}% Complete</span>
            </div>
            <Progress value={completionPercentage()} className="w-full" />
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {loading && (
            <Alert>
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertDescription>
                Loading eligible services and addons...
              </AlertDescription>
            </Alert>
          )}

          {/* Platform Settings */}
          <div className="space-y-4">
            <Label className="text-lg font-semibold">Platform Settings</Label>
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="p-4 border-blue-200 bg-blue-50">
                <div className="flex items-center gap-3 mb-2">
                  <DollarSign className="w-5 h-5 text-blue-600" />
                  <h4 className="font-semibold text-blue-900">Pricing Model</h4>
                </div>
                <p className="text-sm text-blue-800">Fixed Price</p>
                <p className="text-xs text-blue-700 mt-1">Platform Default</p>
              </Card>
              
              <Card className="p-4 border-blue-200 bg-blue-50">
                <div className="flex items-center gap-3 mb-2">
                  <DollarSign className="w-5 h-5 text-blue-600" />
                  <h4 className="font-semibold text-blue-900">Currency</h4>
                </div>
                <p className="text-sm text-blue-800">USD ($)</p>
                <p className="text-xs text-blue-700 mt-1">Platform Default</p>
              </Card>

              <Card className="p-4 border-blue-200 bg-blue-50">
                <div className="flex items-center gap-3 mb-2">
                  <Settings className="w-5 h-5 text-blue-600" />
                  <h4 className="font-semibold text-blue-900">Tax Rate</h4>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={pricingData.taxRate}
                    onChange={(e) => updatePricingData('taxRate', parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    min="0"
                    max="100"
                    step="0.1"
                    className="w-20"
                  />
                  <span className="text-sm text-blue-800">%</span>
                </div>
              </Card>
            </div>
          </div>

          {/* My Services */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-lg font-semibold">My Services</Label>
              <Badge variant="outline" className="text-sm">
                {pricingData.business_services.length} configured
              </Badge>
            </div>

            {pricingData.business_services.length === 0 ? (
              <Card className="p-8 text-center">
                <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Services Configured</h3>
                <p className="text-gray-600 mb-4">
                  Add services from the available catalog below to start accepting bookings
                </p>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {pricingData.business_services.map((businessService) => {
                  const eligibleService = pricingData.eligible_services.find(es => es.id === businessService.service_id);
                  if (!eligibleService) return null;

                  return (
                    <Card key={businessService.service_id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-semibold">{eligibleService.name}</h4>
                            <Badge className={businessService.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                              {businessService.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                          <p className="text-gray-600 mb-2">{eligibleService.description}</p>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                              <DollarSign className="w-4 h-4" />
                              ${businessService.business_price}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {eligibleService.duration_minutes} min
                            </span>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingService(eligibleService);
                              setShowAddServiceModal(true);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeBusinessService(businessService.service_id)}
                            className="text-red-600 border-red-300 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Available Services */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-lg font-semibold">Available Services</Label>
              <Badge variant="outline" className="text-sm">
                {pricingData.eligible_services.filter(es => 
                  !pricingData.business_services.some(bs => bs.service_id === es.id)
                ).length} available
              </Badge>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {pricingData.eligible_services
                .filter(eligibleService => 
                  !pricingData.business_services.some(bs => bs.service_id === eligibleService.id)
                )
                .map((eligibleService) => (
                  <Card key={eligibleService.id} className="p-4 border-dashed">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-semibold">{eligibleService.name}</h4>
                          <Badge variant="outline">Available</Badge>
                        </div>
                        <p className="text-gray-600 mb-2">{eligibleService.description}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <DollarSign className="w-4 h-4" />
                            ${eligibleService.min_price} (min)
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {eligibleService.duration_minutes} min
                          </span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => {
                          setEditingService(eligibleService);
                          setShowAddServiceModal(true);
                        }}
                        className="bg-roam-blue hover:bg-roam-blue/90"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add
                      </Button>
                    </div>
                  </Card>
                ))}
            </div>
          </div>

          {/* My Addons */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-lg font-semibold">My Addons</Label>
              <Badge variant="outline" className="text-sm">
                {pricingData.business_addons.length} configured
              </Badge>
            </div>

            {pricingData.business_addons.length === 0 ? (
              <Card className="p-8 text-center">
                <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Addons Configured</h3>
                <p className="text-gray-600 mb-4">
                  Add addons from the available catalog below to enhance your services
                </p>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {pricingData.business_addons.map((businessAddon) => {
                  const eligibleAddon = pricingData.eligible_addons.find(ea => ea.id === businessAddon.addon_id);
                  if (!eligibleAddon) return null;

                  return (
                    <Card key={businessAddon.addon_id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-semibold">{eligibleAddon.name}</h4>
                            <Badge className={businessAddon.is_available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                              {businessAddon.is_available ? 'Available' : 'Unavailable'}
                            </Badge>
                          </div>
                          <p className="text-gray-600 mb-2">{eligibleAddon.description}</p>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                              <DollarSign className="w-4 h-4" />
                              ${businessAddon.custom_price || 'Variable'}
                            </span>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingAddon(eligibleAddon);
                              setShowAddonModal(true);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeBusinessAddon(businessAddon.addon_id)}
                            className="text-red-600 border-red-300 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Available Addons */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-lg font-semibold">Available Addons</Label>
              <Badge variant="outline" className="text-sm">
                {pricingData.eligible_addons.filter(ea => 
                  !pricingData.business_addons.some(ba => ba.addon_id === ea.id)
                ).length} available
              </Badge>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {pricingData.eligible_addons
                .filter(eligibleAddon => 
                  !pricingData.business_addons.some(ba => ba.addon_id === eligibleAddon.id)
                )
                .map((eligibleAddon) => (
                  <Card key={eligibleAddon.id} className="p-4 border-dashed">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-semibold">{eligibleAddon.name}</h4>
                          <Badge variant="outline">Available</Badge>
                        </div>
                        <p className="text-gray-600 mb-2">{eligibleAddon.description}</p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => {
                          setEditingAddon(eligibleAddon);
                          setShowAddonModal(true);
                        }}
                        className="bg-roam-blue hover:bg-roam-blue/90"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add
                      </Button>
                    </div>
                  </Card>
                ))}
            </div>
          </div>

          {/* Platform Cancellation Policy */}
          <div className="space-y-4">
            <Label className="text-lg font-semibold">Cancellation Policy</Label>
            <Card className="p-4 border-blue-200 bg-blue-50">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-blue-900 mb-2">Platform Cancellation Policy</h4>
                  <p className="text-sm text-blue-800 mb-3">
                    By using our platform, you agree to our cancellation policy. For detailed terms and conditions, 
                    please review our platform's cancellation policy.
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-blue-700 border-blue-300 hover:bg-blue-100"
                    onClick={() => window.open('/terms-of-service', '_blank')}
                  >
                    View Platform Policy
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          {/* Information Alert */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Tip:</strong> Services and addons are based on your business qualifications. 
              You can adjust pricing and availability anytime from your dashboard.
            </AlertDescription>
          </Alert>

          {/* Action Buttons */}
          <div className="flex justify-between pt-6">
            {onBack && (
              <Button variant="outline" onClick={onBack}>
                Back
              </Button>
            )}
            
            <Button
              onClick={handleSubmit}
              disabled={loading || !canSubmit()}
              className="bg-roam-blue hover:bg-roam-blue/90 ml-auto"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  Continue to Final Review
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
