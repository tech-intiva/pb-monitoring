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
    <section className="flex flex-1 flex-col gap-6 sm:gap-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h2
          className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl"
          style={{
            color: project.accent,
            textShadow: `0 0 30px ${project.accent}60, 0 0 60px ${project.accent}30`,
          }}
        >
          {project.name}
        </h2>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm sm:text-base md:text-lg">
          <Badge
            variant="outline"
            className="bg-status-ok/10 text-status-ok border-status-ok px-3 py-1.5 sm:px-4"
          >
            OK {stats.ok}
          </Badge>
          <Badge
            variant="outline"
            className="bg-status-warn/10 text-status-warn border-status-warn px-3 py-1.5 sm:px-4"
          >
            WARN {stats.warn}
          </Badge>
          <Badge
            variant="outline"
            className="bg-status-error/10 text-status-error border-status-error px-3 py-1.5 sm:px-4"
          >
            ERROR {stats.error}
          </Badge>
          <span className="text-muted-foreground text-sm sm:text-base md:text-lg">
            Total: {stats.total}
          </span>
        </div>
      </div>

      <div className="grid flex-1 grid-cols-1 gap-4 content-start sm:[grid-template-columns:repeat(auto-fill,minmax(220px,1fr))] sm:gap-5">
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
