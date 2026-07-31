import React from 'react';
import { Home, Video, ListChecks, Trophy, History, Wallet, Settings, LogOut, Sun, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/hooks/useTheme';
import type { User } from '@supabase/supabase-js';

export type View = 'dashboard' | 'selection' | 'interview' | 'history' | 'settings' | 'credits' | 'questions' | 'achievements' | 'grownup';

interface SharedProps {
  currentView: View;
  onNavigate: (view: View) => void;
}

interface SidebarNavProps extends SharedProps {
  onSignOut: () => void;
}

const NAV_ITEMS: { view: View; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { view: 'dashboard', label: 'Home', icon: Home },
  { view: 'selection', label: 'Practise', icon: Video },
  { view: 'questions', label: 'Questions', icon: ListChecks },
  { view: 'history', label: 'Feedback', icon: History },
  { view: 'achievements', label: 'Achievements', icon: Trophy },
  { view: 'credits', label: 'Credits', icon: Wallet },
];

/**
 * Alternate app chrome (Dashboard 2, toggled from Index.tsx): fixed left icon sidebar +
 * centered-logo top header, in place of the default top-nav. Split into two components
 * (SidebarNav + SidebarTopBar) rather than one wrapping shell, so they can slot in as siblings
 * next to the EXISTING header/mobile-nav/main in Index.tsx — mobile keeps its current top bar +
 * bottom nav either way (a fixed icon rail doesn't fit a phone), so only desktop chrome changes.
 *
 * Locker Room has no icon of its own here — it's a tab inside AchievementsPage now, not a
 * separate view (see AchievementsPage.tsx).
 */
export function SidebarNav({ currentView, onNavigate, onSignOut }: SidebarNavProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <aside className="hidden md:flex w-[84px] shrink-0 flex-col items-center border-r bg-card py-4">
      <button
        type="button"
        aria-label="intrvue — go to home"
        onClick={() => onNavigate('dashboard')}
        className="mb-6 rounded-xl p-1.5 hover:bg-accent transition-colors"
      >
        <img src="/lovable-uploads/icon-mark.png" alt="intrvue.ai" className="h-8 w-8" />
      </button>

      <nav className="flex flex-col items-center gap-1.5 w-full px-2">
        {NAV_ITEMS.map(({ view, label, icon: Icon }) => {
          const active = currentView === view;
          return (
            <button
              key={view}
              type="button"
              onClick={() => onNavigate(view)}
              aria-label={label}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex flex-col items-center gap-1 w-full rounded-xl py-2.5 transition-colors',
                active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-semibold leading-none text-center px-0.5">{label}</span>
            </button>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col items-center gap-1.5 w-full px-2">
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          className="flex items-center justify-center w-full rounded-xl py-2.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
        <button
          type="button"
          onClick={() => onNavigate('settings')}
          aria-label="Settings"
          aria-current={currentView === 'settings' ? 'page' : undefined}
          className={cn(
            'flex items-center justify-center w-full rounded-xl py-2.5 transition-colors',
            currentView === 'settings' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent hover:text-foreground',
          )}
        >
          <Settings className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={onSignOut}
          aria-label="Sign out"
          className="flex items-center justify-center w-full rounded-xl py-2.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </aside>
  );
}

interface SidebarTopBarProps extends SharedProps {
  credits: number;
  user: User;
}

export function SidebarTopBar({ currentView, onNavigate, credits, user }: SidebarTopBarProps) {
  const initial = (user.user_metadata?.full_name || user.email || 'U').charAt(0).toUpperCase();

  return (
    <header className="hidden md:flex h-16 items-center border-b bg-background/95 backdrop-blur px-6 relative">
      <button
        type="button"
        aria-label="intrvue — go to home"
        onClick={() => onNavigate('dashboard')}
        className="absolute left-1/2 -translate-x-1/2"
      >
        <img src="/lovable-uploads/logo.png" alt="intrvue.ai" className="h-[26px] w-auto" />
      </button>

      <div className="ml-auto flex items-center gap-3">
        <button
          type="button"
          onClick={() => onNavigate('credits')}
          className="flex items-center gap-1.5 px-3.5 py-[7px] rounded-full border border-foreground/15 text-[12.5px] font-semibold text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <Wallet className="w-3.5 h-3.5" />
          {credits} credits
        </button>
        <div className="relative">
          <div
            className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-rose flex items-center justify-center font-extrabold text-[13px] text-white select-none"
            title={user.user_metadata?.full_name || user.email || undefined}
          >
            {initial}
          </div>
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald border-2 border-background" aria-label="Online" />
        </div>
      </div>
    </header>
  );
}
