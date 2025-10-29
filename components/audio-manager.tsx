'use client';

import { useEffect, useRef, useState } from 'react';
import { useUIStore } from '@/lib/store';
import { AUDIO_THROTTLE } from '@/lib/device-utils';

export function AudioManager() {
  const { muted } = useUIStore();
  const lastPlayedRef = useRef<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pendingAlertsRef = useRef<Set<string>>(new Set());
  const [audioReady, setAudioReady] = useState(false);

  useEffect(() => {
    // create audio element with actual WAV file
    const audio = new Audio();

    // use the alarm sound from public directory
    audio.src = '/mixkit-facility-alarm-sound-999.wav';
    audio.volume = 1.0;
    audio.preload = 'auto';

    // load the audio
    audio.load();

    audio.addEventListener('canplaythrough', () => {
      console.log('[AudioManager] Audio loaded and ready');
      setAudioReady(true);
    });

    audio.addEventListener('error', (e) => {
      console.error('[AudioManager] Audio loading error:', {
        error: e,
        src: audio.src,
        readyState: audio.readyState,
        networkState: audio.networkState,
      });
    });

    audio.addEventListener('loadeddata', () => {
      console.log('[AudioManager] Audio data loaded');
    });

    audioRef.current = audio;

    return () => {
      audio.pause();
      audio.src = '';
      setAudioReady(false);
    };
  }, []);

  useEffect(() => {
    const handleDeviceError = (event: Event) => {
      const customEvent = event as CustomEvent<{ ip: string; projectId: string }>;
      const { ip } = customEvent.detail;

      console.log(`[AudioManager] Received device-error event for ${ip}`);

      // check if muted
      if (muted) {
        console.log('[AudioManager] Audio is globally muted, skipping');
        return;
      }

      // check throttle - only play one sound every 30 seconds regardless of how many errors
      const now = Date.now();
      const timeSinceLastPlay = now - lastPlayedRef.current;

      if (timeSinceLastPlay < AUDIO_THROTTLE) {
        console.log(`[AudioManager] Throttled - ${Math.round((AUDIO_THROTTLE - timeSinceLastPlay) / 1000)}s remaining`);
        pendingAlertsRef.current.add(ip);
        return;
      }

      // play sound
      if (audioRef.current && audioReady) {
        console.log('[AudioManager] Playing alert sound');
        audioRef.current.currentTime = 0;
        audioRef.current.play()
          .then(() => {
            console.log('[AudioManager] Sound played successfully');
            lastPlayedRef.current = now;
            pendingAlertsRef.current.clear();
          })
          .catch((err) => {
            console.error('[AudioManager] Failed to play audio:', err);
            console.error('[AudioManager] Error details:', {
              name: err.name,
              message: err.message,
              muted,
              audioReady,
            });
          });
      } else {
        console.warn('[AudioManager] Audio not ready or ref is null', {
          audioReady,
          hasRef: !!audioRef.current,
        });
      }
    };

    console.log('[AudioManager] Registering device-error event listener');
    window.addEventListener('device-error', handleDeviceError);

    return () => {
      console.log('[AudioManager] Unregistering device-error event listener');
      window.removeEventListener('device-error', handleDeviceError);
    };
  }, [muted, audioReady]);

  // test button for debugging (only in development)
  const testSound = () => {
    if (audioRef.current && audioReady) {
      console.log('[AudioManager] Manual test - playing sound');
      audioRef.current.currentTime = 0;
      audioRef.current.play()
        .then(() => console.log('[AudioManager] Test sound played'))
        .catch((err) => console.error('[AudioManager] Test failed:', err));
    } else {
      console.warn('[AudioManager] Audio not ready for test');
    }
  };

  // expose test function to window for console access
  useEffect(() => {
    (window as any).testAlertSound = testSound;
    return () => {
      delete (window as any).testAlertSound;
    };
  }, [audioReady]);

  return null;
}
