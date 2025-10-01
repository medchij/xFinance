import React, { useState, lazy, Suspense } from "react";
import PropTypes from "prop-types";

const Sidebar = lazy(() => import(/* webpackChunkName: "page-sidebar" */ "./Sidebar"));
const MainContent = lazy(() => import(/* webpackChunkName: "page-main" */ "./maincontent"));
const CustomTools = lazy(() => import(/* webpackChunkName: "page-tools" */ "./CustomTools"));
const SettingsPage = lazy(() => import(/* webpackChunkName: "page-settings" */ "./SettingsPage"));
const SearchAccount = lazy(() => import(/* webpackChunkName: "page-search" */ "./SearchAccount"));
const Profile = lazy(() => import(/* webpackChunkName: "page-profile" */ "./Profile"));
const BrowserView = lazy(() => import(/* webpackChunkName: "page-browser" */ "./BrowserView"));
const AdminPage = lazy(() => import(/* webpackChunkName: "page-admin" */ "./AdminPage"));

const AuthenticatedApp = ({ title }) => {
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
        <div style={{
          flexGrow: 1,
          transition: "margin-left 0.3s ease-in-out",
          marginLeft: isSidebarOpen ? 250 : 50,
          padding: "24px",
          backgroundColor: "#f3f4f6"
        }}>
          {activePage === "maincontent" && <MainContent title={title} isSidebarOpen={isSidebarOpen} />}
          {activePage === "CustomTools" && <CustomTools isSidebarOpen={isSidebarOpen} />}
          {activePage === "search" && <SearchAccount />}
          {activePage === "settings" && <SettingsPage isSidebarOpen={isSidebarOpen} />}
          {activePage === "profile" && <Profile isSidebarOpen={isSidebarOpen} />}
          {activePage === "browser" && <BrowserView isSidebarOpen={isSidebarOpen} />}
          {activePage === "admin" && <AdminPage isSidebarOpen={isSidebarOpen} />}
        </div>
      </Suspense>
    </div>
  );
};

AuthenticatedApp.propTypes = {
  title: PropTypes.string,
};

export default AuthenticatedApp;
