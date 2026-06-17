const TEST_DATE_STORAGE_KEY = "consorciapp.appToday";

const isBrowser = typeof window !== "undefined";
const isDateTestingEnabled = import.meta.env.VITE_BUILD_TEST === "true";

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

function getStoredTestDate(): string | null {
  if (!isBrowser || !isDateTestingEnabled) return null;

  try {
    return window.localStorage.getItem(TEST_DATE_STORAGE_KEY);
  } catch {
    return null;
  }
}

function getRealTodayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function getAppTodayIso(): string {
  const stored = getStoredTestDate();
  return stored && isoDatePattern.test(stored) ? stored : getRealTodayIso();
}

export function getAppToday(): Date {
  return new Date(`${getAppTodayIso()}T00:00:00`);
}

export function setAppTodayIso(value: string): void {
  if (!isBrowser || !isDateTestingEnabled || !isoDatePattern.test(value)) return;

  window.localStorage.setItem(TEST_DATE_STORAGE_KEY, value);
  window.dispatchEvent(new Event("consorciapp:app-date-change"));
}

export function clearAppTodayIso(): void {
  if (!isBrowser || !isDateTestingEnabled) return;

  window.localStorage.removeItem(TEST_DATE_STORAGE_KEY);
  window.dispatchEvent(new Event("consorciapp:app-date-change"));
}

export function isAppDateTestingEnabled(): boolean {
  return isDateTestingEnabled;
}