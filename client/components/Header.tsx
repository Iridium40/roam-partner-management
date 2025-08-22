import { Button } from "@/components/ui/button";
import { Menu, X, Calendar } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { EdgeNotificationCenter } from "@/components/EdgeNotificationCenter";
import { CustomerAvatarDropdown } from "@/components/CustomerAvatarDropdown";
import { useAuth } from "@/contexts/AuthContext";
import { useSystemConfig } from "@/hooks/useSystemConfig";

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { customer, isAuthenticated } = useAuth();
  const { siteLogo } = useSystemConfig();

  return (
    <nav className="border-b bg-background/80 backdrop-blur-md sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            <Link to="/" className="flex items-center">
              <img
                src={siteLogo || "https://cdn.builder.io/api/v1/image/assets%2Fa42b6f9ec53e4654a92af75aad56d14f%2F38446bf6c22b453fa45caf63b0513e21?format=webp&width=800"}
                alt="ROAM - Your Best Life. Everywhere."
                className="h-10 w-auto hover:opacity-80 transition-opacity"
                onError={(e) => {
                  // Fallback to default logo if dynamic logo fails to load
                  const target = e.target as HTMLImageElement;
                  target.src = "https://cdn.builder.io/api/v1/image/assets%2Fa42b6f9ec53e4654a92af75aad56d14f%2F38446bf6c22b453fa45caf63b0513e21?format=webp&width=800";
                }}
              />
            </Link>
            <span className="text-2xl font-semibold text-roam-blue">Services</span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <a
              href="#services"
              className="text-foreground/70 hover:text-roam-blue transition-colors"
            >
              Services
            </a>
            <a
              href="#how-it-works"
              className="text-foreground/70 hover:text-roam-blue transition-colors"
            >
              How it Works
            </a>
            <Link
              to="/about"
              className="text-foreground/70 hover:text-roam-blue transition-colors"
            >
              About
            </Link>
            <Link
              to="/contact"
              className="text-foreground/70 hover:text-roam-blue transition-colors"
            >
              Contact
            </Link>
            
            {isAuthenticated ? (
              <>
                <EdgeNotificationCenter />
                <Button
                  asChild
                  variant="ghost"
                  className="text-foreground hover:bg-foreground/10 border-2 border-gray-400"
                >
                  <Link to="/customer/bookings" className="flex items-center">
                    <Calendar className="w-4 h-4 mr-2" />
                    My Bookings
                  </Link>
                </Button>
                <CustomerAvatarDropdown />
              </>
            ) : (
              <>
                <Button
                  asChild
                  variant="outline"
                  className="border-roam-blue text-roam-blue hover:bg-roam-blue hover:text-white"
                >
                  <Link to="/sign-in">Sign In</Link>
                </Button>
                <Button asChild className="bg-roam-blue hover:bg-roam-blue/90">
                  <Link to="/become-a-provider">Become a Provider</Link>
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t">
            <div className="flex flex-col space-y-4">
              <a
                href="#services"
                className="text-foreground/70 hover:text-roam-blue transition-colors"
              >
                Services
              </a>
              <a
                href="#how-it-works"
                className="text-foreground/70 hover:text-roam-blue transition-colors"
              >
                How it Works
              </a>
              <Link
                to="/about"
                className="text-foreground/70 hover:text-roam-blue transition-colors"
              >
                About
              </Link>
              <Link
                to="/contact"
                className="text-foreground/70 hover:text-roam-blue transition-colors"
              >
                Contact
              </Link>
              
              {isAuthenticated ? (
                <>
                  <Link
                    to="/customer/bookings"
                    className="text-foreground/70 hover:text-roam-blue transition-colors flex items-center"
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    My Bookings
                  </Link>
                  <Link
                    to="/customer/profile"
                    className="text-foreground/70 hover:text-roam-blue transition-colors"
                  >
                    My Profile
                  </Link>
                  <Link
                    to="/customer/settings"
                    className="text-foreground/70 hover:text-roam-blue transition-colors"
                  >
                    Settings
                  </Link>
                </>
              ) : (
                <div className="flex flex-col space-y-2 pt-4">
                  <Button
                    asChild
                    variant="outline"
                    className="border-roam-blue text-roam-blue hover:bg-roam-blue hover:text-white"
                  >
                    <Link to="/sign-in">Sign In</Link>
                  </Button>
                  <Button asChild className="bg-roam-blue hover:bg-roam-blue/90">
                    <Link to="/become-a-provider">Become a Provider</Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
