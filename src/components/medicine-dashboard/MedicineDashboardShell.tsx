import { ReactNode } from 'react';
import { Home, Stethoscope, TrendingUp, MapPin, FileText, Wallet, Settings, Users, LogOut, ChevronDown, Palette } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { ProductLine } from '@/lib/productLine';

export type MedicineTab = 'home' | 'practice' | 'progress' | 'schools' | 'feedback';

// Real CSS + media queries, not inline `style.gridTemplateColumns` + a Tailwind `max-[...]` class —
// an inline style always wins over a class at any viewport, so the responsive class silently never
// applied (caused real horizontal overflow on mobile). Rendered once here; every Medicine tab
// component below uses these class names instead of inline grid-template-columns.
const MEDICINE_GRID_CSS = `
  .med-grid-home { display:grid; grid-template-columns: 1fr 336px; gap:20px; }
  @media (max-width: 960px) { .med-grid-home { grid-template-columns: 1fr; } }
  .med-grid-scoring { display:grid; grid-template-columns: 200px 1fr; gap:20px; }
  @media (max-width: 640px) { .med-grid-scoring { grid-template-columns: 1fr; } }
  .med-grid-feedback { display:grid; grid-template-columns: 326px 1fr; gap:20px; }
  @media (max-width: 900px) { .med-grid-feedback { grid-template-columns: 1fr; } }
  .med-grid-two { display:grid; grid-template-columns: 1fr 1fr; gap:20px; }
  @media (max-width: 720px) { .med-grid-two { grid-template-columns: 1fr; } }
`;

const TABS: { id: MedicineTab; label: string; icon: typeof Home }[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'practice', label: 'Practice', icon: Stethoscope },
  { id: 'progress', label: 'Progress', icon: TrendingUp },
  { id: 'schools', label: 'Schools', icon: MapPin },
  { id: 'feedback', label: 'Feedback', icon: FileText },
];

interface Props {
  activeTab: MedicineTab;
  onTabChange: (tab: MedicineTab) => void;
  productLine: ProductLine;
  onProductLineChange: (line: ProductLine) => void;
  credits: number;
  onOpenCredits: () => void;
  onOpenSettings: () => void;
  onOpenGrownup: () => void;
  onSignOut: () => void;
  onSwitchToClassic: () => void;
  userInitial: string;
  children: ReactNode;
  hideChrome?: boolean;
}

/**
 * Coral/white shell for the Medicine dashboard — see design-reference's Dashboard.dc.html handoff.
 * Only ever rendered when productLine === 'medicine' (see Index.tsx); the default 11+ experience
 * never touches this file.
 */
export function MedicineDashboardShell({
  activeTab, onTabChange, productLine, onProductLineChange, credits,
  onOpenCredits, onOpenSettings, onOpenGrownup, onSignOut, onSwitchToClassic, userInitial, children, hideChrome,
}: Props) {
  return (
    <div style={{ background: '#FAFAF8', minHeight: '100vh', fontFamily: "'Inter Tight',system-ui,-apple-system,sans-serif", color: '#1C2029' }}>
      <style dangerouslySetInnerHTML={{ __html: MEDICINE_GRID_CSS }} />
      {!hideChrome && (
        <header style={{ height: 68, borderBottom: '1px solid rgba(28,32,41,.09)', background: '#FAFAF8', position: 'sticky', top: 0, zIndex: 40 }}>
          <div style={{ maxWidth: 1440, margin: '0 auto', padding: '0 28px', height: '100%', display: 'flex', alignItems: 'center', gap: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexShrink: 0 }}>
              <div style={{ width: 22, height: 22, borderRadius: 7, background: 'linear-gradient(135deg,#FF7F50 0%,#FF9F6B 100%)' }} />
              <span style={{ fontFamily: "'Bricolage Grotesque',serif", fontWeight: 600, fontSize: 15, color: '#E8622F' }}>intrvue.ai</span>
            </div>

            <nav className="hidden md:flex" style={{ alignItems: 'center', gap: 4, flex: 1, overflowX: 'auto' }} aria-label="Dashboard">
              {TABS.map((tab) => {
                const active = tab.id === activeTab;
                return (
                  <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 9,
                      border: 0, cursor: 'pointer', fontSize: 14.5, fontFamily: 'inherit', whiteSpace: 'nowrap',
                      background: active ? '#FFE4D6' : 'transparent',
                      color: active ? '#E8622F' : '#6B7280',
                      fontWeight: active ? 600 : 500,
                    }}
                  >
                    <tab.icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
              <div style={{ display: 'flex', background: '#F1EFEA', borderRadius: 10, padding: 3 }}>
                {(['medicine', '11plus'] as ProductLine[]).map((line) => (
                  <button
                    key={line}
                    onClick={() => onProductLineChange(line)}
                    style={{
                      padding: '6px 12px', borderRadius: 8, border: 0, cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
                      background: productLine === line ? '#fff' : 'transparent',
                      color: productLine === line ? '#1C2029' : '#9A9488',
                      boxShadow: productLine === line ? '0 2px 10px -4px rgba(28,32,41,.08)' : 'none',
                    }}
                  >
                    {line === 'medicine' ? 'Medicine' : '11+'}
                  </button>
                ))}
              </div>

              <button onClick={onOpenCredits} style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 20,
                border: '1px solid rgba(28,32,41,.15)', background: '#fff', cursor: 'pointer', fontSize: 13.5, fontWeight: 500, color: '#1C2029',
              }}>
                <Wallet className="h-3.5 w-3.5" /> {credits}<span className="hidden sm:inline">&nbsp;credits</span>
              </button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button style={{
                    width: 34, height: 34, borderRadius: '50%', border: 0, cursor: 'pointer',
                    background: '#FFE4D6', color: '#E8622F', fontWeight: 700, fontSize: 13,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {userInitial}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={onOpenCredits}><Wallet className="h-4 w-4 mr-2" /> Credits & billing</DropdownMenuItem>
                  <DropdownMenuItem onClick={onOpenSettings}><Settings className="h-4 w-4 mr-2" /> Settings</DropdownMenuItem>
                  <DropdownMenuItem onClick={onOpenGrownup}><Users className="h-4 w-4 mr-2" /> Grown-up view</DropdownMenuItem>
                  <DropdownMenuItem onClick={onSwitchToClassic}><Palette className="h-4 w-4 mr-2" /> Switch to classic dashboard</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onSignOut}><LogOut className="h-4 w-4 mr-2" /> Sign out</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>
      )}

      <main style={{ maxWidth: 1440, margin: '0 auto', padding: hideChrome ? 0 : '34px 28px 44px' }}>
        {children}
      </main>

      {!hideChrome && (
        <nav
          className="flex md:hidden"
          style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, height: 76, background: '#fff',
            borderTop: '1px solid rgba(28,32,41,.09)', zIndex: 40,
          }}
        >
          {TABS.map((tab) => {
            const active = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                style={{
                  flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
                  border: 0, background: 'transparent', cursor: 'pointer',
                  color: active ? '#E8622F' : '#9A9488',
                }}
              >
                <tab.icon className="h-5 w-5" />
                <span style={{ fontSize: 11, fontWeight: active ? 600 : 500 }}>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      )}
    </div>
  );
}
