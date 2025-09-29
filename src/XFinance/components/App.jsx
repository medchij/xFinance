import React, { useState, lazy, Suspense } from "react";
import PropTypes from "prop-types";
import { AppProvider, useAppContext } from "./AppContext";
import AppLoader from "./AppLoader";
import AppNotification from "./AppNotification";
import ShortcutListener from "./ShortcutListener";

// Lazy components
const UnauthenticatedApp = lazy(() => import(/* webpackChunkName: "app-unauth" */ "./UnauthenticatedApp"));
const AuthenticatedApp = lazy(() => import(/* webpackChunkName: "app-auth" */ "./AuthenticatedApp")); // AuthenticatedApp-г тусад нь гаргая

// AuthenticatedApp-н тодорхойлолтыг тусдаа файл болгох нь зүйтэй ч, энд түр үлдээе
// Тусдаа файл: AuthenticatedApp.jsx
const Sidebar = lazy(() => import(/* webpackChunkName: "page-sidebar" */ "./Sidebar"));
const MainContent = lazy(() => import(/* webpackChunkName: "page-main" */ "./maincontent"));
const CustomTools = lazy(() => import(/* webpackChunkName: "page-tools" */ "./CustomTools"));
const SettingsPage = lazy(() => import(/* webpackChunkName: "page-settings" */ "./SettingsPage"));
const SearchAccount = lazy(() => import(/* webpackChunkName: "page-search" */ "./SearchAccount"));
const Profile = lazy(() => import(/* webpackChunkName: "page-profile" */ "./Profile"));
const BrowserView = lazy(() => import(/* webpackChunkName: "page-browser" */ "./BrowserView"));

const InternalAuthenticatedApp = ({ title }) => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [activePage, setActivePage] = useState("maincontent");

  const toggleSidebar = () => {
    setSidebarOpen((prev) => !prev);
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Suspense fallback={<div style={{ padding: 12 }}>Түр хүлээгээрэй…</div>}>
        <Sidebar
          isOpen={isSidebarOpen}
          toggleSidebar={toggleSidebar}
          setActivePage={setActivePage}
        />
        <div style={{ flexGrow: 1 }} >
          {activePage === "maincontent" && <MainContent title={title} isSidebarOpen={isSidebarOpen} />}
          {activePage === "CustomTools" && <CustomTools isSidebarOpen={isSidebarOpen} />}
          {activePage === "search" && <SearchAccount />}
          {activePage === "settings" && <SettingsPage isSidebarOpen={isSidebarOpen} />}
          {activePage === "profile" && <Profile isSidebarOpen={isSidebarOpen} />}
          {activePage === "browser" && <BrowserView isSidebarOpen={isSidebarOpen} />}
        </div>
      </Suspense>
    </div>
  );
};
InternalAuthenticatedApp.propTypes = { title: PropTypes.string };


// AppContent-г шинэчлэв
const AppContent = ({ title }) => {
  const { isLoggedIn, login, setSelectedCompany } = useAppContext();

  return (
    <Suspense fallback={<AppLoader />}>
      {isLoggedIn ? <InternalAuthenticatedApp title={title} /> : <UnauthenticatedApp onLogin={login} onCompanySelect={setSelectedCompany} />}
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