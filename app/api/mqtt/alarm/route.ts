import { NextRequest, NextResponse } from 'next/server';
import mqtt from 'mqtt';
import { MQTT_CONFIG } from '@/lib/mqtt-config';

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();

    if (action !== 'on' && action !== 'off') {
      return NextResponse.json(
        { error: 'invalid action, must be "on" or "off"' },
        { status: 400 }
      );
    }

    const client = mqtt.connect(MQTT_CONFIG.broker, {
      username: MQTT_CONFIG.username,
      password: MQTT_CONFIG.password,
    });

    return new Promise<NextResponse>((resolve) => {
      const timeout = setTimeout(() => {
        client.end(true);
        resolve(
          NextResponse.json(
            { error: 'connection timeout' },
            { status: 504 }
          )
        );
      }, 10000);

      client.on('connect', () => {
        clearTimeout(timeout);
        const command = action === 'on' ? 'ON' : 'OFF';

        client.publish(MQTT_CONFIG.tasmotaTopic, command, (err) => {
          client.end();

          if (err) {
            resolve(
              NextResponse.json(
                { error: err.message },
                { status: 500 }
              )
            );
          } else {
            resolve(
              NextResponse.json({
                success: true,
                action,
                topic: MQTT_CONFIG.tasmotaTopic,
                command,
              })
            );
          }
        });
      });

      client.on('error', (err) => {
        clearTimeout(timeout);
        client.end(true);
        resolve(
          NextResponse.json(
            { error: err.message },
            { status: 500 }
          )
        );
      });
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'unknown error' },
      { status: 500 }
    );
  }
}
