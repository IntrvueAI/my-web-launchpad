/** Only authentication keys belong here; saved practice and preferences are untouched. */
export function createRecoverableAuthStorage(storage: Storage, key: string) {
  let cleared = false;
  return {
    getItem(name: string) {
      return cleared ? null : storage.getItem(name);
    },
    setItem(name: string, value: string) {
      // A refresh already in flight must not restore credentials during a forced logout.
      if (!cleared) storage.setItem(name, value);
    },
    removeItem(name: string) {
      storage.removeItem(name);
    },
    clearSession() {
      cleared = true;
      for (const name of [key, `${key}-code-verifier`, `${key}-user`])
        storage.removeItem(name);
    },
  };
}

interface SignOutActions {
  remote: () => Promise<{ error: unknown }>;
  clearStoredSession: () => void;
  onSignedOut: () => void;
  reload: () => void;
}

/** A failed or stuck revocation request must not prevent signing out of this browser. */
export async function signOutWithRecovery(
  actions: SignOutActions,
  timeoutMs = 4000,
) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let remoteFailed = false;
  try {
    const result = await Promise.race([
      actions.remote(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error("Sign-out request timed out")),
          timeoutMs,
        );
      }),
    ]);
    remoteFailed = Boolean(result.error);
  } catch {
    remoteFailed = true;
  } finally {
    clearTimeout(timer);
  }
  if (remoteFailed) actions.clearStoredSession();
  actions.onSignedOut();
  // Destroy the old client and in-flight requests before a new account signs in.
  // This also clears credentials from the address bar on a failed OAuth callback.
  if (remoteFailed) actions.reload();
  return { error: null };
}
