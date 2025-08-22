import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Announcement } from "@/lib/database.types";

interface AnnouncementPopupProps {
  isCustomer?: boolean;
}

export function AnnouncementPopup({ isCustomer = false }: AnnouncementPopupProps) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnnouncements();
  }, [isCustomer]);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0]; // Get YYYY-MM-DD format

      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .eq("is_active", true)
        .eq("announcement_audience", "customer")
        .or(`start_date.is.null,start_date.lte.${today}`)
        .or(`end_date.is.null,end_date.gte.${today}`)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching announcements:", error);
        return;
      }

      // Additional client-side filtering to ensure date range is valid
      const validAnnouncements = (data || []).filter((announcement) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Reset time to start of day

        // Check start date
        if (announcement.start_date) {
          const startDate = new Date(announcement.start_date);
          startDate.setHours(0, 0, 0, 0);
          if (startDate > today) return false;
        }

        // Check end date
        if (announcement.end_date) {
          const endDate = new Date(announcement.end_date);
          endDate.setHours(23, 59, 59, 999); // Set to end of day
          if (endDate < today) return false;
        }

        return true;
      });

      setAnnouncements(validAnnouncements);
      
      // Show popup if there are announcements and user is a customer
      if (validAnnouncements.length > 0 && isCustomer) {
        setIsOpen(true);
      }
    } catch (error) {
      console.error("Error fetching announcements:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setCurrentIndex(0);
  };

  const handleNext = () => {
    if (currentIndex < announcements.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      handleClose();
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  if (loading || announcements.length === 0) {
    return null;
  }

  const currentAnnouncement = announcements[currentIndex];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-md mx-auto">
        <DialogHeader className="relative">
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-6 w-6 p-0"
            onClick={handleClose}
          >
            <X className="h-4 w-4" />
          </Button>
          <DialogTitle className="text-lg font-semibold pr-8">
            {currentAnnouncement.title}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="text-sm text-foreground/80 whitespace-pre-wrap">
            {currentAnnouncement.content}
          </div>

          {/* Navigation and counter */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-xs text-foreground/60">
              {announcements.length > 1 && (
                <span>
                  {currentIndex + 1} of {announcements.length}
                </span>
              )}
            </div>
            
            <div className="flex gap-2">
              {announcements.length > 1 && currentIndex > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevious}
                >
                  Previous
                </Button>
              )}
              
              <Button
                size="sm"
                onClick={handleNext}
                className="bg-roam-blue hover:bg-roam-blue/90"
              >
                {currentIndex < announcements.length - 1 ? "Next" : "Close"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default AnnouncementPopup;
