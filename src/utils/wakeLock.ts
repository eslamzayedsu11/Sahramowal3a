import { useEffect, useRef } from 'react';

interface WakeLockSentinelLike {
  released: boolean;
  release: () => Promise<void>;
}

interface NavigatorWithWakeLock {
  wakeLock?: {
    request: (type: 'screen') => Promise<WakeLockSentinelLike>;
  };
}

/**
 * Keeps the screen awake while `enabled` is true.
 * Automatically re-acquires on visibilitychange and releases cleanly on pause/exit.
 * Fails silently on unsupported browsers or restricted iframes.
 */
export function useWakeLock(enabled: boolean): void {
  const sentinelRef = useRef<WakeLockSentinelLike | null>(null);

  useEffect(() => {
    let cancelled = false;

    const releaseCurrent = async () => {
      const current = sentinelRef.current;
      sentinelRef.current = null;
      if (current && !current.released) {
        try {
          await current.release();
        } catch {
          // Ignore silently
        }
      }
    };

    const requestLock = async () => {
      if (!enabled || cancelled) return;
      if (document.visibilityState !== 'visible') return;
      const nav = navigator as unknown as NavigatorWithWakeLock;
      if (!nav?.wakeLock?.request) return;

      try {
        if (sentinelRef.current && !sentinelRef.current.released) return;
        const sentinel = await nav.wakeLock.request('screen');
        if (cancelled) {
          await sentinel.release().catch(() => undefined);
          return;
        }
        sentinelRef.current = sentinel;
      } catch {
        // Fail silently if unsupported or battery saver blocks it
      }
    };

    if (enabled) {
      void requestLock();
    } else {
      void releaseCurrent();
    }

    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && enabled) {
        void requestLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', handleVisibility);
      void releaseCurrent();
    };
  }, [enabled]);
}
