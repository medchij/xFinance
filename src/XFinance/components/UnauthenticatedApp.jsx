import React, { useState } from "react";
import LoginPage from "./LoginPage";
import MainContent from "./maincontent";
import Header from "./Header";

const UnauthenticatedApp = ({ onLogin, onCompanySelect }) => {
  // State to toggle between login and public view
  const [showLogin, setShowLogin] = useState(false);

  const handleNavigateToLogin = () => {
    setShowLogin(true);
  };

  const handleNavigateToPublic = () => {
    setShowLogin(false);
  };

  return (
    <div className="unauth-container">
      {showLogin ? (
        <LoginPage onLogin={onLogin} onCompanySelect={onCompanySelect} onNavigateToPublic={handleNavigateToPublic} />
      ) : (
        <>
          {/* Public view - Header with login button */}
          <Header
            logo="assets/logo-filled.png"
            title="xFinance"
            message="xFinance"
            isPublic={true}
            onNavigateToLogin={handleNavigateToLogin}
            isSidebarOpen={false}
          />
          <MainContent isPublic={true} onNavigateToLogin={handleNavigateToLogin} />
        </>
      )}
    </div>
  );
};

export default UnauthenticatedApp;
