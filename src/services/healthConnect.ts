import { WatchDay, WatchDiagnostics } from '../types/tracker';

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

export interface WatchReadResult {
  days: WatchDay[];
  /** One line per data type that could not be read, e.g. "Sleep: Not allowed in Health Connect". */
  errors: string[];
}

export async function readWatchDays(_dayKeys: string[]): Promise<WatchReadResult> {
  return { days: [], errors: [] };
}

export async function diagnoseWatch(): Promise<WatchDiagnostics> {
  return { status: 'unavailable', granted: [], rows: [], checkedAt: new Date().toISOString() };
}

export function openWatchSettings(): void {}
