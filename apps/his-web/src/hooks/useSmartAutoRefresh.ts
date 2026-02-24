'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Smart auto-refresh hook that pauses during user interaction.
 * 
 * Features:
 * - Auto-refreshes at specified interval
 * - Pauses when user is interacting (typing, clicking, etc.)
 * - Resumes after idle timeout
 * - Can be manually paused/resumed
 * - Visibility-aware (pauses when tab is hidden)
 */
export type UseSmartAutoRefreshOptions = {
  /** Refresh interval in milliseconds */
  intervalMs: number;
  /** Idle timeout before resuming auto-refresh after interaction (default: 5000) */
  idleTimeoutMs?: number;
  /** Whether auto-refresh is enabled (default: true) */
  enabled?: boolean;
  /** Callback to execute on refresh */
  onRefresh: () => void | Promise<void>;
  /** Whether to refresh immediately on mount (default: false) */
  refreshOnMount?: boolean;
};

export type UseSmartAutoRefreshReturn = {
  /** Whether auto-refresh is currently paused */
  isPaused: boolean;
  /** Whether a refresh is currently in progress */
  isRefreshing: boolean;
  /** Time until next refresh in seconds (null if paused) */
  nextRefreshIn: number | null;
  /** Manually trigger a refresh */
  refresh: () => Promise<void>;
  /** Pause auto-refresh */
  pause: () => void;
  /** Resume auto-refresh */
  resume: () => void;
  /** Register an element or area that should pause refresh on interaction */
  registerInteractionArea: (element: HTMLElement | null) => void;
};

export function useSmartAutoRefresh(options: UseSmartAutoRefreshOptions): UseSmartAutoRefreshReturn {
  const {
    intervalMs,
    idleTimeoutMs = 5000,
    enabled = true,
    onRefresh,
    refreshOnMount = false
  } = options;

  const [isPaused, setIsPaused] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [nextRefreshIn, setNextRefreshIn] = useState<number | null>(null);

  const lastInteractionRef = useRef<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const idleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const refreshStartTimeRef = useRef<number>(0);

  const clearTimers = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (idleTimeoutRef.current) {
      clearTimeout(idleTimeoutRef.current);
      idleTimeoutRef.current = null;
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);

  const refresh = useCallback(async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    refreshStartTimeRef.current = Date.now();
    
    try {
      await onRefresh();
    } catch (error) {
      console.error('Auto-refresh error:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [onRefresh, isRefreshing]);

  const handleInteraction = useCallback(() => {
    lastInteractionRef.current = Date.now();
    setIsPaused(true);
    setNextRefreshIn(null);

    // Clear existing idle timeout
    if (idleTimeoutRef.current) {
      clearTimeout(idleTimeoutRef.current);
    }

    // Set new idle timeout to resume after inactivity
    idleTimeoutRef.current = setTimeout(() => {
      const timeSinceInteraction = Date.now() - lastInteractionRef.current;
      if (timeSinceInteraction >= idleTimeoutMs) {
        setIsPaused(false);
      }
    }, idleTimeoutMs);
  }, [idleTimeoutMs]);

  const registerInteractionArea = useCallback((element: HTMLElement | null) => {
    if (!element) return;

    const events = ['mousedown', 'keydown', 'touchstart', 'focusin'];
    
    events.forEach(event => {
      element.addEventListener(event, handleInteraction, { passive: true });
    });

    // Return cleanup function
    return () => {
      events.forEach(event => {
        element.removeEventListener(event, handleInteraction);
      });
    };
  }, [handleInteraction]);

  const pause = useCallback(() => {
    setIsPaused(true);
    setNextRefreshIn(null);
  }, []);

  const resume = useCallback(() => {
    setIsPaused(false);
    lastInteractionRef.current = 0;
  }, []);

  // Handle visibility change (pause when tab is hidden)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        pause();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [pause]);

  // Main auto-refresh logic
  useEffect(() => {
    if (!enabled) {
      clearTimers();
      return;
    }

    // Initial refresh on mount if requested
    if (refreshOnMount) {
      void refresh();
    }

    // Set up countdown
    let countdownValue = Math.floor(intervalMs / 1000);
    
    const startCountdown = () => {
      countdownValue = Math.floor(intervalMs / 1000);
      setNextRefreshIn(countdownValue);
      
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
      
      countdownRef.current = setInterval(() => {
        countdownValue -= 1;
        if (countdownValue <= 0) {
          countdownValue = Math.floor(intervalMs / 1000);
        }
        setNextRefreshIn(countdownValue);
      }, 1000);
    };

    // Set up main refresh interval
    intervalRef.current = setInterval(() => {
      if (!isPaused && !isRefreshing) {
        void refresh();
        startCountdown();
      }
    }, intervalMs);

    startCountdown();

    return () => {
      clearTimers();
    };
  }, [enabled, intervalMs, isPaused, isRefreshing, refresh, refreshOnMount, clearTimers]);

  // Update nextRefreshIn when paused state changes
  useEffect(() => {
    if (isPaused) {
      setNextRefreshIn(null);
    }
  }, [isPaused]);

  return {
    isPaused,
    isRefreshing,
    nextRefreshIn,
    refresh,
    pause,
    resume,
    registerInteractionArea
  };
}
