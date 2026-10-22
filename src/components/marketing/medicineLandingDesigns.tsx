import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

export interface LandingDesign {
  id: string;
  name: string;
  note: string;
  Component: LazyExoticComponent<ComponentType>;
}

/**
 * Medicine landing designs shown in the admin preview portal (/admin/landing-previews), in
 * button order. Add a mock by creating its component and appending one entry here; it never
 * reaches the public site unless src/pages/Medicine.tsx is changed to render it.
 */
export const MEDICINE_LANDING_DESIGNS: LandingDesign[] = [
  {
    id: 'live',
    name: 'Current live page',
    note: 'What mmipractice.co.uk shows today.',
    Component: lazy(() => import('@/pages/Medicine')),
  },
  {
    id: 'coral-legacy',
    name: 'Legacy coral design',
    note: 'Earlier white/coral version. Preview only.',
    Component: lazy(() => import('./MedicineLandingCoralPreview').then((m) => ({ default: m.MedicineLandingCoralPreview }))),
  },
  {
    id: 'flow',
    name: 'Flow (dark, continuous)',
    note: 'Dark sections that fade into each other, scroll reveals and a ticker. Inspired by backboard.io.',
    Component: lazy(() => import('./MedicineLandingFlow').then((m) => ({ default: m.MedicineLandingFlow }))),
  },
  {
    id: 'calm',
    name: 'Calm (light, editorial)',
    note: 'Warm paper, serif headlines and lots of space. Inspired by editorial wellness sites.',
    Component: lazy(() => import('./MedicineLandingCalm').then((m) => ({ default: m.MedicineLandingCalm }))),
  },
  {
    id: 'try',
    name: 'Try it now (interactive hero)',
    note: 'A working station in the hero: read a real practice brief, time it, see a follow-up.',
    Component: lazy(() => import('./MedicineLandingTry').then((m) => ({ default: m.MedicineLandingTry }))),
  },
  {
    id: 'story',
    name: 'Story (sticky scroll)',
    note: 'One station told in four steps while a sticky screen changes. Inspired by product scrollytelling.',
    Component: lazy(() => import('./MedicineLandingStory').then((m) => ({ default: m.MedicineLandingStory }))),
  },
];

export type PreviewDevice = 'full' | 'desktop' | 'tablet' | 'phone';
export const PREVIEW_DEVICES: Record<Exclude<PreviewDevice, 'full'>, { label: string; width: number; height: number }> = {
  desktop: { label: 'Desktop', width: 1440, height: 900 },
  tablet: { label: 'Tablet', width: 834, height: 1112 },
  phone: { label: 'Phone', width: 390, height: 844 },
};

/** Device from ?device=, defaulting to the full window. */
export function deviceFrom(search: string): PreviewDevice {
  const d = new URLSearchParams(search).get('device');
  return d === 'desktop' || d === 'tablet' || d === 'phone' ? d : 'full';
}

/** 1-based design number from ?design=, clamped to the available designs. */
export function designIndexFrom(search: string, count = MEDICINE_LANDING_DESIGNS.length): number {
  const n = Number(new URLSearchParams(search).get('design'));
  return Number.isInteger(n) && n >= 1 && n <= count ? n - 1 : 0;
}
