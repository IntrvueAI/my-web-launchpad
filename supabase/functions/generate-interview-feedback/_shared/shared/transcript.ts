/** Display filtering keeps UTF-16 offsets stable for transcript annotations.
 * Match whole words, including common inflections/obfuscations; never substrings
 * such as Scunthorpe, assessment or therapist. Assessment can use the original text.
 */
const SWEAR_WORDS =
  /(?<![\p{L}\p{N}])(?:f[u*]ck(?:s|ed|er|ers|ing|wit|wits)?|motherf[u*]ck(?:er|ers|ing)?|sh[i1!]t(?:s|ty|ting|ted|head|heads)?|bullsh[i1!]t|b[i1!]tch(?:es|y|ing)?|c[u*]nt(?:s)?|wank(?:er|ers|ing)?|bollocks|bastard(?:s)?|arsehole(?:s)?|asshole(?:s)?|dickhead(?:s)?|piss(?:ed|ing)?|twat(?:s)?|f[.\-_ ]u[.\-_ ]c[.\-_ ]k|s[.\-_ ]h[.\-_ ]i[.\-_ ]t)(?![\p{L}\p{N}])/giu;
export function censorTranscript(text: string): string {
  return text.replace(SWEAR_WORDS, (match) =>
    match.replace(/[\p{L}\p{N}!*]/gu, "*"),
  );
}
/** Apply the same display policy to quoted answers, feedback and annotations. */
export function censorFeedback<T>(value: T): T {
  if (typeof value === "string") return censorTranscript(value) as T;
  if (Array.isArray(value)) return value.map(censorFeedback) as T;
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, censorFeedback(item)]),
    ) as T;
  return value;
}
