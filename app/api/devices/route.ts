import { NextResponse } from 'next/server';
import yaml from 'js-yaml';
import fs from 'fs';
import path from 'path';
import { fetchDeviceStatusFromDevice } from '@/lib/server/device-status';
import { DeviceStatus } from '@/types';

interface ApiDeviceState {
  ip: string;
  projectId: string;
  status: DeviceStatus;
  totalOnline: number;
  lastChecked: number;
  error?: string;
}

export async function GET() {
  try {
    // load config from yaml
    const configPath = path.join(process.cwd(), 'public', 'config', 'monitor.yaml');
    const fileContents = fs.readFileSync(configPath, 'utf8');
    const data = yaml.load(fileContents) as any;

    const devices: ApiDeviceState[] = [];

    // fetch all devices in parallel
    const projectEntries = Object.entries(data.projects || {});
    const fetchPromises: Promise<void>[] = [];

    for (const [projectId, projectData] of projectEntries) {
      const hosts = (projectData as any).hosts || [];

      for (const ip of hosts) {
        fetchPromises.push(
          fetchDeviceStatusFromDevice(ip).then((result) => {
            devices.push({
              ip,
              projectId,
              status: result.status,
              totalOnline: result.totalOnline,
              lastChecked: result.lastChecked,
              error: result.error,
            });
          })
        );
      }
    }

    // wait for all fetches to complete
    await Promise.all(fetchPromises);

    return NextResponse.json({
      devices,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('[API] Failed to fetch device statuses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch device statuses' },
      { status: 500 }
    );
  }
}
