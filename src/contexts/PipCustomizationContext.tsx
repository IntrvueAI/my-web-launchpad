/**
 * Pip customization — the "locker room" state. The equipped hat is stored in the user's auth
 * metadata (`pip_hat`), so it follows them across devices with no schema changes, and every Pip
 * on the site reads it through this context (the Pip component itself subscribes, so all owls
 * change hats at once). Unlocks are derived live from the same stats as the Achievements page.
 */
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type HatId = 'none' | 'beta-cap' | 'party' | 'beanie' | 'grad' | 'wizard' | 'crown';

export interface HatDef {
  id: HatId;
  name: string;
  /** What you have to do to unlock it (shown in the locker room). */
  unlock: string;
  /** Which achievement it's tied to, for the locker card. */
  achievement: string;
}

/** All account sign-ups before public launch count as beta testers. */
export const BETA_CUTOFF = '2026-10-01';

export const HATS: HatDef[] = [
  { id: 'none', name: 'No hat', unlock: 'Always yours', achievement: 'Just Pip' },
  { id: 'beta-cap', name: 'intrvue cap', unlock: 'Joined during the beta', achievement: 'Beta Tester' },
  { id: 'party', name: 'Party hat', unlock: 'Finish your first interview', achievement: 'First Mock' },
  { id: 'beanie', name: 'Cosy beanie', unlock: '3-day practice streak', achievement: 'On a Roll' },
  { id: 'grad', name: 'Graduation cap', unlock: 'Complete 10 mocks', achievement: 'Committed' },
  { id: 'wizard', name: 'Wizard hat', unlock: 'Score 4/5 in Reasoning', achievement: 'Deep Thinker' },
  { id: 'crown', name: 'Golden crown', unlock: 'Score 16+ in an interview', achievement: 'Brilliant' },
];

interface PipCustomization {
  hat: HatId;
  setHat: (hat: HatId) => Promise<void>;
}

// Safe default so Pips rendered outside the provider (SSR scripts, auth screens) just go hatless.
const PipCustomizationContext = createContext<PipCustomization>({ hat: 'none', setHat: async () => {} });

export const PipCustomizationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [hat, setHatState] = useState<HatId>('none');

  // Load the equipped hat from auth metadata whenever the signed-in user changes.
  useEffect(() => {
    const stored = user?.user_metadata?.pip_hat as HatId | undefined;
    setHatState(stored && HATS.some((h) => h.id === stored) ? stored : 'none');
  }, [user?.id, user?.user_metadata?.pip_hat]);

  const setHat = useCallback(async (next: HatId) => {
    setHatState(next); // optimistic — all Pips change instantly
    try {
      await supabase.auth.updateUser({ data: { pip_hat: next } });
    } catch (e) {
      console.warn('Failed to save Pip hat:', e);
    }
  }, []);

  return (
    <PipCustomizationContext.Provider value={{ hat, setHat }}>
      {children}
    </PipCustomizationContext.Provider>
  );
};

export const usePipCustomization = () => useContext(PipCustomizationContext);

/** Which hats this user has unlocked, from the same live stats the Achievements page uses. */
export function unlockedHats(args: {
  createdAt?: string;
  sessions: number;
  streak: number;
  reasoning: number;
  bestScore: number;
}): Set<HatId> {
  const set = new Set<HatId>(['none']);
  if (args.createdAt && args.createdAt.slice(0, 10) < BETA_CUTOFF) set.add('beta-cap');
  if (args.sessions >= 1) set.add('party');
  if (args.streak >= 3) set.add('beanie');
  if (args.sessions >= 10) set.add('grad');
  if (args.reasoning >= 4) set.add('wizard');
  if (args.bestScore >= 16) set.add('crown');
  return set;
}
