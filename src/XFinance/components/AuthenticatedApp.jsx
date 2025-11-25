import React, { useState, lazy, Suspense } from "react";
import PropTypes from "prop-types";
import { useAppContext } from "./AppContext"; // useAppContext-г импортлох
import LogViewer from "./LogViewer"; // LogViewer нэмэх
import Header from "./Header"; // Header нэмэх
import { useActivityTracking } from "../hooks/useActivityTracking";

const Sidebar = lazy(() => import(/* webpackChunkName: "page-sidebar" */ "./Sidebar"));
const MainContent = lazy(() => import(/* webpackChunkName: "page-main" */ "./maincontent"));
const CustomTools = lazy(() => import(/* webpackChunkName: "page-tools" */ "./CustomTools"));
const SettingsPage = lazy(() => import(/* webpackChunkName: "page-settings" */ "./SettingsPage"));
const SearchAccount = lazy(() => import(/* webpackChunkName: "page-search" */ "./SearchAccount"));
const Profile = lazy(() => import(/* webpackChunkName: "page-profile" */ "./Profile"));
const AdminPage = lazy(() => import(/* webpackChunkName: "page-admin" */ "./AdminPage"));
const ChatPage = lazy(() => import(/* webpackChunkName: "page-chat" */ "./ChatPage"));

// Эрх шалгах тохиргоо
const pagePermissions = {
  settings: "view_settings_page",
  admin: "view_admin_page",
  // Шаардлагатай бол бусад хуудсыг нэмнэ
};

const AuthenticatedApp = ({ title }) => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [activePage, setActivePage] = useState("maincontent");
  const [isLogViewerOpen, setLogViewerOpen] = useState(false);
  const { hasPermission, showMessage, currentUser } = useAppContext(); // currentUser нэмэв

  // Activity tracking
  const { trackExcelAction } = useActivityTracking("AuthenticatedApp");

  // Клавиатур shortcut - Ctrl+Shift+L лог харах
  React.useEffect(() => {
    const handleKeydown = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === "L") {
        e.preventDefault();
        setLogViewerOpen(true);
        trackExcelAction("открыт_лог_просмотрщик_клавиатурой");
      }
    };

    document.addEventListener("keydown", handleKeydown);
    return () => document.removeEventListener("keydown", handleKeydown);
  }, [trackExcelAction]);

  const pages = {
    maincontent: { Component: MainContent, props: { title, currentUser, onNavigateToProfile: () => setActivePage("profile") } },
    CustomTools: { Component: CustomTools, props: {} },
    search: { Component: SearchAccount, props: {} },
    settings: { Component: SettingsPage, props: {} },
    profile: { Component: Profile, props: {} },
    admin: { Component: AdminPage, props: {} },
    chat: { Component: ChatPage, props: {} },
  };

  const toggleSidebar = () => {
    setSidebarOpen((prev) => !prev);
  };

  // Хуудас солих хүсэлтийг зохицуулах шинэ функц
  const handlePageChange = (page) => {
    const requiredPermission = pagePermissions[page];

    if (requiredPermission && !hasPermission(requiredPermission)) {
      // Эрх байхгүй тохиолдолд
      showMessage("❌ Энэ хуудсыг үзэх эрх танд байхгүй байна.", "error");
      return; // Хуудас солих үйлдлийг зогсооно
    }

    // Эрхтэй бол хуудсыг солино
    setActivePage(page);
  };

  const ActivePageComponent = pages[activePage]?.Component;
  const pageProps = pages[activePage]?.props || {};

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      {/* Header бүх хуудсанд */}
      <Header
        logo="assets/logo-filled.png"
        title={title}
        message="xFinance"
        isPublic={false}
        currentUser={currentUser}
        onNavigateToProfile={() => handlePageChange("profile")}
        isSidebarOpen={isSidebarOpen}
      />
      
      <div style={{ display: "flex", flex: 1 }}>
        <Suspense fallback={<div style={{ padding: 12 }}>Түр хүлээгээрэй…</div>}>
          <Sidebar
            isOpen={isSidebarOpen}
            toggleSidebar={toggleSidebar}
            setActivePage={handlePageChange}
            onOpenLogViewer={() => setLogViewerOpen(true)} // Лог товч функц нэмэв
          />
          <div
            style={{
              flexGrow: 1,
              transition: "margin-left 0.3s ease-in-out",
              //marginLeft: isSidebarOpen ? 250 : 50,
              padding: "8px", // Зайг эрс багасгав
              backgroundColor: "#f3f4f6",
            }}
          >
            {ActivePageComponent ? (
              <ActivePageComponent {...pageProps} isSidebarOpen={isSidebarOpen} />
            ) : (
              <div>Хуудас олдсонгүй</div>
            )}
          </div>
        </Suspense>
      </div>

      {/* Log Viewer Modal */}
      <LogViewer isOpen={isLogViewerOpen} onClose={() => setLogViewerOpen(false)} />
    </div>
  );
};

AuthenticatedApp.propTypes = {
  title: PropTypes.string,
};

export default AuthenticatedApp;
