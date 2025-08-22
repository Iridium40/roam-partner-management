import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, ArrowLeft, Home } from "lucide-react";
import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-roam-light-blue/10">
      {/* Simple Navigation */}
      <nav className="border-b bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <img
                src="https://cdn.builder.io/api/v1/image/assets%2Fa42b6f9ec53e4654a92af75aad56d14f%2F38446bf6c22b453fa45caf63b0513e21?format=webp&width=800"
                alt="ROAM - Your Best Life. Everywhere."
                className="h-8 w-auto"
              />
            </div>
            <div className="text-sm text-foreground/60">Provider Portal</div>
          </div>
        </div>
      </nav>

      <section className="py-20 lg:py-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto text-center">
            <Card className="border-border/50">
              <CardContent className="p-12">
                <div className="w-20 h-20 bg-gradient-to-br from-roam-blue to-roam-light-blue rounded-full flex items-center justify-center mx-auto mb-6">
                  <Shield className="w-10 h-10 text-white" />
                </div>

                <h1 className="text-4xl sm:text-5xl font-bold mb-4 text-roam-blue">
                  404
                </h1>

                <h2 className="text-2xl font-semibold mb-4">
                  Page Not Found
                </h2>

                <p className="text-lg text-foreground/70 mb-8">
                  The page you're looking for doesn't exist in the Provider Portal. 
                  Let's get you back to managing your business.
                </p>

                <div className="bg-roam-light-blue/10 rounded-lg p-6 mb-8 border border-roam-light-blue/20">
                  <p className="text-sm text-foreground/80">
                    💡 <strong>Quick Access:</strong> Use the navigation to access your 
                    dashboard, manage your business, or sign in to your provider account.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button
                    asChild
                    className="bg-roam-blue hover:bg-roam-blue/90"
                  >
                    <Link to="/provider-portal">
                      <Home className="w-4 h-4 mr-2" />
                      Provider Portal
                    </Link>
                  </Button>

                  <Button
                    asChild
                    variant="outline"
                    className="border-roam-blue text-roam-blue hover:bg-roam-blue hover:text-white"
                  >
                    <Link to="/dashboard">
                      <Shield className="w-4 h-4 mr-2" />
                      Dashboard
                    </Link>
                  </Button>
                </div>

                <div className="mt-8 text-sm text-foreground/60">
                  <p>
                    Need help? Contact ROAM Provider Support
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
