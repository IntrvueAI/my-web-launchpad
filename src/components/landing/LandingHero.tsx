import { Button } from '@/components/ui/button';
import { Play, BookOpen, Brain, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Pip } from '@/components/brand/Pip';
import { SparklesText } from '@/components/ui/sparkles-text';
import { ShimmerButton } from '@/components/ui/shimmer-button';
interface LandingHeroProps {
  onSignUp: () => void;
}
export const LandingHero = ({
  onSignUp
}: LandingHeroProps) => {
  return <>
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-20 bg-background/80 backdrop-blur-sm border-b border-border/50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Pip size={40} float />
            <span className="font-display text-2xl font-semibold tracking-tight text-white">intrvue</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={onSignUp} className="rounded-full font-extrabold text-sm">
              Sign In
            </Button>
          </div>
        </div>
      </header>
      
      <section className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-[#0F1830] to-primary/10 overflow-hidden pt-20">
      {/* Background Elements - with winter touches */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-24 h-24 bg-winter/20 rounded-full blur-xl animate-pulse" />
        <div className="absolute bottom-32 right-16 w-32 h-32 bg-primary/5 rounded-full blur-2xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-winter-soft/30 rounded-full blur-lg animate-pulse delay-500" />
        <div className="absolute top-1/3 right-1/4 w-20 h-20 bg-winter/10 rounded-full blur-xl animate-pulse delay-700" />
      </div>

      <div className="container mx-auto px-4 py-20 max-w-7xl relative z-10">
        <div className="text-center space-y-8 mb-16">
          {/* St. Paul's School Badge */}
          <Badge className="bg-white text-[#FF7F50] hover:bg-gray-50 px-4 py-2 text-sm font-medium border border-[#FF7F50]/40 relative overflow-hidden">
            <BookOpen className="w-4 h-4 mr-2" />
            <SparklesText text="Designed by former Students & Teachers from St. Paul's School, London" className="text-sm font-medium" sparklesCount={5} colors={{
              first: "#FF7F50",
              second: "#FFB347"
            }} />
          </Badge>

          {/* Technology Badge */}
          

          {/* Main Headline */}
          <div className="space-y-4 md:space-y-6">
            <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight max-w-5xl mx-auto leading-tight">
              Master 11+ Interviews with{' '}
              <span className="bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent">
                Digital Humans
              </span>
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed px-4 md:px-0">
              Get instant feedback and admissions insights aligned with former students, educators, and interview tutors with over 20 years' experience at St. Paul's, Westminster, & Eton College.
            </p>
          </div>
          
          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center items-center pt-4 px-4">
            <ShimmerButton 
              onClick={onSignUp} 
              className="w-full sm:w-auto text-base md:text-lg px-6 md:px-8 py-3 md:py-4 h-auto min-h-[48px] shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
              background="hsl(var(--primary))"
              shimmerColor="#ffffff"
              shimmerDuration="2s"
            >
              <BookOpen className="w-4 md:w-5 h-4 md:h-5 mr-2" />
              <span className="whitespace-nowrap">Start 11+ Practice</span>
            </ShimmerButton>
            <Button variant="outline" size="lg" onClick={() => document.getElementById('demo-video')?.scrollIntoView({
              behavior: 'smooth',
              block: 'start'
            })} className="w-full sm:w-auto text-base md:text-lg px-6 md:px-8 py-3 md:py-4 h-auto min-h-[48px] border-2 hover:bg-primary/5 transition-all duration-300">
              <Play className="w-4 md:w-5 h-4 md:h-5 mr-2" />
              <span className="whitespace-nowrap">Watch Demo</span>
            </Button>
          </div>

          {/* Social Proof */}
          <div className="flex flex-wrap justify-center items-center gap-8 pt-8 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              <span>Trusted by 100+ students</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
              <span>Expert digital human technology</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
              <span>Available 24/7</span>
            </div>
          </div>
        </div>

        {/* Demo Video */}
        <div id="demo-video" className="relative max-w-4xl mx-auto">
          <h2 className="text-xl md:text-2xl font-semibold text-center mb-4">Check it out...</h2>
          <div className="relative bg-card/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-border/50 overflow-hidden group hover:shadow-3xl transition-all duration-500">
            <div className="aspect-video bg-gradient-to-br from-primary/5 via-accent/10 to-primary/5 relative">
              <div className="absolute inset-0 p-4">
                <video className="w-full h-full rounded-2xl border object-contain bg-white z-10 pointer-events-auto" controls preload="metadata" playsInline aria-label="11+ Interview demo video">
                  <source src="/lovable-uploads/DemoVideo.mp4" type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              </div>
            </div>
            
            {/* Floating elements */}
            <div className="absolute -top-6 -right-6 w-32 h-32 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full blur-2xl opacity-60 group-hover:opacity-80 transition-opacity duration-500 pointer-events-none" />
            <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-gradient-to-tr from-primary/15 to-accent/15 rounded-full blur-xl opacity-40 group-hover:opacity-60 transition-opacity duration-500 pointer-events-none" />
          </div>
        </div>
      </div>
    </section>
    </>;
};