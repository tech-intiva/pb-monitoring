import { DeviceStatus, DeviceStatusResponse } from '@/types';

export const POLL_INTERVAL = 15000; // 15 seconds
export const REQUEST_TIMEOUT = 15000; // 15 seconds
export const STALE_THRESHOLD = 45000; // 45 seconds
export const AUDIO_THROTTLE = 30000; // 30 seconds

export async function fetchDeviceStatus(ip: string): Promise<{
  status: DeviceStatus;
  totalOnline: number;
  error?: string;
}> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    const response = await fetch(
      `http://${ip}:8084/api/v1/adb-controller/status-all-devices`,
      { signal: controller.signal }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        status: 'ERROR',
        totalOnline: 0,
        error: `HTTP ${response.status}`,
      };
    }

    const data: DeviceStatusResponse = await response.json();
    const totalOnline = data.data[data.data.length - 1]?.total_online ?? 0;

    return {
      status: totalOnline > 0 ? 'OK' : 'WARN',
      totalOnline,
    };
  } catch (err) {
    return {
      status: 'ERROR',
      totalOnline: 0,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

export function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}

export function formatTimeWIB(timestamp: number): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(timestamp);
}

export function formatDateTimeWIB(timestamp: number): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(timestamp);
}

export function getStatusColor(status: DeviceStatus): string {
  switch (status) {
    case 'OK':
      return 'text-status-ok border-status-ok';
    case 'WARN':
      return 'text-status-warn border-status-warn';
    case 'ERROR':
      return 'text-status-error border-status-error';
  }
}

export function getProjectAccentColor(projectId: string): string {
  const id = projectId.toLowerCase();
  if (id.includes('cyclops')) return 'project-cyclops';
  if (id.includes('defiant') || id.includes('volvo')) return 'project-defiant';
  if (id.includes('skyarmy') && id.includes('v1')) return 'project-skyarmyv1';
  if (id.includes('enigma')) return 'project-enigma';
  if (id.includes('skyarmy') && id.includes('v2')) return 'project-skyarmyv2';
  if (id.includes('deimos')) return 'project-deimos';
  return 'project-cyclops'; // fallback
}
