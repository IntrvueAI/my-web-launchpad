import { Separator } from '@/components/ui/separator';

export const LandingFooter = () => {
  const footerLinks = {
    product: [
      { name: 'Features', href: '#features' },
      { name: 'Pricing', href: '#pricing' },
      { name: 'Demo', href: '#demo' },
      { name: 'FAQ', href: '#faq' }
    ],
    interviews: [
      { name: '11+ Preparation', href: '#academic' },
      { name: 'IELTS Speaking', href: '#language' },
      { name: 'Professional', href: '#professional' },
      { name: 'Request Type', href: '#request' }
    ],
    support: [
      { name: 'Help Center', href: '#help' },
      { name: 'Contact Us', href: '#contact' },
      { name: 'System Status', href: '#status' },
      { name: 'API Docs', href: '#api' }
    ],
    legal: [
      { name: 'Privacy Policy', href: '#privacy' },
      { name: 'Terms of Service', href: '#terms' },
      { name: 'Cookie Policy', href: '#cookies' },
      { name: 'GDPR', href: '#gdpr' }
    ]
  };

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
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-8 mb-12">
          {/* Brand Section */}
          <div className="col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <img 
                src="/lovable-uploads/logo.png" 
                alt="Intrvue AI" 
                className="w-8 h-8"
              />
              <span className="text-xl font-bold">Intrvue.AI</span>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-sm">
              Master your interview skills with digital human interviewers. Get instant feedback and build confidence for academic, language, and professional interviews.
            </p>
            
            {/* Social Links */}
            <div className="flex items-center gap-3 pt-2">
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

          {/* Product Links */}
          <div className="space-y-4">
            <h4 className="font-semibold">Product</h4>
            <ul className="space-y-2">
              {footerLinks.product.map((link, index) => (
                <li key={index}>
                  <a href={link.href} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Interview Types */}
          <div className="space-y-4">
            <h4 className="font-semibold">Interviews</h4>
            <ul className="space-y-2">
              {footerLinks.interviews.map((link, index) => (
                <li key={index}>
                  <a href={link.href} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div className="space-y-4">
            <h4 className="font-semibold">Support</h4>
            <ul className="space-y-2">
              {footerLinks.support.map((link, index) => (
                <li key={index}>
                  <a href={link.href} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div className="space-y-4">
            <h4 className="font-semibold">Legal</h4>
            <ul className="space-y-2">
              {footerLinks.legal.map((link, index) => (
                <li key={index}>
                  <a href={link.href} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <Separator className="my-8" />

        {/* Bottom Footer */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <span>© 2024 Intrvue.AI. All rights reserved.</span>
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