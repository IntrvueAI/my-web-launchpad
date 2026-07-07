/** Small helpers to make the student-facing screens warm, playful and encouraging for ~10-year-olds. */

const CHEERS = ['Brilliant', 'Amazing', 'Well done', 'Fantastic', 'Superstar effort', 'Yes'];
const TRIES = ['Nice try', 'Good thinking', 'Almost there', 'Great effort', 'So close'];

const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

/** e.g. "Brilliant, Sophia! 🎉" */
export const cheer = (name: string) => `${pick(CHEERS)}, ${name}! 🎉`;
/** e.g. "Nice try, Sophia!" */
export const encourage = (name: string) => `${pick(TRIES)}, ${name}!`;

const STAR_KEY = 'pip-stars';

export function getStars(): number {
  return Number(localStorage.getItem(STAR_KEY) || '0');
}

/** Award a star and return the new total. Fires a lightweight event so counters can refresh. */
export function addStar(): number {
  const next = getStars() + 1;
  localStorage.setItem(STAR_KEY, String(next));
  window.dispatchEvent(new CustomEvent('pip-stars-changed', { detail: next }));
  return next;
}
