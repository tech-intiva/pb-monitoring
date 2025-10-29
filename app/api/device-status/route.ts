import { NextResponse } from 'next/server';
import { fetchDeviceStatusFromDevice } from '@/lib/server/device-status';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ip = searchParams.get('ip');

  if (!ip) {
    return NextResponse.json(
      { error: 'Missing ip parameter' },
      { status: 400 }
    );
  }

  const result = await fetchDeviceStatusFromDevice(ip);

  return NextResponse.json(result);
}

