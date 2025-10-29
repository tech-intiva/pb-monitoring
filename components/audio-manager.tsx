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
  const currentProjectId = useUIStore((state) => state.currentProjectId);
  const setAudioStatus = useUIStore((state) => state.setAudioStatus);
  const lastPlayedRef = useRef<number>(0);
  const audioRefs = useRef<Record<string, HTMLAudioElement>>({});
  const readyMapRef = useRef<Record<string, boolean>>({});
  const pendingAlertsRef = useRef<Set<string>>(new Set());
  const unlockedRef = useRef<Record<string, boolean>>({});
  const hasInteractedRef = useRef(false);
  const playingRef = useRef<string | null>(null);
  const lastProjectRef = useRef<string | null>(null);
  const [cyclopsReady, setCyclopsReady] = useState(false);
  const [defaultReady, setDefaultReady] = useState(false);
  const [showUnlockPrompt, setShowUnlockPrompt] = useState(false);
  const [allUnlocked, setAllUnlocked] = useState(false);

  useEffect(() => {
    // show prompt once at the beginning
    setTimeout(() => {
      setShowUnlockPrompt(true);
    }, 500);
  }, []);

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

        // auto-unlock if user has already interacted
        if (hasInteractedRef.current && !unlockedRef.current[key]) {
          audio.muted = true;
          audio.loop = false;
          audio
            .play()
            .then(() => {
              audio.pause();
              audio.currentTime = 0;
              audio.muted = false;
              unlockedRef.current[key] = true;
              console.log(`[AudioManager] Audio "${key}" auto-unlocked after late load`);
            })
            .catch((err) => {
              console.warn(`[AudioManager] Failed to auto-unlock "${key}"`, err);
            });
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
    hasInteractedRef.current = true;
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

  const stopAllAudio = (force = false) => {
    const playing = playingRef.current;
    Object.entries(audioRefs.current).forEach(([key, audio]) => {
      // don't stop audio that's currently being played unless forced
      if (!force && key === playing) {
        return;
      }
      audio.pause();
      audio.currentTime = 0;
    });
    if (force) {
      playingRef.current = null;
    }
  };

  useEffect(() => {
    const handleStopAudio = () => {
      console.log('[AudioManager] stop-audio event received');
      // defer stop to allow any immediately following play events to set playingRef first
      setTimeout(() => {
        // if no new audio started in this window, force stop everything
        if (!playingRef.current) {
          stopAllAudio(true);
        } else {
          stopAllAudio();
        }
        pendingAlertsRef.current.clear();
      }, 100);
    };

    window.addEventListener('stop-audio', handleStopAudio);
    return () => {
      window.removeEventListener('stop-audio', handleStopAudio);
    };
  }, []);

  useEffect(() => {
    // don't stop audio here - the stop-audio event handles that
    // reset throttle so new project can play immediately
    lastPlayedRef.current = 0;
    pendingAlertsRef.current.clear();
    setAudioStatus({ lastError: null });
  }, [currentProjectId]);

  useEffect(() => {
    if (muted) {
      stopAllAudio(true);
    }
  }, [muted]);

  useEffect(() => {
    const handleProjectAudioEvaluate = (event: Event) => {
      const customEvent = event as CustomEvent<{ projectId: string; deviceIps: string[] }>;
      const { projectId, deviceIps } = customEvent.detail;

      // read current values from store to avoid closure staleness
      const { currentProjectId: activeProjectId, muted: isMuted, isAcked: checkAcked } = useUIStore.getState();

      console.log('[AudioManager] Evaluate project audio', {
        eventProjectId: projectId,
        activeProjectId,
        deviceIps
      });

      if (!activeProjectId) {
        console.log('[AudioManager] No active project, skipping');
        return;
      }

      if (projectId !== activeProjectId) {
        console.log('[AudioManager] Event project does not match active project, skipping', {
          expected: activeProjectId,
          received: projectId,
        });
        return;
      }

      if (isMuted) {
        console.log('[AudioManager] Audio is globally muted, skipping');
        return;
      }

      if (checkAcked(projectId)) {
        console.log(`[AudioManager] Project ${projectId} is acknowledged, skipping`);
        return;
      }

      const targetIp = (deviceIps || []).find((candidateIp) => !checkAcked(candidateIp));

      if (!targetIp) {
        console.log('[AudioManager] No alerting device after ack filtering, skipping');
        return;
      }

      // reset throttle when switching to a different project
      if (lastProjectRef.current !== projectId) {
        console.log('[AudioManager] New project detected, resetting throttle', {
          oldProject: lastProjectRef.current,
          newProject: projectId,
        });
        lastPlayedRef.current = 0;
        lastProjectRef.current = projectId;
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
        // mark this audio as currently playing before any async operations
        playingRef.current = soundKey;

        // stop only other audio, not the one we're about to play
        Object.entries(audioRefs.current).forEach(([key, otherAudio]) => {
          if (key !== soundKey) {
            otherAudio.pause();
            otherAudio.currentTime = 0;
          }
        });

        audio.currentTime = 0;
        audio.muted = false;
        audio.loop = true;

        audio.play()
          .then(() => {
            console.log(`[AudioManager] Playing ${soundKey} alert for ${projectId} (looping until OK)`);
            lastPlayedRef.current = now;
            pendingAlertsRef.current.clear();
            setAudioStatus({ lastError: null });

            // clear playing protection after stop-audio window passes
            setTimeout(() => {
              playingRef.current = null;
            }, 150);
          })
          .catch((err) => {
            console.error('[AudioManager] Failed to play audio', {
              soundKey,
              error: err,
            });
            playingRef.current = null;
            setAudioStatus({ lastError: err?.message ?? 'Unable to play audio' });
          });
      } catch (error) {
        console.error('[AudioManager] Unexpected error playing audio', {
          soundKey,
          error,
        });
        playingRef.current = null;
        setAudioStatus({ lastError: error instanceof Error ? error.message : 'Unexpected audio error' });
      }
    };

    console.log('[AudioManager] Registering project-audio-evaluate event listener');
    window.addEventListener('project-audio-evaluate', handleProjectAudioEvaluate);

    return () => {
      console.log('[AudioManager] Unregistering project-audio-evaluate event listener');
      window.removeEventListener('project-audio-evaluate', handleProjectAudioEvaluate);
    };
  }, []);

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
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        cursor: 'pointer',
      }}
    >
      <p
        style={{
          color: '#ffffff',
          fontSize: '24px',
          fontWeight: '500',
          textShadow: '0 2px 20px rgba(0, 0, 0, 0.8)',
        }}
      >
        Click anywhere to start!!
      </p>
    </div>
  );
}
