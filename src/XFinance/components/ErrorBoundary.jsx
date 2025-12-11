import React from "react";
import { ActivityTracker } from "../utils/activityTracker";
import logger from "../utils/logger";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
    this.activityTracker = ActivityTracker.getInstance();
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error using activity tracker
    this.activityTracker.trackError("ErrorBoundary", "React Error Boundary caught error", {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo?.componentStack || "No component stack available",
      timestamp: new Date().toISOString(),
    });

    // Log to enhanced logger with full stack trace
    logger.error("React Component Error", {
      error: error,
      componentStack: errorInfo?.componentStack,
      componentName: this.props.name || 'Unknown Component'
    });

    this.setState({
      error: error,
      errorInfo: errorInfo,
    });

    // Also log to console for development
    console.error("Error Boundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // Custom error UI
      return (
        <div
          style={{
            padding: "20px",
            margin: "20px",
            border: "2px solid #ff4444",
            borderRadius: "8px",
            backgroundColor: "#fff5f5",
            color: "#cc0000",
          }}
        >
          <h2>🚨 Програмын алдаа гарлаа</h2>
          <p>Уучлаарай, программд алдаа гарсан тул хуудсыг дахин ачаалах шаардлагатай байна.</p>

          <details style={{ marginTop: "10px" }}>
            <summary>Техникийн дэлгэрэнгүй мэдээлэл</summary>
            <div
              style={{
                marginTop: "10px",
                padding: "10px",
                backgroundColor: "#f0f0f0",
                fontFamily: "monospace",
                fontSize: "12px",
                overflow: "auto",
              }}
            >
              <strong>Алдааны мэдээлэл:</strong>
              <pre>{this.state.error && this.state.error.toString()}</pre>

              <strong>Компонентын stack:</strong>
              <pre>{this.state.errorInfo?.componentStack || "No component stack available"}</pre>
            </div>
          </details>

          <div style={{ marginTop: "15px" }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: "8px 16px",
                backgroundColor: "#007acc",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              🔄 Хуудсыг дахин ачаалах
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
