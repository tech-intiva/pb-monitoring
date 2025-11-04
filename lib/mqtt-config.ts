export const MQTT_CONFIG = {
  broker: process.env.MQTT_BROKER_URL || 'mqtt://103.78.25.230:1883',
  username: process.env.MQTT_USERNAME || 'DVES_USER',
  password: process.env.MQTT_PASSWORD || 'Aselole123',
  tasmotaTopic: process.env.TASMOTA_TOPIC || 'cmnd/tasmota_C95BC9/POWER',
};
