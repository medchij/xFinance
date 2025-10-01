import React, { useState, lazy, Suspense } from "react";
import PropTypes from "prop-types";
import { AppProvider, useAppContext } from "./AppContext";
import AppLoader from "./AppLoader";
import AppNotification from "./AppNotification";
import ShortcutListener from "./ShortcutListener";

// Lazy components
const UnauthenticatedApp = lazy(() => import(/* webpackChunkName: "app-unauth" */ "./UnauthenticatedApp"));
const AuthenticatedApp = lazy(() => import(/* webpackChunkName: "app-auth" */ "./AuthenticatedApp"));

const Sidebar = lazy(() => import(/* webpackChunkName: "page-sidebar" */ "./Sidebar"));
const MainContent = lazy(() => import(/* webpackChunkName: "page-main" */ "./maincontent"));
const CustomTools = lazy(() => import(/* webpackChunkName: "page-tools" */ "./CustomTools"));
const SettingsPage = lazy(() => import(/* webpackChunkName: "page-settings" */ "./SettingsPage"));
const SearchAccount = lazy(() => import(/* webpackChunkName: "page-search" */ "./SearchAccount"));
const Profile = lazy(() => import(/* webpackChunkName: "page-profile" */ "./Profile"));
const BrowserView = lazy(() => import(/* webpackChunkName: "page-browser" */ "./BrowserView"));
// AdminPage-г lazy load хийхээр нэмэв
const AdminPage = lazy(() => import(/* webpackChunkName: "page-admin" */ "./AdminPage"));


// PERMISSION CHECKER
const pagePermissions = {
  settings: 'view_settings_page',
  admin: 'view_admin_page',
  // Шаардлагатай бол бусад хуудсыг нэмнэ
  // жишээ нь: reports: 'view_reports_page'
};


const InternalAuthenticatedApp = ({ title }) => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [activePage, setActivePage] = useState("maincontent");
  const { hasPermission, showMessage } = useAppContext(); // showNotification-г showMessage болгов

  const toggleSidebar = () => {
    setSidebarOpen((prev) => !prev);
  };

  // Хуудас солих хүсэлтийг зохицуулах шинэ функц
  const handlePageChange = (page) => {
    const requiredPermission = pagePermissions[page];

    if (requiredPermission && !hasPermission(requiredPermission)) {
      // Эрх байхгүй тохиолдолд
      console.warn(`Permission denied: User tried to access '${page}' without '${requiredPermission}' permission.`);
      showMessage("❌ Энэ хуудсыг үзэх эрх танд байхгүй байна."); // showNotification-г showMessage болгов
      return; // Хуудас солих үйлдлийг зогсооно
    } 
    
    // Эрхтэй бол хуудсыг солино
    setActivePage(page);
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Suspense fallback={<div style={{ padding: 12 }}>Түр хүлээгээрэй…</div>}>
        <Sidebar
          isOpen={isSidebarOpen}
          toggleSidebar={toggleSidebar}
          // setActivePage-ийн оронд шинэ функцээ дамжуулна
          setActivePage={handlePageChange} 
        />
        <div style={{ flexGrow: 1 }} >
          {activePage === "maincontent" && <MainContent title={title} isSidebarOpen={isSidebarOpen} />}
          {activePage === "CustomTools" && <CustomTools isSidebarOpen={isSidebarOpen} />}
          {activePage === "search" && <SearchAccount />}
          {activePage === "settings" && <SettingsPage isSidebarOpen={isSidebarOpen} />}
          {activePage === "profile" && <Profile isSidebarOpen={isSidebarOpen} />}
          {activePage === "browser" && <BrowserView isSidebarOpen={isSidebarOpen} />}
          {/* AdminPage-г энд нэмж өгөх. Sidebar-аас 'admin' гэж дуудагдана. */}
          {activePage === "admin" && <AdminPage isSidebarOpen={isSidebarOpen} />}
        </div>
      </Suspense>
    </div>
  );
};
InternalAuthenticatedApp.propTypes = { title: PropTypes.string };


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