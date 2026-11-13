import { AiCredentials, parseStoredCredentials } from './aiTypes';

// Web has no secure keystore; the key stays in this browser's local storage only.

const KEY = 'jing.anthropicApiKey';

export async function getAiCredentials(): Promise<AiCredentials | null> {
  try {
    return parseStoredCredentials(localStorage.getItem(KEY));
  } catch {
    return null;
  }
}

export async function setAiCredentials(creds: AiCredentials): Promise<void> {
  localStorage.setItem(KEY, JSON.stringify({ provider: creds.provider, key: creds.key.trim() }));
}

export async function clearAiCredentials(): Promise<void> {
  localStorage.removeItem(KEY);
}
