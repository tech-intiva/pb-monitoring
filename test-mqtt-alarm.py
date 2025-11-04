#!/usr/bin/env python3
"""
standalone script to test tasmota device via direct HTTP
usage: python test-mqtt-alarm.py [on|off] [device_url]
"""

import sys

import requests

DEFAULT_DEVICE_URL = "http://103.78.25.230:8080"


def test_alarm(action, device_url):
    """test tasmota device via direct HTTP command"""
    if action not in ["on", "off"]:
        print(f"error: action must be 'on' or 'off', got '{action}'")
        sys.exit(1)

    command = "ON" if action == "on" else "OFF"
    url = f"{device_url}/cm?cmnd=POWER%20{command}"

    print(f"testing alarm: {action.upper()}")
    print(f"sending GET to {url}")

    try:
        response = requests.get(url, timeout=10)

        print(f"status code: {response.status_code}")

        if response.status_code == 200:
            try:
                data = response.json()
                print(f"response: {data}")

                # check if POWER state matches expected
                power_state = data.get("POWER", "")
                if power_state == command:
                    print(f"✅ success: alarm turned {action.upper()}")
                else:
                    print(f"⚠️  unexpected state: expected {command}, got {power_state}")
            except:
                print(f"response text: {response.text}")
                print(f"✅ request sent successfully")
        else:
            print(f"❌ failed: HTTP {response.status_code}")
            print(f"response: {response.text}")

    except requests.exceptions.ConnectionError:
        print(f"❌ connection error: device not reachable at {device_url}")
        sys.exit(1)
    except requests.exceptions.Timeout:
        print("❌ timeout: request took too long")
        sys.exit(1)
    except Exception as e:
        print(f"❌ error: {e}")
        sys.exit(1)


def main():
    if len(sys.argv) < 2 or len(sys.argv) > 3:
        print("usage: python test-mqtt-alarm.py [on|off] [device_url]")
        print("\nexamples:")
        print(
            "  python test-mqtt-alarm.py on                           # use default device"
        )
        print(
            "  python test-mqtt-alarm.py off                          # use default device"
        )
        print(
            "  python test-mqtt-alarm.py on http://192.168.1.100:8080  # custom device"
        )
        print(f"\ndefault device: {DEFAULT_DEVICE_URL}")
        sys.exit(1)

    action = sys.argv[1].lower()
    device_url = sys.argv[2] if len(sys.argv) == 3 else DEFAULT_DEVICE_URL

    test_alarm(action, device_url)


if __name__ == "__main__":
    main()
