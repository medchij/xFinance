/**
 * User Journey Tracker - Track user navigation and interactions
 * Records the complete user flow through the application
 */
import logger from './logger';

class UserJourneyTracker {
  constructor() {
    this.journey = [];
    this.currentSession = this.initSession();
    this.maxJourneySteps = 1000;
    this.interactions = [];
    
    // Initialize tracking
    this.initTracking();
  }

  static instance = null;

  static getInstance() {
    if (!UserJourneyTracker.instance) {
      UserJourneyTracker.instance = new UserJourneyTracker();
    }
    return UserJourneyTracker.instance;
  }

  initSession() {
    const sessionId = sessionStorage.getItem('journeySessionId') || this.generateSessionId();
    sessionStorage.setItem('journeySessionId', sessionId);

    const session = {
      sessionId,
      startTime: Date.now(),
      startUrl: window.location.href,
      userAgent: navigator.userAgent,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      language: navigator.language,
      platform: navigator.platform
    };

    // Load existing journey from sessionStorage
    const savedJourney = sessionStorage.getItem('userJourney');
    if (savedJourney) {
      try {
        this.journey = JSON.parse(savedJourney);
      } catch (e) {
        console.warn('Failed to load saved journey:', e);
      }
    }

    return session;
  }

  generateSessionId() {
    return `journey_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  initTracking() {
    if (typeof window === 'undefined') return;

    // Track page visibility changes
    document.addEventListener('visibilitychange', () => {
      this.trackEvent('page', document.hidden ? 'hidden' : 'visible');
    });

    // Track clicks
    document.addEventListener('click', (e) => {
      this.trackClick(e);
    }, true);

    // Track form submissions
    document.addEventListener('submit', (e) => {
      this.trackFormSubmit(e);
    }, true);

    // Track navigation
    this.trackNavigation();

    // Track scroll depth
    this.trackScrollDepth();

    // Save journey periodically
    setInterval(() => {
      this.saveJourney();
    }, 30000); // Every 30 seconds

    // Save on page unload
    window.addEventListener('beforeunload', () => {
      this.trackEvent('session', 'end');
      this.saveJourney();
      this.sendJourneyReport();
    });
  }

  trackNavigation() {
    // Track initial page load
    this.trackEvent('navigation', 'page_load', {
      url: window.location.href,
      referrer: document.referrer
    });

    // Track URL changes (for SPA)
    let lastUrl = window.location.href;
    const observer = new MutationObserver(() => {
      const currentUrl = window.location.href;
      if (currentUrl !== lastUrl) {
        this.trackEvent('navigation', 'url_change', {
          from: lastUrl,
          to: currentUrl
        });
        lastUrl = currentUrl;
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  trackScrollDepth() {
    let maxScroll = 0;
    let scrollTimeout;

    const checkScroll = () => {
      const scrollPercent = Math.round(
        (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
      );

      if (scrollPercent > maxScroll) {
        maxScroll = scrollPercent;
        
        // Track milestones: 25%, 50%, 75%, 100%
        const milestones = [25, 50, 75, 100];
        const milestone = milestones.find(m => scrollPercent >= m && maxScroll - scrollPercent < 25);
        
        if (milestone) {
          this.trackEvent('scroll', `depth_${milestone}%`, {
            depth: scrollPercent,
            url: window.location.href
          });
        }
      }
    };

    window.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(checkScroll, 150);
    });
  }

  trackClick(event) {
    const target = event.target;
    const tagName = target.tagName?.toLowerCase();
    
    // Only track meaningful clicks
    if (!['a', 'button', 'input', 'select'].includes(tagName) && 
        !target.onclick && 
        !target.closest('[role="button"]')) {
      return;
    }

    const data = {
      tagName,
      id: target.id,
      className: target.className,
      text: target.textContent?.substring(0, 50),
      href: target.href,
      type: target.type,
      name: target.name,
      x: event.clientX,
      y: event.clientY
    };

    this.trackEvent('click', tagName, data);
  }

  trackFormSubmit(event) {
    const form = event.target;
    const data = {
      formId: form.id,
      formName: form.name,
      action: form.action,
      method: form.method,
      fieldCount: form.elements.length
    };

    this.trackEvent('form', 'submit', data);
  }

  trackEvent(category, action, data = {}) {
    const step = {
      timestamp: Date.now(),
      category,
      action,
      data,
      url: window.location.href,
      sequenceNumber: this.journey.length + 1
    };

    this.journey.push(step);
    this.interactions.push(step);

    // Limit journey size
    if (this.journey.length > this.maxJourneySteps) {
      this.journey.shift();
    }

    // Log significant events
    if (['navigation', 'form', 'error'].includes(category)) {
      logger.info(`Journey: ${category} - ${action}`, step);
    }
  }

  // Track specific user actions
  trackPageView(pageName, metadata = {}) {
    this.trackEvent('page', 'view', {
      pageName,
      ...metadata
    });
  }

  trackFeatureUse(featureName, action = 'used', metadata = {}) {
    this.trackEvent('feature', action, {
      featureName,
      ...metadata
    });
  }

  trackSearch(searchTerm, resultsCount = null) {
    this.trackEvent('search', 'query', {
      searchTerm,
      resultsCount
    });
  }

  trackDataExport(exportType, recordCount = null) {
    this.trackEvent('export', exportType, {
      recordCount
    });
  }

  trackError(errorType, errorMessage) {
    this.trackEvent('error', errorType, {
      message: errorMessage
    });
  }

  // Get journey statistics
  getJourneyStats() {
    const now = Date.now();
    const sessionDuration = now - this.currentSession.startTime;

    const categories = {};
    this.journey.forEach(step => {
      categories[step.category] = (categories[step.category] || 0) + 1;
    });

    const pageViews = this.journey.filter(s => s.category === 'navigation').length;
    const clicks = this.journey.filter(s => s.category === 'click').length;
    const forms = this.journey.filter(s => s.category === 'form').length;
    const errors = this.journey.filter(s => s.category === 'error').length;

    return {
      sessionId: this.currentSession.sessionId,
      sessionDuration,
      totalSteps: this.journey.length,
      pageViews,
      clicks,
      forms,
      errors,
      categories,
      startTime: new Date(this.currentSession.startTime).toISOString(),
      currentUrl: window.location.href
    };
  }

  // Get recent journey steps
  getRecentSteps(count = 20) {
    return this.journey.slice(-count);
  }

  // Get journey by category
  getStepsByCategory(category) {
    return this.journey.filter(step => step.category === category);
  }

  // Get journey path (navigation only)
  getNavigationPath() {
    return this.journey
      .filter(step => step.category === 'navigation')
      .map(step => ({
        timestamp: step.timestamp,
        action: step.action,
        url: step.data.url || step.data.to,
        sequenceNumber: step.sequenceNumber
      }));
  }

  // Get user flow (simplified view)
  getUserFlow() {
    const flow = [];
    let currentPage = null;
    let pageStartTime = null;

    this.journey.forEach(step => {
      if (step.category === 'navigation') {
        // Save previous page info
        if (currentPage) {
          flow.push({
            ...currentPage,
            duration: step.timestamp - pageStartTime,
            actions: this.journey.filter(s => 
              s.timestamp >= pageStartTime && 
              s.timestamp < step.timestamp &&
              s.category !== 'navigation'
            ).length
          });
        }

        // Start new page
        currentPage = {
          url: step.data.url || step.data.to,
          startTime: step.timestamp
        };
        pageStartTime = step.timestamp;
      }
    });

    // Add current page
    if (currentPage) {
      flow.push({
        ...currentPage,
        duration: Date.now() - pageStartTime,
        actions: this.journey.filter(s => 
          s.timestamp >= pageStartTime &&
          s.category !== 'navigation'
        ).length
      });
    }

    return flow;
  }

  // Save journey to sessionStorage
  saveJourney() {
    try {
      sessionStorage.setItem('userJourney', JSON.stringify(this.journey));
    } catch (e) {
      console.warn('Failed to save journey:', e);
      // If storage is full, keep only recent steps
      this.journey = this.journey.slice(-100);
      sessionStorage.setItem('userJourney', JSON.stringify(this.journey));
    }
  }

  // Export journey as JSON
  exportJourney() {
    return {
      session: this.currentSession,
      stats: this.getJourneyStats(),
      journey: this.journey,
      navigationPath: this.getNavigationPath(),
      userFlow: this.getUserFlow(),
      exportTime: new Date().toISOString()
    };
  }

  // Send journey report to backend
  async sendJourneyReport() {
    try {
      const report = {
        session: this.currentSession,
        stats: this.getJourneyStats(),
        recentSteps: this.getRecentSteps(50),
        navigationPath: this.getNavigationPath(),
        userFlow: this.getUserFlow()
      };

      logger.info('User Journey Report', report);
    } catch (error) {
      console.warn('Failed to send journey report:', error);
    }
  }

  // Clear journey
  clearJourney() {
    this.journey = [];
    this.interactions = [];
    sessionStorage.removeItem('userJourney');
  }

  // Replay journey (for debugging)
  replayJourney(speed = 1000) {
    console.log('🎬 Journey Replay Started');
    console.log('Session:', this.currentSession);
    console.log('Total Steps:', this.journey.length);
    console.log('---');

    let index = 0;
    const interval = setInterval(() => {
      if (index >= this.journey.length) {
        clearInterval(interval);
        console.log('🎬 Journey Replay Ended');
        return;
      }

      const step = this.journey[index];
      console.log(`[${index + 1}/${this.journey.length}]`, {
        time: new Date(step.timestamp).toLocaleTimeString(),
        category: step.category,
        action: step.action,
        data: step.data
      });

      index++;
    }, speed);
  }
}

// Create singleton
const userJourneyTracker = UserJourneyTracker.getInstance();

// Expose to window for debugging
if (typeof window !== 'undefined') {
  window.userJourneyTracker = userJourneyTracker;
  
  // Send report every 5 minutes
  setInterval(() => {
    userJourneyTracker.sendJourneyReport();
  }, 5 * 60 * 1000);
}

export default userJourneyTracker;
export { UserJourneyTracker };
