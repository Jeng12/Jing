// Fallback for platforms without the Bluetooth module wired up (iOS, web).
// Android resolves to liveHeartRate.android.ts instead.

export interface HeartRateDevice {
  id: string;
  name: string;
  rssi: number | null;
  advertisesHr: boolean;
}

export type LiveProblem = 'permission' | 'bluetooth-off' | 'unsupported' | 'scan-failed' | 'connect-failed';

export const liveHeartRateSupported: boolean = false;

export async function prepareBluetooth(): Promise<LiveProblem | null> {
  return 'unsupported';
}

export function scanForHeartRateDevices(
  _onDevice: (device: HeartRateDevice) => void,
  onError: (problem: LiveProblem) => void,
): () => void {
  onError('unsupported');
  return () => undefined;
}

export async function connectHeartRate(
  _deviceId: string,
  _onBpm: (bpm: number) => void,
  _onLost: () => void,
): Promise<() => void> {
  throw new Error('unsupported');
}
