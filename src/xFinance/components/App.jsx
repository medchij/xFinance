import * as React from "react";
import { useState } from "react";
import PropTypes from "prop-types";
import Sidebar from "./Sidebar";
import MainContent from "./maincontent";
import CustomTools from "./CustomTools";
import SettingsPage from "./SettingsPage";
import SearchAccount from "./SearchAccount";
import Profile from "./Profile";
import { AppProvider } from "./AppContext";
import AppLoader from "./AppLoader";
import AppNotification from "./AppNotification";
import ShortcutListener from "./ShortcutListener";
import BrowserView from "./BrowserView";


const App = ({ title }) => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [activePage, setActivePage] = useState("maincontent");

  const toggleSidebar = () => {
    setSidebarOpen((prev) => !prev);
  };

  return (
    <AppProvider>
      <ShortcutListener onTrigger={() => setShowCalendar(true)} />
      <div style={{ display: "flex", minHeight: "100vh", transition: "margin-left 0.3s ease-in-out" }}>
        <Sidebar
          isOpen={isSidebarOpen}
          toggleSidebar={toggleSidebar}
          setActivePage={setActivePage}
        />

        {activePage === "maincontent" && (
          <MainContent
            title={title}
            isSidebarOpen={isSidebarOpen}
          />
        )}
        {activePage === "CustomTools" && <CustomTools isSidebarOpen={isSidebarOpen} />}
        {activePage === "search" && <SearchAccount />}
        {activePage === "settings" && <SettingsPage isSidebarOpen={isSidebarOpen} />}
        {activePage === "profile" && <Profile isSidebarOpen={isSidebarOpen} />}
        {activePage === "browser" && <BrowserView isSidebarOpen={isSidebarOpen} />}

        {/* Main content area */}


        {/* Global Loader and Notification */}
        <AppLoader />
        <AppNotification />
      </div>
    </AppProvider>
  );
};

App.propTypes = {
  title: PropTypes.string,
};

export default App;
