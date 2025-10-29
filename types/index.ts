export type DeviceStatus = 'OK' | 'WARN' | 'ERROR';

export interface DeviceConfig {
  ip: string;
}

export interface ProjectConfig {
  id: string;
  name: string;
  accent: string;
  hosts: DeviceConfig[];
}

export interface MonitorConfig {
  projects: ProjectConfig[];
}

export interface DeviceStatusResponse {
  data: Array<{
    total_online: number;
  }>;
}

export interface DeviceState {
  ip: string;
  projectId: string;
  status: DeviceStatus;
  totalOnline: number;
  lastChecked: number;
  error?: string;
  stale: boolean;
}

export interface AckState {
  [key: string]: number; // key = device IP or project ID, value = expiry timestamp
}

export interface UIState {
  muted: boolean;
  acks: AckState;
  setMuted: (muted: boolean) => void;
  ackDevice: (ip: string) => void;
  unackDevice: (ip: string) => void;
  ackProject: (projectId: string) => void;
  unackProject: (projectId: string) => void;
  isAcked: (key: string) => boolean;
  clearExpiredAcks: () => void;
}
