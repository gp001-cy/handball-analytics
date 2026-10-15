import { useEffect, useSyncExternalStore } from 'react';
import { matchStore, type MatchStoreState } from '../state/matchStore';
import { matchRepository } from '../data/repository';

const subscribe = matchStore.subscribe;
const getSnapshot = () => matchStore.getState();

export function useMatchStoreState(): MatchStoreState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function useMatchTicker(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    let last = Date.now();
    const iv = setInterval(() => {
      const now = Date.now();
      const dt = Math.min(1000, now - last);
      last = now;
      matchStore.getState().tick(dt);
    }, 250);
    return () => clearInterval(iv);
  }, [active]);
}

export function useMatchPersistence(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const unsub = matchStore.subscribe((state, prev) => {
      if (!state.match || state.match === prev.match) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        const m = matchStore.getState().match;
        if (m) void matchRepository.save(m);
      }, 700);
    });
    return () => {
      unsub();
      if (timer) clearTimeout(timer);
    };
  }, [active]);
}

export function useToastAutoDismiss(ms = 9000): void {
  const state = useMatchStoreState();
  const toastId = state.toastEventId;
  useEffect(() => {
    if (!toastId) return;
    const t = setTimeout(() => matchStore.getState().clearToast(), ms);
    return () => clearTimeout(t);
  }, [toastId, ms]);
}
