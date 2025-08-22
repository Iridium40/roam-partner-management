import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  CheckCircle,
  Clock,
  Shield,
  User,
  Building,
  Calendar,
  Users,
  Banknote,
  DollarSign,
  Star,
  ArrowRight,
  Sparkles
} from 'lucide-react';

interface WelcomeBackStepProps {
  businessName?: string;
  onContinue: () => void;
  userId?: string;
  businessId?: string;
  className?: string;
}

interface SetupStep {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  estimatedTime: string;
  completed?: boolean;
}

const setupSteps: SetupStep[] = [
  {
    id: 'business_profile',
    title: 'Business Profile & Branding',
    description: 'Upload logo, cover image, and complete business details',
    icon: Building,
    estimatedTime: '3-5 minutes'
  },
  {
    id: 'personal_profile',
    title: 'Personal Profile',
    description: 'Professional photo and personal information',
    icon: User,
    estimatedTime: '2-3 minutes'
  },
  {
    id: 'business_hours',
    title: 'Business Hours & Availability',
    description: 'Set your operating hours and availability preferences',
    icon: Calendar,
    estimatedTime: '2-4 minutes'
  },
  {
    id: 'staff_management',
    title: 'Staff Management',
    description: 'Add team members and set their permissions',
    icon: Users,
    estimatedTime: '3-6 minutes'
  },
  {
    id: 'banking_payout',
    title: 'Banking & Payouts',
    description: 'Configure payment processing and payout preferences',
    icon: Banknote,
    estimatedTime: '2-3 minutes'
  },
  {
    id: 'service_pricing',
    title: 'Service Pricing',
    description: 'Set pricing for your services and add-ons',
    icon: DollarSign,
    estimatedTime: '4-8 minutes'
  }
];

export default function WelcomeBackStep({ 
  businessName, 
  onContinue, 
  userId, 
  businessId,
  className = "" 
}: WelcomeBackStepProps) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<any>(null);
  const [stepsWithProgress, setStepsWithProgress] = useState<SetupStep[]>(setupSteps);

  useEffect(() => {
    loadProgress();
  }, [businessId]);

  const loadProgress = async () => {
    if (!businessId) return;

    try {
      // Try to load existing progress
      const response = await fetch(`/api/onboarding/phase2-progress/${businessId}`);
      if (response.ok) {
        const progressData = await response.json();
        setProgress(progressData);
        
        // Update steps with completion status
        const updatedSteps = setupSteps.map(step => ({
          ...step,
          completed: progressData[`${step.id}_completed`] || false
        }));
        setStepsWithProgress(updatedSteps);
      }
    } catch (error) {
      console.log('Could not load progress, starting fresh');
    }
  };

  const handleStart = async () => {
    setLoading(true);
    
    try {
      // Mark welcome step as completed
      if (businessId) {
        await fetch('/api/onboarding/save-phase2-progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            business_id: businessId,
            step: 'welcome',
            data: { started_at: new Date().toISOString() }
          })
        });
      }

      onContinue();
    } catch (error) {
      console.error('Error marking welcome step complete:', error);
      // Continue anyway - don't block user
      onContinue();
    } finally {
      setLoading(false);
    }
  };

  const completedSteps = stepsWithProgress.filter(step => step.completed).length;
  const progressPercentage = Math.round((completedSteps / setupSteps.length) * 100);
  const estimatedTotalTime = setupSteps.reduce((total, step) => {
    const [min, max] = step.estimatedTime.split('-').map(t => parseInt(t));
    return total + ((min + (max || min)) / 2);
  }, 0);

  return (
    <div className={`max-w-4xl mx-auto ${className}`}>
      <Card>
        <CardHeader className="text-center pb-4">
          <div className="w-20 h-20 bg-gradient-to-br from-roam-blue to-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
          
          <CardTitle className="text-3xl text-roam-blue mb-2">
            Welcome Back!
          </CardTitle>
          
          {businessName && (
            <p className="text-lg text-foreground/80">
              Let's complete the setup for <span className="font-semibold text-roam-blue">{businessName}</span>
            </p>
          )}
        </CardHeader>

        <CardContent className="space-y-8">
          {/* Status Alert */}
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <AlertDescription className="text-green-800">
              <strong>Congratulations!</strong> Your application has been approved. 
              Complete the setup below to start accepting bookings on ROAM.
            </AlertDescription>
          </Alert>

          {/* Progress Overview */}
          {completedSteps > 0 && (
            <div className="bg-accent/30 rounded-lg p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-lg">Your Progress</h3>
                <Badge variant="outline" className="bg-white">
                  {completedSteps} of {setupSteps.length} completed
                </Badge>
              </div>
              
              <Progress value={progressPercentage} className="mb-2" />
              
              <p className="text-sm text-foreground/70">
                {progressPercentage}% complete • Continue where you left off
              </p>
            </div>
          )}

          {/* Setup Steps Overview */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold">Setup Steps</h3>
              <div className="flex items-center gap-2 text-sm text-foreground/70">
                <Clock className="w-4 h-4" />
                <span>~{Math.round(estimatedTotalTime)} minutes total</span>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {stepsWithProgress.map((step, index) => {
                const Icon = step.icon;
                
                return (
                  <div
                    key={step.id}
                    className={`relative p-4 border rounded-lg transition-all duration-200 ${
                      step.completed 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-white border-gray-200 hover:border-roam-blue/30'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                        step.completed 
                          ? 'bg-green-100' 
                          : 'bg-roam-blue/10'
                      }`}>
                        {step.completed ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <Icon className="w-5 h-5 text-roam-blue" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className={`font-medium ${
                            step.completed ? 'text-green-800' : 'text-foreground'
                          }`}>
                            {step.title}
                          </h4>
                          {step.completed && (
                            <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                              Done
                            </Badge>
                          )}
                        </div>
                        
                        <p className={`text-sm ${
                          step.completed ? 'text-green-600' : 'text-foreground/70'
                        }`}>
                          {step.description}
                        </p>
                        
                        <div className="flex items-center gap-1 mt-2">
                          <Clock className="w-3 h-3 text-foreground/50" />
                          <span className="text-xs text-foreground/50">
                            {step.estimatedTime}
                          </span>
                        </div>
                      </div>
                    </div>

                    {index === 0 && !step.completed && (
                      <div className="absolute -top-2 -right-2">
                        <Badge className="bg-roam-blue text-white text-xs">
                          Start Here
                        </Badge>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Key Benefits */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6">
            <h3 className="font-semibold text-lg mb-4 text-center">
              What You'll Gain
            </h3>
            
            <div className="grid gap-4 md:grid-cols-3">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Star className="w-6 h-6 text-blue-600" />
                </div>
                <h4 className="font-medium mb-1">Professional Presence</h4>
                <p className="text-sm text-foreground/70">
                  Complete profile with branding and credentials
                </p>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
                <h4 className="font-medium mb-1">Start Earning</h4>
                <p className="text-sm text-foreground/70">
                  Accept bookings and receive payments seamlessly
                </p>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Shield className="w-6 h-6 text-purple-600" />
                </div>
                <h4 className="font-medium mb-1">Verified Provider</h4>
                <p className="text-sm text-foreground/70">
                  Trusted badge and full platform access
                </p>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="text-center pt-4">
            <Button
              onClick={handleStart}
              size="lg"
              className="bg-roam-blue hover:bg-roam-blue/90 px-8"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Starting...
                </>
              ) : (
                <>
                  {completedSteps > 0 ? 'Continue Setup' : 'Start Setup'}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>

            <p className="text-sm text-foreground/60 mt-3">
              You can save progress and return anytime
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
