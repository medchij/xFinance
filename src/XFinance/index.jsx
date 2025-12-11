import * as React from "react";
import { createRoot } from "react-dom/client";
import App from "./components/App";
import { FluentProvider, webLightTheme } from "@fluentui/react-components";
import performanceMonitor from "./utils/performanceMonitor";
import userJourneyTracker from "./utils/userJourneyTracker";

/* global document, Office, module, require */

const title = "XFinance";

// Track app initialization
performanceMonitor.startTiming('app-init');

// Track app start in user journey
userJourneyTracker.trackPageView('App Initialization', {
  title,
  timestamp: Date.now()
});

const rootElement = document.getElementById("container");
const root = rootElement ? createRoot(rootElement) : undefined;

Office.onReady(() => {
  performanceMonitor.endTiming('app-init');
  performanceMonitor.startTiming('first-render');
  
  root?.render(
    <FluentProvider theme={webLightTheme}>
      <App title={title} />
    </FluentProvider>
  );
  
  // Track first render complete
  requestAnimationFrame(() => {
    performanceMonitor.endTiming('first-render');
  });
});

if (module.hot) {
  module.hot.accept("./components/App", () => {
    const NextApp = require("./components/App").default;
    root?.render(
      <FluentProvider theme={webLightTheme}>
        <NextApp title={title} />
      </FluentProvider>
    );
  });
}
