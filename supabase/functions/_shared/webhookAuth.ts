/** App-managed callback secret; configure it in the provider's callback URL or header. */
export async function matchesSecret(
  provided: string | null,
  expected: string,
): Promise<boolean> {
  if (!provided || provided.length > 512 || expected.length < 32) return false;
  const encode = new TextEncoder();
  const [a, b] = await Promise.all(
    [provided, expected].map((value) =>
      crypto.subtle.digest("SHA-256", encode.encode(value)),
    ),
  );
  const left = new Uint8Array(a);
  const right = new Uint8Array(b);
  let difference = 0;
  for (let i = 0; i < left.length; i++) difference |= left[i] ^ right[i];
  return difference === 0;
}
