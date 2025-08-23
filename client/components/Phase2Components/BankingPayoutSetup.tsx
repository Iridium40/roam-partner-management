import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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
  Banknote,
  CreditCard,
  Shield,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Loader2,
  Info,
  ExternalLink,
  Lock
} from 'lucide-react';
import { PlaidBankConnection } from '@/components/PlaidBankConnection';

interface BankingPayoutData {
  stripeConnected: boolean;
  plaidConnected: boolean;
  bankAccount?: {
    account_id: string;
    mask: string;
    name: string;
    type: string;
    institution_name: string;
  };
}

interface BankingPayoutSetupProps {
  businessId: string;
  userId: string;
  onComplete: (data: BankingPayoutData) => void;
  onBack?: () => void;
  initialData?: BankingPayoutData;
  className?: string;
}



export default function BankingPayoutSetup({
  businessId,
  userId,
  onComplete,
  onBack,
  initialData,
  className = ""
}: BankingPayoutSetupProps) {
  const [bankingData, setBankingData] = useState<BankingPayoutData>(
    initialData || {
      stripeConnected: false,
      plaidConnected: false,
    }
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectingStripe, setConnectingStripe] = useState(false);

  const updateBankingData = (field: keyof BankingPayoutData, value: any) => {
    setBankingData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const connectStripeAccount = async () => {
    try {
      setConnectingStripe(true);
      setError(null);

      // Get business profile data for Stripe Connect
      const businessResponse = await fetch(`/api/business/profile/${businessId}`);
      if (!businessResponse.ok) {
        throw new Error('Failed to fetch business profile');
      }
      const businessProfile = await businessResponse.json();
      
      // Map business profile fields to Stripe Connect requirements
      const businessName = businessProfile.businessName || 'Test Business';
      const email = businessProfile.email || 'test@example.com';
      const businessType = businessProfile.business_type || 'llc';

      const response = await fetch('/api/stripe/create-connect-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          businessId,
          businessType,
          businessName,
          email,
          taxInfo: {
            business_tax_id: '12-3456789', // Mock EIN for testing
            business_tax_id_type: 'ein',
            mcc: '5734', // Computer Software Stores
            product_description: 'Professional services',
            url: businessProfile.websiteUrl || 'https://example.com'
          },
          country: 'US',
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true }
          }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create Stripe Connect account');
      }

      const result = await response.json();
      
      // Redirect to Stripe Connect onboarding
      if (result.onboarding_url) {
        window.location.href = result.onboarding_url;
      } else {
        throw new Error('No onboarding URL received from Stripe');
      }
    } catch (error) {
      console.error('Error connecting Stripe:', error);
      setError(error instanceof Error ? error.message : 'Failed to connect Stripe account');
    } finally {
      setConnectingStripe(false);
    }
  };

  const completionPercentage = () => {
    let completed = 0;
    const total = 2; // stripe connection and plaid connection

    if (bankingData.stripeConnected) completed++;
    if (bankingData.plaidConnected) completed++;

    return Math.round((completed / total) * 100);
  };

  const canSubmit = () => {
    return bankingData.stripeConnected && bankingData.plaidConnected;
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      // Save banking & payout data to database
      const response = await fetch('/api/onboarding/save-phase2-progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          businessId,
          userId,
          step: 'banking_payout',
          data: bankingData,
          completed: true
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save banking & payout data');
      }

      // Call the onComplete callback
      onComplete(bankingData);
    } catch (error) {
      console.error('Error saving banking & payout data:', error);
      setError(error instanceof Error ? error.message : 'Failed to save banking & payout data');
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className={`max-w-4xl mx-auto ${className}`}>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-roam-blue to-blue-600 rounded-full flex items-center justify-center">
              <Banknote className="w-6 h-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl text-roam-blue">
                Banking & Payouts
              </CardTitle>
              <p className="text-foreground/70">
                Configure how you'll receive payments from customers
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

          {/* Payment Processing Information */}
          <div className="space-y-4">
            <Label className="text-lg font-semibold">Payment Processing</Label>
            <Card className="p-4 border-blue-200 bg-blue-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-blue-900">Stripe Connect</h4>
                  <p className="text-sm text-blue-800">Secure payment processing & payouts</p>
                </div>
              </div>
              <div className="mt-3 space-y-2 text-sm text-blue-700">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-blue-600" />
                  <span>Instant payouts every Friday</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-blue-600" />
                  <span>Secure payment processing</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-blue-600" />
                  <span>Automatic tax handling</span>
                </div>
              </div>
              <div className="mt-3 p-2 bg-blue-100 rounded text-xs text-blue-800">
                <strong>Note:</strong> This shows what Stripe Connect provides. You'll need to connect your account below.
              </div>
            </Card>
          </div>

                    {/* Stripe Connect Setup */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-lg font-semibold">Stripe Connect Setup</Label>
              <Badge className={bankingData.stripeConnected ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}>
                {bankingData.stripeConnected ? 'Connected' : 'Not Connected'}
              </Badge>
            </div>
            
            {!bankingData.stripeConnected ? (
              <Card className="p-6">
                <div className="text-center space-y-4">
                  <Shield className="w-12 h-12 text-gray-400 mx-auto" />
                  <div>
                    <h4 className="font-semibold text-gray-900">Connect Your Stripe Account</h4>
                    <p className="text-gray-600">
                      Set up your Stripe Connect account to receive payments securely
                    </p>
                  </div>
                  <Button 
                    onClick={connectStripeAccount}
                    disabled={connectingStripe}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {connectingStripe ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Connect Stripe Account
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            ) : (
              <Card className="p-4 border-green-200 bg-green-50">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  <div>
                    <h4 className="font-semibold text-green-800">Stripe Account Connected</h4>
                    <p className="text-green-700">Your account is ready to receive payments</p>
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* Bank Account Connection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-lg font-semibold">Bank Account Connection</Label>
              <Badge className={bankingData.plaidConnected ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}>
                {bankingData.plaidConnected ? 'Connected' : 'Not Connected'}
              </Badge>
            </div>
            
            {!bankingData.plaidConnected ? (
              <Card className="p-6">
                <div className="text-center space-y-4">
                  <Banknote className="w-12 h-12 text-gray-400 mx-auto" />
                  <div>
                    <h4 className="font-semibold text-gray-900">Connect Your Bank Account</h4>
                    <p className="text-gray-600">
                      Securely connect your bank account for automatic payouts
                    </p>
                  </div>
                  <PlaidBankConnection
                      userId={userId}
                      businessId={businessId}
                      businessType="llc"
                      onConnectionComplete={(connectionData) => {
                        setBankingData(prev => ({
                          ...prev,
                          plaidConnected: true,
                          bankAccount: {
                            account_id: connectionData.accounts[0]?.account_id || '',
                            mask: connectionData.accounts[0]?.mask || '',
                            name: connectionData.accounts[0]?.name || '',
                            type: connectionData.accounts[0]?.type || '',
                            institution_name: connectionData.institution.name,
                          }
                        }));
                      }}
                      onConnectionError={(error) => {
                        setError(error);
                      }}
                      className="w-full"
                    />
                    
                    {/* Debug Information */}
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                      <p className="text-sm text-gray-700">
                        <strong>Debug Info:</strong> 
                        <br />• The PlaidBankConnection component should show a "Connect Bank Account" button
                        <br />• Check browser console for any API errors
                        <br />• Make sure your Plaid environment variables are set
                      </p>
                    </div>
                </div>
              </Card>
            ) : (
              <Card className="p-4 border-green-200 bg-green-50">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  <div>
                    <h4 className="font-semibold text-green-800">Bank Account Connected</h4>
                    <p className="text-green-700">
                      {bankingData.bankAccount?.institution_name} •••• {bankingData.bankAccount?.mask}
                    </p>
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* Platform Payout Settings */}
          <div className="space-y-4">
            <Label className="text-lg font-semibold">Platform Payout Settings</Label>
            <Card className="p-4 border-blue-200 bg-blue-50">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <Info className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-blue-900">Weekly Payouts</h4>
                    <p className="text-sm text-blue-800">Payouts are processed every Friday</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <Info className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-blue-900">Minimum Payout Amount</h4>
                    <p className="text-sm text-blue-800">Set by platform (typically $25 minimum)</p>
                  </div>
                </div>
              </div>
            </Card>
            <p className="text-sm text-gray-600">
              These settings are controlled at the platform level to ensure consistent payout processing for all providers.
            </p>
          </div>

          {/* Automatic Payouts Information */}
          <div className="space-y-4">
            <Label className="text-lg font-semibold">Automatic Payouts</Label>
            <Card className="p-4 border-green-200 bg-green-50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-green-900">Automated Payouts Enabled</h4>
                  <p className="text-sm text-green-800">
                    All providers receive automatic payouts every Friday. No action required.
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Security Information */}
          <Alert>
            <Lock className="h-4 w-4" />
            <AlertDescription>
              <strong>Security:</strong> All payment information is encrypted and processed securely through Stripe. 
              We never store your full bank account or credit card details.
            </AlertDescription>
          </Alert>

          {/* Information Alert */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Note:</strong> You can change your payout settings anytime from your dashboard. 
              The first payout may take 7-14 days to process for new accounts.
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
              {!canSubmit() && (
                <span className="text-xs mr-2">
                  {!bankingData.stripeConnected && !bankingData.plaidConnected 
                    ? "Connect Stripe & Bank Account" 
                    : !bankingData.stripeConnected 
                    ? "Connect Stripe Account" 
                    : "Connect Bank Account"}
                </span>
              )}
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  Continue to Service Pricing
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
