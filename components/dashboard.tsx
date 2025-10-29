'use client';

import { useEffect, useLayoutEffect, useState, useCallback, useRef } from 'react';
import { MonitorConfig, DeviceState } from '@/types';
import { ProjectSection } from './project-section';
import { AudioManager } from './audio-manager';
import { loadConfig } from '@/lib/config';
import { useDeviceStatus, isStale } from '@/lib/hooks';
import { useUIStore } from '@/lib/store';

function DeviceMonitor({
  ip,
  projectId,
  onStatusChange,
}: {
  ip: string;
  projectId: string;
  onStatusChange: (device: DeviceState) => void;
}) {
  const { data } = useDeviceStatus(ip, projectId);

  useEffect(() => {
    if (data) {
      const deviceWithStale: DeviceState = {
        ...data,
        stale: isStale(data.lastChecked),
      };

      // notify parent of state change
      onStatusChange(deviceWithStale);

    }
  }, [data, ip, projectId, onStatusChange]);

  return null;
}

export function Dashboard() {
  const [config, setConfig] = useState<MonitorConfig>({ projects: [] });
  const [devices, setDevices] = useState<Map<string, DeviceState>>(new Map());
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const clearExpiredAcks = useUIStore((state) => state.clearExpiredAcks);
  const setCurrentProjectId = useUIStore((state) => state.setCurrentProjectId);
  const audioEvaluationRef = useRef<string | null>(null);
  const audioStatus = useUIStore((state) => state.audioStatus);

  useEffect(() => {
    loadConfig().then(setConfig);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      clearExpiredAcks();
    }, 60000); // clean up every minute

    return () => clearInterval(interval);
  }, [clearExpiredAcks]);

  // ensure current slide stays in range if project list changes
  const dispatchStopAudio = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('stop-audio'));
    }
  }, []);

  useEffect(() => {
    if (
      config.projects.length > 0 &&
      currentSlide >= config.projects.length
    ) {
      dispatchStopAudio();
      audioEvaluationRef.current = null;
      setCurrentSlide(0);
    }
  }, [config.projects.length, currentSlide, dispatchStopAudio]);

  // auto-rotate carousel every 60 seconds
  useEffect(() => {
    if (config.projects.length === 0) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => {
        const next = (prev + 1) % config.projects.length;
        console.log('[Dashboard] Auto-rotate - changing slide', { prev, next });
        dispatchStopAudio();
        audioEvaluationRef.current = null;
        return next;
      });
    }, 60000);

    return () => clearInterval(interval);
  }, [config.projects.length, dispatchStopAudio]);

  const handleDeviceStatusChange = useCallback(
    (device: DeviceState) => {
      setDevices((prev) => {
        const next = new Map(prev);
        next.set(device.ip, device);
        return next;
      });
    },
    []
  );

  // track fullscreen state
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'm') {
        const { muted, setMuted } = useUIStore.getState();
        setMuted(!muted);
      } else if (e.key === 'f') {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen();
        } else {
          document.exitFullscreen();
        }
      } else if (e.key === 'r') {
        window.location.reload();
      } else if (e.key === 'ArrowLeft') {
        setCurrentSlide((prev) => {
          const next =
            prev === 0 ? config.projects.length - 1 : prev - 1;
          console.log('[Dashboard] Arrow left - changing slide', { prev, next });
          dispatchStopAudio();
          audioEvaluationRef.current = null;
          return next;
        });
      } else if (e.key === 'ArrowRight') {
        setCurrentSlide((prev) => {
          const next = (prev + 1) % config.projects.length;
          console.log('[Dashboard] Arrow right - changing slide', { prev, next });
          dispatchStopAudio();
          audioEvaluationRef.current = null;
          return next;
        });
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [config.projects.length, dispatchStopAudio]);

  // group devices by project
  const projectDevices = new Map<string, DeviceState[]>();
  devices.forEach((device) => {
    const projectDevices_ = projectDevices.get(device.projectId) || [];
    projectDevices_.push(device);
    projectDevices.set(device.projectId, projectDevices_);
  });

  const currentProject = config.projects[currentSlide];

  useLayoutEffect(() => {
    console.log('[Dashboard] Setting currentProjectId', {
      slide: currentSlide,
      projectId: currentProject?.id ?? null,
      projectName: currentProject?.name ?? 'none',
    });
    setCurrentProjectId(currentProject?.id ?? null);
  }, [currentProject?.id, setCurrentProjectId]);

  useEffect(() => {
    return () => {
      setCurrentProjectId(null);
    };
  }, [setCurrentProjectId]);

  useEffect(() => {
    const projectId = currentProject?.id;
    if (!projectId) {
      audioEvaluationRef.current = null;
      return;
    }

    if (audioEvaluationRef.current === projectId) {
      return;
    }

    const projectDevicesList = Array.from(devices.values()).filter(
      (device) => device.projectId === projectId
    );

    const alertDevices = projectDevicesList
      .filter((device) => device.status === 'WARN' || device.status === 'ERROR')
      .map((device) => device.ip);

    const alertSignature = alertDevices.slice().sort().join('|');
    const evaluationKey = `${projectId}:${alertSignature}`;

    if (audioEvaluationRef.current === evaluationKey) {
      return;
    }

    audioEvaluationRef.current = evaluationKey;

    if (alertDevices.length === 0) {
      return;
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('project-audio-evaluate', {
          detail: {
            projectId,
            deviceIps: alertDevices,
          },
        })
      );
    }
  }, [currentProject?.id, devices]);

  return (
    <div
      className="min-h-screen flex flex-col relative overflow-hidden"
      style={{
        background: currentProject
          ? `radial-gradient(circle at 20% 20%, ${currentProject.accent}40 0%, transparent 40%),
             radial-gradient(circle at 80% 80%, ${currentProject.accent}35 0%, transparent 40%),
             radial-gradient(ellipse at 50% 0%, ${currentProject.accent}25 0%, transparent 50%),
             radial-gradient(ellipse at 50% 100%, ${currentProject.accent}20 0%, transparent 50%),
             linear-gradient(180deg, ${currentProject.accent}12 0%, #0b0f14 30%, #0b0f14 70%, ${currentProject.accent}12 100%)`
          : '#0b0f14',
      }}
    >
      {/* Strong accent gradient overlay */}
      {currentProject && (
        <>
          <div
            className="absolute inset-0 pointer-events-none opacity-40"
            style={{
              background: `linear-gradient(135deg, ${currentProject.accent}25 0%, transparent 30%, transparent 70%, ${currentProject.accent}20 100%)`,
            }}
          />
          <div
            className="absolute inset-0 pointer-events-none opacity-30"
            style={{
              background: `radial-gradient(ellipse at center, transparent 30%, ${currentProject.accent}15 100%)`,
            }}
          />
        </>
      )}

      <AudioManager />

      {/* Hidden monitors for all devices */}
      {config.projects.map((project) =>
        project.hosts.map((host) => (
          <DeviceMonitor
            key={host.ip}
            ip={host.ip}
            projectId={project.id}
            onStatusChange={handleDeviceStatusChange}
          />
        ))
      )}

      <main className="relative z-10 flex flex-1 flex-col p-4 sm:p-6">
        <div className="flex flex-wrap justify-end gap-3 text-xs sm:text-sm text-muted-foreground">
          {audioStatus.lastError && (
            <span className="text-status-warn">
              Audio warning: {audioStatus.lastError}
            </span>
          )}
        </div>

        {config.projects.length === 0 && (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-xl">
            Initialising configuration…
          </div>
        )}

        {config.projects.length > 0 && devices.size === 0 && (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-xl">
            Connecting to devices…
          </div>
        )}

        {currentProject && (
          <div className="flex-1 flex flex-col">
            <ProjectSection
              project={currentProject}
              devices={projectDevices.get(currentProject.id) ?? []}
              isFullscreen={isFullscreen}
            />
          </div>
        )}

        {/* Navigation dots */}
        {config.projects.length > 1 && (
          <div className="flex items-center justify-center gap-3 mt-6">
            {config.projects.map((project, index) => (
              <button
                key={project.id}
                onClick={() => {
                  dispatchStopAudio();
                  audioEvaluationRef.current = null;
                  setCurrentSlide(index);
                }}
                style={{
                  backgroundColor: index === currentSlide ? project.accent : undefined,
                  boxShadow: index === currentSlide ? `0 0 20px ${project.accent}80, 0 0 40px ${project.accent}40` : undefined,
                }}
                className={`h-4 rounded-full transition-all ${
                  index === currentSlide
                    ? 'w-12 opacity-100'
                    : 'w-4 bg-muted/50 hover:bg-muted-foreground'
                }`}
                aria-label={`Go to ${project.name}`}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
