# tasmota mqtt alarm integration plan

## overview
trigger external tasmota device via mqtt when devices have ERROR status

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

### 1. install mqtt library
```bash
npm install mqtt
```

### 2. create mqtt config
create `lib/mqtt-config.ts`:
```typescript
export const MQTT_CONFIG = {
  broker: process.env.MQTT_BROKER_URL || 'mqtt://103.78.25.230:1883',
  username: process.env.MQTT_USERNAME || 'DVES_USER',
  password: process.env.MQTT_PASSWORD || '',
  tasmotaTopic: process.env.TASMOTA_TOPIC || 'cmnd/tasmota_C95BC9/POWER',
};
```

**note**: tasmota mqtt broker runs on port **1883** (not 8080, that's the web interface)

### 3. create api endpoint
create `app/api/mqtt/alarm/route.ts`:
- accepts POST with `{ action: 'on' | 'off' }`
- connects to mqtt broker at `103.78.25.230:8080`
- publishes 'ON' or 'OFF' to tasmota topic
- returns success/error response

```typescript
import { NextRequest, NextResponse } from 'next/server';
import mqtt from 'mqtt';
import { MQTT_CONFIG } from '@/lib/mqtt-config';

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json(); // 'on' or 'off'

    const client = mqtt.connect(MQTT_CONFIG.broker, {
      username: MQTT_CONFIG.username,
      password: MQTT_CONFIG.password,
    });

    return new Promise<NextResponse>((resolve) => {
      client.on('connect', () => {
        const command = action === 'on' ? 'ON' : 'OFF';
        client.publish(MQTT_CONFIG.tasmotaTopic, command, (err) => {
          client.end();
          if (err) {
            resolve(NextResponse.json({ error: err.message }, { status: 500 }));
          } else {
            resolve(NextResponse.json({ success: true }));
          }
        });
      });

      client.on('error', (err) => {
        resolve(NextResponse.json({ error: err.message }, { status: 500 }));
      });
    });
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

this ensures mqtt alarm stops when:
- switching to another project/slide (auto-rotate or manual navigation)
- project list changes
- all devices become OK (alertDevices becomes empty, no event dispatched)

### 5. env configuration
add to `.env.production`:
```
MQTT_BROKER_URL=mqtt://103.78.25.230:1883
MQTT_USERNAME=DVES_USER
MQTT_PASSWORD=<password from tasmota>
TASMOTA_TOPIC=cmnd/tasmota_C95BC9/POWER
```

**device info**:
- device: Sonoff Basic
- web interface: http://103.78.25.230:8080
- mqtt port: 1883
- topic: tasmota_C95BC9

## testing steps

### 1. test mqtt connection
```bash
# test turning on
curl -X POST http://localhost:3000/api/mqtt/alarm \
  -H "Content-Type: application/json" \
  -d '{"action":"on"}'

# test turning off
curl -X POST http://localhost:3000/api/mqtt/alarm \
  -H "Content-Type: application/json" \
  -d '{"action":"off"}'
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
- [ ] install mqtt package
- [ ] create `lib/mqtt-config.ts`
- [ ] create `app/api/mqtt/alarm/route.ts`
- [ ] update dashboard.tsx line ~221 (trigger alarm)
- [ ] update dashboard.tsx line ~61 (stop alarm)
- [ ] add env variables to `.env.production`
- [ ] test mqtt connection
- [ ] test ERROR trigger
- [ ] test slide switching
- [ ] test WARN (no mqtt)

## notes
- mqtt calls are async (fire and forget with .catch)
- only ERROR status triggers mqtt alarm
- WARN status only plays sound, no mqtt trigger
- alarm behavior mirrors audio manager exactly
- `projectDevicesList` already available in scope at line ~221
