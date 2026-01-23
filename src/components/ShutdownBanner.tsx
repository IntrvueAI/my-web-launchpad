/**
 * ShutdownBanner Component
 * Displays a dismissible banner notifying users of the service shutdown date.
 * Uses localStorage to remember if the user has dismissed the banner.
 */
import { useState, useEffect } from "react";
import { X, Calendar } from "lucide-react";

const STORAGE_KEY = "intrvue-shutdown-banner-dismissed";

export const ShutdownBanner = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if banner was previously dismissed
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (!dismissed) {
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem(STORAGE_KEY, "true");
  };

  if (!isVisible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-primary text-primary-foreground shadow-lg">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Banner content */}
          <div className="flex items-center gap-3 flex-1 justify-center">
            <Calendar className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm md:text-base font-medium text-center">
              <span className="font-bold">Important:</span> Intrvue.AI services will end on{" "}
              <span className="font-bold underline">February 9th, 2025</span> for this exam cycle. 
              Thank you for your support!
            </p>
          </div>
          
          {/* Dismiss button */}
          <button
            onClick={handleDismiss}
            className="p-1.5 hover:bg-primary-foreground/20 rounded-full transition-colors flex-shrink-0"
            aria-label="Dismiss banner"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
