/**
 * Custom React Hooks for Activity Tr        if (tracker.config && tracker.config.enableModals) {
          tracker.log(`${modalName} модал нээгдлээ`, 'modal', { modalName });
        }
      } else {
        if (tracker.config && tracker.config.enableModals) {
          tracker.log(`${modalName} модал хаагдлаа`, 'modal', { modalName });
        }
 * Makes it easy to add logging to any component without repetition
 */
import { useEffect, useCallback, useRef, useState } from "react";
import activityTracker from "../utils/activityTracker";

// === NAVIGATION HOOKS ===

/**
 * Track when a component mounts/unmounts
 */
export function usePageTracking(pageName, additionalData = {}) {
  useEffect(() => {
    // Navigation tracking идэвхтэй байвал л ажиллуулах
    const tracker = activityTracker; // Direct use of singleton instance
    if (tracker.config && tracker.config.enableNavigation) {
      tracker.trackPageView(pageName, window.location.pathname);
    }

    return () => {
      if (tracker.config && tracker.config.enableNavigation) {
        tracker.log("Компонент хаагдлаа / унмоунт болсон", "navigation", {
          pageName,
          ...additionalData,
        });
      }
    };
  }, [pageName]);
}

/**
 * Track modal/dialog open/close
 */
export function useModalTracking(modalName, isOpen) {
  const prevIsOpen = useRef(isOpen);

  useEffect(() => {
    const tracker = activityTracker; // Direct use of singleton instance

    if (prevIsOpen.current !== isOpen) {
      if (isOpen) {
        if (tracker.config && tracker.config.enableModals) {
          tracker.log(`${modalName} модал нээгдлээ`, "modal", { modalName });
        }
      } else {
        if (tracker.config && tracker.config.enableModals) {
          tracker.log(`${modalName} модал хаагдлаа`, "modal", { modalName });
        }
      }
      prevIsOpen.current = isOpen;
    }
  }, [modalName, isOpen]);
}

// === USER ACTION HOOKS ===

/**
 * Track button clicks with automatic logging
 */
export function useButtonTracking(buttonName, extraData = {}) {
  return useCallback(
    (event) => {
      const tracker = activityTracker; // Direct use of singleton instance
      if (tracker.config && tracker.config.enableUserActions) {
        tracker.trackButtonClick(buttonName, extraData);
      }
    },
    [buttonName, extraData]
  );
}

// === FORM HOOKS ===

/**
 * Track tab switching
 */
export function useTabTracking(currentTab, tabName = "unknown") {
  const prevTab = useRef(currentTab);

  useEffect(() => {
    if (currentTab !== prevTab.current && prevTab.current !== undefined) {
      activityTracker.trackTabSwitch(prevTab.current, currentTab);
    }
    prevTab.current = currentTab;
  }, [currentTab, tabName]);
}

/**
 * Track form interactions automatically
 */
export function useFormTracking(formName) {
  const formStarted = useRef(false);

  const trackFormStart = useCallback(() => {
    if (!formStarted.current) {
      activityTracker.trackFormStart(formName);
      formStarted.current = true;
    }
  }, [formName]);

  const trackFieldChange = useCallback(
    (fieldName, value) => {
      trackFormStart(); // Auto-start tracking when first field changes
      activityTracker.trackFormFieldChange(formName, fieldName, !!value);
    },
    [formName, trackFormStart]
  );

  const trackSubmit = useCallback(
    (success, errors = []) => {
      activityTracker.trackFormSubmit(formName, success, errors);
    },
    [formName]
  );

  return {
    trackFormStart,
    trackFieldChange,
    trackSubmit,
  };
}

// === SEARCH HOOKS ===

/**
 * Track search functionality with debouncing
 */
export function useSearchTracking(searchType = "general", debounceMs = 1000) {
  const searchTimeoutRef = useRef(null);
  const lastSearchRef = useRef("");

  const trackSearch = useCallback(
    (query, resultCount = 0) => {
      // Clear previous timeout
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      // Only track if query changed and is not empty
      if (query && query !== lastSearchRef.current) {
        searchTimeoutRef.current = setTimeout(() => {
          activityTracker.trackSearch(searchType, query, resultCount);
          lastSearchRef.current = query;
        }, debounceMs);
      }
    },
    [searchType, debounceMs]
  );

  const trackFilter = useCallback((filterType, filterValue, resultCount = 0) => {
    activityTracker.trackFilter(filterType, filterValue, resultCount);
  }, []);

  const trackSelection = useCallback((itemType, itemId, itemName) => {
    activityTracker.trackSelection(itemType, itemId, itemName);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  return {
    trackSearch,
    trackFilter,
    trackSelection,
  };
}

// === API HOOKS ===

/**
 * Enhanced version of API calls with automatic tracking
 */
export function useApiTracking() {
  const trackApiCall = useCallback(async (apiCall, endpoint, method = "GET") => {
    const startTime = Date.now();

    try {
      const result = await apiCall();
      const responseTime = Date.now() - startTime;

      activityTracker.trackApiCall("api", "request", method, endpoint, {
        success: true,
        responseTime,
        statusCode: 200,
      });
      return result;
    } catch (error) {
      const responseTime = Date.now() - startTime;

      activityTracker.trackApiCall("api", "request", method, endpoint, {
        success: false,
        responseTime,
        statusCode: error.status || 500,
      });
      activityTracker.trackError("api_error", error.message, { endpoint, method });
      throw error;
    }
  }, []);

  return { trackApiCall };
}

// === PERFORMANCE HOOKS ===

/**
 * Track performance of operations
 */
export function usePerformanceTracking() {
  const trackOperation = useCallback(async (operation, operationName, details = {}) => {
    const startTime = Date.now();

    try {
      const result = await operation();
      const duration = Date.now() - startTime;

      activityTracker.trackPerformance(operationName, duration, details);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      activityTracker.trackPerformance(operationName, duration, {
        ...details,
        error: true,
        errorMessage: error.message,
      });
      throw error;
    }
  }, []);

  return { trackOperation };
}

// === ERROR HOOKS ===

/**
 * Global error boundary hook
 */
export function useErrorTracking() {
  const trackError = useCallback((error, context = {}) => {
    activityTracker.trackError("component_error", error.message, {
      stack: error.stack,
      ...context,
    });
  }, []);

  const trackWarning = useCallback((message, context = {}) => {
    activityTracker.trackWarning("component_warning", message, context);
  }, []);

  return { trackError, trackWarning };
}

// === EXCEL HOOKS ===

/**
 * Track Excel-specific operations
 */
export function useExcelTracking() {
  const trackExcelAction = useCallback((action, details = {}) => {
    activityTracker.trackExcelAction(action, details);
  }, []);

  const trackCellEdit = useCallback((cellAddress, oldValue, newValue) => {
    activityTracker.trackCellEdit(cellAddress, oldValue, newValue);
  }, []);

  const trackDataInsertion = useCallback((dataType, rowCount, source = "manual") => {
    activityTracker.trackDataInsertion(dataType, rowCount, source);
  }, []);

  return {
    trackExcelAction,
    trackCellEdit,
    trackDataInsertion,
  };
}

// === COMPOSITE HOOKS ===

/**
 * All-in-one hook for components that need multiple tracking types
 */
export function useActivityTracking(componentName, options = {}) {
  const { trackFormStart, trackFieldChange, trackSubmit } = useFormTracking(componentName);
  const { trackSearch, trackFilter, trackSelection } = useSearchTracking(componentName);
  const { trackApiCall } = useApiTracking();
  const { trackOperation } = usePerformanceTracking();
  const { trackError, trackWarning } = useErrorTracking();
  const { trackExcelAction, trackCellEdit, trackDataInsertion } = useExcelTracking();

  // Auto-track page view if enabled
  usePageTracking(componentName, options.pageData);

  return {
    // Form tracking
    trackFormStart,
    trackFieldChange,
    trackSubmit,

    // Search tracking
    trackSearch,
    trackFilter,
    trackSelection,

    // API tracking
    trackApiCall,

    // Performance tracking
    trackOperation,

    // Error tracking
    trackError,
    trackWarning,

    // Excel tracking
    trackExcelAction,
    trackCellEdit,
    trackDataInsertion,

    // Page tracking
    trackPageView: (pageName, route) => {
      const tracker = activityTracker; // Direct use of singleton instance
      if (tracker.config && tracker.config.enableNavigation) {
        tracker.trackPageView(pageName, route);
      }
    },

    // General actions
    trackAction: (action, details) => {
      const tracker = activityTracker; // Direct use of singleton instance
      if (tracker.config && tracker.config.enableUserActions) {
        tracker.trackAction(componentName, action, details);
      }
    },
    trackSuccess: (action, details) => {
      const tracker = activityTracker; // Direct use of singleton instance
      if (tracker.config && tracker.config.enableUserActions) {
        tracker.trackSuccess(componentName, action, details);
      }
    },

    // Direct access to activity tracker
    activityTracker,
  };
}
