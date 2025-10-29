'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useUIStore } from '@/lib/store';
import { AUDIO_THROTTLE } from '@/lib/device-utils';

const SOUND_MAP: Record<string, string> = {
  cyclops: '/mixkit-city-alert-siren-loop-1008.wav',
  default: '/mixkit-security-facility-breach-alarm-994.wav',
};

export function AudioManager() {
  const muted = useUIStore((state) => state.muted);
  const isAcked = useUIStore((state) => state.isAcked);
  const currentProjectId = useUIStore((state) => state.currentProjectId);
  const setAudioStatus = useUIStore((state) => state.setAudioStatus);
  const lastPlayedRef = useRef<number>(0);
  const audioRefs = useRef<Record<string, HTMLAudioElement>>({});
  const readyMapRef = useRef<Record<string, boolean>>({});
  const pendingAlertsRef = useRef<Set<string>>(new Set());
  const stopTimersRef = useRef<Record<string, number>>({});
  const unlockedRef = useRef<Record<string, boolean>>({});
  const [cyclopsReady, setCyclopsReady] = useState(false);
  const [defaultReady, setDefaultReady] = useState(false);
  const [showUnlockPrompt, setShowUnlockPrompt] = useState(false);
  const [allUnlocked, setAllUnlocked] = useState(false);

  useEffect(() => {
    const cleanupTasks: Array<() => void> = [];
    const audioEntries = Object.entries(SOUND_MAP);
    const refs: Record<string, HTMLAudioElement> = {};
    const readyMap: Record<string, boolean> = {};

    audioEntries.forEach(([key, src]) => {
      const audio = new Audio();
      audio.src = src;
      audio.volume = 1.0;
      audio.preload = 'auto';
      audio.load();

      const handleReady = () => {
        console.log(`[AudioManager] Audio "${key}" ready`);
        readyMapRef.current = { ...readyMapRef.current, [key]: true };

        if (key === 'cyclops') {
          setCyclopsReady(true);
          setAudioStatus({ cyclopsReady: true });
        } else if (key === 'default') {
          setDefaultReady(true);
          setAudioStatus({ defaultReady: true });
        }

        // show unlock prompt after a short delay when both are ready
        const allReady = Object.values(readyMapRef.current).every((ready) => ready);
        if (allReady) {
          setTimeout(() => {
            setShowUnlockPrompt(true);
          }, 1000);
        }
      };

      const handleError = (event: Event) => {
        console.error('[AudioManager] Audio loading error', {
          key,
          src,
          event,
          readyState: audio.readyState,
          networkState: audio.networkState,
        });
        setAudioStatus({ lastError: `Failed to load ${key} audio` });
      };

      audio.addEventListener('canplaythrough', handleReady);
      audio.addEventListener('error', handleError);

      cleanupTasks.push(() => {
        audio.removeEventListener('canplaythrough', handleReady);
        audio.removeEventListener('error', handleError);
        audio.pause();
        audio.src = '';
      });

      refs[key] = audio;
      readyMap[key] = false;
    });

    audioRefs.current = refs;
    readyMapRef.current = readyMap;

    return () => {
      cleanupTasks.forEach((task) => task());
      audioRefs.current = {};
      readyMapRef.current = {};
    };
  }, []);

  const unlockAudio = useCallback(async () => {
    const entries = Object.entries(audioRefs.current);
    const unlockPromises: Promise<void>[] = [];

    entries.forEach(([key, audio]) => {
      if (unlockedRef.current[key] || !readyMapRef.current[key]) {
        return;
      }

      audio.muted = true;
      audio.loop = false;

      const promise = audio
        .play()
        .then(() => {
          audio.pause();
          audio.currentTime = 0;
          audio.muted = false;
          unlockedRef.current[key] = true;
          console.log(`[AudioManager] Audio "${key}" unlocked`);
        })
        .catch((err) => {
          console.warn(`[AudioManager] Failed to unlock "${key}"`, err);
        });

      unlockPromises.push(promise);
    });

    await Promise.all(unlockPromises);

    console.log('[AudioManager] All audio unlocked, hiding prompt');
    setAllUnlocked(true);
    setShowUnlockPrompt(false);
  }, []);

  useEffect(() => {
    const events = ['click', 'touchstart', 'keydown'];
    events.forEach((event) => {
      document.addEventListener(event, unlockAudio, { once: true });
    });

    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, unlockAudio);
      });
    };
  }, [unlockAudio]);

  const stopAllAudio = () => {
    Object.values(audioRefs.current).forEach((audio) => {
      audio.pause();
      audio.currentTime = 0;
    });
    Object.values(stopTimersRef.current).forEach((timerId) => {
      clearTimeout(timerId);
    });
    stopTimersRef.current = {};
  };

  useEffect(() => {
    const handleStopAudio = () => {
      console.log('[AudioManager] stop-audio event received');
      stopAllAudio();
      pendingAlertsRef.current.clear();
    };

    window.addEventListener('stop-audio', handleStopAudio);
    return () => {
      window.removeEventListener('stop-audio', handleStopAudio);
    };
  }, []);

  useEffect(() => {
    stopAllAudio();
    pendingAlertsRef.current.clear();
    setAudioStatus({ lastError: null });
  }, [currentProjectId]);

  useEffect(() => {
    if (muted) {
      stopAllAudio();
    }
  }, [muted]);

  useEffect(() => {
    const handleProjectAudioEvaluate = (event: Event) => {
      const customEvent = event as CustomEvent<{ projectId: string; deviceIps: string[] }>;
      const { projectId, deviceIps } = customEvent.detail;

      console.log('[AudioManager] Evaluate project audio', {
        eventProjectId: projectId,
        currentProjectId,
        deviceIps
      });

      if (!currentProjectId) {
        console.log('[AudioManager] No active project, skipping');
        return;
      }

      if (projectId !== currentProjectId) {
        console.log('[AudioManager] Event project does not match active project, skipping', {
          expected: currentProjectId,
          received: projectId,
        });
        return;
      }

      if (muted) {
        console.log('[AudioManager] Audio is globally muted, skipping');
        return;
      }

      if (isAcked(projectId)) {
        console.log(`[AudioManager] Project ${projectId} is acknowledged, skipping`);
        return;
      }

      const targetIp = (deviceIps || []).find((candidateIp) => !isAcked(candidateIp));

      if (!targetIp) {
        console.log('[AudioManager] No alerting device after ack filtering, skipping');
        return;
      }

      const now = Date.now();
      const timeSinceLastPlay = now - lastPlayedRef.current;

      if (timeSinceLastPlay < AUDIO_THROTTLE) {
        const remaining = Math.round((AUDIO_THROTTLE - timeSinceLastPlay) / 1000);
        console.log(`[AudioManager] Throttled - ${remaining}s remaining`);
        pendingAlertsRef.current.add(`${projectId}:${targetIp}`);
        return;
      }

      const isCyclopsProject = projectId.toLowerCase().includes('cyclops');
      const soundKey = isCyclopsProject ? 'cyclops' : 'default';
      const audio = audioRefs.current[soundKey];
      const ready = readyMapRef.current[soundKey];

      if (!audio) {
        console.warn(`[AudioManager] No audio instance for key "${soundKey}"`);
        return;
      }

      if (!ready) {
        console.warn(`[AudioManager] Audio "${soundKey}" not ready yet`);
        return;
      }

      try {
        stopAllAudio();
        audio.currentTime = 0;
        audio.muted = false;
        audio.loop = false;
        audio.play()
          .then(() => {
            console.log(`[AudioManager] Playing ${soundKey} alert for ${projectId}`);
            lastPlayedRef.current = now;
            pendingAlertsRef.current.clear();
            setAudioStatus({ lastError: null });

            if (stopTimersRef.current[soundKey]) {
              clearTimeout(stopTimersRef.current[soundKey]);
            }

            stopTimersRef.current[soundKey] = window.setTimeout(() => {
              audio.pause();
              audio.currentTime = 0;
            }, 8000);
          })
          .catch((err) => {
            console.error('[AudioManager] Failed to play audio', {
              soundKey,
              error: err,
            });
            setAudioStatus({ lastError: err?.message ?? 'Unable to play audio' });
          });
      } catch (error) {
        console.error('[AudioManager] Unexpected error playing audio', {
          soundKey,
          error,
        });
        setAudioStatus({ lastError: error instanceof Error ? error.message : 'Unexpected audio error' });
      }
    };

    console.log('[AudioManager] Registering project-audio-evaluate event listener');
    window.addEventListener('project-audio-evaluate', handleProjectAudioEvaluate);

    return () => {
      console.log('[AudioManager] Unregistering project-audio-evaluate event listener');
      window.removeEventListener('project-audio-evaluate', handleProjectAudioEvaluate);
    };
  }, [muted, isAcked, currentProjectId]);

  const testSound = (projectIdOverride?: string) => {
    const targetProject = projectIdOverride ?? currentProjectId ?? 'default';
    const isCyclopsProject = targetProject.toLowerCase().includes('cyclops');
    const soundKey = isCyclopsProject ? 'cyclops' : 'default';
    const audio = audioRefs.current[soundKey];
    const ready = readyMapRef.current[soundKey];

    if (audio && ready) {
      stopAllAudio();
      audio.currentTime = 0;
      audio.play()
        .then(() => console.log(`[AudioManager] Test sound ${soundKey} played`))
        .catch((err) => console.error('[AudioManager] Test failed:', err));
    } else {
      console.warn('[AudioManager] Audio not ready for test', { soundKey, ready });
    }
  };

  useEffect(() => {
    (window as any).testAlertSound = testSound;
    return () => {
      delete (window as any).testAlertSound;
    };
  }, [currentProjectId]);

  if (!showUnlockPrompt) {
    return null;
  }

  return (
    <div
      onClick={unlockAudio}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        cursor: 'pointer',
      }}
    >
      <div
        style={{
          backgroundColor: '#1a1a1a',
          border: '2px solid #fbbf24',
          borderRadius: '12px',
          padding: '32px 48px',
          textAlign: 'center',
          maxWidth: '400px',
        }}
      >
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔊</div>
        <h2 style={{ color: '#fbbf24', fontSize: '24px', marginBottom: '12px' }}>
          Enable Audio Alerts
        </h2>
        <p style={{ color: '#9ca3af', fontSize: '16px', marginBottom: '24px' }}>
          Click anywhere to enable audio notifications for device monitoring
        </p>
        <div
          style={{
            display: 'inline-block',
            padding: '12px 32px',
            backgroundColor: '#fbbf24',
            color: '#000',
            borderRadius: '8px',
            fontWeight: 'bold',
            fontSize: '16px',
          }}
        >
          Enable Audio
        </div>
      </div>
    </div>
  );
}
