import { siteProduct } from './site';
export type ProductLine = '11plus' | 'medicine';

const STORAGE_KEY = 'intrvue_product_line';

export function getStoredProductLine(): ProductLine {
  const product = siteProduct();
  if (product !== 'combined') return product;
  const params = new URLSearchParams(window.location.search);
  if (params.get('mode') === 'medicine' || params.has('medicinePractice')) return 'medicine';
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'medicine' || stored === '11plus') return stored;
  } catch { /* A blocked storage setting must not prevent the landing page loading. */ }
  return window.location.hostname.toLowerCase() === 'medicine.intrvue.ai' ? 'medicine' : '11plus';
}

export function setStoredProductLine(line: ProductLine): void {
  const product = siteProduct();
  if (product !== 'combined') line = product;
  try { localStorage.setItem(STORAGE_KEY, line); } catch { /* Keep the current tab usable. */ }
  window.dispatchEvent(new Event('intrvue:product-line-changed'));
}

// Only meaningful when productLine === 'medicine' — which dashboard shell a Medicine user sees:
// the coral redesign (default) or the original dashboard shared with 11+. Independent of
// productLine itself so a Medicine user can compare the two without losing their product line.
export type MedicineDashboardStyle = 'coral' | 'classic';

const STYLE_STORAGE_KEY = 'intrvue_medicine_dashboard_style';

export function getStoredMedicineDashboardStyle(): MedicineDashboardStyle {
  if (siteProduct() === 'medicine') return 'coral';
  try { return localStorage.getItem(STYLE_STORAGE_KEY) === 'classic' ? 'classic' : 'coral'; }
  catch { return 'coral'; }
}

export function setStoredMedicineDashboardStyle(style: MedicineDashboardStyle): void {
  try { localStorage.setItem(STYLE_STORAGE_KEY, siteProduct() === 'medicine' ? 'coral' : style); } catch { /* Keep the current tab usable. */ }
}

// NOTE: both keys above are plain per-browser localStorage, not tied to the account. On a shared
// machine, a different person signing in after someone else can inherit their product line /
// dashboard style. Deliberately not "fixed" by clearing on sign-out — that regresses the far more
// common case (the same person signing out and back in) since there is no server-side product
// line to restore from, and no in-app way back to Medicine once cleared. Revisit by scoping the
// key to the signed-in user id instead, if the shared-machine case turns out to matter in practice.
