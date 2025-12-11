/**
 * Performance Monitor - Frontend performance tracking
 * Tracks page load, API calls, component renders, and custom metrics
 */
import logger from './logger';

class PerformanceMonitor {
  constructor() {
    this.metrics = [];
    this.maxMetrics = 500;
    this.marks = new Map(); // Performance marks
    this.apiCalls = []; // API call tracking
    this.enabled = true;
    
    // Initialize performance observer
    this.initObservers();
  }

  static instance = null;

  static getInstance() {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  initObservers() {
    if (typeof window === 'undefined' || !window.PerformanceObserver) {
      console.warn('Performance API not available');
      return;
    }

    try {
      // Navigation timing (page load)
      const navObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.recordNavigationTiming(entry);
        }
      });
      navObserver.observe({ entryTypes: ['navigation'] });

      // Resource timing (images, scripts, etc.)
      const resourceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.recordResourceTiming(entry);
        }
      });
      resourceObserver.observe({ entryTypes: ['resource'] });

      // Long tasks (blocking the main thread)
      if ('PerformanceObserver' in window && PerformanceObserver.supportedEntryTypes.includes('longtask')) {
        const longTaskObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.recordLongTask(entry);
          }
        });
        longTaskObserver.observe({ entryTypes: ['longtask'] });
      }
    } catch (error) {
      console.warn('Failed to initialize performance observers:', error);
    }
  }

  // Record navigation timing (page load)
  recordNavigationTiming(entry) {
    const metrics = {
      type: 'navigation',
      dns: entry.domainLookupEnd - entry.domainLookupStart,
      tcp: entry.connectEnd - entry.connectStart,
      ttfb: entry.responseStart - entry.requestStart, // Time to first byte
      download: entry.responseEnd - entry.responseStart,
      domLoad: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart,
      windowLoad: entry.loadEventEnd - entry.loadEventStart,
      totalLoad: entry.loadEventEnd - entry.fetchStart,
      timestamp: Date.now()
    };

    this.addMetric(metrics);
    
    // Log slow page loads
    if (metrics.totalLoad > 3000) {
      logger.warn('Slow page load detected', metrics);
    }
  }

  // Record resource timing
  recordResourceTiming(entry) {
    // Filter to important resources only
    if (entry.initiatorType === 'xmlhttprequest' || entry.initiatorType === 'fetch') {
      const metrics = {
        type: 'api',
        url: entry.name,
        duration: entry.duration,
        size: entry.transferSize,
        timestamp: Date.now()
      };

      this.addMetric(metrics);
      
      // Log slow API calls
      if (metrics.duration > 2000) {
        logger.warn('Slow API call detected', metrics);
      }
    }
  }

  // Record long tasks (>50ms)
  recordLongTask(entry) {
    const metrics = {
      type: 'longtask',
      duration: entry.duration,
      startTime: entry.startTime,
      timestamp: Date.now()
    };

    this.addMetric(metrics);
    
    // Log very long tasks
    if (metrics.duration > 500) {
      logger.warn('Very long task detected (blocking UI)', metrics);
    }
  }

  // Start timing a custom operation
  startTiming(label) {
    if (!this.enabled) return;
    
    const markName = `${label}_start`;
    this.marks.set(label, {
      start: performance.now(),
      markName
    });
    
    if (performance.mark) {
      performance.mark(markName);
    }
  }

  // End timing and record
  endTiming(label, metadata = {}) {
    if (!this.enabled) return;
    
    const mark = this.marks.get(label);
    if (!mark) {
      console.warn(`No start mark found for: ${label}`);
      return;
    }

    const duration = performance.now() - mark.start;
    
    const metrics = {
      type: 'custom',
      label,
      duration: Math.round(duration * 100) / 100, // 2 decimal places
      timestamp: Date.now(),
      ...metadata
    };

    this.addMetric(metrics);
    this.marks.delete(label);

    // Create performance measure if available
    if (performance.measure && performance.mark) {
      const endMarkName = `${label}_end`;
      performance.mark(endMarkName);
      try {
        performance.measure(label, mark.markName, endMarkName);
      } catch (e) {
        // Ignore if marks are cleared
      }
    }

    return duration;
  }

  // Track API call
  trackApiCall(url, method, duration, status, error = null) {
    const apiMetric = {
      type: 'api',
      url,
      method,
      duration: Math.round(duration),
      status,
      error: error ? String(error) : null,
      timestamp: Date.now()
    };

    this.apiCalls.push(apiMetric);
    if (this.apiCalls.length > this.maxMetrics) {
      this.apiCalls.shift();
    }

    this.addMetric(apiMetric);

    // Log slow API calls
    if (duration > 2000) {
      logger.warn(`Slow API call: ${method} ${url}`, apiMetric);
    }

    // Log failed API calls
    if (error || (status && status >= 400)) {
      logger.error(`API call failed: ${method} ${url}`, apiMetric);
    }
  }

  // Track component render time
  trackComponentRender(componentName, renderTime, props = {}) {
    const metric = {
      type: 'render',
      component: componentName,
      duration: Math.round(renderTime * 100) / 100,
      propsCount: Object.keys(props).length,
      timestamp: Date.now()
    };

    this.addMetric(metric);

    // Log slow renders
    if (renderTime > 100) {
      logger.warn(`Slow component render: ${componentName}`, metric);
    }
  }

  // Add metric to storage
  addMetric(metric) {
    this.metrics.push(metric);
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }
  }

  // Get all metrics
  getMetrics() {
    return this.metrics;
  }

  // Get metrics by type
  getMetricsByType(type) {
    return this.metrics.filter(m => m.type === type);
  }

  // Get API call statistics
  getApiStats() {
    if (this.apiCalls.length === 0) {
      return null;
    }

    const durations = this.apiCalls.map(c => c.duration);
    const total = durations.reduce((a, b) => a + b, 0);
    
    return {
      count: this.apiCalls.length,
      avgDuration: Math.round(total / this.apiCalls.length),
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      failures: this.apiCalls.filter(c => c.error || c.status >= 400).length,
      slowCalls: this.apiCalls.filter(c => c.duration > 2000).length
    };
  }

  // Get page performance summary
  getPagePerformance() {
    if (!window.performance || !window.performance.timing) {
      return null;
    }

    const timing = window.performance.timing;
    const navigation = window.performance.navigation;

    return {
      // Page load times
      pageLoadTime: timing.loadEventEnd - timing.navigationStart,
      domReadyTime: timing.domContentLoadedEventEnd - timing.navigationStart,
      
      // Network times
      dnsTime: timing.domainLookupEnd - timing.domainLookupStart,
      tcpTime: timing.connectEnd - timing.connectStart,
      requestTime: timing.responseEnd - timing.requestStart,
      
      // Rendering times
      domParseTime: timing.domInteractive - timing.domLoading,
      renderTime: timing.domComplete - timing.domLoading,
      
      // Navigation type
      navigationType: navigation.type, // 0: navigate, 1: reload, 2: back/forward
      redirectCount: navigation.redirectCount
    };
  }

  // Export metrics as JSON
  exportMetrics() {
    return {
      metrics: this.metrics,
      apiStats: this.getApiStats(),
      pagePerformance: this.getPagePerformance(),
      exportTime: new Date().toISOString()
    };
  }

  // Clear all metrics
  clearMetrics() {
    this.metrics = [];
    this.apiCalls = [];
    this.marks.clear();
  }

  // Send performance report to backend
  async sendReport() {
    try {
      const report = {
        apiStats: this.getApiStats(),
        pagePerformance: this.getPagePerformance(),
        slowMetrics: this.metrics.filter(m => 
          (m.type === 'api' && m.duration > 2000) ||
          (m.type === 'render' && m.duration > 100) ||
          (m.type === 'longtask' && m.duration > 500)
        ),
        timestamp: Date.now(),
        url: window.location.href,
        userAgent: navigator.userAgent
      };

      logger.info('Performance Report', report);
    } catch (error) {
      console.warn('Failed to send performance report:', error);
    }
  }

  // Enable/disable monitoring
  setEnabled(enabled) {
    this.enabled = enabled;
  }
}

// Create singleton
const performanceMonitor = PerformanceMonitor.getInstance();

// Send report every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    performanceMonitor.sendReport();
  }, 5 * 60 * 1000);

  // Send report on page unload
  window.addEventListener('beforeunload', () => {
    performanceMonitor.sendReport();
  });
}

export default performanceMonitor;
export { PerformanceMonitor };
