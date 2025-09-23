import * as React from "react";
import { useState } from "react";
import PropTypes from "prop-types";
import { lazy, Suspense } from "react";

import { AppProvider } from "./AppContext";
import AppLoader from "./AppLoader";
import AppNotification from "./AppNotification";
import ShortcutListener from "./ShortcutListener";

// Lazy components
const Sidebar = lazy(() => import(/* webpackChunkName: "page-sidebar" */ "./Sidebar"));
const MainContent = lazy(() => import(/* webpackChunkName: "page-main" */ "./maincontent"));
const CustomTools = lazy(() => import(/* webpackChunkName: "page-tools" */ "./CustomTools"));
const SettingsPage = lazy(() => import(/* webpackChunkName: "page-settings" */ "./SettingsPage"));
const SearchAccount = lazy(() => import(/* webpackChunkName: "page-search" */ "./SearchAccount"));
const Profile = lazy(() => import(/* webpackChunkName: "page-profile" */ "./Profile"));
const BrowserView = lazy(() => import(/* webpackChunkName: "page-browser" */ "./BrowserView"));

const App = ({ title }) => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [activePage, setActivePage] = useState("maincontent");
  const [showCalendar, setShowCalendar] = useState(false); // 🆕 нэмсэн

  const toggleSidebar = () => {
    setSidebarOpen((prev) => !prev);
  };

  return (
    <AppProvider>
      <ShortcutListener onTrigger={() => setShowCalendar(true)} />
      <div
        style={{
          display: "flex",
          minHeight: "100vh",
          transition: "margin-left 0.3s ease-in-out",
        }}
      >
        <Suspense fallback={<div style={{ padding: 12 }}>Түр хүлээгээрэй…</div>}>
          <Sidebar
            isOpen={isSidebarOpen}
            toggleSidebar={toggleSidebar}
            setActivePage={setActivePage}
          />

          {activePage === "maincontent" && (
            <MainContent title={title} isSidebarOpen={isSidebarOpen} />
          )}
          {activePage === "CustomTools" && <CustomTools isSidebarOpen={isSidebarOpen} />}
          {activePage === "search" && <SearchAccount />}
          {activePage === "settings" && <SettingsPage isSidebarOpen={isSidebarOpen} />}
          {activePage === "profile" && <Profile isSidebarOpen={isSidebarOpen} />}
          {activePage === "browser" && <BrowserView isSidebarOpen={isSidebarOpen} />}
        </Suspense>

        {/* Global Loader and Notification */}
        <AppLoader />
        <AppNotification />
      </div>

      {/* Жишээ: showCalendar state ашиглаж UI харуулж болно */}
      {showCalendar && <div style={{ position: "absolute", top: 20, right: 20 }}>📅 Calendar Placeholder</div>}
    </AppProvider>
  );
};

App.propTypes = {
  title: PropTypes.string,
};

export default App;
