import { WatchDay } from '../types/tracker';

// Fallback for platforms without Health Connect (iOS, web).
// Android resolves to healthConnect.android.ts instead.

export type WatchAvailability = 'available' | 'needs-update' | 'unavailable';

export const watchSupported: boolean = false;

export async function getWatchAvailability(): Promise<WatchAvailability> {
  return 'unavailable';
}

export async function requestWatchAccess(): Promise<boolean> {
  return false;
}

export async function readWatchDays(_dayKeys: string[]): Promise<WatchDay[]> {
  return [];
}

export function openWatchSettings(): void {}
