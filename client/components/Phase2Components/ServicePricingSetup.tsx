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
  Users
} from 'lucide-react';

interface Service {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  duration: number; // in minutes
  category: string;
  isActive: boolean;
  addons?: ServiceAddon[];
}

interface ServiceAddon {
  id: string;
  name: string;
  description: string;
  price: number;
  isActive: boolean;
}

interface ServicePricingData {
  services: Service[];
  pricingModel: 'fixed' | 'hourly' | 'variable';
  currency: string;
  taxRate: number;
  cancellationPolicy: string;
}

interface ServicePricingSetupProps {
  businessId: string;
  userId: string;
  onComplete: (data: ServicePricingData) => void;
  onBack?: () => void;
  initialData?: ServicePricingData;
  className?: string;
}

const serviceCategories = [
  { value: 'cleaning', label: 'Cleaning Services' },
  { value: 'maintenance', label: 'Maintenance & Repair' },
  { value: 'consultation', label: 'Consultation' },
  { value: 'installation', label: 'Installation' },
  { value: 'inspection', label: 'Inspection' },
  { value: 'other', label: 'Other Services' },
];

const pricingModels = [
  { value: 'fixed', label: 'Fixed Price', description: 'Set price per service' },
  { value: 'hourly', label: 'Hourly Rate', description: 'Charge by the hour' },
  { value: 'variable', label: 'Variable Pricing', description: 'Price varies by complexity' },
];

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
      services: [],
      pricingModel: 'fixed',
      currency: 'USD',
      taxRate: 0,
      cancellationPolicy: '24-hour notice required for cancellations',
    }
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddServiceModal, setShowAddServiceModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [newService, setNewService] = useState({
    name: '',
    description: '',
    basePrice: 0,
    duration: 60,
    category: 'cleaning',
  });

  const updatePricingData = (field: keyof ServicePricingData, value: any) => {
    setPricingData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addService = () => {
    if (!newService.name || !newService.description || newService.basePrice <= 0) {
      setError('Please fill in all required fields and set a valid price');
      return;
    }

    const service: Service = {
      id: Date.now().toString(),
      ...newService,
      isActive: true,
      addons: [],
    };

    setPricingData(prev => ({
      ...prev,
      services: [...prev.services, service]
    }));

    setNewService({
      name: '',
      description: '',
      basePrice: 0,
      duration: 60,
      category: 'cleaning',
    });
    setShowAddServiceModal(false);
    setError(null);
  };

  const updateService = (id: string, updates: Partial<Service>) => {
    setPricingData(prev => ({
      ...prev,
      services: prev.services.map(service => 
        service.id === id ? { ...service, ...updates } : service
      )
    }));
  };

  const removeService = (id: string) => {
    setPricingData(prev => ({
      ...prev,
      services: prev.services.filter(service => service.id !== id)
    }));
  };

  const completionPercentage = () => {
    let completed = 0;
    const total = 4; // pricing model, currency, tax rate, at least one service

    if (pricingData.pricingModel) completed++;
    if (pricingData.currency) completed++;
    if (pricingData.taxRate >= 0) completed++;
    if (pricingData.services.length > 0) completed++;

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
    <div className={`max-w-4xl mx-auto ${className}`}>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-roam-blue to-blue-600 rounded-full flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl text-roam-blue">
                Service Pricing
              </CardTitle>
              <p className="text-foreground/70">
                Set up your services and pricing structure
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

          {/* Pricing Model Selection */}
          <div className="space-y-4">
            <Label className="text-lg font-semibold">Pricing Model</Label>
            <div className="grid gap-4 md:grid-cols-3">
              {pricingModels.map((model) => (
                <Card 
                  key={model.value}
                  className={`p-4 cursor-pointer border-2 transition-colors ${
                    pricingData.pricingModel === model.value 
                      ? 'border-roam-blue bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => updatePricingData('pricingModel', model.value)}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <DollarSign className="w-5 h-5 text-roam-blue" />
                    <h4 className="font-semibold">{model.label}</h4>
                  </div>
                  <p className="text-sm text-gray-600">{model.description}</p>
                </Card>
              ))}
            </div>
          </div>

          {/* Currency and Tax Settings */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-4">
              <Label className="text-lg font-semibold">Currency</Label>
              <Select
                value={pricingData.currency}
                onValueChange={(value) => updatePricingData('currency', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                  <SelectItem value="GBP">GBP (£)</SelectItem>
                  <SelectItem value="CAD">CAD (C$)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              <Label className="text-lg font-semibold">Tax Rate (%)</Label>
              <Input
                type="number"
                value={pricingData.taxRate}
                onChange={(e) => updatePricingData('taxRate', parseFloat(e.target.value) || 0)}
                placeholder="0"
                min="0"
                max="100"
                step="0.1"
              />
            </div>
          </div>

          {/* Services Management */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-lg font-semibold">Services</Label>
              <Dialog open={showAddServiceModal} onOpenChange={setShowAddServiceModal}>
                <DialogTrigger asChild>
                  <Button className="bg-roam-blue hover:bg-roam-blue/90">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Service
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Add New Service</DialogTitle>
                    <DialogDescription>
                      Create a new service with pricing and duration.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div>
                      <Label htmlFor="service_name">Service Name *</Label>
                      <Input
                        id="service_name"
                        value={newService.name}
                        onChange={(e) => setNewService(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="e.g., Deep Cleaning"
                      />
                    </div>
                    <div>
                      <Label htmlFor="service_description">Description *</Label>
                      <Textarea
                        id="service_description"
                        value={newService.description}
                        onChange={(e) => setNewService(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Describe what this service includes..."
                        rows={3}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="service_price">Base Price *</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                          <Input
                            id="service_price"
                            type="number"
                            value={newService.basePrice}
                            onChange={(e) => setNewService(prev => ({ ...prev, basePrice: parseFloat(e.target.value) || 0 }))}
                            className="pl-8"
                            placeholder="0.00"
                            min="0"
                            step="0.01"
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="service_duration">Duration (minutes)</Label>
                        <Input
                          id="service_duration"
                          type="number"
                          value={newService.duration}
                          onChange={(e) => setNewService(prev => ({ ...prev, duration: parseInt(e.target.value) || 60 }))}
                          placeholder="60"
                          min="15"
                          step="15"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="service_category">Category</Label>
                      <Select
                        value={newService.category}
                        onValueChange={(value) => setNewService(prev => ({ ...prev, category: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {serviceCategories.map((category) => (
                            <SelectItem key={category.value} value={category.value}>
                              {category.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowAddServiceModal(false)}>
                      Cancel
                    </Button>
                    <Button onClick={addService} className="bg-roam-blue hover:bg-roam-blue/90">
                      Add Service
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {pricingData.services.length === 0 ? (
              <Card className="p-8 text-center">
                <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Services Yet</h3>
                <p className="text-gray-600 mb-4">
                  Add your first service to start accepting bookings
                </p>
                <Button onClick={() => setShowAddServiceModal(true)} className="bg-roam-blue hover:bg-roam-blue/90">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Service
                </Button>
              </Card>
            ) : (
              <div className="space-y-4">
                {pricingData.services.map((service) => (
                  <Card key={service.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-semibold">{service.name}</h4>
                          <Badge variant="outline">{service.category}</Badge>
                          <Badge className={service.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                            {service.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        <p className="text-gray-600 mb-2">{service.description}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <DollarSign className="w-4 h-4" />
                            ${service.basePrice}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {service.duration} min
                          </span>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingService(service);
                            setNewService({
                              name: service.name,
                              description: service.description,
                              basePrice: service.basePrice,
                              duration: service.duration,
                              category: service.category,
                            });
                            setShowAddServiceModal(true);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeService(service.id)}
                          className="text-red-600 border-red-300 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Cancellation Policy */}
          <div className="space-y-4">
            <Label className="text-lg font-semibold">Cancellation Policy</Label>
            <Textarea
              value={pricingData.cancellationPolicy}
              onChange={(e) => updatePricingData('cancellationPolicy', e.target.value)}
              placeholder="Describe your cancellation policy..."
              rows={3}
            />
          </div>

          {/* Information Alert */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Tip:</strong> You can add more services and adjust pricing anytime from your dashboard. 
              Consider starting with your most popular services.
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
