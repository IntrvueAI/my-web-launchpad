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
];

/** 1-based design number from ?design=, clamped to the available designs. */
export function designIndexFrom(search: string, count = MEDICINE_LANDING_DESIGNS.length): number {
  const n = Number(new URLSearchParams(search).get('design'));
  return Number.isInteger(n) && n >= 1 && n <= count ? n - 1 : 0;
}
