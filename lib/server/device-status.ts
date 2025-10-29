'use server';

import { DeviceStatus, DeviceStatusResponse } from '@/types';

const REQUEST_TIMEOUT = 15000; // 15 seconds

export async function fetchDeviceStatusFromDevice(ip: string): Promise<{
  status: DeviceStatus;
  totalOnline: number;
  lastChecked: number;
  error?: string;
}> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const response = await fetch(
      `http://${ip}:8084/api/v1/adb-controller/status-all-devices`,
      {
        signal: controller.signal,
        cache: 'no-store',
      }
    );

    if (!response.ok) {
      return {
        status: 'ERROR',
        totalOnline: 0,
        lastChecked: Date.now(),
        error: `HTTP ${response.status}`,
      };
    }

    const data: DeviceStatusResponse = await response.json();
    const totalOnline = data.data[data.data.length - 1]?.total_online ?? 0;

    return {
      status: totalOnline > 0 ? 'OK' : 'WARN',
      totalOnline,
      lastChecked: Date.now(),
    };
  } catch (err) {
    return {
      status: 'ERROR',
      totalOnline: 0,
      lastChecked: Date.now(),
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

