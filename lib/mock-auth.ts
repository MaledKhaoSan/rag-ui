/** Mock “logged in” flag for localStorage + document cookie (middleware reads cookie). */
const COOKIE = "mock-auth";
const STORAGE_KEY = "mock-auth-user";

const COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 7; // 7 days

export function setMockAuthSession(email: string) {
    if (typeof document === "undefined") return;
    document.cookie = `${COOKIE}=1; path=/; max-age=${COOKIE_MAX_AGE_SEC}; SameSite=Lax`;
    try {
        localStorage.setItem(STORAGE_KEY, email || "mock@local");
    } catch {
        /* ignore */
    }
}

export function clearMockAuthSession() {
    if (typeof document === "undefined") return;
    document.cookie = `${COOKIE}=; path=/; max-age=0`;
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch {
        /* ignore */
    }
}
