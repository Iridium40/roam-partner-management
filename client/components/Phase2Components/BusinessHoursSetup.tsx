import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Clock,
  Calendar,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Loader2,
  Info
} from 'lucide-react';

interface BusinessHours {
  [key: string]: {
    isOpen: boolean;
    openTime: string;
    closeTime: string;
  };
}

interface BusinessHoursSetupProps {
  businessId: string;
  userId: string;
  onComplete: (data: BusinessHours) => void;
  onBack?: () => void;
  initialData?: BusinessHours;
  className?: string;
}

const daysOfWeek = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' }
];

const defaultHours: BusinessHours = {
  monday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
  tuesday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
  wednesday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
  thursday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
  friday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
  saturday: { isOpen: false, openTime: '09:00', closeTime: '17:00' },
  sunday: { isOpen: false, openTime: '09:00', closeTime: '17:00' }
};

export default function BusinessHoursSetup({
  businessId,
  userId,
  onComplete,
  onBack,
  initialData,
  className = ""
}: BusinessHoursSetupProps) {
  const [businessHours, setBusinessHours] = useState<BusinessHours>(
    initialData || defaultHours
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateDayHours = (day: string, field: keyof BusinessHours[string], value: any) => {
    setBusinessHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value
      }
    }));
  };

  const toggleDay = (day: string) => {
    updateDayHours(day, 'isOpen', !businessHours[day].isOpen);
  };

  const completionPercentage = () => {
    const total = 7; // 7 days of the week
    let completed = 0;

    Object.values(businessHours).forEach(day => {
      if (day.isOpen) {
        // If open, both open and close times must be set
        if (day.openTime && day.closeTime) completed++;
      } else {
        // If closed, it's considered complete
        completed++;
      }
    });

    return Math.round((completed / total) * 100);
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      // Save business hours to database
      const response = await fetch('/api/onboarding/save-phase2-progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          businessId,
          userId,
          step: 'business_hours',
          data: businessHours,
          completed: true
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save business hours');
      }

      // Call the onComplete callback
      onComplete(businessHours);
    } catch (error) {
      console.error('Error saving business hours:', error);
      setError(error instanceof Error ? error.message : 'Failed to save business hours');
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
              <Clock className="w-6 h-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl text-roam-blue">
                Business Hours & Availability
              </CardTitle>
              <p className="text-foreground/70">
                Set your operating hours for each day of the week
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

          {/* Business Hours Setup */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-roam-blue" />
              <Label className="text-lg font-semibold">Operating Hours</Label>
            </div>

            <div className="space-y-4">
              {daysOfWeek.map(({ key, label }) => (
                <div key={key} className="flex items-center gap-4 p-4 border rounded-lg">
                  <div className="flex items-center gap-3 flex-1">
                    <Switch
                      checked={businessHours[key].isOpen}
                      onCheckedChange={() => toggleDay(key)}
                    />
                    <Label className="font-medium min-w-[80px]">{label}</Label>
                  </div>

                  {businessHours[key].isOpen ? (
                    <div className="flex items-center gap-2">
                      <div>
                        <Label className="text-sm text-foreground/70">Open</Label>
                        <Input
                          type="time"
                          value={businessHours[key].openTime}
                          onChange={(e) => updateDayHours(key, 'openTime', e.target.value)}
                          className="w-24"
                        />
                      </div>
                      <span className="text-foreground/50">to</span>
                      <div>
                        <Label className="text-sm text-foreground/70">Close</Label>
                        <Input
                          type="time"
                          value={businessHours[key].closeTime}
                          onChange={(e) => updateDayHours(key, 'closeTime', e.target.value)}
                          className="w-24"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="text-foreground/50 italic">
                      Closed
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Information Alert */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Tip:</strong> Your business hours will be visible to customers when they book services. 
              You can update these anytime from your dashboard.
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
                  Continue to Staff Management
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
