'use client';

import { ProjectConfig, DeviceState } from '@/types';
import { DeviceCard } from './device-card';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useMemo } from 'react';

interface ProjectSectionProps {
  project: ProjectConfig;
  devices: DeviceState[];
  onDeviceClick?: (device: DeviceState) => void;
  isFullscreen?: boolean;
}

function DeviceSkeleton() {
  return (
    <div className="group relative transition-all duration-300">
      <Card className="min-w-[200px] sm:min-w-[220px] min-h-[140px] sm:min-h-[150px] border-2 relative overflow-hidden backdrop-blur-sm bg-card/20">
        <CardContent className="relative z-10 flex h-full flex-col justify-between p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="h-4 w-24 rounded bg-muted/30 animate-pulse" />
            <div className="h-5 w-5 rounded bg-muted/30 animate-pulse" />
          </div>
          <div className="flex-1 flex items-center justify-center">
            <div className="h-10 w-24 rounded bg-muted/30 animate-pulse" />
          </div>
          <div className="flex items-center justify-between gap-2 mt-2">
            <div className="h-3 w-24 rounded bg-muted/30 animate-pulse" />
            <div className="flex items-center gap-2">
              <div className="h-3 w-16 rounded bg-muted/30 animate-pulse" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function ProjectSection({
  project,
  devices,
  onDeviceClick,
  isFullscreen = false,
}: ProjectSectionProps) {
  const hosts = project.hosts ?? [];

  const deviceMap = useMemo(() => {
    const map = new Map<string, DeviceState>();
    devices.forEach((device) => {
      map.set(device.ip, device);
    });
    return map;
  }, [devices]);

  const items = useMemo(() => {
    if (hosts.length > 0) {
      return hosts.map((host) => ({
        key: host.ip,
        device: deviceMap.get(host.ip) ?? null,
      }));
    }

    return devices.map((device) => ({ key: device.ip, device }));
  }, [hosts, deviceMap, devices]);

  const stats = useMemo(() => {
    const ok = devices.filter((d) => d.status === 'OK').length;
    const warn = devices.filter((d) => d.status === 'WARN').length;
    const error = devices.filter((d) => d.status === 'ERROR').length;
    const total = hosts.length || devices.length;
    return { ok, warn, error, total };
  }, [devices, hosts.length]);

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
        {items.map(({ key, device }) =>
          device ? (
            <DeviceCard
              key={key}
              device={device}
              onClick={() => onDeviceClick?.(device)}
            />
          ) : (
            <DeviceSkeleton key={key} />
          )
        )}
      </div>
    </section>
  );
}
