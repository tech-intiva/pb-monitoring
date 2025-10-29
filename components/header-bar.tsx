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
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">PB Monitoring</h1>
            {currentProject && (
              <>
                <Separator orientation="vertical" className="h-6" />
                <span className="text-xl text-muted-foreground">
                  {currentProject}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-4 text-sm">
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

            <Separator orientation="vertical" className="h-6" />

            {/* Clock */}
            <div className="font-mono tabular-nums">
              {formatTimeWIB(currentTime)} WIB
            </div>

            <Separator orientation="vertical" className="h-6" />

            {/* Refresh info */}
            {lastRefresh && (
              <div className="text-muted-foreground text-xs">
                Last: {formatTimeAgo(lastRefresh)}
              </div>
            )}

            <Separator orientation="vertical" className="h-6" />

            {/* Mute toggle */}
            <div className="flex items-center gap-2">
              <label
                htmlFor="mute-toggle"
                className="text-sm font-medium cursor-pointer flex items-center gap-1"
              >
                {muted ? (
                  <VolumeX className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4" />
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
