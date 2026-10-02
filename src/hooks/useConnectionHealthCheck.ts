import { useState, useEffect, useCallback, useRef } from 'react';

export interface ConnectionHealth {
  isOnline: boolean;
  latency: number | null;
  lastCheck: Date | null;
  connectionQuality: 'good' | 'poor' | 'offline';
}

export interface ConnectionHealthCheckReturn extends ConnectionHealth {
  checkConnection: () => Promise<void>;
  startMonitoring: () => void;
  stopMonitoring: () => void;
}

export const useConnectionHealthCheck = (intervalMs: number = 30000): ConnectionHealthCheckReturn => {
  const [health, setHealth] = useState<ConnectionHealth>({
    isOnline: navigator.onLine,
    latency: null,
    lastCheck: null,
    connectionQuality: 'good'
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const checkConnection = useCallback(async (): Promise<void> => {
    const controller = new AbortController();
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      // Cancel any existing check
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = controller;
      timeout = setTimeout(() => controller.abort(new DOMException('Connection check timed out', 'TimeoutError')), 5000);
      const startTime = performance.now();

      // Check this site. A blocked third-party icon says nothing about the interview.
      const response = await fetch('/favicon.ico', {
        method: 'HEAD',
        signal: controller.signal,
        cache: 'no-store',
      });

      const endTime = performance.now();
      const latency = endTime - startTime;

      const newHealth: ConnectionHealth = {
        isOnline: true, // If we reach here, we're online
        latency: latency,
        lastCheck: new Date(),
        connectionQuality: response.ok && latency < 500 ? 'good' : 'poor'
      };

      if (abortControllerRef.current === controller) setHealth(newHealth);
    } catch (error) {
      // If the request was aborted, don't update state
      if (abortControllerRef.current !== controller || (controller.signal.aborted && controller.signal.reason?.name !== 'TimeoutError')) {
        return;
      }

      setHealth({
        isOnline: navigator.onLine,
        latency: null,
        lastCheck: new Date(),
        connectionQuality: navigator.onLine ? 'poor' : 'offline'
      });
    } finally {
      clearTimeout(timeout);
      if (abortControllerRef.current === controller) abortControllerRef.current = null;
    }
  }, []);

  const startMonitoring = useCallback(() => {
    checkConnection(); // Initial check
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(checkConnection, intervalMs);
  }, [checkConnection, intervalMs]);

  const stopMonitoring = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  // Listen to browser online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setHealth(prev => ({ ...prev, isOnline: true }));
      checkConnection();
    };

    const handleOffline = () => {
      setHealth(prev => ({ 
        ...prev, 
        isOnline: false, 
        connectionQuality: 'offline',
        lastCheck: new Date()
      }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [checkConnection]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMonitoring();
    };
  }, [stopMonitoring]);

  return {
    ...health,
    checkConnection,
    startMonitoring,
    stopMonitoring
  };
};
