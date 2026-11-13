// Web has no secure keystore; the key stays in this browser's local storage only.

const KEY = 'jing.anthropicApiKey';

export async function getApiKey(): Promise<string | null> {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export async function setApiKey(value: string): Promise<void> {
  localStorage.setItem(KEY, value.trim());
}

export async function clearApiKey(): Promise<void> {
  localStorage.removeItem(KEY);
}
