import { useQuery } from '@tanstack/react-query';
import { DeviceState } from '@/types';
import {
  fetchDeviceStatus,
  POLL_INTERVAL,
  STALE_THRESHOLD,
} from './device-utils';

export function useDeviceStatus(ip: string, projectId: string) {
  return useQuery({
    queryKey: ['device', ip],
    queryFn: async (): Promise<DeviceState> => {
      const result = await fetchDeviceStatus(ip);
      const lastChecked = result.lastChecked;

      return {
        ip,
        projectId,
        status: result.status,
        totalOnline: result.totalOnline,
        lastChecked,
        error: result.error,
        stale: false,
      };
    },
    refetchInterval: POLL_INTERVAL,
    staleTime: POLL_INTERVAL - 1000,
    retry: 0, // don't retry, handle errors via status
  });
}

export function isStale(lastChecked: number): boolean {
  return Date.now() - lastChecked > STALE_THRESHOLD;
}
