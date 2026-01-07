import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { SecurityProvider } from "@/components/SecurityProvider";
import { ClickSpark } from "@/components/ui/click-spark";
import { Heart, Snowflake, Mail } from "lucide-react";
import Snowfall from "@/components/Snowfall";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import AdminDashboard from "./pages/AdminDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Set to true to display the seasonal dormant notice
const IS_SITE_DOWN = true;

// Admin email that can bypass downtime
const ADMIN_BYPASS_EMAIL = "ibrahim@khan.cc";

const AppContent = () => {
  const { user } = useAuth();
  
  // Check if current user is the admin who can bypass downtime
  const isAdminBypass = user?.email === ADMIN_BYPASS_EMAIL;
  const shouldShowDowntime = IS_SITE_DOWN && !isAdminBypass;

  return (
    <ClickSpark
      sparkColor="#FF7F50"
      sparkSize={12}
      sparkRadius={20}
      sparkCount={8}
      duration={500}
      className="fixed inset-0 z-50 pointer-events-none"
      style={{ pointerEvents: 'none' }}
    >
      <div className="w-full h-full pointer-events-auto">
        <Snowfall />
        <Toaster />
        <Sonner />
        {shouldShowDowntime && (
          <div className="fixed inset-0 bg-gradient-to-br from-background via-winter-frost/50 to-background z-50 flex items-center justify-center p-4">
            <div className="max-w-lg text-center space-y-6 p-8 bg-card/80 backdrop-blur-sm rounded-2xl border border-winter-soft/40 shadow-xl">
              {/* Logo */}
              <div className="flex justify-center">
                <img src="/lovable-uploads/logo.png" alt="Intrvue.ai Logo" className="h-16 w-auto" />
              </div>
              
              {/* Decorative snowflakes */}
              <div className="flex justify-center gap-3">
                <Snowflake className="w-5 h-5 text-winter animate-pulse" />
                <Heart className="w-5 h-5 text-primary" />
                <Snowflake className="w-5 h-5 text-winter animate-pulse delay-300" />
              </div>
              
              {/* Main message */}
              <div className="space-y-4">
                <h1 className="text-2xl font-bold text-foreground">
                  Thank You for a Wonderful Season!
                </h1>
                <p className="text-muted-foreground leading-relaxed">
                  We thank you for trusting <span className="font-semibold text-primary">Intrvue.AI</span> to help your children prepare for their interviews. We hope they achieved their goals and wish them all the best in their academic journeys.
                </p>
              </div>
              
              {/* Contact info */}
              <div className="pt-4 border-t border-border">
                <p className="text-sm text-muted-foreground mb-3">
                  For any questions, please reach out to us:
                </p>
                <a 
                  href="mailto:founders@intrvue.ai" 
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-colors font-medium"
                >
                  <Mail className="w-4 h-4" />
                  founders@intrvue.ai
                </a>
              </div>
              
              {/* Footer note */}
              <p className="text-xs text-muted-foreground/70">
                See you next season! ❄️
              </p>
            </div>
          </div>
        )}
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/landing" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/admin" element={<AdminDashboard />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </div>
    </ClickSpark>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <SecurityProvider>
          <AppContent />
        </SecurityProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
