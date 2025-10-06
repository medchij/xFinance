import React, { lazy, Suspense } from "react";
import PropTypes from "prop-types";
import { AppProvider, useAppContext } from "./AppContext";
import AppLoader from "./AppLoader";
import AppNotification from "./AppNotification";
import ShortcutListener from "./ShortcutListener";
import AuthenticatedApp from "./AuthenticatedApp"; // Зөвхөн AuthenticatedApp-г импортлоно

// Lazy components
const UnauthenticatedApp = lazy(() => import(/* webpackChunkName: "app-unauth" */ "./UnauthenticatedApp"));

const AppContent = ({ title }) => {
  const { isLoggedIn, login, setSelectedCompany } = useAppContext();

  return (
    <Suspense fallback={<AppLoader />}>
      {isLoggedIn ? <AuthenticatedApp title={title} /> : <UnauthenticatedApp onLogin={login} onCompanySelect={setSelectedCompany} />}
      <AppLoader />
      <AppNotification />
    </Suspense>
  );
};
AppContent.propTypes = { title: PropTypes.string };


const App = ({ title }) => {
  return (
    <AppProvider>
      <ShortcutListener onTrigger={() => console.log("Shortcut triggered!")} />
      <AppContent title={title} />
    </AppProvider>
  );
};
App.propTypes = { title: PropTypes.string };

export default App;