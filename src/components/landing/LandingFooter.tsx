import { Separator } from '@/components/ui/separator';

export const LandingFooter = () => {

  const socialIcons = [
    { name: 'Twitter', icon: 'TW', href: '#twitter' },
    { name: 'LinkedIn', icon: 'LI', href: '#linkedin' },
    { name: 'YouTube', icon: 'YT', href: '#youtube' },
    { name: 'Facebook', icon: 'FB', href: '#facebook' }
  ];

  return (
    <footer className="bg-muted/30 border-t">
      <div className="container mx-auto px-4 py-16 max-w-7xl">
        {/* Main Footer Content */}
        <div className="flex justify-center mb-12">
          {/* Brand Section */}
          <div className="space-y-4 max-w-md text-center">
            <div className="flex items-center justify-center gap-3">
              <span className="text-xl font-bold">Intrvue.AI</span>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Master your interview skills with digital human interviewers. Get instant feedback and build confidence for academic, language, and professional interviews.
            </p>
            
            {/* Social Links */}
            <div className="flex items-center justify-center gap-3 pt-2">
              {socialIcons.map((social, index) => (
                <a 
                  key={index}
                  href={social.href}
                  className="w-8 h-8 bg-muted rounded-full flex items-center justify-center text-xs font-bold text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>
        </div>

        <Separator className="my-8" />

        {/* Bottom Footer */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <span>© 2025 Intrvue.AI. All rights reserved.</span>
            <div className="hidden md:flex items-center gap-2">
              <div className="w-2 h-2 bg-success rounded-full" />
              <span>All systems operational</span>
            </div>
          </div>
          
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <span>Made with ❤️ for students worldwide</span>
            <div className="flex items-center gap-2">
              <span>🔒 SSL Secured</span>
            </div>
          </div>
        </div>

        {/* Newsletter CTA */}
        <div className="mt-12 p-6 bg-card rounded-lg border text-center space-y-3">
          <h4 className="font-semibold">Stay Updated</h4>
          <p className="text-sm text-muted-foreground">
            Get notified about new interview types, features, and tips to improve your performance.
          </p>
          <div className="flex gap-2 max-w-sm mx-auto">
            <input 
              type="email" 
              placeholder="Enter your email" 
              className="flex-1 px-3 py-2 border rounded-md text-sm"
            />
            <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors">
              Subscribe
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};