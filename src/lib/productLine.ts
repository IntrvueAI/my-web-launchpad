export type ProductLine = '11plus' | 'medicine';

const STORAGE_KEY = 'intrvue_product_line';

export function getStoredProductLine(): ProductLine {
  return localStorage.getItem(STORAGE_KEY) === 'medicine' ? 'medicine' : '11plus';
}

export function setStoredProductLine(line: ProductLine): void {
  localStorage.setItem(STORAGE_KEY, line);
}
