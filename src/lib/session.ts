// The unlocked desktop lives in sessionStorage: it survives F5 in the same tab
// but is cleared when the tab closes, and reset clears it explicitly.
export const SESSION_KEY = "igc-session";

export function hasSession(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

export function startSession(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(SESSION_KEY, "1");
  } catch {
    /* storage disabled: the desktop simply asks for the password again */
  }
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}
