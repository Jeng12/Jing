import * as SecureStore from 'expo-secure-store';

// The user's own Anthropic API key, kept in the phone's encrypted storage (Android Keystore).
// Web resolves to apiKeyStore.web.ts instead.

const KEY = 'jing.anthropicApiKey';

export async function getApiKey(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(KEY);
  } catch {
    return null;
  }
}

export async function setApiKey(value: string): Promise<void> {
  await SecureStore.setItemAsync(KEY, value.trim());
}

export async function clearApiKey(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY);
}
