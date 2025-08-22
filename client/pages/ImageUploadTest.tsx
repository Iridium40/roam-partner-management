import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, TestTube2, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Import our Phase 2 components for testing
import BusinessProfileSetup from '@/components/Phase2Components/BusinessProfileSetup';
import PersonalProfileSetup from '@/components/Phase2Components/PersonalProfileSetup';

export default function ImageUploadTest() {
  const navigate = useNavigate();
  const [currentTest, setCurrentTest] = React.useState<'business' | 'personal' | null>(null);

  // Real test business ID created in database
  const mockBusinessId = '12345678-1234-1234-1234-123456789abc';
  const mockUserId = 'test-user-456';

  const handleTestComplete = (data: any) => {
    console.log('Test completed with data:', data);
    alert('Image upload test completed! Check console for data.');
    setCurrentTest(null);
  };

  const handleBack = () => {
    setCurrentTest(null);
  };

  if (currentTest === 'business') {
    return (
      <BusinessProfileSetup
        businessId={mockBusinessId}
        userId={mockUserId}
        onComplete={handleTestComplete}
        onBack={handleBack}
        initialData={{
          businessName: 'Test Business',
          detailedDescription: 'This is a test business for image upload testing.',
          websiteUrl: 'https://testbusiness.com',
          socialMediaLinks: {}
        }}
      />
    );
  }

  if (currentTest === 'personal') {
    return (
      <PersonalProfileSetup
        businessId={mockBusinessId}
        userId={mockUserId}
        onComplete={handleTestComplete}
        onBack={handleBack}
        initialData={{
          professionalTitle: 'Test Provider',
          professionalBio: 'This is a test professional bio for image upload testing. I am testing the personal profile setup component.',
          yearsExperience: 5,
          specialties: ['Test Specialty 1', 'Test Specialty 2'],
          certifications: [],
          education: [],
          awards: [],
          socialLinks: {}
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-roam-light-blue/10">
      {/* Navigation */}
      <nav className="border-b bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/provider-portal")}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Portal
              </Button>
              <div className="flex items-center space-x-2">
                <img
                  src="https://cdn.builder.io/api/v1/image/assets%2Fa42b6f9ec53e4654a92af75aad56d14f%2F38446bf6c22b453fa45caf63b0513e21?format=webp&width=800"
                  alt="ROAM Logo"
                  className="h-8 w-auto"
                />
              </div>
            </div>
            <Badge variant="outline" className="border-roam-blue text-roam-blue">
              Image Upload Test
            </Badge>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-roam-blue to-blue-600 rounded-full flex items-center justify-center">
                  <TestTube2 className="w-8 h-8 text-white" />
                </div>
                <div>
                  <CardTitle className="text-3xl text-roam-blue">Image Upload Test</CardTitle>
                  <p className="text-foreground/70">Test the Phase 2 image upload functionality</p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-8">
              <Alert className="border-blue-200 bg-blue-50">
                <CheckCircle className="h-5 w-5 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  <strong>Storage Setup Complete!</strong> The business-images bucket is configured with proper security policies.
                  You can now test uploading business logos, cover images, and personal avatars.
                </AlertDescription>
              </Alert>

              <div className="grid gap-6 md:grid-cols-2">
                {/* Business Profile Test */}
                <Card className="border-2 border-dashed border-gray-300 hover:border-roam-blue transition-colors">
                  <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                      🏢 Business Profile Test
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-foreground/70">
                      Test uploading business branding images:
                    </p>
                    <ul className="text-sm space-y-1 text-foreground/60">
                      <li>• Business Logo (512x512px, max 2MB)</li>
                      <li>• Business Cover Image (1200x400px, max 5MB)</li>
                      <li>• Image validation and resizing</li>
                      <li>• Supabase storage integration</li>
                    </ul>
                    <Button
                      onClick={() => setCurrentTest('business')}
                      className="w-full bg-roam-blue hover:bg-roam-blue/90"
                    >
                      Test Business Images
                    </Button>
                  </CardContent>
                </Card>

                {/* Personal Profile Test */}
                <Card className="border-2 border-dashed border-gray-300 hover:border-roam-blue transition-colors">
                  <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                      👤 Personal Profile Test
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-foreground/70">
                      Test uploading personal profile images:
                    </p>
                    <ul className="text-sm space-y-1 text-foreground/60">
                      <li>• Personal Avatar (400x400px, max 1MB)</li>
                      <li>• Personal Cover Image (1200x400px, max 3MB)</li>
                      <li>• Professional profile form</li>
                      <li>• Certifications and credentials</li>
                    </ul>
                    <Button
                      onClick={() => setCurrentTest('personal')}
                      className="w-full bg-roam-blue hover:bg-roam-blue/90"
                    >
                      Test Personal Images
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Test Instructions */}
              <Card className="bg-gray-50 border-gray-200">
                <CardHeader>
                  <CardTitle className="text-lg">Test Instructions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <h4 className="font-semibold mb-2">What to Test:</h4>
                      <ul className="text-sm space-y-1">
                        <li>✅ Image validation (size, format)</li>
                        <li>✅ Image preview before upload</li>
                        <li>✅ Upload progress indicators</li>
                        <li>✅ Error handling</li>
                        <li>✅ Image resizing and optimization</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Expected Behavior:</h4>
                      <ul className="text-sm space-y-1">
                        <li>• Images automatically resize if too large</li>
                        <li>• Upload progress shows during processing</li>
                        <li>• Success confirmation when complete</li>
                        <li>• Images stored in organized folders</li>
                        <li>• Public URLs generated for display</li>
                      </ul>
                    </div>
                  </div>

                  <Alert className="border-amber-200 bg-amber-50">
                    <AlertDescription className="text-amber-800">
                      <strong>Note:</strong> This is a test environment. Uploaded images will use mock business and user IDs.
                      Check your browser's developer console for detailed upload information.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>

              {/* Storage Info */}
              <Card className="bg-green-50 border-green-200">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-green-900 mb-1">Storage Configuration</h4>
                      <p className="text-sm text-green-800">
                        The business-images bucket is properly configured with RLS policies, 
                        file size limits, and MIME type restrictions. Images will be stored in 
                        organized folders based on business ID and user ID.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
