import { PermissionsAndroid, Platform } from 'react-native';
import { BleManager, State } from 'react-native-ble-plx';
import { base64ToBytes, parseHeartRateMeasurement } from '../utils/heartRate';
import type { HeartRateDevice, LiveProblem } from './liveHeartRate';

// Live heart rate from a Garmin watch's "Broadcast Heart Rate", which advertises the standard
// Bluetooth Heart Rate service. This is separate from the Garmin Connect pairing.

const HR_SERVICE = '0000180d-0000-1000-8000-00805f9b34fb';
const HR_MEASUREMENT = '00002a37-0000-1000-8000-00805f9b34fb';
const WATCH_NAMES = /forerunner|garmin|f[eē]nix|epix|venu|vivoactive|vivosmart|instinct|enduro|marq|hrm/i;

let manager: BleManager | null = null;
const ble = () => (manager ??= new BleManager());

export const liveHeartRateSupported = true;

async function requestPermissions(): Promise<boolean> {
  const P = PermissionsAndroid.PERMISSIONS;
  const wanted =
    Number(Platform.Version) >= 31 ? [P.BLUETOOTH_SCAN, P.BLUETOOTH_CONNECT] : [P.ACCESS_FINE_LOCATION];
  const result = await PermissionsAndroid.requestMultiple(wanted);
  return wanted.every(p => result[p] === PermissionsAndroid.RESULTS.GRANTED);
}

function waitForPoweredOn(timeoutMs: number): Promise<State> {
  return new Promise(resolve => {
    const timer = setTimeout(() => {
      sub.remove();
      ble().state().then(resolve, () => resolve(State.Unknown));
    }, timeoutMs);
    const sub = ble().onStateChange(state => {
      if (state === State.PoweredOn) {
        clearTimeout(timer);
        sub.remove();
        resolve(state);
      }
    }, true);
  });
}

export async function prepareBluetooth(): Promise<LiveProblem | null> {
  if (!(await requestPermissions())) return 'permission';
  const state = await waitForPoweredOn(3000);
  if (state === State.PoweredOn) return null;
  if (state === State.Unsupported) return 'unsupported';
  if (state === State.Unauthorized) return 'permission';
  return 'bluetooth-off';
}

const isHeartRateService = (uuid: string) => {
  const u = uuid.toLowerCase();
  return u === '180d' || u.startsWith('0000180d-');
};

export function scanForHeartRateDevices(
  onDevice: (device: HeartRateDevice) => void,
  onError: (problem: LiveProblem) => void,
): () => void {
  ble()
    .startDeviceScan(null, { allowDuplicates: false }, (error, device) => {
      if (error) return onError('scan-failed');
      if (!device) return;
      const name = device.name ?? device.localName;
      const advertisesHr = device.serviceUUIDs?.some(isHeartRateService) ?? false;
      if (advertisesHr || (name && WATCH_NAMES.test(name))) {
        onDevice({ id: device.id, name: name ?? 'Heart rate sensor', rssi: device.rssi, advertisesHr });
      }
    })
    .catch(() => onError('scan-failed'));
  return () => {
    ble().stopDeviceScan().catch(() => undefined);
  };
}

/** Connects and streams beats per minute; resolves to a function that ends the connection. */
export async function connectHeartRate(
  deviceId: string,
  onBpm: (bpm: number) => void,
  onLost: () => void,
): Promise<() => void> {
  const device = await ble().connectToDevice(deviceId, { timeout: 15000 });
  await device.discoverAllServicesAndCharacteristics();
  const services = await device.services();
  if (!services.some(s => isHeartRateService(s.uuid))) {
    await ble().cancelDeviceConnection(deviceId).catch(() => undefined);
    throw new Error('no-heart-rate-service');
  }

  let closing = false;
  const monitor = device.monitorCharacteristicForService(HR_SERVICE, HR_MEASUREMENT, (error, characteristic) => {
    if (error || !characteristic?.value) return;
    const bpm = parseHeartRateMeasurement(base64ToBytes(characteristic.value));
    if (bpm) onBpm(bpm);
  });
  const lost = ble().onDeviceDisconnected(deviceId, () => {
    monitor.remove();
    lost.remove();
    if (!closing) onLost();
  });

  return () => {
    closing = true;
    monitor.remove();
    lost.remove();
    ble().cancelDeviceConnection(deviceId).catch(() => undefined);
  };
}
