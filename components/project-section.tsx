'use client';

import { ProjectConfig, DeviceState } from '@/types';
import { DeviceCard } from './device-card';
import { Badge } from '@/components/ui/badge';
import { useMemo } from 'react';

interface ProjectSectionProps {
  project: ProjectConfig;
  devices: DeviceState[];
  onDeviceClick?: (device: DeviceState) => void;
  isFullscreen?: boolean;
}

export function ProjectSection({
  project,
  devices,
  onDeviceClick,
  isFullscreen = false,
}: ProjectSectionProps) {
  const stats = useMemo(() => {
    const ok = devices.filter((d) => d.status === 'OK').length;
    const warn = devices.filter((d) => d.status === 'WARN').length;
    const error = devices.filter((d) => d.status === 'ERROR').length;
    return { ok, warn, error, total: devices.length };
  }, [devices]);

  return (
    <section className="flex-1 flex flex-col">
      <div className="flex items-center justify-between mb-8">
        <h2
          className="text-5xl font-bold tracking-tight"
          style={{
            color: project.accent,
            textShadow: `0 0 30px ${project.accent}60, 0 0 60px ${project.accent}30`,
          }}
        >
          {project.name}
        </h2>

        <div className="flex items-center gap-5 text-lg">
          <Badge
            variant="outline"
            className="bg-status-ok/10 text-status-ok border-status-ok px-4 py-1.5 text-lg"
          >
            OK {stats.ok}
          </Badge>
          <Badge
            variant="outline"
            className="bg-status-warn/10 text-status-warn border-status-warn px-4 py-1.5 text-lg"
          >
            WARN {stats.warn}
          </Badge>
          <Badge
            variant="outline"
            className="bg-status-error/10 text-status-error border-status-error px-4 py-1.5 text-lg"
          >
            ERROR {stats.error}
          </Badge>
          <span className="text-muted-foreground text-lg">
            Total: {stats.total}
          </span>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-5 content-start">
        {devices.map((device) => (
          <DeviceCard
            key={device.ip}
            device={device}
            onClick={() => onDeviceClick?.(device)}
          />
        ))}
      </div>
    </section>
  );
}
