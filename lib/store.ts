import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UIState, AckState } from '@/types';

const ACK_DURATION = 5 * 60 * 1000; // 5 minutes

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      muted: false,
      acks: {},

      setMuted: (muted: boolean) => set({ muted }),

      ackDevice: (ip: string) => {
        const expiry = Date.now() + ACK_DURATION;
        set((state) => ({
          acks: { ...state.acks, [ip]: expiry },
        }));
      },

      unackDevice: (ip: string) => {
        set((state) => {
          const newAcks = { ...state.acks };
          delete newAcks[ip];
          return { acks: newAcks };
        });
      },

      ackProject: (projectId: string) => {
        const expiry = Date.now() + ACK_DURATION;
        set((state) => ({
          acks: { ...state.acks, [projectId]: expiry },
        }));
      },

      unackProject: (projectId: string) => {
        set((state) => {
          const newAcks = { ...state.acks };
          delete newAcks[projectId];
          return { acks: newAcks };
        });
      },

      isAcked: (key: string) => {
        const { acks } = get();
        const expiry = acks[key];
        if (!expiry) return false;
        // Check if expired but don't trigger state update during render
        // The cleanup interval in Dashboard will handle removing expired acks
        if (expiry < Date.now()) {
          return false;
        }
        return true;
      },

      clearExpiredAcks: () => {
        const now = Date.now();
        set((state) => {
          const newAcks: AckState = {};
          Object.entries(state.acks).forEach(([key, expiry]) => {
            if (expiry > now) {
              newAcks[key] = expiry;
            }
          });
          return { acks: newAcks };
        });
      },
    }),
    {
      name: 'pb-monitoring-ui',
    }
  )
);
