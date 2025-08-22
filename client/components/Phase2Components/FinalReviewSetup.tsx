import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Loader2,
  Info,
  Clock,
  Users,
  Banknote,
  DollarSign,
  Building,
  User,
  Calendar
} from 'lucide-react';

interface Phase2Data {
  business_profile?: any;
  personal_profile?: any;
  business_hours?: any;
  staff_management?: any;
  banking_payout?: any;
  service_pricing?: any;
}

interface FinalReviewSetupProps {
  businessId: string;
  userId: string;
  onComplete: () => void;
  onBack?: () => void;
  phase2Data: Phase2Data;
  className?: string;
}

const phase2Steps = [
  {
    id: 'business_profile',
    title: 'Business Profile',
    icon: Building,
    description: 'Business information and branding',
  },
  {
    id: 'personal_profile',
    title: 'Personal Profile',
    icon: User,
    description: 'Professional background and credentials',
  },
  {
    id: 'business_hours',
    title: 'Business Hours',
    icon: Clock,
    description: 'Operating hours and availability',
  },
  {
    id: 'staff_management',
    title: 'Staff Management',
    icon: Users,
    description: 'Team members and roles',
  },
  {
    id: 'banking_payout',
    title: 'Banking & Payouts',
    icon: Banknote,
    description: 'Payment processing and payouts',
  },
  {
    id: 'service_pricing',
    title: 'Service Pricing',
    icon: DollarSign,
    description: 'Services and pricing structure',
  },
];

export default function FinalReviewSetup({
  businessId,
  userId,
  onComplete,
  onBack,
  phase2Data,
  className = ""
}: FinalReviewSetupProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getStepStatus = (stepId: string) => {
    const data = phase2Data[stepId as keyof Phase2Data];
    return data ? 'completed' : 'pending';
  };

  const getCompletionPercentage = () => {
    const completedSteps = phase2Steps.filter(step => 
      getStepStatus(step.id) === 'completed'
    ).length;
    return Math.round((completedSteps / phase2Steps.length) * 100);
  };

  const getStepSummary = (stepId: string) => {
    const data = phase2Data[stepId as keyof Phase2Data];
    if (!data) return 'Not completed';

    switch (stepId) {
      case 'business_profile':
        return data.businessName ? `Business: ${data.businessName}` : 'Business profile configured';
      case 'personal_profile':
        return data.professionalTitle ? `Title: ${data.professionalTitle}` : 'Personal profile configured';
      case 'business_hours':
        const openDays = Object.values(data).filter((day: any) => day?.isOpen).length;
        return `${openDays} days configured`;
      case 'staff_management':
        const staffCount = Array.isArray(data) ? data.length : 0;
        return `${staffCount} team member${staffCount !== 1 ? 's' : ''}`;
      case 'banking_payout':
        return data.payoutMethod ? `${data.payoutMethod} configured` : 'Payment method configured';
      case 'service_pricing':
        const serviceCount = data.services?.length || 0;
        return `${serviceCount} service${serviceCount !== 1 ? 's' : ''} configured`;
      default:
        return 'Configured';
    }
  };

  const handleCompleteSetup = async () => {
    try {
      setLoading(true);
      setError(null);

      // Mark Phase 2 as complete
      const response = await fetch('/api/onboarding/save-phase2-progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          businessId,
          userId,
          step: 'final_review',
          data: { completed: true },
          completed: true
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to complete Phase 2 setup');
      }

      // Call the onComplete callback
      onComplete();
    } catch (error) {
      console.error('Error completing Phase 2 setup:', error);
      setError(error instanceof Error ? error.message : 'Failed to complete setup');
    } finally {
      setLoading(false);
    }
  };

  const allStepsCompleted = getCompletionPercentage() === 100;

  return (
    <div className={`max-w-4xl mx-auto ${className}`}>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl text-green-600">
                Final Review
              </CardTitle>
              <p className="text-foreground/70">
                Review your Phase 2 setup before going live
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Phase 2 Completion</span>
              <span>{getCompletionPercentage()}% Complete</span>
            </div>
            <Progress value={getCompletionPercentage()} className="w-full" />
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

          {/* Setup Summary */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Setup Summary</h3>
            <div className="grid gap-4">
              {phase2Steps.map((step) => {
                const status = getStepStatus(step.id);
                const summary = getStepSummary(step.id);
                const Icon = step.icon;

                return (
                  <Card key={step.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          status === 'completed' 
                            ? 'bg-green-100 text-green-600' 
                            : 'bg-gray-100 text-gray-400'
                        }`}>
                          {status === 'completed' ? (
                            <CheckCircle className="w-5 h-5" />
                          ) : (
                            <Icon className="w-5 h-5" />
                          )}
                        </div>
                        <div>
                          <h4 className="font-semibold">{step.title}</h4>
                          <p className="text-sm text-gray-600">{step.description}</p>
                          <p className="text-sm text-gray-500 mt-1">{summary}</p>
                        </div>
                      </div>
                      <Badge className={status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}>
                        {status === 'completed' ? 'Complete' : 'Pending'}
                      </Badge>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Next Steps */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">What Happens Next?</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="p-4 border-blue-200 bg-blue-50">
                <div className="flex items-center gap-3 mb-2">
                  <CheckCircle className="w-5 h-5 text-blue-600" />
                  <h4 className="font-semibold text-blue-900">Account Activation</h4>
                </div>
                <p className="text-sm text-blue-800">
                  Your account will be activated and you'll have access to the full dashboard.
                </p>
              </Card>

              <Card className="p-4 border-green-200 bg-green-50">
                <div className="flex items-center gap-3 mb-2">
                  <Users className="w-5 h-5 text-green-600" />
                  <h4 className="font-semibold text-green-900">Start Accepting Bookings</h4>
                </div>
                <p className="text-sm text-green-800">
                  Customers can now discover and book your services through the platform.
                </p>
              </Card>

              <Card className="p-4 border-purple-200 bg-purple-50">
                <div className="flex items-center gap-3 mb-2">
                  <DollarSign className="w-5 h-5 text-purple-600" />
                  <h4 className="font-semibold text-purple-900">Receive Payments</h4>
                </div>
                <p className="text-sm text-purple-800">
                  Payments will be processed automatically and deposited to your account.
                </p>
              </Card>

              <Card className="p-4 border-orange-200 bg-orange-50">
                <div className="flex items-center gap-3 mb-2">
                  <Info className="w-5 h-5 text-orange-600" />
                  <h4 className="font-semibold text-orange-900">Dashboard Access</h4>
                </div>
                <p className="text-sm text-orange-800">
                  Manage bookings, staff, and business settings from your dashboard.
                </p>
              </Card>
            </div>
          </div>

          {/* Information Alert */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Important:</strong> You can always update your settings and information from your dashboard after going live. 
              This setup ensures you have everything configured to start accepting customers.
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
              onClick={handleCompleteSetup}
              disabled={loading || !allStepsCompleted}
              className="bg-green-600 hover:bg-green-700 ml-auto"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Completing Setup...
                </>
              ) : (
                <>
                  Complete Setup & Go Live
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>

          {!allStepsCompleted && (
            <Alert className="border-yellow-200 bg-yellow-50">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                Please complete all setup steps before going live. You can navigate back to any incomplete step to finish the setup.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
