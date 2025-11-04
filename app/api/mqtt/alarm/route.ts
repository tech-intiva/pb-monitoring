import { NextRequest, NextResponse } from 'next/server';
import { TASMOTA_CONFIG } from '@/lib/mqtt-config';

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();

    console.log('[Tasmota API] Received request', { action });

    if (action !== 'on' && action !== 'off') {
      return NextResponse.json(
        { error: 'invalid action, must be "on" or "off"' },
        { status: 400 }
      );
    }

    const command = action === 'on' ? 'ON' : 'OFF';
    const url = `${TASMOTA_CONFIG.deviceUrl}/cm?cmnd=POWER%20${command}`;

    console.log('[Tasmota API] Sending HTTP request', { url, command });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.log('[Tasmota API] ❌ HTTP error', { status: response.status });
        return NextResponse.json(
          { error: `HTTP ${response.status}` },
          { status: response.status }
        );
      }

      const data = await response.json();
      console.log('[Tasmota API] ✅ Command sent successfully', { action, command, response: data });

      return NextResponse.json({
        success: true,
        action,
        command,
        response: data,
      });
    } catch (fetchError) {
      clearTimeout(timeoutId);

      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        console.log('[Tasmota API] ❌ Request timeout');
        return NextResponse.json(
          { error: 'request timeout' },
          { status: 504 }
        );
      }

      throw fetchError;
    }
  } catch (error) {
    console.log('[Tasmota API] ❌ Unexpected error', { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'unknown error' },
      { status: 500 }
    );
  }
}
