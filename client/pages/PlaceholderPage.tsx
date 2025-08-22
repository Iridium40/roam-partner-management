import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Construction, ArrowLeft, MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";

interface PlaceholderPageProps {
  title: string;
  description: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export default function PlaceholderPage({ 
  title, 
  description, 
  icon: Icon = Construction 
}: PlaceholderPageProps) {
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
            <Card className="border-dashed border-2 border-roam-light-blue/30">
              <CardContent className="p-12">
                <div className="w-16 h-16 bg-gradient-to-br from-roam-blue to-roam-light-blue rounded-full flex items-center justify-center mx-auto mb-6">
                  <Icon className="w-8 h-8 text-white" />
                </div>
                
                <h1 className="text-3xl sm:text-4xl font-bold mb-4 text-roam-blue">
                  {title}
                </h1>
                
                <p className="text-lg text-foreground/70 mb-8">
                  {description}
                </p>
                
                <div className="bg-roam-light-blue/10 rounded-lg p-6 mb-8 border border-roam-light-blue/20">
                  <p className="text-sm text-foreground/80">
                    🚧 This feature is currently under development. We're working hard to bring you amazing new provider tools! 
                    In the meantime, explore your dashboard or contact support with any questions.
                  </p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button asChild variant="outline" className="border-roam-blue text-roam-blue hover:bg-roam-blue hover:text-white">
                    <Link to="/provider-portal">
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back to Portal
                    </Link>
                  </Button>
                  
                  <Button className="bg-roam-blue hover:bg-roam-blue/90">
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Contact Support
                  </Button>
                </div>
                
                <div className="mt-8 text-sm text-foreground/60">
                  <p>Have suggestions for provider features? We'd love to hear from you!</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
