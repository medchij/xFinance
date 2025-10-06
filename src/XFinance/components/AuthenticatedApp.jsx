import React, { useState, lazy, Suspense } from "react";
import PropTypes from "prop-types";
import { useAppContext } from "./AppContext"; // useAppContext-г импортлох

const Sidebar = lazy(() => import(/* webpackChunkName: "page-sidebar" */ "./Sidebar"));
const MainContent = lazy(() => import(/* webpackChunkName: "page-main" */ "./maincontent"));
const CustomTools = lazy(() => import(/* webpackChunkName: "page-tools" */ "./CustomTools"));
const SettingsPage = lazy(() => import(/* webpackChunkName: "page-settings" */ "./SettingsPage"));
const SearchAccount = lazy(() => import(/* webpackChunkName: "page-search" */ "./SearchAccount"));
const Profile = lazy(() => import(/* webpackChunkName: "page-profile" */ "./Profile"));
const AdminPage = lazy(() => import(/* webpackChunkName: "page-admin" */ "./AdminPage"));

// Эрх шалгах тохиргоо
const pagePermissions = {
  settings: 'view_settings_page',
  admin: 'view_admin_page',
  // Шаардлагатай бол бусад хуудсыг нэмнэ
};

const AuthenticatedApp = ({ title }) => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [activePage, setActivePage] = useState("maincontent");
  const { hasPermission, showMessage } = useAppContext(); // Context-оос хэрэгтэй функцүүдийг авах

  const pages = {
    maincontent: { Component: MainContent, props: { title } },
    CustomTools: { Component: CustomTools, props: {} },
    search: { Component: SearchAccount, props: {} },
    settings: { Component: SettingsPage, props: {} },
    profile: { Component: Profile, props: {} },
    admin: { Component: AdminPage, props: {} },
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
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Suspense fallback={<div style={{ padding: 12 }}>Түр хүлээгээрэй…</div>}>
        <Sidebar
          isOpen={isSidebarOpen}
          toggleSidebar={toggleSidebar}
          setActivePage={handlePageChange} // setActivePage-ийн оронд шинэ функцээ дамжуулна
        />
        <div
          style={{
            flexGrow: 1,
            transition: "margin-left 0.3s ease-in-out",
            //marginLeft: isSidebarOpen ? 250 : 50,
            padding: "24px",
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
  );
};

AuthenticatedApp.propTypes = {
  title: PropTypes.string,
};

export default AuthenticatedApp;
