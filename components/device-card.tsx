'use client';

import { DeviceState } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  formatTimeAgo,
  formatDateTimeWIB,
  getStatusColor,
} from '@/lib/device-utils';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/lib/store';
import { BellOff } from 'lucide-react';

interface DeviceCardProps {
  device: DeviceState;
  onClick?: () => void;
}

export function DeviceCard({ device, onClick }: DeviceCardProps) {
  const statusColor = getStatusColor(device.status);
  const isError = device.status === 'ERROR';
  const { ackDevice, unackDevice, isAcked } = useUIStore();
  const isDeviceAcked = isAcked(device.ip);

  const onlineTextColor = (() => {
    switch (device.status) {
      case 'OK':
        return 'text-status-ok';
      case 'WARN':
        return 'text-status-warn';
      case 'ERROR':
        return 'text-status-error';
      default:
        return 'text-muted-foreground';
    }
  })();

  const handleMuteToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDeviceAcked) {
      unackDevice(device.ip);
    } else {
      ackDevice(device.ip);
    }
  };

  // status-based colors for glows
  const getStatusGlow = () => {
    switch (device.status) {
      case 'OK':
        return '22, 197, 94'; // green rgb
      case 'WARN':
        return '245, 158, 11'; // amber rgb
      case 'ERROR':
        return '239, 68, 68'; // red rgb
    }
  };

  const statusRGB = getStatusGlow();

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              'group relative transition-all duration-300',
              device.stale && 'opacity-50',
              onClick && 'cursor-pointer'
            )}
            onClick={onClick}
            style={{
              filter: isError && !isDeviceAcked
                ? `drop-shadow(0 0 12px rgba(${statusRGB}, 0.6)) drop-shadow(0 0 24px rgba(${statusRGB}, 0.3))`
                : `drop-shadow(0 4px 8px rgba(0, 0, 0, 0.4))`,
            }}
          >
            <Card
              className={cn(
                'min-w-[200px] sm:min-w-[220px] min-h-[140px] sm:min-h-[150px] border-2 transition-all duration-300 relative overflow-hidden',
                'backdrop-blur-sm bg-card/40',
                statusColor,
                'hover:scale-105 hover:shadow-2xl',
                isError && !isDeviceAcked && 'animate-pulse'
              )}
              style={{
                borderRadius: '16px',
                boxShadow: `0 0 0 1px rgba(${statusRGB}, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)`,
              }}
            >
              {/* Glass morphism gradient overlay */}
              <div
                className="absolute inset-0 opacity-10 pointer-events-none"
                style={{
                  background: `linear-gradient(135deg, rgba(${statusRGB}, 0.3) 0%, transparent 60%)`,
                }}
              />

              {/* Shimmer effect on hover */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{
                  background: 'linear-gradient(135deg, transparent 0%, rgba(255, 255, 255, 0.1) 50%, transparent 100%)',
                  transform: 'translateX(-100%)',
                  animation: 'shimmer 2s infinite',
                }}
              />

              <CardContent className="relative z-10 flex h-full flex-col justify-between p-4 sm:p-5">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="text-base font-mono font-semibold truncate flex-1 tracking-wide sm:text-lg">
                    {device.ip}
                  </div>
                  {isError && (
                    <button
                      onClick={handleMuteToggle}
                      className={cn(
                        'opacity-0 group-hover:opacity-100 transition-all duration-200 p-1.5 rounded-lg',
                        'hover:bg-background/30 backdrop-blur-sm',
                        isDeviceAcked && 'opacity-100 bg-background/20'
                      )}
                      title={isDeviceAcked ? 'Click to unmute' : 'Mute alerts for 5 minutes'}
                    >
                      <BellOff className={cn('w-5 h-5', isDeviceAcked && 'text-status-warn')} />
                    </button>
                  )}
                </div>

                <div className="flex-1 flex items-center justify-center">
                  <div
                    className={cn(
                      'text-4xl font-bold tabular-nums tracking-tight sm:text-5xl',
                      statusColor
                    )}
                    style={{
                      textShadow: `0 0 20px rgba(${statusRGB}, 0.5), 0 2px 4px rgba(0, 0, 0, 0.3)`,
                    }}
                  >
                    {device.status}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 mt-2 text-xs sm:text-sm">
                  <span className="font-medium text-muted-foreground">
                    {formatTimeAgo(device.lastChecked)}
                  </span>

                  <div className="flex items-center gap-2">
                    <span className={cn('font-semibold text-xs', onlineTextColor)}>
                      online: {device.totalOnline}
                    </span>
                    {device.stale && (
                      <Badge
                        variant="outline"
                        className="text-[10px] px-2 py-0.5 rounded-full bg-background/50 backdrop-blur-sm"
                      >
                        stale
                      </Badge>
                    )}
                    {isDeviceAcked && (
                      <Badge
                        variant="outline"
                        className="text-[10px] px-2 py-0.5 rounded-full text-status-warn border-status-warn bg-status-warn/10 backdrop-blur-sm"
                      >
                        muted
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-xs space-y-1">
            <div>
              <strong>IP:</strong> {device.ip}
            </div>
            <div>
              <strong>Last check:</strong> {formatDateTimeWIB(device.lastChecked)} WIB
            </div>
            {device.error && (
              <div className="text-status-error">
                <strong>Error:</strong> {device.error}
              </div>
            )}
            <div>
              <strong>Online:</strong> {device.totalOnline}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
