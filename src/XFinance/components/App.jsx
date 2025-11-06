import React, { lazy, Suspense, useEffect, useState } from "react";
import PropTypes from "prop-types";
import { AppProvider, useAppContext } from "./AppContext";
import AppLoader from "./AppLoader";
import AppNotification from "./AppNotification";
import ShortcutListener from "./ShortcutListener";
import AuthenticatedApp from "./AuthenticatedApp"; // Зөвхөн AuthenticatedApp-г импортлоно
import ErrorBoundary from "./ErrorBoundary";
import activityTracker from "../utils/activityTracker";
import ResetPassword from "./ResetPassword";

// Lazy components
const UnauthenticatedApp = lazy(() => import(/* webpackChunkName: "app-unauth" */ "./UnauthenticatedApp"));

const AppContent = ({ title }) => {
  const { isLoggedIn, login, setSelectedCompany } = useAppContext();
  const [currentView, setCurrentView] = useState('main');

  // URL-аас token шалгах
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      setCurrentView('reset-password');
    }
  }, []);

  // Reset Password хуудас харуулах
  if (currentView === 'reset-password') {
    return <ResetPassword />;
  }

  return (
    <Suspense fallback={<AppLoader />}>
      {isLoggedIn ? (
        <AuthenticatedApp title={title} />
      ) : (
        <UnauthenticatedApp onLogin={login} onCompanySelect={setSelectedCompany} />
      )}
      <AppLoader />
      <AppNotification />
    </Suspense>
  );
};
AppContent.propTypes = { title: PropTypes.string };

const App = ({ title }) => {
  // Activity Tracker configuration тохируулах
  useEffect(() => {
    // App ачаалагдсан эсэхийг бичнэ
    activityTracker.log("xFinance App ачаалагдлаа", "info", { title });
  }, [title]);

  return (
    <ErrorBoundary>
      <AppProvider>
        <ShortcutListener onTrigger={() => console.log("Shortcut triggered!")} />
        <AppContent title={title} />
      </AppProvider>
    </ErrorBoundary>
  );
};
App.propTypes = { title: PropTypes.string };

export default App;
