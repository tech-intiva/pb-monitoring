# tasmota alarm integration plan (HTTP)

## overview
trigger external tasmota device via HTTP when devices have ERROR status

## behavior

### alarm triggers (ON)
- device has ERROR status (totalOnline === 0 or explicit ERROR)
- user viewing the project with ERROR device
- not acknowledged

### alarm stops (OFF)
- all devices become OK
- user switches to different project/slide
- user acknowledges device/project
- auto-rotate changes slide

### no alarm
- device has WARN status (5+ offline but not all)
- sound plays, but mqtt alarm stays off

### re-trigger
- when returning to project with ERROR
- alarm triggers again if ERROR condition still exists

## implementation steps

### 1. no external dependencies needed
uses built-in `fetch` API for HTTP requests

### 2. create tasmota config
create `lib/mqtt-config.ts`:
```typescript
export const TASMOTA_CONFIG = {
  deviceUrl: process.env.TASMOTA_DEVICE_URL || 'http://103.78.25.230:8080',
};
```

**note**: uses tasmota HTTP API on port **8080**

### 3. create api endpoint
create `app/api/mqtt/alarm/route.ts`:
- accepts POST with `{ action: 'on' | 'off' }`
- sends HTTP GET to tasmota device at `103.78.25.230:8080`
- uses tasmota command API: `/cm?cmnd=POWER%20ON` or `POWER%20OFF`
- returns success/error response

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { TASMOTA_CONFIG } from '@/lib/mqtt-config';

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();

    if (action !== 'on' && action !== 'off') {
      return NextResponse.json(
        { error: 'invalid action, must be "on" or "off"' },
        { status: 400 }
      );
    }

    const command = action === 'on' ? 'ON' : 'OFF';
    const url = `${TASMOTA_CONFIG.deviceUrl}/cm?cmnd=POWER%20${command}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return NextResponse.json(
          { error: `HTTP ${response.status}` },
          { status: response.status }
        );
      }

      const data = await response.json();

      return NextResponse.json({
        success: true,
        action,
        command,
        response: data,
      });
    } catch (fetchError) {
      clearTimeout(timeoutId);

      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        return NextResponse.json(
          { error: 'request timeout' },
          { status: 504 }
        );
      }

      throw fetchError;
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'unknown error' },
      { status: 500 }
    );
  }
}
```

### 4. update dashboard.tsx

#### a. trigger alarm on ERROR (line ~221)
after dispatching `project-audio-evaluate` event:

```typescript
// components/dashboard.tsx line ~221
if (typeof window !== 'undefined') {
  window.dispatchEvent(
    new CustomEvent('project-audio-evaluate', {
      detail: {
        projectId,
        deviceIps: alertDevices,
      },
    })
  );

  // trigger mqtt alarm only for ERROR devices
  const errorDevices = projectDevicesList.filter(
    (device) => device.status === 'ERROR'
  );

  if (errorDevices.length > 0) {
    fetch('/api/mqtt/alarm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'on' }),
    }).catch(console.error);
  }
}
```

#### b. stop alarm with dispatchStopAudio
update `dispatchStopAudio` function (line ~61):

```typescript
const dispatchStopAudio = useCallback(() => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('stop-audio'));

    // turn off mqtt alarm
    fetch('/api/mqtt/alarm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'off' }),
    }).catch(console.error);
  }
}, []);
```

this ensures alarm stops when:
- switching to another project/slide (auto-rotate or manual navigation)
- project list changes
- all devices become OK

### 5. env configuration
add to `.env.production`:
```
TASMOTA_DEVICE_URL=http://103.78.25.230:8080
```

**device info**:
- device: Sonoff Basic
- HTTP API: http://103.78.25.230:8080
- command endpoint: /cm?cmnd=POWER%20[ON|OFF]

## testing steps

### 1. test HTTP connection
```bash
# test via API endpoint
curl -X POST http://localhost:3000/api/mqtt/alarm \
  -H "Content-Type: application/json" \
  -d '{"action":"on"}'

curl -X POST http://localhost:3000/api/mqtt/alarm \
  -H "Content-Type: application/json" \
  -d '{"action":"off"}'

# OR test directly via python script
python test-mqtt-alarm.py on
python test-mqtt-alarm.py off
```

### 2. test with device ERROR
- simulate device ERROR status
- verify alarm turns on
- switch to another project/slide
- verify alarm turns off

### 3. test with device WARN
- simulate device WARN status
- verify sound plays but alarm stays off

### 4. test acknowledgement
- when ERROR status is acknowledged
- alarm should stop (via dispatchStopAudio flow)

## implementation checklist
- [x] no external packages needed (uses built-in fetch)
- [x] create `lib/mqtt-config.ts` (now TASMOTA_CONFIG)
- [x] create `app/api/mqtt/alarm/route.ts` (uses HTTP)
- [x] update dashboard.tsx line ~221 (trigger alarm)
- [x] update dashboard.tsx line ~61 (stop alarm)
- [ ] add env variables to `.env.production`
- [ ] test HTTP connection
- [ ] test ERROR trigger
- [ ] test slide switching
- [ ] test WARN (no alarm)

## notes
- HTTP requests are async (fire and forget with .catch)
- only ERROR status triggers alarm
- WARN status only plays sound, no alarm trigger
- alarm behavior mirrors audio manager exactly
- `projectDevicesList` already available in scope at line ~221
- uses Tasmota HTTP command API instead of MQTT for simplicity
- no external dependencies required
