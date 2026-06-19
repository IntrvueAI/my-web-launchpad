import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Video, History, Wallet, Settings, LogOut, ListChecks } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileBottomNavProps {
  currentView: 'dashboard' | 'selection' | 'interview' | 'history' | 'settings' | 'credits' | 'questions';
  credits: number;
  onViewChange: (view: 'dashboard' | 'selection' | 'interview' | 'history' | 'settings' | 'credits' | 'questions') => void;
  onSignOut: () => void;
  className?: string;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentView,
  credits,
  onViewChange,
  onSignOut,
  className
}) => {
  return (
    <div className={cn(
      "fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-t border-border md:hidden",
      className
    )}>
      <nav className="container mx-auto px-4 py-2">
        <div className="flex items-center justify-around">
          {/* Practice */}
          <Button
            variant={currentView === 'selection' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewChange('selection')}
            className="flex-col h-auto py-2 px-2 gap-1 min-w-0"
          >
            <Video className="w-4 h-4" />
            <span className="text-xs">Practice</span>
          </Button>

          {/* Questions */}
          <Button
            variant={currentView === 'questions' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewChange('questions')}
            className="flex-col h-auto py-2 px-2 gap-1 min-w-0"
          >
            <ListChecks className="w-4 h-4" />
            <span className="text-xs">Questions</span>
          </Button>

          {/* History */}
          <Button
            variant={currentView === 'history' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewChange('history')}
            className="flex-col h-auto py-2 px-2 gap-1 min-w-0"
          >
            <History className="w-4 h-4" />
            <span className="text-xs">History</span>
          </Button>

          {/* Credits */}
          <Button
            variant={currentView === 'credits' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewChange('credits')}
            className="flex-col h-auto py-2 px-2 gap-1 min-w-0 relative"
          >
            <Wallet className="w-4 h-4" />
            <span className="text-xs">Credits</span>
            <Badge variant="outline" className="absolute -top-1 -right-1 text-xs h-5 w-5 p-0 flex items-center justify-center">
              {credits}
            </Badge>
          </Button>

          {/* Settings */}
          <Button
            variant={currentView === 'settings' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewChange('settings')}
            className="flex-col h-auto py-2 px-2 gap-1 min-w-0"
          >
            <Settings className="w-4 h-4" />
            <span className="text-xs">Settings</span>
          </Button>

          {/* Sign Out */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onSignOut}
            className="flex-col h-auto py-2 px-2 gap-1 min-w-0"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-xs">Exit</span>
          </Button>
        </div>
      </nav>
    </div>
  );
};