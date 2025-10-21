/**
 * Centralized User Activity Tracker
 * Tracks all user interactions and system events in one place
 */
import logger from "./logger";

class ActivityTracker {
  constructor() {
    this.sessionId = this.generateSessionId();
    this.startTime = new Date().toISOString();
    this.activityCount = 0;
    this.lastLogTime = 0;
    this.lastLogMessage = "";
    this.duplicateThreshold = 1000; // 1 секундийн дотор ижил лог давтахгүй

    // Энгийн тохиргоо
    this.config = {
      enableNavigation: false, // Navigation tracking: Ихэвчлэн шаардлагагүй
      enableComponents: false, // Component tracking: Шаардлагатай үед л идэвхжүүлэх
      enableModals: false, // Modal tracking: Шаардлагатай үед л идэвхжүүлэх
      enableUserActions: true, // User action tracking: Хэрэглэгчийн үйлдлүүд чухал
      enableErrors: true, // Error tracking: Алдаа мэдээлэл чухал
      enableApi: true, // API tracking: Performance болон debugging-д чухал
      enablePerformance: true, // Performance tracking: Системийн гүйцэтгэл хянах
      enableSecurity: true, // Security tracking: Аюулгүй байдлын лог
      enableLogViewer: false, // LogViewer tracking: LogViewer компонентийн лог хасах
    };
  }

  // Singleton pattern
  static getInstance() {
    if (!ActivityTracker.instance) {
      ActivityTracker.instance = new ActivityTracker();
    }
    return ActivityTracker.instance;
  }

  generateSessionId() {
    return "session_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
  }

  // Азийн цагийн бүс (+8) ашиглан DD.MM.YYYY HH:mm:ss форматаар
  getAsiaTimestamp() {
    const now = new Date();
    const asiaTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    const day = String(asiaTime.getUTCDate()).padStart(2, "0");
    const month = String(asiaTime.getUTCMonth() + 1).padStart(2, "0");
    const year = asiaTime.getUTCFullYear();
    const hours = String(asiaTime.getUTCHours()).padStart(2, "0");
    const minutes = String(asiaTime.getUTCMinutes()).padStart(2, "0");
    const seconds = String(asiaTime.getUTCSeconds()).padStart(2, "0");
    return `${day}.${month}.${year} ${hours}:${minutes}:${seconds}`;
  }

  // Get current user info from localStorage or session
  getCurrentUser() {
    try {
      // Try to get user from localStorage
      const token = localStorage.getItem("authToken");
      if (token) {
        // Decode JWT token to get user info (basic decoding, not verification)
        const payload = JSON.parse(atob(token.split(".")[1]));
        return payload.username || payload.email || payload.id || "authenticated";
      }

      // Try to get user from sessionStorage
      const currentUser = JSON.parse(localStorage.getItem("currentUser") || "null");
      if (currentUser) {
        return currentUser.username || currentUser.email || currentUser.name || "authenticated";
      }
    } catch (e) {
      // Failed to decode or parse
    }
    return "anonymous";
  }

  // Tracking идэвхтэй эсэхийг шалгах
  isTrackingEnabled(type) {
    switch (type) {
      case "navigation":
        return this.config.enableNavigation;
      case "component":
        return this.config.enableComponents;
      case "modal":
        return this.config.enableModals;
      case "user_action":
      case "button":
      case "form":
      case "search":
      case "filter":
        return this.config.enableUserActions;
      case "api":
      case "data":
        return this.config.enableApi;
      case "error":
      case "warning":
        return this.config.enableErrors;
      case "performance":
        return this.config.enablePerformance;
      case "security":
      case "auth":
        return this.config.enableSecurity;
      case "LogViewer":
      case "LOGVIEWER":
      case "logviewer":
        return this.config.enableLogViewer;
      case "info":
      case "config":
      case "session":
        return true; // System logs үргэлж идэвхтэй
      default:
        return true; // Мэдэгдэхгүй category-г default ажиллуулах
    }
  }

  // Tracking-тай холбоотой бүх үйлдлүүдийг шалгах
  shouldTrack(category) {
    return this.isTrackingEnabled(category);
  }

  // Давхцсан лог шалгах
  isDuplicateLog(message) {
    const now = Date.now();
    if (this.lastLogMessage === message && now - this.lastLogTime < this.duplicateThreshold) {
      return true;
    }
    this.lastLogTime = now;
    this.lastLogMessage = message;
    return false;
  }

  /**
   * Core logging method with automatic metadata
   * @param {string} action - Хийгдэж буй үйлдлийн тайлбар/мессеж
   * @param {string} category - Логийн категори (auth, navigation, component, user_action, api, error гэх мэт)
   * @param {Object} details - Нэмэлт мэдээлэл (object)
   * @param {string} level - Логийн түвшин (info, warn, error, debug)
   */
  log(action, category, details = {}, level = "info") {
    // Tracking идэвхгүй бол алгасах
    if (!this.shouldTrack(category)) {
      return;
    }

    const message = `[${category.toUpperCase()}] ${action}`;

    // Давхцсан лог шалгах
    if (this.isDuplicateLog(message)) {
      console.log(`🔄 Давхцсан лог алгасагдсан: ${message}`);
      return; // Давхцсан лог үгүйсгэх
    }

    this.activityCount++;

    const enrichedDetails = {
      ...details,
      sessionId: this.sessionId,
      activityCount: this.activityCount,
      timestamp: this.getAsiaTimestamp(),
      category,
      action,
      user: this.getCurrentUser(), // Add current user
      url: typeof window !== "undefined" ? window.location.href : "unknown",
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
    };

    // Console debug мэдээлэл нэмэх
    console.log(`📝 Log [${category}]: ${action}`, enrichedDetails);

    switch (level) {
      case "error":
        logger.error(message, enrichedDetails);
        break;
      case "warn":
        logger.warn(message, enrichedDetails);
        break;
      case "debug":
        logger.debug(message, enrichedDetails);
        break;
      default:
        logger.info(message, enrichedDetails);
    }
  }

  // === USER AUTHENTICATION ===
  trackLogin(username, success, details = {}) {
    this.log(
      success ? "Нэвтрэх амжилттай" : "Нэвтрэх амжилтгүй",
      "auth",
      { username: username?.substring(0, 3) + "***", success, ...details },
      success ? "info" : "warn"
    );
  }

  trackLogout(reason = "user_action") {
    this.log("Системээс гарсан", "auth", { reason });
  }

  // === NAVIGATION ===
  trackPageView(pageName, route) {
    if (!this.config.enableNavigation) return; // Navigation tracking идэвхгүй бол алгасах

    // Зөвхөн чухал хуудсуудыг лог хийх
    const importantPages = ["login", "dashboard", "admin", "reports", "settings"];
    if (importantPages.some((page) => pageName.toLowerCase().includes(page))) {
      this.log("Чухал хуудас нээгдсэн", "navigation", { pageName, route });
    }
  }

  trackRouteChange(fromRoute, toRoute) {
    if (!this.config.enableNavigation) return; // Navigation tracking идэвхгүй бол алгасах

    // Route өөрчлөлт зөвхөн error tracking-д
    if (fromRoute && toRoute && fromRoute !== toRoute) {
      this.log(
        `Route өөрчлөгдсөн: ${fromRoute} → ${toRoute}`,
        "navigation",
        {
          fromRoute,
          toRoute,
        },
        "debug"
      ); // debug level болгох
    }
  }

  // Configuration methods - Тохиргоог программаас удирдах
  enableNavigationTracking(enable = true) {
    this.config.enableNavigation = enable;
    this.log(`Navigation tracking ${enable ? "идэвхжүүлэгдсэн" : "идэвхгүй болгогдсон"}`, "config");
  }

  enableModalTracking(enable = true) {
    this.config.enableModals = enable;
    this.log(`Modal tracking ${enable ? "идэвхжүүлэгдсэн" : "идэвхгүй болгогдсон"}`, "config");
  }

  enableComponentTracking(enable = true) {
    this.config.enableComponents = enable;
    this.log(`Component tracking ${enable ? "идэвхжүүлэгдсэн" : "идэвхгүй болгогдсон"}`, "config");
  }

  // Debug функцүүд - browser console дээр ашиглахад тохиромжтой
  debugConfig() {
    console.log("🔧 ActivityTracker тохиргоо:", this.config);
    return this.config;
  }

  disableAllComponentTracking() {
    this.config.enableComponents = false;
    this.config.enableModals = false;
    this.config.enableNavigation = false;
    console.log("🚫 Бүх component/modal/navigation tracking идэвхгүй болгогдсон");
    return this.config;
  }

  // === COMPONENT TRACKING ===
  trackComponentMount(componentName, props = {}) {
    if (!this.config.enableComponents) return; // Component tracking идэвхгүй бол алгасах

    this.log(`${componentName} компонент нээгдсэн`, "component", {
      componentName,
      propsCount: Object.keys(props).length,
      mountTime: new Date().toISOString(),
    });
  }

  trackComponentUnmount(componentName) {
    if (!this.config.enableComponents) return; // Component tracking идэвхгүй бол алгасах

    this.log(`${componentName} компонент хаагдсан`, "component", {
      componentName,
      unmountTime: new Date().toISOString(),
    });
  }

  trackUserAction(componentName, actionType, details = {}) {
    this.log(`${componentName}: ${actionType}`, "user_action", {
      componentName,
      actionType,
      ...details,
    });
  }

  trackButtonClick(buttonName, componentName, context = {}) {
    this.log(`Товч дарагдсан: ${buttonName}`, "user_action", {
      buttonName,
      componentName,
      clickTime: new Date().toISOString(),
      ...context,
    });
  }

  trackModalOpen(modalName, data = {}) {
    if (!this.config.enableModals) return; // Modal tracking идэвхгүй бол алгасах

    this.log(`${modalName} модал нээгдсэн`, "modal", {
      modalName,
      openTime: new Date().toISOString(),
      ...data,
    });
  }

  trackModalClose(modalName, duration = null) {
    if (!this.config.enableModals) return; // Modal tracking идэвхгүй бол алгасах

    this.log(`${modalName} модал хаагдсан`, "modal", {
      modalName,
      closeTime: new Date().toISOString(),
      duration,
    });
  }

  trackTabSwitch(fromTab, toTab) {
    if (!this.config.enableNavigation) return; // Navigation tracking идэвхгүй бол алгасах

    this.log(`Tab солигдсон: ${fromTab} → ${toTab}`, "navigation", {
      fromTab,
      toTab,
      switchTime: new Date().toISOString(),
    });
  }

  // === FORM INTERACTIONS ===
  trackFormStart(formName) {
    this.log("Form эхэлсэн", "form", { formName });
  }

  trackFormSubmit(formName, success, validationErrors = []) {
    this.log(
      success ? "Form амжилттай илгээгдсэн" : "Form илгээхэд алдаа",
      "form",
      { formName, success, validationErrors },
      success ? "info" : "error"
    );
  }

  trackFormFieldChange(formName, fieldName, hasValue) {
    this.log(
      "Form талбар өөрчлөгдсөн",
      "form",
      {
        formName,
        fieldName,
        hasValue,
      },
      "debug"
    );
  }

  // === SEARCH & FILTER ===
  trackSearch(searchType, query, resultCount) {
    this.log("Хайлт хийгдсэн", "search", {
      searchType,
      query: query?.substring(0, 50) + (query?.length > 50 ? "..." : ""),
      resultCount,
    });
  }

  trackFilter(filterType, filterValue, resultCount) {
    this.log("Шүүлт хийгдсэн", "filter", { filterType, filterValue, resultCount });
  }

  trackSelection(itemType, itemId, itemName) {
    this.log("Элемент сонгогдсон", "selection", {
      itemType,
      itemId,
      itemName: itemName?.substring(0, 100),
    });
  }

  // === EXCEL INTEGRATION ===
  trackExcelAction(action, details = {}) {
    this.log(`Excel ${action}`, "excel", details);
  }

  trackCellEdit(cellAddress, oldValue, newValue) {
    this.log("Excel нүд засагдсан", "excel", {
      cellAddress,
      hasOldValue: !!oldValue,
      hasNewValue: !!newValue,
    });
  }

  trackDataInsertion(dataType, rowCount, source) {
    this.log("Өгөгдөл Excel-д орууласан", "excel", { dataType, rowCount, source });
  }

  // === API CALLS ===
  trackApiCall(category, action, method, endpoint, details = {}) {
    this.log(`API ${method} ${action}`, category || "api", { endpoint, method, ...details });
  }

  trackDataLoad(dataType, recordCount, loadTime) {
    this.log("Өгөгдөл ачаалагдсан", "data", { dataType, recordCount, loadTime });
  }

  // === ERRORS & WARNINGS ===
  trackError(errorType, errorMessage, context = {}) {
    this.log(
      "Алдаа гарсан",
      "error",
      {
        errorType,
        errorMessage: errorMessage?.substring(0, 200),
        context,
      },
      "error"
    );
  }

  trackWarning(warningType, warningMessage, context = {}) {
    this.log(
      "Сэрэмжлүүлэг",
      "warning",
      {
        warningType,
        warningMessage: warningMessage?.substring(0, 200),
        context,
      },
      "warn"
    );
  }

  // === GENERAL ACTIONS ===
  trackAction(category, action, details = {}) {
    this.log(`${action}`, category, details, "info");
  }

  trackSuccess(category, action, details = {}) {
    this.log(`${action}`, category, details, "info");
  }

  // === PERFORMANCE ===
  trackPerformance(operation, duration, details = {}) {
    const level = duration > 5000 ? "warn" : duration > 2000 ? "info" : "debug";
    this.log(
      "Гүйцэтгэл хэмжээ",
      "performance",
      {
        operation,
        duration: `${duration}ms`,
        ...details,
      },
      level
    );
  }

  // === SESSION INFO ===
  getSessionInfo() {
    return {
      sessionId: this.sessionId,
      startTime: this.startTime,
      activityCount: this.activityCount,
      duration: Date.now() - new Date(this.startTime).getTime(),
    };
  }

  // === BULK LOGGING ===
  trackBulkActivity(activities) {
    activities.forEach((activity) => {
      this.log(activity.action, activity.category, activity.details, activity.level);
    });
  }
}

// Create singleton instance
const activityTracker = ActivityTracker.getInstance();

// Browser console дээр ашиглах боломжтой болгох
if (typeof window !== "undefined") {
  window.activityTracker = activityTracker;
}

// Auto-track page visibility changes
if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    activityTracker.log(document.hidden ? "Хуудас нуугдсан" : "Хуудас харагдсан", "session");
  });
}

export default activityTracker;
export { ActivityTracker };
