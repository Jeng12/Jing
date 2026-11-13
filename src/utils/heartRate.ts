import colors from '../theme/colors';

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export function base64ToBytes(b64: string): number[] {
  const clean = b64.replace(/[^A-Za-z0-9+/]/g, '');
  const bytes: number[] = [];
  for (let i = 0; i < clean.length; i += 4) {
    const n =
      (B64.indexOf(clean[i]) << 18) |
      (B64.indexOf(clean[i + 1]) << 12) |
      ((B64.indexOf(clean[i + 2] ?? 'A') & 63) << 6) |
      (B64.indexOf(clean[i + 3] ?? 'A') & 63);
    bytes.push((n >> 16) & 255);
    if (i + 2 < clean.length) bytes.push((n >> 8) & 255);
    if (i + 3 < clean.length) bytes.push(n & 255);
  }
  return bytes;
}

/**
 * Parses the Bluetooth Heart Rate Measurement characteristic (0x2A37).
 * Bit 0 of the flags byte says whether the value is 8 or 16 bits.
 */
export function parseHeartRateMeasurement(bytes: number[]): number | null {
  if (bytes.length < 2) return null;
  const sixteenBit = (bytes[0] & 0x01) === 1;
  if (sixteenBit) return bytes.length >= 3 ? bytes[1] | (bytes[2] << 8) : null;
  return bytes[1];
}

export interface HeartRateZone {
  zone: number; // 0 = below zone 1, otherwise 1–5
  label: string;
  color: string;
}

const ZONES: HeartRateZone[] = [
  { zone: 0, label: 'Resting', color: colors.gray },
  { zone: 1, label: 'Warm up', color: colors.zone1 },
  { zone: 2, label: 'Easy', color: colors.zone2 },
  { zone: 3, label: 'Aerobic', color: colors.zone3 },
  { zone: 4, label: 'Threshold', color: colors.zone4 },
  { zone: 5, label: 'Maximum', color: colors.zone5 },
];

export const ZONE_LIST = ZONES.slice(1);

/** Zones as 50/60/70/80/90 % of max heart rate (the split Garmin uses by default). */
export function heartRateZone(bpm: number, maxHeartRate: number): HeartRateZone {
  const pct = bpm / maxHeartRate;
  if (pct >= 0.9) return ZONES[5];
  if (pct >= 0.8) return ZONES[4];
  if (pct >= 0.7) return ZONES[3];
  if (pct >= 0.6) return ZONES[2];
  if (pct >= 0.5) return ZONES[1];
  return ZONES[0];
}
