import * as SecureStore from 'expo-secure-store';
import { AiCredentials, parseStoredCredentials } from './aiTypes';

// The user's own AI API key and its provider, kept in the phone's encrypted storage (Android Keystore).
// Web resolves to apiKeyStore.web.ts instead.

const KEY = 'jing.anthropicApiKey'; // name kept so keys saved by earlier versions still load

export async function getAiCredentials(): Promise<AiCredentials | null> {
  try {
    return parseStoredCredentials(await SecureStore.getItemAsync(KEY));
  } catch {
    return null;
  }
}

export async function setAiCredentials(creds: AiCredentials): Promise<void> {
  await SecureStore.setItemAsync(KEY, JSON.stringify({ provider: creds.provider, key: creds.key.trim() }));
}

export async function clearAiCredentials(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY);
}
