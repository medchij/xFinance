/**
 * withPerformanceTracking - HOC to track component render performance
 */
import React, { useEffect, useRef } from 'react';
import performanceMonitor from './performanceMonitor';

export function withPerformanceTracking(WrappedComponent, componentName = null) {
  const name = componentName || WrappedComponent.displayName || WrappedComponent.name || 'Unknown';

  return function PerformanceTrackedComponent(props) {
    const renderStartTime = useRef(performance.now());
    const mountTime = useRef(null);

    // Track component mount time
    useEffect(() => {
      const mountDuration = performance.now() - renderStartTime.current;
      mountTime.current = mountDuration;
      performanceMonitor.trackComponentRender(name, mountDuration, props);
    }, []);

    // Track each render
    useEffect(() => {
      const renderDuration = performance.now() - renderStartTime.current;
      if (mountTime.current !== renderDuration) {
        performanceMonitor.trackComponentRender(`${name} (re-render)`, renderDuration, props);
      }
    });

    // Update render start time before each render
    renderStartTime.current = performance.now();

    return <WrappedComponent {...props} />;
  };
}

// Hook for manual performance tracking
export function usePerformanceTracking(label) {
  useEffect(() => {
    performanceMonitor.startTiming(label);
    
    return () => {
      performanceMonitor.endTiming(label);
    };
  }, [label]);
}

// Hook for tracking async operations
export function useAsyncPerformance(label) {
  const start = () => {
    performanceMonitor.startTiming(label);
  };

  const end = () => {
    performanceMonitor.endTiming(label);
  };

  return { start, end };
}
