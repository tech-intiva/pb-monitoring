'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { formatTimeWIB, formatTimeAgo } from '@/lib/device-utils';
import { useUIStore } from '@/lib/store';
import { Volume2, VolumeX } from 'lucide-react';

interface HeaderBarProps {
  lastRefresh?: number;
  nextRefresh?: number;
  currentProject?: string;
}

export function HeaderBar({ lastRefresh, nextRefresh, currentProject }: HeaderBarProps) {
  const { muted, setMuted } = useUIStore();
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
      <div className="w-full px-4 py-3">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <h1 className="text-xl font-bold sm:text-2xl">PB Monitoring</h1>
            {currentProject && (
              <>
                <Separator orientation="vertical" className="hidden h-6 sm:block" />
                <Separator className="h-px w-full bg-border sm:hidden" />
                <span className="text-base text-muted-foreground sm:text-xl">
                  {currentProject}
                </span>
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs sm:text-sm">
            {/* Legend */}
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="bg-status-ok/10 text-status-ok border-status-ok"
              >
                OK
              </Badge>
              <Badge
                variant="outline"
                className="bg-status-warn/10 text-status-warn border-status-warn"
              >
                WARN
              </Badge>
              <Badge
                variant="outline"
                className="bg-status-error/10 text-status-error border-status-error"
              >
                ERROR
              </Badge>
            </div>

            <Separator orientation="vertical" className="hidden h-6 sm:block" />

            {/* Clock */}
            <div className="font-mono text-sm tabular-nums sm:text-base">
              {formatTimeWIB(currentTime)} WIB
            </div>

            <Separator orientation="vertical" className="hidden h-6 sm:block" />

            {/* Refresh info */}
            {lastRefresh && (
              <div className="text-muted-foreground text-[11px] sm:text-xs">
                Last: {formatTimeAgo(lastRefresh)}
              </div>
            )}

            <Separator orientation="vertical" className="hidden h-6 sm:block" />

            {/* Mute toggle */}
            <div className="flex items-center gap-2">
              <label
                htmlFor="mute-toggle"
                className="flex cursor-pointer items-center gap-1 text-sm font-medium"
              >
                {muted ? (
                  <VolumeX className="h-4 w-4" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
                Mute
              </label>
              <Switch
                id="mute-toggle"
                checked={muted}
                onCheckedChange={setMuted}
              />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
