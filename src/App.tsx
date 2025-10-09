import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { SecurityProvider } from "@/components/SecurityProvider";
import { ClickSpark } from "@/components/ui/click-spark";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import AdminDashboard from "./pages/AdminDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Set to true to display the downtime notice
const IS_SITE_DOWN = false;

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <SecurityProvider>
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
              <Toaster />
              <Sonner />
              {IS_SITE_DOWN && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <Alert className="max-w-lg border-destructive/50 bg-background shadow-lg">
                    <AlertCircle className="h-5 w-5 text-destructive" />
                    <AlertTitle className="text-lg font-semibold">Site Maintenance</AlertTitle>
                    <AlertDescription className="mt-2">
                      We're currently performing scheduled maintenance to improve your experience. 
                      The site will be back online shortly. Thank you for your patience.
                    </AlertDescription>
                  </Alert>
                </div>
              )}
              <BrowserRouter>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/landing" element={<Index />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/admin" element={<AdminDashboard />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </div>
          </ClickSpark>
        </SecurityProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
